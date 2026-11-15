/* ============================================================
   Kopi Kosong Empire — kopitiam incremental game
   v2: RM currency, EN/BM, buy modes, achievements, 2 prestige layers
   No dependencies. Numbers are {m,e} pairs so nothing overflows.
   ============================================================ */

'use strict';

/* ---------------- big numbers ---------------- */
function norm(m, e) {
  if (!isFinite(m) || m === 0) return { m: 0, e: 0 };
  const sgn = m < 0 ? -1 : 1;
  m = Math.abs(m);
  while (m >= 10) { m /= 10; e++; }
  while (m < 1)   { m *= 10; e--; }
  return { m: m * sgn, e: e };
}
const N    = (v) => (typeof v === 'object' && v !== null ? v : (v === 0 ? { m: 0, e: 0 } : norm(v, 0)));
const add  = (a, b) => {
  a = N(a); b = N(b);
  if (a.m === 0) return b;
  if (b.m === 0) return a;
  if (a.e > b.e) { const d = a.e - b.e; if (d > 17) return a; return norm(a.m + b.m / Math.pow(10, d), a.e); }
  if (b.e > a.e) { const d = b.e - a.e; if (d > 17) return b; return norm(b.m + a.m / Math.pow(10, d), b.e); }
  return norm(a.m + b.m, a.e);
};
const mul  = (a, b) => { a = N(a); b = N(b); return (a.m === 0 || b.m === 0) ? { m: 0, e: 0 } : norm(a.m * b.m, a.e + b.e); };
const cmp  = (a, b) => {
  a = N(a); b = N(b);
  if (a.m === 0 && b.m === 0) return 0;
  if (a.m === 0) return -1;
  if (b.m === 0) return 1;
  if (a.e !== b.e) return a.e < b.e ? -1 : 1;
  return a.m < b.m ? -1 : (a.m > b.m ? 1 : 0);
};
const gte  = (a, b) => cmp(a, b) >= 0;
const val  = (a) => { a = N(a); return a.m === 0 ? 0 : a.m * Math.pow(10, a.e); };
const fromNum = (x) => (x === 0 ? { m: 0, e: 0 } : norm(x, 0));

const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
function fmt(a) {
  a = N(a);
  if (a.m === 0) return '0';
  if (a.e < 3) {
    const v = a.m * Math.pow(10, a.e);
    return v < 1000 ? v.toFixed(2).replace(/\.00$/, '') : Math.round(v).toLocaleString('en-MY');
  }
  if (a.e < 33) {
    const i = Math.floor(a.e / 3);
    const v = a.m * Math.pow(10, a.e % 3);
    return v.toFixed(2) + ' ' + SUF[i];
  }
  return a.m.toFixed(2) + 'e' + a.e;
}
const fmtRM = (a) => 'RM ' + fmt(a);

/* ---------------- content ---------------- */
const COST_MULT = 1.15;
const CLICK_BASE = 0.05;
const OFFLINE_CAP_HOURS = 8;
const OFFLINE_RATE = 0.5;
const P1_UNLOCK = 1e7;
const P2_UNLOCK_TOKENS = 100;

const BUILDINGS = [
  { id: 'cerek',    name: 'Cerek Air Panas',     nameEn: 'Kettle',           base: 0.25,    cps: 0.02,
    en: 'Old aluminium kettle. Where every kopi begins.',
    bm: 'Cerek aluminium lama. Di sinilah setiap kopi bermula.' },
  { id: 'tapis',    name: 'Tapis Kopi',          nameEn: 'Cloth Filter',     base: 1.5,     cps: 0.15,
    en: 'Cloth filter. Makes the kopi thicker and stronger.',
    bm: 'Kain tapis. Buat kopi lebih kaw dan pekat.' },
  { id: 'mesin',    name: 'Mesin Kopi Lama',     nameEn: 'Coffee Machine',   base: 18,      cps: 1.2,
    en: 'Loud motor, still great coffee.',
    bm: 'Motor bising, kopi tetap sedap.' },
  { id: 'roti',     name: 'Dapur Roti Canai',    nameEn: 'Roti Canai Griddle', base: 220,   cps: 8,
    en: 'The morning crowd magnet.',
    bm: 'Tarikan utama setiap pagi.' },
  { id: 'tetap',    name: 'Pelanggan Tetap',     nameEn: 'Loyal Regulars',   base: 2600,    cps: 55,
    en: 'They come even in heavy rain.',
    bm: 'Mereka datang walaupun hujan lebat.' },
  { id: 'rider',    name: 'Rider Penghantaran',  nameEn: 'Delivery Rider',   base: 32000,   cps: 400,
    en: 'Coffee to the office in 30 minutes.',
    bm: 'Kopi sampai ke ofis dalam 30 minit.' },
  { id: 'cawangan', name: 'Cawangan Warung',     nameEn: 'Branch Outlet',    base: 450000,  cps: 3200,
    en: 'Another shop at the end of the road.',
    bm: 'Satu lagi kedai di hujung jalan.' },
  { id: 'francais', name: 'Francais Kebangsaan', nameEn: 'National Franchise', base: 7.5e6, cps: 26000,
    en: 'Your kopitiam in every state.',
    bm: 'Kopitiam anda di setiap negeri.' },
];

