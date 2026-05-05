import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, 'dist');
const INDEX = resolve(__dirname, 'index.html');
const MAIN = resolve(__dirname, 'src', 'main.js');
const CSS = resolve(__dirname, 'src', 'style.css');
const START_IMG = 'start-img.jpg';
const ANDROID_DIR = resolve(__dirname, 'android');
const ICON_SRC = resolve(__dirname, 'pic', String.fromCharCode(22270,26631) + '.png');

export async function build() {
  const result = await esbuild.build({
    entryPoints: [MAIN],
    bundle: true,
    format: 'esm',
    minifyWhitespace: true,
    minifySyntax: true,
    minifyIdentifiers: false,
    write: false,
  });

  const jsCode = result.outputFiles[0].text;
  const cssCode = readFileSync(CSS, 'utf8');

  const imgPath = resolve(__dirname, START_IMG);
  let imgDataUri = '';
  try {
    const imgBuf = readFileSync(imgPath);
    imgDataUri = 'data:image/jpeg;base64,' + imgBuf.toString('base64');
  } catch (e) {
    console.warn('Warning: could not read ' + START_IMG + ', skipping image embed');
  }

  let html = readFileSync(INDEX, 'utf8')
    .replace('<link rel="stylesheet" href="src/style.css">', '')
    .replace(/<script type="module" src="src\/main\.js"><\/script>/, '')
    .replace(/<script type="importmap">[\s\S]*?<\/script>/, '')
    .replace('</head>', `<style>${cssCode}</style>\n</head>`)
    .replace('</body>', `<script>\n${jsCode}\n</script>\n</body>`);

  if (imgDataUri) {
    html = html.replace(/src="[^"]*start-img.jpg"/, `src="${imgDataUri}"`);
  } else {
    // Remove the img tag entirely so no broken image shows
    html = html.replace(/<img[^>]*start-img.jpg[^>]*>/, '');
  }

  writeFileSync(resolve(DIST, 'AICraft.html'), html);
  console.log(`Built ${(html.length / 1024).toFixed(0)}KB to dist/AICraft.html`);
}

// Dispatch
let args = process.argv.slice(2);
if (args[0] === "android") {
  import("./build-android.js").then(function(m) {
    m.buildAndroid().catch(function(e) { console.error(e); process.exit(1); });
  }).catch(function(e) { console.error(e); process.exit(1); });
} else {
  build().catch(function(e) { console.error(e); process.exit(1); });
}
