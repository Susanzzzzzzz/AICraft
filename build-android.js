import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { build } from './build.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST = resolve(__dirname, 'dist');
const ANDROID_DIR = resolve(__dirname, 'android');
const ICON_SRC = resolve(__dirname, 'pic', '\u56FE\u6807.png');

export async function ensureGradleWrapper() {
  const wrapperDir = resolve(ANDROID_DIR, 'gradle', 'wrapper');
  const jarPath = resolve(wrapperDir, 'gradle-wrapper.jar');
  if (existsSync(jarPath)) return;
  mkdirSync(wrapperDir, { recursive: true });
  console.log('  Downloading Gradle wrapper jar...');


  const url = 'https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradle/wrapper/gradle-wrapper.jar';
  try {
    const resp = await fetch(url);
    if (resp.ok) {
      writeFileSync(jarPath, Buffer.from(await resp.arrayBuffer()));
      console.log('  Gradle wrapper jar downloaded');
      return;
    }
  } catch (_) {}

  console.log('  Downloading Gradle distribution (may take a moment)...');
  const distUrl = 'https://services.gradle.org/distributions/gradle-8.5-bin.zip';
  const zipResp = await fetch(distUrl);
  if (!zipResp.ok) throw new Error('Failed to download Gradle distribution');
  const zipBuf = Buffer.from(await zipResp.arrayBuffer());
  for (let i = 0; i < zipBuf.length - 30; i++) {
    if (zipBuf[i] === 0x50 && zipBuf[i+1] === 0x4B && zipBuf[i+2] === 0x03 && zipBuf[i+3] === 0x04) {
      const nameLen = zipBuf.readUInt16LE(i + 26);
      const extraLen = zipBuf.readUInt16LE(i + 28);
      const compSize = zipBuf.readUInt32LE(i + 18);
      const fileName = zipBuf.subarray(i + 30, i + 30 + nameLen).toString();
      if (fileName.includes('gradle-wrapper.jar') && !fileName.includes('sources') && !fileName.includes('javadoc')) {
        const data = zipBuf.subarray(i + 30 + nameLen + extraLen, i + 30 + nameLen + extraLen + compSize);
        writeFileSync(jarPath, data);
        console.log('  Gradle wrapper jar extracted');
        return;
      }
      i += 29 + nameLen + extraLen + compSize;
    }
  }
  throw new Error('Could not get gradle-wrapper.jar. Try: gradle wrapper');
}


