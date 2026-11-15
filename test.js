const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const out = {};
  out.money_start = (await page.textContent('#money')).trim();

  for (let i = 0; i < 60; i++) await page.click('#brewBtn');
  await page.waitForTimeout(300);
  out.money_after_clicks = (await page.textContent('#money')).trim();

  if (await page.isEnabled('#buy-cerek')) await page.click('#buy-cerek');
  await page.waitForTimeout(200);
  out.cerek_owned = (await page.textContent('#own-cerek')).trim();
  out.cps = (await page.textContent('#cps')).trim();

  await page.click('#buymode button[data-n="10"]');
  await page.waitForTimeout(150);
  out.cost_x10 = (await page.textContent('#cost-cerek')).trim();
  await page.click('#buymode button[data-n="max"]');
  await page.waitForTimeout(150);
  out.cost_max = (await page.textContent('#cost-cerek')).trim();
  await page.click('#buymode button[data-n="1"]');

  await page.click('#tabAch');
  await page.waitForTimeout(300);
  out.ach_badge = (await page.textContent('#achBadge')).trim();
  out.ach_cards = await page.locator('.ach').count();
  await page.screenshot({ path: '/tmp/kop-ach.png', fullPage: true });

  await page.click('#tabStats');
  await page.waitForTimeout(300);
  out.stat_cells = await page.locator('.stat').count();
  await page.screenshot({ path: '/tmp/kop-stats.png', fullPage: true });

  await page.click('#tabSet');
  await page.waitForTimeout(200);
  await page.click('#langSeg button[data-lang="bm"]');
  await page.waitForTimeout(300);
  out.tab_shop_bm = (await page.textContent('#tabShop')).trim();
  out.save_btn_bm = (await page.textContent('#saveBtn')).trim();
  await page.screenshot({ path: '/tmp/kop-settings-bm.png', fullPage: true });

  await page.click('#langSeg button[data-lang="en"]');
  await page.click('#tabShop');
  await page.waitForTimeout(400);
  out.tab_shop_en = (await page.textContent('#tabShop')).trim();
  await page.screenshot({ path: '/tmp/kop-shop.png', fullPage: true });

  out.p1_disabled = await page.isDisabled('#prestigeBtn');
  out.p2_disabled = await page.isDisabled('#prestige2Btn');

  out.errors = errors;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