const ACHIEVEMENTS = [
  { id: 'first_click', en: 'First Brew',           bm: 'Bancuhan Pertama',      ok: s => s.clicks >= 1,      p: s => [s.clicks, 1] },
  { id: 'click_100',   en: '100 Brews',            bm: '100 Bancuhan',          ok: s => s.clicks >= 100,    p: s => [s.clicks, 100] },
  { id: 'click_1000',  en: '1,000 Brews',          bm: '1,000 Bancuhan',        ok: s => s.clicks >= 1000,   p: s => [s.clicks, 1000] },
  { id: 'b_cerek',     en: 'First Kettle',         bm: 'Cerek Pertama',         ok: s => s.counts.cerek >= 1,  p: s => [s.counts.cerek, 1] },
  { id: 'b_cerek_50',  en: '50 Kettles',           bm: '50 Cerek',              ok: s => s.counts.cerek >= 50, p: s => [s.counts.cerek, 50] },
  { id: 'b_tapis',     en: 'Cloth Filter',         bm: 'Tapis Kopi',            ok: s => s.counts.tapis >= 1,  p: s => [s.counts.tapis, 1] },
  { id: 'b_mesin',     en: 'Coffee Machine',       bm: 'Mesin Kopi',            ok: s => s.counts.mesin >= 1,  p: s => [s.counts.mesin, 1] },
  { id: 'b_roti',      en: 'Roti Canai Griddle',   bm: 'Dapur Roti Canai',      ok: s => s.counts.roti >= 1,   p: s => [s.counts.roti, 1] },
  { id: 'b_tetap',     en: 'Loyal Regulars',       bm: 'Pelanggan Tetap',       ok: s => s.counts.tetap >= 1,  p: s => [s.counts.tetap, 1] },
  { id: 'b_rider',     en: 'Delivery Rider',       bm: 'Rider Penghantaran',    ok: s => s.counts.rider >= 1,  p: s => [s.counts.rider, 1] },
  { id: 'b_cawangan',  en: 'Branch Outlet',        bm: 'Cawangan Kedua',        ok: s => s.counts.cawangan >= 1, p: s => [s.counts.cawangan, 1] },
  { id: 'b_francais',  en: 'National Franchise',   bm: 'Francais Kebangsaan',   ok: s => s.counts.francais >= 1, p: s => [s.counts.francais, 1] },
  { id: 'earn_1k',     en: 'RM 1,000 Earned',      bm: 'RM 1,000 Diperoleh',    ok: s => s.lifetime.e >= 3,  p: s => [Math.min(val(s.lifetime), 1000), 1000] },
  { id: 'earn_1m',     en: 'RM 1,000,000',         bm: 'RM 1 Juta',             ok: s => s.lifetime.e >= 6,  p: s => [Math.min(val(s.lifetime), 1000000), 1000000] },
  { id: 'p1_first',    en: 'First Balik Kampung',  bm: 'Balik Kampung Pertama', ok: s => s.prestiges >= 1,   p: s => [s.prestiges, 1] },
  { id: 'p1_five',     en: '5x Balik Kampung',     bm: '5x Balik Kampung',      ok: s => s.prestiges >= 5,   p: s => [s.prestiges, 5] },
  { id: 'all_types',   en: 'Full Menu',            bm: 'Menu Penuh',            ok: s => BUILDINGS.every(b => s.counts[b.id] >= 1), p: s => [BUILDINGS.filter(b => s.counts[b.id] >= 1).length, BUILDINGS.length] },
  { id: 'tokens_100',  en: '100 Warung Tokens',    bm: '100 Warung Token',      ok: s => s.tokens >= 100,    p: s => [s.tokens, 100] },
  { id: 'star_1',      en: 'First Franchise Star', bm: 'Bintang Francais',      ok: s => s.bintang >= 1,     p: s => [s.bintang, 1] },
];

