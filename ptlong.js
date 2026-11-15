const { chromium } = require('playwright');
const fs = require('fs');

const OFFLINE_MS = 60 * 60 * 1000;   // 1 hour away
const MAX_CYCLES = 40;

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

  const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('kopitiam-kosong-v2') || '{}'));
  const tab = async (t) => { await p.click('button[data-tab="' + t + '"]'); await p.waitForTimeout(250); };

  const buyBest = async () => {
    for (let i = 0; i < 6; i++) {
      const done = await p.evaluate(() => {
        const btns = [...document.querySelectorAll('.buybtn')].filter(x => !x.disabled);
        if (!btns.length) return false;
        btns[btns.length - 1].click();
        return true;
      });
      if (!done) return;
      await p.waitForTimeout(120);
    }
  };

  const claimMissions = async () => {
    await tab('mission');
    for (let i = 0; i < 3; i++) {
      const any = await p.evaluate(() => {
        const btns = [...document.querySelectorAll('#goalList button:not([disabled])')];
        btns.forEach(x => x.click());
        return btns.length;
      });
      if (!any) break;
      await p.waitForTimeout(200);
    }
    await tab('brew');
  };

  // rewind lastSeen on EVERY navigation, before the game scripts run
  await p.addInitScript((ms) => {
    try {
      const k = 'kopitiam-kosong-v2';
      const raw = localStorage.getItem(k);
      if (!raw) return;
      const s = JSON.parse(raw);
      s.lastSeen = Date.now() - ms;
      localStorage.setItem(k, JSON.stringify(s));
    } catch (e) {}
  }, OFFLINE_MS);

  const cycleLog = [];
  let cycle = 0, hoursAway = 0, reachedFranchiseAt = null;

  while (cycle < MAX_CYCLES) {
    cycle++;

    // ---------- ACTIVE: a normal playing burst ----------
    await tab('brew');
    for (let i = 0; i < 40; i++) { await p.click('#brewBtn'); }
    await buyBest();
    await claimMissions();
    await buyBest();

    const before = await S();

    // ---------- OFFLINE: 1 hour away (init script rewinds lastSeen on load) ----------
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(900);

    const hadModal = await p.isVisible('#offlineModal.show');
    const offAmount = hadModal ? (await p.textContent('#offAmount')).trim() : 'none';
    if (hadModal) { await p.click('#claimOffline'); await p.waitForTimeout(400); }

    // a real player prestiges whenever it is available
    const canPrestige = await p.evaluate(() => {
      const btn = document.querySelector('#prestigeBtn');
      return btn && !btn.disabled;
    });
    if (canPrestige) {
      await p.click('#prestigeBtn');
      await p.waitForTimeout(700);
      await buyBest();
    }

    await buyBest();
    await claimMissions();

    const after = await S();
    hoursAway += 1;
    const cps = (await p.textContent('#cps')).trim();
    const francais = (after.counts || {}).francais || 0;

    cycleLog.push({
      cycle, hours_played: '~1min + ' + cycle + 'h offline',
      off_claim: offAmount, cash_after_claim: (await p.textContent('#money')).trim(),
      cps, francais, buildings: after.counts, prestiges: after.prestiges || 0,
      life_e: after.lifetime ? after.lifetime.e : null
    });

    if (francais >= 1 && !reachedFranchiseAt) { reachedFranchiseAt = cycle; break; }
  }

  fs.writeFileSync('/tmp/ptlong.json', JSON.stringify({
    reached_franchise_at_cycle: reachedFranchiseAt || 'not within ' + MAX_CYCLES + ' cycles',
    simulated_hours_away: hoursAway,
    cycleLog, errors: errs
  }, null, 2));

  console.log('DONE franchise_cycle=' + (reachedFranchiseAt || 'none') + ' cycles=' + cycle);
  await b.close();
})();
