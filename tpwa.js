const { chromium, devices } = require('playwright');

(async () => {
  const errors = [];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('http://127.0.0.1:5201/', { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  // dismiss welcome overlay so it doesn't block taps
  const wel = await page.$('#welStart');
  if (wel && await wel.isVisible()) { await wel.click(); await page.waitForTimeout(400); }

  const meta = await page.evaluate(() => {
    const l = document.querySelector('link[rel="manifest"]');
    const apple = document.querySelector('link[rel="apple-touch-icon"]');
    const cap = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    return {
      manifest: l ? l.getAttribute('href') : null,
      appleIcon: apple ? apple.getAttribute('href') : null,
      capable: cap ? cap.getAttribute('content') : null,
      theme: document.querySelector('meta[name="theme-color"]')?.content,
      version: document.querySelector('.buildbar b')?.textContent || null
    };
  });
  console.log('META:', JSON.stringify(meta));

  // manifest is valid JSON + fields
  const mres = await page.request.get('http://127.0.0.1:5201/manifest.json');
  const mj = await mres.json();
  console.log('MANIFEST status', mres.status(), '| name', mj.name, '| display', mj.display,
              '| icons', mj.icons.length, '| start_url', mj.start_url);

  // icons reachable
  for (const ic of mj.icons) {
    const r = await page.request.get('http://127.0.0.1:5201/' + ic.src);
    console.log('  icon', ic.src, r.status(), ic.purpose || '');
  }

  // service worker
  const sw = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      await new Promise(r => setTimeout(r, 1500));
      return { scope: reg.scope, active: !!reg.active, state: reg.active?.state || reg.installing?.state };
    } catch (e) { return 'ERR ' + e.message; }
  });
  console.log('SW:', JSON.stringify(sw));

  // install bar should appear on iOS after ~3.5s
  await page.waitForSelector('#installBar.show', { timeout: 8000 }).catch(() => {});
  const barVisible = await page.evaluate(() => document.getElementById('installBar').classList.contains('show'));
  console.log('INSTALL BAR VISIBLE:', barVisible);
  await page.screenshot({ path: '/tmp/pwa-bar.png' });

  if (barVisible) {
    await page.click('#ibAdd');
    await page.waitForTimeout(500);
    const sheet = await page.evaluate(() => document.getElementById('iosSheet').classList.contains('show'));
    console.log('IOS SHEET:', sheet);
    const steps = await page.evaluate(() => [...document.querySelectorAll('#iosSteps li')].map(li => li.textContent.trim()));
    console.log('STEPS:', JSON.stringify(steps));
    await page.screenshot({ path: '/tmp/pwa-sheet.png' });
    await page.click('#iosOk');
    await page.waitForTimeout(300);
  }

  // English/BM text swap
  const bm = await page.evaluate(() => {
    const out = {};
    const btn = document.getElementById('langBtn');
    btn.click();
    out.title = document.getElementById('ibTitle').textContent;
    return out;
  });
  await page.waitForTimeout(400);
  console.log('BM after toggle:', JSON.stringify(bm));
  await page.evaluate(() => document.getElementById('langBtn').click());

  // landscape-ish + small android check: viewport still fine, no horizontal overflow
  const of = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log('OVERFLOW:', JSON.stringify(of), '| errors:', errors.length ? errors : 'none');

  await browser.close();
})();
