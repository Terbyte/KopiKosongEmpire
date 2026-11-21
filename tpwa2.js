const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();

  // ---- Android (Pixel 7) ----
  const a = await browser.newContext({ ...devices['Pixel 7'] });
  const p = await a.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:5201/', { waitUntil: 'load' });
  const w = await p.$('#welStart');
  if (w && await w.isVisible()) { await w.click(); await p.waitForTimeout(300); }
  await p.waitForTimeout(7500);   // fallback timer is 6s on non-iOS
  const bar = await p.evaluate(() => document.getElementById('installBar').classList.contains('show'));
  const pad = await p.evaluate(() => getComputedStyle(document.body).paddingBottom);
  console.log('ANDROID bar:', bar, '| body padding-bottom:', pad);
  if (bar) {
    await p.click('#ibAdd');
    await p.waitForTimeout(600);
    const toast = await p.evaluate(() => {
      const t = document.getElementById('toast');
      return { shown: t.classList.contains('show'), text: t.textContent };
    });
    console.log('ANDROID after ADD (no prompt available):', JSON.stringify(toast));
    const sheet = await p.evaluate(() => document.getElementById('iosSheet').classList.contains('show'));
    console.log('ANDROID ios sheet (should be false):', sheet);
  }
  await p.screenshot({ path: '/tmp/pwa-android.png' });
  console.log('ANDROID errors:', errs.length ? errs : 'none');

  // ---- Desktop (should stay hidden) ----
  const d = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dp = await d.newPage();
  await dp.goto('http://127.0.0.1:5201/', { waitUntil: 'load' });
  const dw = await dp.$('#welStart');
  if (dw && await dw.isVisible()) { await dw.click(); }
  await dp.waitForTimeout(8000);
  const dbar = await dp.evaluate(() => document.getElementById('installBar').classList.contains('show'));
  console.log('DESKTOP bar (should be false):', dbar);

  await browser.close();
})();