/* ---------------- i18n ---------------- */
const T = {
  en: {
    tagline: 'Small warung, big dreams 🇲🇾',
    rateUnit: 'RM / sec', brew: 'BREW KOPI', notice: 'Notice Board',
    shop: 'Equipment & Outlets', buy: 'BUY',
    tabShop: 'Shop', tabAch: 'Achievements', tabStats: 'Stats', tabSet: 'Settings',
    achTitle: 'Achievements', achSub: 'Each achievement gives a permanent +1% to all earnings.',
    achDone: 'Unlocked', achNot: 'Locked',
    statsTitle: 'Statistics',
    sMoney: 'Cash on hand', sRate: 'Income', sLifetime: 'Earned this run',
    sClick: 'Click value', sTokens: 'Warung Tokens', sStars: 'Franchise Stars',
    sMult: 'Total multiplier', sAch: 'Achievements', sBuildings: 'Buildings owned',
    sPrestiges: 'Prestiges', sPlaytime: 'Played', sClicks: 'Total clicks',
    setTitle: 'Settings', langTitle: 'Language', langSub: 'English is the default. Bahasa Melayu available.',
    soundTitle: 'Sound', soundSub: 'Synthesised kopitiam sounds, no audio files.',
    saveTitle: 'Save & backup', saveSub: 'Auto-saves every 5 seconds in this browser.',
    resetTitle: 'Reset everything', resetSub: 'Wipes all progress including prestige layers.',
    save: 'Save', export: 'Export', import: 'Import', reset: 'Reset',
    p1: 'Balik Kampung', p2: 'Franchise Expansion',
    p1Locked: 'Earn RM 10.00M lifetime to unlock.',
    p2Locked: 'Reach 100 Warung Tokens to unlock.',
    p1Ready: (g, tk) => 'Convert to ' + g + ' Warung Token (+' + (g * 10).toFixed(0) + '% earnings). You have ' + tk + '.',
    p2Ready: (g) => 'Spend all Warung Tokens for ' + g + ' Franchise Star (+50% each, forever).',
    p1Btn: 'Balik Kampung', p2Btn: 'Expand Franchise',
    confirm1: (g) => 'Balik Kampung?\n\nAll cash and equipment reset. You gain ' + g + ' Warung Token (+' + (g * 10) + '% forever).',
    confirm2: (g) => 'Expand franchise?\n\nAll Warung Tokens are spent. You gain ' + g + ' Franchise Star (+' + (g * 50) + '% forever, and faster token gain).',
    toastAch: (n) => 'Achievement unlocked: ' + n + ' (+1% earnings)',
    achKicker: 'Achievement unlocked', achSub: '+1% earnings, permanently',
    toastSave: 'Saved.', toastWelcome: 'Welcome. Click the cup to brew kopi.',
    toastBack: (g) => 'Welcome back! While away: +' + g,
    toastP1: (g) => 'Balik kampung! +' + g + ' Warung Token',
    toastP2: (g) => 'Franchise expanded! +' + g + ' Star',
  },
  bm: {
    tagline: 'Warung kecil, impian besar 🇲🇾',
    rateUnit: 'RM / saat', brew: 'BANCUH KOPI', notice: 'Papan Notis',
    shop: 'Peralatan & Kedai', buy: 'BELI',
    tabShop: 'Kedai', tabAch: 'Pencapaian', tabStats: 'Statistik', tabSet: 'Tetapan',
    achTitle: 'Pencapaian', achSub: 'Setiap pencapaian memberi +1% kekal kepada semua pendapatan.',
    achDone: 'Dibuka', achNot: 'Belum',
    statsTitle: 'Statistik',
    sMoney: 'Tunai di tangan', sRate: 'Pendapatan', sLifetime: 'Diperoleh pusingan ini',
    sClick: 'Nilai klik', sTokens: 'Warung Token', sStars: 'Bintang Francais',
    sMult: 'Pengganda keseluruhan', sAch: 'Pencapaian', sBuildings: 'Bangunan dimiliki',
    sPrestiges: 'Prestij', sPlaytime: 'Masa bermain', sClicks: 'Jumlah klik',
    setTitle: 'Tetapan', langTitle: 'Bahasa', langSub: 'Inggeris ialah lalai. Bahasa Melayu tersedia.',
    soundTitle: 'Bunyi', soundSub: 'Bunyi kopitiam disintesis, tiada fail audio.',
    saveTitle: 'Simpan & sandaran', saveSub: 'Auto-simpan setiap 5 saat dalam pelayar ini.',
    resetTitle: 'Set semula semua', resetSub: 'Padam semua kemajuan termasuk lapisan prestij.',
    save: 'Simpan', export: 'Eksport', import: 'Import', reset: 'Set Semula',
    p1: 'Balik Kampung', p2: 'Buka Francais',
    p1Locked: 'Kumpul RM 10.00J seumur hidup untuk buka.',
    p2Locked: 'Dapatkan 100 Warung Token untuk buka.',
    p1Ready: (g, tk) => 'Tukar kepada ' + g + ' Warung Token (+' + (g * 10).toFixed(0) + '% pendapatan). Anda ada ' + tk + '.',
    p2Ready: (g) => 'Guna semua Warung Token untuk ' + g + ' Bintang Francais (+50% setiap satu, kekal).',
    p1Btn: 'Balik Kampung', p2Btn: 'Buka Francais',
    confirm1: (g) => 'Balik kampung?\n\nSemua tunai dan peralatan direset. Anda dapat ' + g + ' Warung Token (+' + (g * 10) + '% kekal).',
    confirm2: (g) => 'Buka francais?\n\nSemua Warung Token digunakan. Anda dapat ' + g + ' Bintang Francais (+' + (g * 50) + '% kekal, dan token lebih cepat).',
    toastAch: (n) => 'Pencapaian dibuka: ' + n + ' (+1% pendapatan)',
    achKicker: 'Pencapaian dibuka', achSub: '+1% pendapatan, kekal',
    toastSave: 'Disimpan.', toastWelcome: 'Selamat datang. Klik cawan untuk bancuh kopi.',
    toastBack: (g) => 'Selamat kembali! Semasa tiada: +' + g,
    toastP1: (g) => 'Balik kampung! +' + g + ' Warung Token',
    toastP2: (g) => 'Francais dibuka! +' + g + ' Bintang',
  },
};

/* ---------------- state ---------------- */
const VERSION = '2026.11.15-5';
const SAVE_KEY = 'kopitiam-kosong-v2';
const OLD_KEY = 'kopitiam-kosong-v1';

