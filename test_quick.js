import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, 'dist', 'AICraft.html');

async function testViewport(page, w, h, label) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto('file://' + htmlPath, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(1500);

  const mqActive = await page.evaluate(() => window.matchMedia('(max-height: 450px)').matches);
  const start = await page.evaluate(() => {
    const o = document.querySelector('#overlay');
    const s = document.querySelector('#start-screen');
    const btn = document.querySelector('#start-btn');
    return {
      overlaySH: o.scrollHeight, overlayCH: o.clientHeight,
      btnFit: btn ? btn.getBoundingClientRect().bottom <= o.clientHeight : false,
      h1: s.querySelector('h1') ? getComputedStyle(s.querySelector('h1')).fontSize : '?',
      photoHidden: s.querySelector('.start-left') ? getComputedStyle(s.querySelector('.start-left')).display === 'none' : true,
    };
  });
  const startFit = start.overlaySH <= start.overlayCH + 5;
  console.log(`[${label}] START: ${startFit ? 'OK' : 'OVERFLOW'} ${start.overlaySH}/${start.overlayCH} btn=${start.btnFit} h1=${start.h1} photo=${start.photoHidden} mq450=${mqActive}`);

  // Pause
  await page.click('#start-btn');
  await page.waitForTimeout(1000);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const pause = await page.evaluate(() => {
    const o = document.querySelector('#overlay');
    const p = document.querySelector('#pause-screen');
    if (!p || p.classList.contains('hidden')) return null;
    const btn = document.querySelector('#continue-btn');
    return {
      overlaySH: o.scrollHeight, overlayCH: o.clientHeight,
      btnFit: btn ? btn.getBoundingClientRect().bottom <= o.clientHeight : false,
      h1: p.querySelector('h1') ? getComputedStyle(p.querySelector('h1')).fontSize : '?',
    };
  });
  if (pause) {
    const ok = pause.overlaySH <= pause.overlayCH + 5;
    console.log(`[${label}] PAUSE: ${ok ? 'OK' : 'OVERFLOW'} ${pause.overlaySH}/${pause.overlayCH} btn=${pause.btnFit} h1=${pause.h1}`);
  } else {
    console.log(`[${label}] PAUSE: not visible`);
  }

  // Inventory
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  const inv = await page.evaluate(() => {
    const i = document.querySelector('#inventory-overlay');
    if (!i || i.classList.contains('hidden')) return null;
    return { invSH: i.scrollHeight, invCH: i.clientHeight };
  });
  if (inv) {
    const ok = inv.invSH <= inv.invCH + 5;
    console.log(`[${label}] INVENTORY: ${ok ? 'OK' : 'OVERFLOW'} ${inv.invSH}/${inv.invCH}`);
  } else {
    console.log(`[${label}] INVENTORY: not visible`);
  }
}

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await testViewport(page, 732, 412, '732x412 Pixel');
  await testViewport(page, 914, 412, '914x412 S21');
  await testViewport(page, 480, 360, '480x360 small');

  await browser.close();
  console.log('\n验证完成');
}

test().catch(e => { console.error(e); process.exit(1); });
