import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, 'dist');
const INDEX = resolve(__dirname, 'index.html');
const MAIN = resolve(__dirname, 'main.js');
const CSS = resolve(__dirname, 'style.css');
const START_IMG = 'WechatIMG282.jpeg';

async function build() {
  const result = await esbuild.build({
    entryPoints: [MAIN],
    bundle: true,
    format: 'esm',
    minify: true,
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
    .replace('<link rel="stylesheet" href="style.css">', '')
    .replace(/<script type="module" src="main\.js"><\/script>/, '')
    .replace(/<script type="importmap">[\s\S]*?<\/script>/, '')
    .replace('</head>', `<style>${cssCode}</style>\n</head>`)
    .replace('</body>', `<script>\n${jsCode}\n</script>\n</body>`);

  if (imgDataUri) {
    html = html.replace(/src="[^"]*WechatIMG282\.jpeg"/, `src="${imgDataUri}"`);
  } else {
    // Remove the img tag entirely so no broken image shows
    html = html.replace(/<img[^>]*WechatIMG282\.jpeg[^>]*>/, '');
  }

  writeFileSync(resolve(DIST, 'AICraft.html'), html);
  console.log(`Built ${(html.length / 1024).toFixed(0)}KB to dist/AICraft.html`);
}

build().catch(e => { console.error(e); process.exit(1); });