let S = {
  money: { m: 0, e: 0 },
  lifetime: { m: 0, e: 0 },
  clicks: 0,
  tokens: 0,
  bintang: 0,
  prestiges: 0,
  ach: {},
  soundOn: true,
  lang: 'en',
  startedAt: Date.now(),
  lastSeen: Date.now(),
  counts: {},
};
BUILDINGS.forEach(b => { S.counts[b.id] = 0; });

let buyAmount = 1;
let hardReset = false;
let lastFrame = performance.now();
let saveTimer = 0;
const t = () => T[S.lang] || T.en;

/* ---------------- derived ---------------- */
function achCount() { return ACHIEVEMENTS.filter(a => S.ach[a.id]).length; }
function mult() {
  return (1 + S.tokens * 0.1) * (1 + S.bintang * 0.5) * (1 + achCount() * 0.01);
}
function clickPower() { return fromNum((CLICK_BASE + S.clicks * 0.0005) * mult()); }
function cps() {
  let total = 0;
  for (const b of BUILDINGS) total += (S.counts[b.id] || 0) * b.cps;
  return mul(fromNum(total), fromNum(mult()));
}
function costFor(b, from, n) {
  const factor = (Math.pow(COST_MULT, n) - 1) / (COST_MULT - 1);
  return fromNum(b.base * Math.pow(COST_MULT, from) * factor);
}
function maxAffordable(b) {
  const have = val(S.money);
  const base = b.base * Math.pow(COST_MULT, (S.counts[b.id] || 0));
  const k = Math.log((have * (COST_MULT - 1)) / base + 1) / Math.log(COST_MULT);
  if (!isFinite(k) || k <= 0) return 0;
  return Math.min(Math.floor(k), 100000);
}
function p1Gain() {
  if (cmp(S.lifetime, fromNum(P1_UNLOCK)) < 0) return 0;
  const g = Math.floor((S.lifetime.e - 7) * 5 + 1) * (1 + S.bintang * 0.25);
  return Math.max(1, Math.floor(g));
}
function p2Gain() {
  if (S.tokens < P2_UNLOCK_TOKENS) return 0;
  return Math.max(1, Math.floor(Math.sqrt(S.tokens / P2_UNLOCK_TOKENS)));
}

/* ---------------- audio ---------------- */
let AC = null, MASTER = null, NOISE = null;

function audio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      MASTER = AC.createGain();
      MASTER.gain.value = 0.75;
      MASTER.connect(AC.destination);
    } catch (e) { AC = null; }
  }
  if (AC && AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
  return AC;
}

