import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, 'dist', 'AICraft.html');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 732, height: 412 } });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('file://' + htmlPath, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(1500);

  // === START SCREEN ===
  const start = await page.evaluate(() => {
    const o = document.querySelector('#overlay');
    const s = document.querySelector('#start-screen');
    const btn = document.querySelector('#start-btn');
    return {
      overlaySH: o.scrollHeight, overlayCH: o.clientHeight,
      startSH: s.scrollHeight,
      btnFit: btn ? btn.getBoundingClientRect().bottom <= o.clientHeight : false,
      h1: s.querySelector('h1') ? getComputedStyle(s.querySelector('h1')).fontSize : '?',
    };
  });
  const startFit = start.overlaySH <= start.overlayCH + 5;
  console.log(`[START] ${startFit ? 'OK' : 'OVERFLOW'} | ${start.overlaySH}/${start.overlayCH} | btnFits: ${start.btnFit} | h1: ${start.h1}`);

  // Click start button to enter game
  await page.click('#start-btn');
  await page.waitForTimeout(1000);

  // === PAUSE SCREEN (Escape to pause game) ===
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const pause = await page.evaluate(() => {
    const o = document.querySelector('#overlay');
    const p = document.querySelector('#pause-screen');
    if (!p || p.classList.contains('hidden')) return null;
    const btn = document.querySelector('#continue-btn');
    const roleCards = document.querySelectorAll('.role-card');
    const vol = document.querySelector('#pause-volume');
    const lastElBottom = Math.max(
      ...Array.from(o.children).map(el => el.getBoundingClientRect().bottom)
    );
    return {
      overlaySH: o.scrollHeight, overlayCH: o.clientHeight,
      pauseSH: p.scrollHeight,
      contentBottom: lastElBottom,
      btnFit: btn ? btn.getBoundingClientRect().bottom <= o.clientHeight : false,
      role0Fit: roleCards[0] ? roleCards[0].getBoundingClientRect().bottom <= o.clientHeight : false,
      volVis: !!vol,
      h1: p.querySelector('h1') ? getComputedStyle(p.querySelector('h1')).fontSize : '?',
    };
  });
  if (pause) {
    const pauseFit = pause.overlaySH <= pause.overlayCH + 5;
    console.log(`[PAUSE] ${pauseFit ? 'OK' : 'OVERFLOW'} | ${pause.overlaySH}/${pause.overlayCH} | btnFits: ${pause.btnFit} | roleFits: ${pause.role0Fit} | h1: ${pause.h1} | bottom: ${pause.contentBottom}/${pause.overlayCH}`);
  } else {
    console.log('[PAUSE] not visible (game may not have started)');
  }

  // === INVENTORY (Escape to close pause, then E for inventory) ===
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  const inv = await page.evaluate(() => {
    const i = document.querySelector('#inventory-overlay');
    if (!i || i.classList.contains('hidden')) return null;
    const container = i.querySelector('.inventory-container');
    return {
      invSH: i.scrollHeight, invCH: i.clientHeight,
      containerSH: container ? container.scrollHeight : 0,
      containerCH: container ? container.clientHeight : 0,
      hasGrid: !!i.querySelector('.storage-grid'),
      hasCrafting: !!i.querySelector('.crafting-grid'),
    };
  });
  if (inv) {
    const invFit = inv.invSH <= inv.invCH + 5;
    console.log(`[INVENTORY] ${invFit ? 'OK' : 'OVERFLOW'} | ${inv.invSH}/${inv.invCH} | container: ${inv.containerSH}/${inv.containerCH}`);
  } else {
    console.log('[INVENTORY] not visible');
  }

  await browser.close();
  console.log('\n验证完成');
}

test().catch(e => { console.error(e); process.exit(1); });
