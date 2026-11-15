const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('dialog', async d => { await d.accept(); });

  await p.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(500);

  const t0 = Date.now();
  const timeline = [];
  let prestigeAt = null;

  const snap = () => p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('kopitiam-kosong-v2') || '{}');
    const q = (id) => document.querySelector(id)?.textContent.trim();
    return {
      money: q('#money'), cps: q('#cps'), beans: q('#curBeans'),
      ach: q('#achBadge'), missions: q('#tabMission'),
      lifetime: s.lifetime || { m: 0, e: 0 },
      prestiges: s.prestiges || 0,
      p1: !document.querySelector('#prestigeBtn').disabled,
      p1Text: q('#prestigeInfo')
    };
  });

  // A player-like session: constant buying, tapping for the first 90s, then idle
  const buy = setInterval(async () => {
    try {
      await p.evaluate(() => {
        const btns = [...document.querySelectorAll('.buybtn')].filter(x => !x.disabled);
        if (btns.length) btns[btns.length - 1].click();
      });
    } catch (e) {}
  }, 600);

  // claim missions automatically (a real player taps the badge)
  const claim = setInterval(async () => {
    try {
      await p.evaluate(() => {
        const btn = document.querySelector('#tabMission');
        if (btn && btn.querySelector('.badge')) btn.click();
      });
      await p.waitForTimeout(150);
      await p.evaluate(() => {
        const btns = [...document.querySelectorAll('#goalList button:not([disabled])')];
        btns.forEach(x => x.click());
        document.querySelector('button[data-tab="brew"]').click();
      });
    } catch (e) {}
  }, 4000);

  const end = Date.now() + 10 * 60 * 1000;
  let tick = 0;
  while (Date.now() < end) {
    // tap for the first 90 seconds, then let it idle
    if (Date.now() - t0 < 90000) {
      for (let k = 0; k < 6; k++) await p.click('#brewBtn');
    }
    await p.waitForTimeout(1000);
    tick++;

    if (tick % 30 === 0) {
      const s = await snap();
      timeline.push({ at: Math.round((Date.now() - t0) / 1000) + 's', ...s });
      if (s.p1 && !prestigeAt) prestigeAt = Math.round((Date.now() - t0) / 1000) + 's';
    }
    if (prestigeAt && tick % 60 === 0) break;
  }

  clearInterval(buy);
  clearInterval(claim);

  const final = await snap();
  let afterPrestige = null;
  if (final.p1) {
    await p.click('#prestigeBtn');
    await p.waitForTimeout(900);
    afterPrestige = await snap();
  }

  fs.writeFileSync('/tmp/pt10.json', JSON.stringify({
    prestige_available_at: prestigeAt || 'not within 10 min',
    timeline, final, after_prestige: afterPrestige, errors: errs
  }, null, 2));

  console.log('DONE prestige_at=' + (prestigeAt || 'none'));
  await b.close();
})();