function noiseBuffer() {
  if (!NOISE && AC) {
    const len = Math.floor(AC.sampleRate * 1.2);
    const buf = AC.createBuffer(1, len, AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    NOISE = buf;
  }
  return NOISE;
}

function tone(o) {
  if (!S.soundOn) return;
  const ac = audio(); if (!ac) return;
  const t0 = ac.currentTime + (o.delay || 0);
  const dur = o.dur || 0.15;
  const osc = ac.createOscillator(), g = ac.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain || 0.05, t0 + (o.attack || 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(MASTER);
  osc.start(t0); osc.stop(t0 + dur + 0.03);
}

function hiss(o) {
  if (!S.soundOn) return;
  const ac = audio(); if (!ac) return;
  const buf = noiseBuffer(); if (!buf) return;
  const t0 = ac.currentTime + (o.delay || 0);
  const dur = o.dur || 0.2;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const flt = ac.createBiquadFilter();
  flt.type = o.filter || 'bandpass';
  flt.frequency.setValueAtTime(o.freq || 1200, t0);
  if (o.sweepTo) flt.frequency.exponentialRampToValueAtTime(Math.max(40, o.sweepTo), t0 + dur);
  flt.Q.value = o.q || 1;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain || 0.05, t0 + (o.attack || 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(flt); flt.connect(g); g.connect(MASTER);
  src.start(t0); src.stop(t0 + dur + 0.02);
}

/* each purchase gets its own voice */
const SFX = {
  // brewing: water into the cup + ceramic clink
  brew: function () {
    hiss({ dur: 0.30, filter: 'bandpass', freq: 1500, sweepTo: 420, q: 0.8, gain: 0.055, attack: 0.02 });
    tone({ freq: 240, slideTo: 150, dur: 0.10, type: 'sine', gain: 0.05, delay: 0.02 });
    tone({ freq: 1900, dur: 0.05, type: 'triangle', gain: 0.018, delay: 0.05 });
  },
  // kettle: metallic tap + short steam
  cerek: function () {
    tone({ freq: 1650, slideTo: 900, dur: 0.13, type: 'triangle', gain: 0.055 });
    tone({ freq: 2350, dur: 0.07, type: 'sine', gain: 0.025, delay: 0.01 });
    hiss({ dur: 0.22, filter: 'highpass', freq: 3200, gain: 0.02, delay: 0.05 });
  },
  // cloth filter: soft cloth swoosh, low and muffled
  tapis: function () {
    hiss({ dur: 0.26, filter: 'lowpass', freq: 1400, sweepTo: 520, q: 0.7, gain: 0.06, attack: 0.03 });
    tone({ freq: 180, dur: 0.09, type: 'sine', gain: 0.02, delay: 0.03 });
  },
  // coffee machine: motor growl + steam burst
  mesin: function () {
    tone({ freq: 95, slideTo: 70, dur: 0.28, type: 'sawtooth', gain: 0.045 });
    tone({ freq: 190, slideTo: 140, dur: 0.24, type: 'square', gain: 0.018, delay: 0.02 });
    hiss({ dur: 0.30, filter: 'highpass', freq: 2600, gain: 0.03, delay: 0.12 });
  },
  // roti canai griddle: hot sizzle
  roti: function () {
    hiss({ dur: 0.38, filter: 'highpass', freq: 2200, sweepTo: 4200, q: 0.6, gain: 0.045, attack: 0.015 });
    hiss({ dur: 0.22, filter: 'bandpass', freq: 3400, q: 2, gain: 0.025, delay: 0.10 });
    tone({ freq: 120, dur: 0.12, type: 'sine', gain: 0.02, delay: 0.02 });
  },
  // loyal regulars: two voices chatting
  tetap: function () {
    tone({ freq: 430, slideTo: 500, dur: 0.09, type: 'sine', gain: 0.035 });
    tone({ freq: 560, slideTo: 640, dur: 0.10, type: 'sine', gain: 0.03, delay: 0.11 });
    tone({ freq: 470, slideTo: 400, dur: 0.08, type: 'sine', gain: 0.022, delay: 0.22 });
  },
  // delivery rider: scooter horn, two beeps
  rider: function () {
    tone({ freq: 880, dur: 0.09, type: 'square', gain: 0.035 });
    tone({ freq: 880, dur: 0.09, type: 'square', gain: 0.035, delay: 0.14 });
    hiss({ dur: 0.3, filter: 'lowpass', freq: 900, gain: 0.02, delay: 0.05 });
  },
  // new branch: cash register ka-ching
  cawangan: function () {
    tone({ freq: 1200, dur: 0.10, type: 'triangle', gain: 0.045 });
    tone({ freq: 1750, dur: 0.16, type: 'triangle', gain: 0.04, delay: 0.08 });
    tone({ freq: 2350, dur: 0.12, type: 'sine', gain: 0.022, delay: 0.14 });
  },
  // national franchise: little fanfare
  francais: function () {
    [523, 659, 784, 1046].forEach(function (f, i) {
      tone({ freq: f, dur: 0.24, type: 'triangle', gain: 0.045, delay: i * 0.10 });
    });
  },
};

const sfxFor = function (id) { const f = SFX[id] || SFX.cerek; try { f(); } catch (e) {} };
const sfxAch  = () => { [659, 880, 1046].forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.18, type: 'sine', gain: 0.06 }), i * 90)); };
const sfxP1   = () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.22, type: 'sine', gain: 0.07 }), i * 130)); };
const sfxP2   = () => { [392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.26, type: 'sine', gain: 0.07 }), i * 110)); };
const sfxTap  = () => tone({ freq: 700, dur: 0.05, type: 'sine', gain: 0.02 });

/* ---------------- ui utils ---------------- */
const $ = (id) => document.getElementById(id);
let toastBusy = false, toastQueue = [];
function toast(msg) {
  toastQueue.push(msg);
  if (toastBusy) return;
  const next = () => {
    const m = toastQueue.shift();
    if (!m) { toastBusy = false; return; }
    toastBusy = true;
    const el = $('toast');
    el.textContent = m;
    el.classList.add('show');
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(next, 220);
    }, 2000);
  };
  next();
}
function floaty(x, y, text) {
  const d = document.createElement('div');
  d.className = 'floaty';
  d.textContent = text;
  d.style.left = x + 'px';
  d.style.top = y + 'px';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 900);
}

/* ---------------- actions ---------------- */
function brew(ev) {
  const g = clickPower();
  S.money = add(S.money, g);
  S.lifetime = add(S.lifetime, g);
  S.clicks++;
  SFX.brew();
  if (ev) floaty(ev.clientX, ev.clientY, '+' + fmtRM(g));
  checkAchievements();
  render();
}

function buy(b, n) {
  if (n === 'max') n = maxAffordable(b);
  if (!n || n <= 0) return;
  const cost = costFor(b, S.counts[b.id] || 0, n);
  if (!gte(S.money, cost)) return;
  S.money = add(S.money, mul(cost, fromNum(-1)));
  S.counts[b.id] = (S.counts[b.id] || 0) + n;
  sfxFor(b.id);
  checkAchievements();
  render();
}

function doP1() {
  const g = p1Gain();
  if (g <= 0) return;
  S.tokens += g;
  S.prestiges++;
  S.money = { m: 0, e: 0 };
  S.lifetime = { m: 0, e: 0 };
  BUILDINGS.forEach(b => S.counts[b.id] = 0);
  sfxP1(); toast(t().toastP1(g)); checkAchievements(); render(); save();
}

function doP2() {
  const g = p2Gain();
  if (g <= 0) return;
  S.bintang += g;
  S.tokens = 0;
  S.money = { m: 0, e: 0 };
  S.lifetime = { m: 0, e: 0 };
  BUILDINGS.forEach(b => S.counts[b.id] = 0);
  sfxP2(); toast(t().toastP2(g)); checkAchievements(); render(); save();
}