export async function generateAndroidIcons() {
  if (!existsSync(ICON_SRC)) {
    console.warn('  Warning: icon not found, skipping');
    return;
  }
  const resDir = resolve(ANDROID_DIR, 'app', 'src', 'main', 'res');
  const sizes = { 'mipmap-mdpi': 48, 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96, 'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192 };
  for (const [dir, size] of Object.entries(sizes)) {
    const outDir = resolve(resDir, dir);
    mkdirSync(outDir, { recursive: true });
    const outPath = resolve(outDir, 'ic_launcher.png');
    try {
      execSync('/usr/bin/sips -Z ' + size + ' -s format png \x22' + ICON_SRC + '\x22 --out \x22' + outPath + '\x22 2>/dev/null', { stdio: 'pipe' });
    } catch (_) {
      execSync('/usr/bin/sips --resampleWidth ' + size + ' \x22' + ICON_SRC + '\x22 --out \x22' + outPath + '\x22 2>/dev/null', { stdio: 'pipe' });
    }
    console.log('  Icon ' + size + 'x' + size);
  }
}


async function downloadFile(url, destPath) {
  const resp = await fetch(url, { redirect: 'follow' });
  if (!resp.ok) throw new Error('Download failed: ' + resp.status);
  const buf = Buffer.from(await resp.arrayBuffer());
  writeFileSync(destPath, buf);
  return destPath;
}

async function installAndroidSDKDirect() {
  const sdkDir = resolve(__dirname, 'android-sdk');
  const sdkmanager = resolve(sdkDir, 'cmdline-tools', 'latest', 'bin', 'sdkmanager');

  if (existsSync(sdkmanager)) {
    process.env.ANDROID_HOME = sdkDir;
    process.env.ANDROID_SDK_ROOT = sdkDir;
    console.log('  Android SDK: found at ' + sdkDir);
    return true;
  }

  console.log('  Downloading Android command-line tools (~150MB)...');
  mkdirSync(sdkDir, { recursive: true });

  const zipUrl = 'https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip';
  const zipPath = resolve(sdkDir, 'cmdline-tools.zip');

  try {
    await downloadFile(zipUrl, zipPath);
  } catch (e) {
    console.warn('  Download failed: ' + e.message);
    return false;
  }

  console.log('  Extracting...');
  try {
    execSync('cd \x22' + sdkDir + '\x22 && unzip -q -o cmdline-tools.zip 2>&1', { stdio: 'pipe' });
    try { rmSync(zipPath); } catch (_) {}
  } catch (e) {
    console.warn('  Extraction failed: ' + e.message);
    try { rmSync(zipPath); } catch (_) {}
    return false;
  }

  // Verify sdkmanager exists (Google zip has cmdline-tools/latest/bin/ structure)
  if (!existsSync(sdkmanager)) {
    // Try to locate sdkmanager in alternative paths
    try {
      const found = execSync('find \x22' + sdkDir + '\x22 -name sdkmanager -type f 2>/dev/null', { encoding: 'utf8' }).trim();
      if (found) {
        const foundDir = resolve(found, '..', '..');
        const latestDir = resolve(sdkDir, 'cmdline-tools', 'latest');
        mkdirSync(latestDir, { recursive: true });
        execSync('cp -R \x22' + foundDir + '/\x22* \x22' + latestDir + '/\x22 2>&1', { stdio: 'pipe' });
      }
    } catch (_) {}
  }

  if (!existsSync(sdkmanager)) {
    console.warn('  sdkmanager not found after extraction');
    return false;
  }

  chmodSync(sdkmanager, '755');
  process.env.ANDROID_HOME = sdkDir;
  process.env.ANDROID_SDK_ROOT = sdkDir;

  console.log('  Installing platform and build-tools...');
  try {
    execSync('yes | \x22' + sdkmanager + '\x22 \x22platforms;android-34\x22 \x22build-tools;34.0.0\x22 \x22platform-tools\x22 2>&1', { stdio: 'inherit', timeout: 600000 });
    console.log('  Android SDK installed successfully');
    return true;
  } catch (e) {
    console.warn('  SDK component install failed: ' + e.message);
    return false;
  }
}


export async function buildAndroid() {
  console.log('\n=== Building HTML ===');
  await build();

  const assetsDir = resolve(ANDROID_DIR, 'app', 'src', 'main', 'assets');
  mkdirSync(assetsDir, { recursive: true });

  const htmlPath = resolve(DIST, 'AICraft.html');
  if (!existsSync(htmlPath)) throw new Error('HTML not found at ' + htmlPath);
  writeFileSync(resolve(assetsDir, 'index.html'), readFileSync(htmlPath, 'utf8'));
  console.log('Copied HTML to android/app/src/main/assets/');

  console.log('\n=== Downloading Gradle wrapper ===');
  await ensureGradleWrapper();

  console.log('\n=== Generating icons ===');
  await generateAndroidIcons();

  let javaOk = false;
  let sdkOk = false;
  console.log('\n=== Checking prerequisites ===');

  // Check Java
  const javaHomes = [
    process.env.JAVA_HOME,
    '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
    '/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
    '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
    '/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
  ];
  for (const jh of javaHomes) {
    if (jh && existsSync(resolve(jh, 'bin', 'java'))) {
      process.env.JAVA_HOME = jh;
      process.env.PATH = resolve(jh, 'bin') + ':' + process.env.PATH;
      javaOk = true;
      console.log('  Java: OK at ' + jh);
      break;
    }
  }
  if (!javaOk) {
    try {
      execSync('java -version 2>&1', { stdio: 'pipe' });
      javaOk = true;
      console.log('  Java: OK (system)');
    } catch (_) {
      console.log('  Java: not found');
    }
  }

  const sdkPaths = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    resolve(__dirname, 'android-sdk'),
    process.env.HOME + '/Library/Android/sdk',
    '/usr/local/lib/android/sdk',
  ];
  for (const p of sdkPaths) {
    if (p && existsSync(resolve(p, 'platforms'))) {
      process.env.ANDROID_HOME = p;
      sdkOk = true;
      console.log('  Android SDK: OK at ' + p);
      break;
    }
  }
  if (!sdkOk) console.log('  Android SDK: not found');

  if (!javaOk || !sdkOk) {
    console.log('\n=== Installing prerequisites ===');
    if (!javaOk) {
      try {
        console.log('  Installing JDK 17 via Homebrew...');
        execSync('brew install openjdk@17 2>&1', { stdio: 'inherit' });
        const brewJh = '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home';
        const brewJhIntel = '/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home';
        if (existsSync(brewJh)) {
          process.env.JAVA_HOME = brewJh;
          process.env.PATH = resolve(brewJh, 'bin') + ':' + process.env.PATH;
          javaOk = true;
          console.log('  Java: OK at ' + brewJh);
        } else if (existsSync(brewJhIntel)) {
          process.env.JAVA_HOME = brewJhIntel;
          process.env.PATH = resolve(brewJhIntel, 'bin') + ':' + process.env.PATH;
          javaOk = true;
          console.log('  Java: OK at ' + brewJhIntel);
        } else {
          try {
            const jh = execSync('/usr/libexec/java_home -v 17 2>&1', { encoding: 'utf8' }).trim();
            if (jh) { process.env.JAVA_HOME = jh; javaOk = true; }
          } catch (_) {}
        }
      } catch (e) {
        console.warn('  JDK install failed: ' + e.message);
      }
    }
    if (!sdkOk && javaOk) {
      console.log('  Installing Android SDK (direct download)...');
      sdkOk = await installAndroidSDKDirect();
      if (!sdkOk) {
        // Fallback to Homebrew
        try {
          console.log('  Trying Homebrew fallback...');
          execSync('brew install --cask android-commandlinetools 2>&1', { stdio: 'inherit' });
          const candidates = ['/usr/local/share/android-commandlinetools', '/opt/homebrew/share/android-commandlinetools'];
          for (const c of candidates) {
            if (existsSync(c)) {
              process.env.ANDROID_HOME = c;
              const sm = resolve(c, 'cmdline-tools', 'latest', 'bin', 'sdkmanager');
              if (existsSync(sm)) {
                execSync('yes | \x22' + sm + '\x22 \x22platforms;android-34\x22 \x22build-tools;34.0.0\x22 2>&1', { stdio: 'inherit', timeout: 300000 });
                sdkOk = true;
              }
              break;
            }
          }
        } catch (e) {
          console.warn('  Homebrew SDK install failed: ' + e.message);
        }
      }
    }
  }

  if (!javaOk || !sdkOk) {
    console.log('\n============================================');
    console.log('  Prerequisites not met. Install manually:');
    console.log('    brew install openjdk@17');
    console.log('    brew install android-commandlinetools');
    console.log('    sdkmanager \x22platforms;android-34\x22 \x22build-tools;34.0.0\x22');
    console.log('  Then set: export ANDROID_HOME=/path/to/sdk');
    console.log('============================================');
    console.log('\nAndroid project structure created at android/');
    console.log('You can open it in Android Studio to build.');
    return;
  }

  writeFileSync(resolve(ANDROID_DIR, 'local.properties'), 'sdk.dir=' + process.env.ANDROID_HOME + '\n');

  console.log('\n=== Building APK ===');
  chmodSync(resolve(ANDROID_DIR, 'gradlew'), '755');

  try {
    execSync('cd \x22' + ANDROID_DIR + '\x22 && ./gradlew assembleDebug 2>&1', { stdio: 'inherit', timeout: 600000 });
    const apk = resolve(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    if (existsSync(apk)) {
      const sz = readFileSync(apk).length;
      const destApk = resolve(DIST, 'AICraft.apk');
      writeFileSync(destApk, readFileSync(apk));
      console.log('\n=== APK built! ===');
      console.log('  Location: ' + apk);
      console.log('  Also at:  ' + destApk);
      console.log('  Size: ' + (sz / 1024 / 1024).toFixed(1) + ' MB');
    }
  } catch (e) {
    console.error('Gradle build failed: ' + e.message);
  }
}