let achQ = [], achUp = false;

function sparks() {
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  for (let i = 0; i < 16; i++) {
    const sp = document.createElement('div');
    sp.className = 'spark';
    const ang = Math.random() * Math.PI * 2;
    const dist = 110 + Math.random() * 150;
    sp.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(0) + 'px');
    sp.style.setProperty('--dy', (Math.sin(ang) * dist).toFixed(0) + 'px');
    sp.style.left = cx + 'px';
    sp.style.top = cy + 'px';
    document.body.appendChild(sp);
    setTimeout(function () { sp.remove(); }, 1000);
  }
}

function queueAch(a) {
  achQ.push(a);
  if (!achUp) nextAch();
}

function nextAch() {
  const a = achQ.shift();
  if (!a) { achUp = false; return; }
  achUp = true;
  const pop = $('achPop');
  $('achKicker').textContent = t().achKicker;
  $('achPopTitle').textContent = (S.lang === 'bm' ? a.bm : a.en);
  $('achPopSub').textContent = t().achSub;
  pop.classList.add('show');
  sfxAch();
  sparks();
  setTimeout(function () {
    pop.classList.remove('show');
    setTimeout(nextAch, 430);
  }, 2400);
}

function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!S.ach[a.id] && a.ok(S)) {
      S.ach[a.id] = true;
      queueAch(a);
    }
  }
}

/* ---------------- persistence ---------------- */
function save() {
  if (hardReset) return;
  S.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
}

function load() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_KEY); } catch (e) { return false; }
  if (!raw) return false;
  try {
    const d = JSON.parse(raw);
    S.money = N(d.money); S.lifetime = N(d.lifetime);
    S.clicks = d.clicks | 0; S.tokens = d.tokens | 0;
    S.bintang = d.bintang | 0; S.prestiges = d.prestiges | 0;
    S.soundOn = d.soundOn !== false;
    S.lang = (d.lang === 'bm') ? 'bm' : 'en';
    S.ach = d.ach || {};
    S.startedAt = d.startedAt || Date.now();
    S.counts = Object.assign({}, d.counts);
    BUILDINGS.forEach(b => { S.counts[b.id] = S.counts[b.id] | 0; });

    let isOld = false;
    try { isOld = !localStorage.getItem(SAVE_KEY); } catch (e) {}
    if (isOld) {
      S.money = fromNum(val(S.money) / 100);
      S.lifetime = fromNum(val(S.lifetime) / 100);
    }

    const elapsed = Math.max(0, (Date.now() - (d.lastSeen || Date.now())) / 1000);
    const capped = Math.min(elapsed, OFFLINE_CAP_HOURS * 3600);
    if (capped > 60) {
      const gain = mul(cps(), fromNum(capped * OFFLINE_RATE));
      S.money = add(S.money, gain);
      S.lifetime = add(S.lifetime, gain);
      setTimeout(() => toast(t().toastBack(fmtRM(gain))), 500);
    }
    return true;
  } catch (e) { return false; }
}

/* ---------------- render ---------------- */
function buildShop() {
  const wrap = $('shopList');
  wrap.innerHTML = '';
  BUILDINGS.forEach((b) => {
    const el = document.createElement('div');
    el.className = 'item';
    el.id = 'item-' + b.id;
    el.innerHTML =
      '<div>' +
        '<div class="name">' + (S.lang === 'bm' ? b.name : b.nameEn) + '</div>' +
        '<div class="sub" id="sub-' + b.id + '">' + (S.lang === 'bm' ? b.bm : b.en) + '</div>' +
        '<div class="cost" id="cost-' + b.id + '">—</div>' +
      '</div>' +
      '<div class="owned" id="own-' + b.id + '">0</div>' +
      '<button class="buybtn" id="buy-' + b.id + '">' + t().buy + '</button>';
    el.querySelector('.buybtn').addEventListener('click', function () { buy(b, buyAmount); });
    wrap.appendChild(el);
  });
}

function renderShop() {
  BUILDINGS.forEach((b, i) => {
    const owned = S.counts[b.id] || 0;
    const amount = buyAmount === 'max' ? Math.max(1, maxAffordable(b)) : buyAmount;
    const cost = costFor(b, owned, amount);
    const afford = gte(S.money, cost);
    const el = $('item-' + b.id);
    if (!el) return;
    $('own-' + b.id).textContent = owned.toLocaleString('en-MY');
    $('cost-' + b.id).textContent = fmtRM(cost) + (buyAmount === 'max' ? ' · MAX' : '');
    el.classList.toggle('afford', afford);
    el.classList.toggle('locked', i > 0 && owned === 0 && !gte(S.money, fromNum(b.base * 0.2)));
    el.querySelector('.buybtn').disabled = !afford;
  });
}

let achSig = '';
function achSignature() {
  return S.lang + '|' + ACHIEVEMENTS.map(function (a) { return S.ach[a.id] ? '1' : '0'; }).join('');
}
function updateAchBadge() {
  const badge = $('achBadge');
  if (badge) badge.textContent = achCount() + '/' + ACHIEVEMENTS.length;
}

function renderAch() {
  achSig = achSignature();
  $('achList').innerHTML = ACHIEVEMENTS.map(function (a) {
    const done = !!S.ach[a.id];
    return '<div class="ach ' + (done ? 'done' : '') + '">' +
      '<div class="t">' + (S.lang === 'bm' ? a.bm : a.en) + '</div>' +
      '<div class="d">+1% ' + (S.lang === 'bm' ? 'pendapatan' : 'earnings') + '</div>' +
      '<div class="st">' + (done ? '✓ ' + t().achDone : t().achNot) + '</div>' +
    '</div>';
  }).join('');
  updateAchBadge();
}

function playtime() {
  let s = Math.floor((Date.now() - (S.startedAt || Date.now())) / 1000);
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  return d + 'd ' + h + 'h ' + m + 'm';
}

function renderStats() {
  const rows = [
    [t().sMoney, fmtRM(S.money)],
    [t().sRate, fmtRM(cps()) + ' /s'],
    [t().sLifetime, fmtRM(S.lifetime)],
    [t().sClick, fmtRM(clickPower())],
    [t().sTokens, S.tokens.toLocaleString('en-MY')],
    [t().sStars, S.bintang.toLocaleString('en-MY')],
    [t().sMult, 'x' + mult().toFixed(2)],
    [t().sAch, achCount() + '/' + ACHIEVEMENTS.length + ' (+' + achCount() + '%)'],
    [t().sBuildings, BUILDINGS.reduce(function (n, b) { return n + (S.counts[b.id] || 0); }, 0).toLocaleString('en-MY')],
    [t().sPrestiges, String(S.prestiges)],
    [t().sClicks, S.clicks.toLocaleString('en-MY')],
    [t().sPlaytime, playtime()],
  ];
  $('statGrid').innerHTML = rows.map(function (r) {
    return '<div class="stat"><div class="k">' + r[0] + '</div><div class="v">' + r[1] + '</div></div>';
  }).join('');
}

function renderPrestige() {
  const g1 = p1Gain();
  $('prestigeInfo').textContent = g1 > 0
    ? t().p1Ready(g1, S.tokens)
    : t().p1Locked + ' (' + t().sTokens + ': ' + S.tokens + ')';
  $('prestigeBtn').disabled = g1 <= 0;
  $('prestigeBtn').textContent = g1 > 0 ? t().p1Btn + ' (+' + g1 + ')' : t().p1Btn;

  const g2 = p2Gain();
  $('prestige2Info').textContent = g2 > 0
    ? t().p2Ready(g2)
    : t().p2Locked + ' (' + t().sTokens + ': ' + S.tokens + ')';
  $('prestige2Btn').disabled = g2 <= 0;
  $('prestige2Btn').textContent = g2 > 0 ? t().p2Btn + ' (+' + g2 + ')' : t().p2Btn;
}

function renderNotices() {
  const next = ACHIEVEMENTS.filter(function (a) { return !S.ach[a.id]; }).slice(0, 4);
  const fmtn = function (x) { return x >= 10000 ? fmt(fromNum(x)) : Math.round(x).toLocaleString('en-MY'); };
  $('milestones').innerHTML = next.length
    ? next.map(function (a) {
        const pr = a.p ? a.p(S) : [0, 1];
        const pct = Math.max(0, Math.min(100, (pr[0] / Math.max(pr[1], 0.0001)) * 100));
        return '<li class="notice">' +
          '<div class="nrow"><span>' + (S.lang === 'bm' ? a.bm : a.en) + '</span>' +
          '<span class="nnum">' + fmtn(pr[0]) + ' / ' + fmtn(pr[1]) + '</span></div>' +
          '<div class="nbar"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
        '</li>';
      }).join('')
    : '<li>' + (S.lang === 'bm' ? 'Semua pencapaian dibuka!' : 'All achievements unlocked!') + '</li>';
}

function render() {
  $('money').textContent = fmtRM(S.money);
  $('cps').textContent = fmt(cps());
  $('clickGain').textContent = '+ ' + fmtRM(clickPower());
  renderShop();
  renderPrestige();
  renderNotices();
  updateAchBadge();
  if ($('panel-achievements').classList.contains('active') && achSignature() !== achSig) renderAch();
  if ($('panel-stats').classList.contains('active')) renderStats();
}

function applyLang() {
  const d = t();
  document.documentElement.lang = S.lang;
  $('tagline').textContent = d.tagline;
  $('rateUnit').textContent = d.rateUnit;
  $('brewLabel').textContent = d.brew;
  $('noticeTitle').textContent = d.notice;
  $('shopTitle').textContent = d.shop;
  $('tabShop').textContent = d.tabShop;
  $('tabAch').innerHTML = d.tabAch + ' <span class="badge" id="achBadge">' + achCount() + '/' + ACHIEVEMENTS.length + '</span>';
  $('tabStats').textContent = d.tabStats;
  $('tabSet').textContent = d.tabSet;
  $('achTitle').textContent = d.achTitle;
  $('achSub').textContent = d.achSub;
  $('statsTitle').textContent = d.statsTitle;
  $('setTitle').textContent = d.setTitle;
  $('langTitle').textContent = d.langTitle;
  $('langSub').textContent = d.langSub;
  $('soundTitle').textContent = d.soundTitle;
  $('soundSub').textContent = d.soundSub;
  $('saveTitle').textContent = d.saveTitle;
  $('saveSub').textContent = d.saveSub;
  $('resetTitle').textContent = d.resetTitle;
  $('resetSub').textContent = d.resetSub;
  $('saveBtn').textContent = d.save;
  $('exportBtn').textContent = d.export;
  $('importBtn').textContent = d.import;
  $('resetBtn').textContent = d.reset;
  $('p1Title').textContent = d.p1;
  $('p2Title').textContent = d.p2;
  $('langBtn').textContent = S.lang === 'en' ? 'EN' : 'BM';
  const vl = $('verLine');
  if (vl) vl.textContent = 'Kopi Kosong Empire · build ' + VERSION + (S.lang === 'bm' ? ' · muat semula (Ctrl+F5) jika tidak berubah' : ' · press Ctrl+F5 if something looks stale');
  document.querySelectorAll('#langSeg button').forEach(function (b) {
    b.classList.toggle('active', b.dataset.lang === S.lang);
  });
  buildShop();
  render();
}

/* ---------------- loop ---------------- */
function loop(now) {
  const dt = Math.min((now - lastFrame) / 1000, 1.0);
  lastFrame = now;
  const gain = mul(cps(), fromNum(dt));
  if (gain.m !== 0) {
    S.money = add(S.money, gain);
    S.lifetime = add(S.lifetime, gain);
  }
  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; save(); checkAchievements(); }
  render();
  requestAnimationFrame(loop);
}

/* ---------------- wiring ---------------- */
function init() {
  const hadSave = load();
  applyLang();

  $('brewBtn').addEventListener('click', function (e) { audio(); brew(e); });

  $('buymode').addEventListener('click', function (e) {
    const btn = e.target.closest('button'); if (!btn) return;
    document.querySelectorAll('#buymode button').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    buyAmount = btn.dataset.n === 'max' ? 'max' : parseInt(btn.dataset.n, 10);
    render();
  });

  $('tabs').addEventListener('click', function (e) {
    const btn = e.target.closest('button'); if (!btn) return;
    document.querySelectorAll('#tabs button').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
    $('panel-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'achievements') renderAch();
    if (btn.dataset.tab === 'stats') renderStats();
    sfxTap();
  });

  $('prestigeBtn').addEventListener('click', function () {
    const g = p1Gain(); if (g <= 0) return;
    if (confirm(t().confirm1(g))) doP1();
  });
  $('prestige2Btn').addEventListener('click', function () {
    const g = p2Gain(); if (g <= 0) return;
    if (confirm(t().confirm2(g))) doP2();
  });

  $('langBtn').addEventListener('click', function () {
    S.lang = S.lang === 'en' ? 'bm' : 'en';
    applyLang(); save();
  });
  $('langSeg').addEventListener('click', function (e) {
    const btn = e.target.closest('button'); if (!btn) return;
    S.lang = btn.dataset.lang; applyLang(); save();
  });

  function toggleSound() {
    S.soundOn = !S.soundOn;
    $('soundBtn').textContent = S.soundOn ? '🔊' : '🔇';
    $('soundToggle').textContent = S.soundOn ? 'ON' : 'OFF';
    $('soundToggle').classList.toggle('on', S.soundOn);
    if (S.soundOn) { audio(); sfxTap(); }
    save();
  }
  $('soundBtn').addEventListener('click', toggleSound);
  $('soundToggle').addEventListener('click', toggleSound);

  $('saveBtn').addEventListener('click', function () { save(); toast(t().toastSave); });

  $('exportBtn').addEventListener('click', function () {
    save();
    const s = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    if (navigator.clipboard) navigator.clipboard.writeText(s).catch(function () {});
    prompt('Save code / Kod simpanan:', s);
  });

  $('importBtn').addEventListener('click', function () {
    const s = prompt('Paste save code:');
    if (!s) return;
    try {
      const d = JSON.parse(decodeURIComponent(escape(atob(s.trim()))));
      S = Object.assign(S, d);
      S.counts = Object.assign({}, d.counts);
      BUILDINGS.forEach(function (b) { S.counts[b.id] = S.counts[b.id] | 0; });
      applyLang(); save();
    } catch (err) { toast('Invalid save code.'); }
  });

  $('resetBtn').addEventListener('click', function () {
    const msg = S.lang === 'bm'
      ? 'Padam semua kemajuan? Tindakan ini tidak boleh dibatalkan.'
      : 'Delete all progress? This cannot be undone.';
    if (!confirm(msg)) return;
    hardReset = true;
    try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(OLD_KEY); } catch (e) {}
    location.reload();
  });

  $('soundBtn').textContent = S.soundOn ? '🔊' : '🔇';
  $('soundToggle').textContent = S.soundOn ? 'ON' : 'OFF';
  $('soundToggle').classList.toggle('on', S.soundOn);

  window.addEventListener('beforeunload', function () { if (!hardReset) save(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) save(); });

  if (!hadSave) setTimeout(function () { toast(t().toastWelcome); }, 700);

  render();
  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', init);
