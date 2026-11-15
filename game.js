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
const P1_UNLOCK = 1.2e5;
const P2_UNLOCK_TOKENS = 100;

const BUILDINGS = [
  { id: 'cerek',    name: 'Cerek Air Panas',     nameEn: 'Kettle',           base: 0.25,    cps: 0.05,
    en: 'Old aluminium kettle. Where every kopi begins.',
    bm: 'Cerek aluminium lama. Di sinilah setiap kopi bermula.' },
  { id: 'tapis',    name: 'Tapis Kopi',          nameEn: 'Cloth Filter',     base: 1.5,     cps: 0.40,
    en: 'Cloth filter. Makes the kopi thicker and stronger.',
    bm: 'Kain tapis. Buat kopi lebih kaw dan pekat.' },
  { id: 'mesin',    name: 'Mesin Kopi Lama',     nameEn: 'Coffee Machine',   base: 18,      cps: 3.0,
    en: 'Loud motor, still great coffee.',
    bm: 'Motor bising, kopi tetap sedap.' },
  { id: 'roti',     name: 'Dapur Roti Canai',    nameEn: 'Roti Canai Griddle', base: 220,   cps: 8,
    en: 'The morning crowd magnet.',
    bm: 'Tarikan utama setiap pagi.' },
  { id: 'tetap',    name: 'Pelanggan Tetap',     nameEn: 'Loyal Regulars',   base: 2600,    cps: 100,
    en: 'They come even in heavy rain.',
    bm: 'Mereka datang walaupun hujan lebat.' },
  { id: 'rider',    name: 'Rider Penghantaran',  nameEn: 'Delivery Rider',   base: 32000,   cps: 700,
    en: 'Coffee to the office in 30 minutes.',
    bm: 'Kopi sampai ke ofis dalam 30 minit.' },
  { id: 'cawangan', name: 'Cawangan Warung',     nameEn: 'Branch Outlet',    base: 450000,  cps: 5200,
    en: 'Another shop at the end of the road.',
    bm: 'Satu lagi kedai di hujung jalan.' },
  { id: 'francais', name: 'Francais Kebangsaan', nameEn: 'National Franchise', base: 7.5e6, cps: 26000,
    en: 'Your kopitiam in every state.',
    bm: 'Kopitiam anda di setiap negeri.' },
];

const ACHIEVEMENTS = [
  // ---- brew ladder (hardcore) ----
  { id: 'click_1', grp: 'brew',     en: 'First Brew',           bm: 'Bancuhan Pertama',      w: 1,    ok: s => s.clicks >= 1,      p: s => [s.clicks, 1] },
  { id: 'click_100', grp: 'brew',   en: '100 Brews',            bm: '100 Bancuhan',          w: 1,    ok: s => s.clicks >= 100,    p: s => [s.clicks, 100] },
  { id: 'click_250', grp: 'brew',   en: '250 Brews',            bm: '250 Bancuhan',          w: 1,    ok: s => s.clicks >= 250,    p: s => [s.clicks, 250] },
  { id: 'click_600', grp: 'brew',   en: '600 Brews',            bm: '600 Bancuhan',          w: 1,    ok: s => s.clicks >= 600,    p: s => [s.clicks, 600] },
  { id: 'click_1000', grp: 'brew',  en: '1,000 Brews',          bm: '1,000 Bancuhan',        w: 0.5,  ok: s => s.clicks >= 1000,   p: s => [s.clicks, 1000] },
  { id: 'click_2000', grp: 'brew',  en: '2,000 Brews',          bm: '2,000 Bancuhan',        w: 0.5,  ok: s => s.clicks >= 2000,   p: s => [s.clicks, 2000] },
  { id: 'click_5000', grp: 'brew',  en: '5,000 Brews',          bm: '5,000 Bancuhan',        w: 0.25, ok: s => s.clicks >= 5000,   p: s => [s.clicks, 5000] },
  { id: 'click_10000', grp: 'brew', en: '10,000 Brews',         bm: '10,000 Bancuhan',       w: 0.25, ok: s => s.clicks >= 10000,  p: s => [s.clicks, 10000] },

  // ---- money & prestige ----
  { id: 'earn_1k',     en: 'RM 1,000 Earned',      bm: 'RM 1,000 Diperoleh',    w: 0.5,  ok: s => s.lifetime.e >= 3,  p: s => [Math.min(val(s.lifetime), 1000), 1000] },
  { id: 'earn_1m',     en: 'RM 1,000,000',         bm: 'RM 1 Juta',             w: 0.5,  ok: s => s.lifetime.e >= 6,  p: s => [Math.min(val(s.lifetime), 1000000), 1000000] },
  { id: 'p1_first',    en: 'First Balik Kampung',  bm: 'Balik Kampung Pertama', w: 0.5,  ok: s => s.prestiges >= 1,   p: s => [s.prestiges, 1] },
  { id: 'p1_five',     en: '5x Balik Kampung',     bm: '5x Balik Kampung',      w: 0.25, ok: s => s.prestiges >= 5,   p: s => [s.prestiges, 5] },
  { id: 'all_types',   en: 'Full Menu',            bm: 'Menu Penuh',            w: 0.5,  ok: s => BUILDINGS.every(b => s.counts[b.id] >= 1), p: s => [BUILDINGS.filter(b => s.counts[b.id] >= 1).length, BUILDINGS.length] },
  { id: 'tokens_100',  en: '100 Warung Tokens',    bm: '100 Warung Token',      w: 0.25, ok: s => s.tokens >= 100,    p: s => [s.tokens, 100] },
  { id: 'star_1',      en: 'First Franchise Star', bm: 'Bintang Francais',      w: 0.25, ok: s => s.bintang >= 1,     p: s => [s.bintang, 1] },
];

/* ---- equipment tier ladders (kept short on purpose) ---- */
const EQ_TIERS = [
  ['cerek',    'Cerek',       'Kettle',            [1, 50, 250], [1, 0.5, 0.25]],
  ['tapis',    'Tapis',       'Cloth Filter',      [1, 25, 100], [1, 0.5, 0.25]],
  ['mesin',    'Mesin',       'Coffee Machine',    [1, 15, 50],  [1, 0.5, 0.25]],
  ['roti',     'Dapur Roti',  'Roti Canai Griddle',[1, 10, 40],  [1, 0.5, 0.25]],
  ['tetap',    'Pelanggan',   'Loyal Regulars',    [1, 10, 30],  [1, 0.5, 0.25]],
  ['rider',    'Rider',       'Delivery Rider',    [1, 10, 25],  [1, 0.5, 0.25]],
  ['cawangan', 'Cawangan',    'Branch Outlet',     [1, 5, 15],   [0.5, 0.25, 0.25]],
  ['francais', 'Francais',    'National Franchise',[1, 5, 10],   [0.5, 0.25, 0.25]],
];

EQ_TIERS.forEach(function (row) {
  const id = row[0], bmName = row[1], enName = row[2], tiers = row[3], weights = row[4];
  tiers.forEach(function (n, i) {
    ACHIEVEMENTS.push({
      id: 'b_' + id + '_' + n,
      grp: id,
      en: enName + ' \u00d7' + n,
      bm: bmName + ' \u00d7' + n,
      w: weights[i],
      ok: function (s) { return (s.counts[id] || 0) >= n; },
      p: function (s) { return [s.counts[id] || 0, n]; }
    });
  });
});


/* ---------------- mystic buffs & goals ---------------- */
const BUFFS = [
  { id: 'azimat',  icon: '\ud83e\uddfF', en: 'Bomoh\u2019s Charm', bm: 'Azimat Bomoh',
    baseCost: 3,  enD: '+50% click value per level',        bmD: '+50% nilai klik setiap level' },
  { id: 'toyol',   icon: '\ud83d\udc7a', en: 'Helpful Toyol',     bm: 'Toyol Penolong',
    baseCost: 5,  enD: '+10% income per level',             bmD: '+10% pendapatan setiap level' },
  { id: 'jam',     icon: '\u23f3',       en: 'Hourglass of Ages', bm: 'Jam Pasir Sakti',
    baseCost: 6,  enD: '+2 hours offline cap per level',    bmD: '+2 jam had offline setiap level' },
  { id: 'naga',    icon: '\ud83d\udc09', en: 'Coffee Dragon',     bm: 'Naga Kopi',
    baseCost: 7,  enD: '+25% offline rate per level (max 95%)', bmD: '+25% kadar offline setiap level (maks 95%)' },
  { id: 'keris',   icon: '\ud83d\udde1\ufe0f', en: 'Ancient Keris',     bm: 'Keris Tua',
    baseCost: 9,  enD: '+25% income per level',             bmD: '+25% pendapatan setiap level' },
  { id: 'bunga',   icon: '\ud83c\udf38', en: 'Kantan Flower',     bm: 'Bunga Kantan',
    baseCost: 12, enD: '+20% income per level',             bmD: '+20% pendapatan setiap level' },
  { id: 'semangat',icon: '\u2728',       en: 'Shop Spirit',       bm: 'Semangat Kedai',
    baseCost: 15, enD: '+1% of income added per click, per level', bmD: '+1% pendapatan per klik, setiap level' },
];

const BUFF_GROWTH = 1.65;   // cost multiplier per level
const BUFF_EFF = {
  azimat:  function (l) { return '+' + (l * 50) + '% click value'; },
  toyol:   function (l) { return '+' + (l * 10) + '% income'; },
  jam:     function (l) { return '+' + (l * 2) + 'h offline cap'; },
  naga:    function (l) { return '+' + Math.min(95, l * 25) + '% offline rate'; },
  keris:   function (l) { return '+' + (l * 25) + '% income'; },
  bunga:   function (l) { return '+' + (l * 20) + '% income'; },
  semangat:function (l) { return '+' + l + '% income per click'; }
};
function buffLevel(id) { return S.buffs[id] | 0; }
function buffTotal() { let n = 0; for (const b of BUFFS) n += buffLevel(b.id); return n; }
function buffCost(b) { return Math.round(b.baseCost * Math.pow(BUFF_GROWTH, buffLevel(b.id))); }


const GOALS = [
  { id: 'g_brew100',  en: 'Brew 100 cups',            bm: 'Bancuh 100 cawan',        reward: 1, ok: s => s.clicks >= 100,   p: s => [s.clicks, 100] },
  { id: 'g_rm1k',     en: 'Earn RM 1,000',            bm: 'Peroleh RM 1,000',        reward: 2, ok: s => s.lifetime.e >= 3, p: s => [Math.min(val(s.lifetime), 1000), 1000] },
  { id: 'g_k10',      en: 'Own 10 kettles',           bm: 'Miliki 10 cerek',         reward: 1, ok: s => s.counts.cerek >= 10, p: s => [s.counts.cerek, 10] },
  { id: 'g_full',     en: 'Own every building type',  bm: 'Miliki semua jenis kedai',reward: 3, ok: s => BUILDINGS.every(b => s.counts[b.id] >= 1), p: s => [BUILDINGS.filter(b => s.counts[b.id] >= 1).length, BUILDINGS.length] },
  { id: 'g_brew1k',   en: 'Brew 1,000 cups',          bm: 'Bancuh 1,000 cawan',      reward: 2, ok: s => s.clicks >= 1000,  p: s => [s.clicks, 1000] },
  { id: 'g_ach10',    en: 'Unlock 10 achievements',   bm: 'Buka 10 pencapaian',      reward: 3, ok: s => achCount() >= 10,  p: s => [achCount(), 10] },
  { id: 'g_rm100k',   en: 'Earn RM 100,000',          bm: 'Peroleh RM 100,000',      reward: 4, ok: s => s.lifetime.e >= 5, p: s => [Math.min(val(s.lifetime), 100000), 100000] },
  { id: 'g_k50',      en: 'Own 50 kettles',           bm: 'Miliki 50 cerek',         reward: 4, ok: s => s.counts.cerek >= 50, p: s => [s.counts.cerek, 50] },
  { id: 'g_tok10',    en: 'Reach 10 Warung Tokens',   bm: 'Capai 10 Warung Token',   reward: 5, ok: s => s.tokens >= 10,   p: s => [s.tokens, 10] },
  { id: 'g_rm10m',    en: 'Earn RM 10 million',       bm: 'Peroleh RM 10 juta',      reward: 6, ok: s => s.lifetime.e >= 7, p: s => [Math.min(val(s.lifetime), 1e7), 1e7] },

  // ---- extended set ----
  { id: 'g_brew2500', en: 'Brew 2,500 cups',          bm: 'Bancuh 2,500 cawan',      reward: 5, ok: s => s.clicks >= 2500, p: s => [s.clicks, 2500] },
  { id: 'g_k100',     en: 'Own 100 kettles',          bm: 'Miliki 100 cerek',        reward: 5, ok: s => s.counts.cerek >= 100, p: s => [s.counts.cerek, 100] },
  { id: 'g_rm1m',     en: 'Earn RM 1 million',        bm: 'Peroleh RM 1 juta',       reward: 6, ok: s => s.lifetime.e >= 6, p: s => [Math.min(val(s.lifetime), 1e6), 1e6] },
  { id: 'g_ach20',    en: 'Unlock 20 achievements',   bm: 'Buka 20 pencapaian',      reward: 6, ok: s => achCount() >= 20, p: s => [achCount(), 20] },
  { id: 'g_buff3',    en: 'Reach 3 buff levels',      bm: 'Capai 3 level berkat',    reward: 5, ok: s => buffTotal() >= 3, p: s => [buffTotal(), 3] },
  { id: 'g_ads5',     en: 'Watch 5 ads',              bm: 'Tonton 5 iklan',          reward: 4, ok: s => (s.adsTotal || 0) >= 5, p: s => [s.adsTotal || 0, 5] },
  { id: 'g_all5',     en: 'Own 5 of every building',  bm: 'Miliki 5 setiap bangunan', reward: 8, ok: s => BUILDINGS.every(b => s.counts[b.id] >= 5), p: s => [BUILDINGS.filter(b => s.counts[b.id] >= 5).length, BUILDINGS.length] },
  { id: 'g_brew10k',  en: 'Brew 10,000 cups',         bm: 'Bancuh 10,000 cawan',     reward: 8, ok: s => s.clicks >= 10000, p: s => [s.clicks, 10000] },
  { id: 'g_tok50',    en: 'Hold 50 Warung Tokens',    bm: 'Pegang 50 Warung Token',  reward: 10, ok: s => s.tokens >= 50, p: s => [s.tokens, 50] },
  { id: 'g_p5',       en: 'Prestige 5 times',         bm: 'Prestij 5 kali',          reward: 8, ok: s => s.prestiges >= 5, p: s => [s.prestiges, 5] },
];

/* ---------------- i18n ---------------- */
const T = {
  en: {
    tagline: 'Small warung, big dreams 🇲🇾',
    rateUnit: 'RM / sec', brew: 'BREW KOPI', notice: 'Notice Board',
    shop: 'Equipment & Outlets', buy: 'BUY',
    tabShop: 'Brew', tabAch: 'Achievements', tabStats: 'Stats', tabSet: 'Settings', tabBuffs: 'Buffs',
    achTitle: 'Achievements', achSub: 'Every tier gives a permanent earnings bonus. Harder tiers give less.',
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
    p1Locked: 'Earn RM 120,000 lifetime to unlock.',
    p2Locked: 'Reach 100 Warung Tokens to unlock.',
    p1Ready: (g) => 'Convert to ' + g + ' Warung Token (+' + (g * 10).toFixed(0) + '% earnings).',
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
    tabShop: 'Bancuh', tabAch: 'Pencapaian', tabStats: 'Statistik', tabSet: 'Tetapan', tabBuffs: 'Berkat',
    achTitle: 'Pencapaian', achSub: 'Setiap tier memberi bonus pendapatan kekal. Tier lebih susah beri lebih sedikit.',
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
    p1Locked: 'Kumpul RM 120,000 seumur hidup untuk buka.',
    p2Locked: 'Dapatkan 100 Warung Token untuk buka.',
    p1Ready: (g) => 'Tukar kepada ' + g + ' Warung Token (+' + (g * 10).toFixed(0) + '% pendapatan).',
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
const VERSION = '2026.11.16-16';
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
  beans: 0,
  buffs: {},
  boostUntil: 0,
  boostMult: 1,
  adsToday: 0,
  brewBeans: 0,
  adsDate: '',
  adsTotal: 0,
  purchases: [],
  goals: {},
  soundOn: true,
  lang: 'en',
  startedAt: Date.now(),
  lastSeen: Date.now(),
  counts: {},
};
BUILDINGS.forEach(b => { S.counts[b.id] = 0; });

let buyAmount = 1;
let pendingOffline = null;
let hardReset = false;
let lastFrame = performance.now();
let saveTimer = 0;
const t = () => T[S.lang] || T.en;

/* ---------------- derived ---------------- */
function achCount() { return ACHIEVEMENTS.filter(a => S.ach[a.id]).length; }
function achBonus() {
  let b = 0;
  for (const a of ACHIEVEMENTS) if (S.ach[a.id]) b += (a.w || 1);
  return b;
}
function buffIncomeMult() {
  return 1 + buffLevel('toyol') * 0.10 + buffLevel('keris') * 0.25 + buffLevel('bunga') * 0.20;
}
function boostActive() { return S.boostUntil > Date.now() && (S.boostMult || 1) > 1; }
function mult() {
  return (1 + S.tokens * 0.1) * (1 + S.bintang * 0.5) * (1 + achBonus() / 100) * buffIncomeMult() *
         (boostActive() ? (S.boostMult || 1) : 1);
}
function clickPower() {
  const tier = 1 + Math.floor(S.clicks / 50);          // +100% base every 50 taps
  let v = (CLICK_BASE * tier + S.clicks * 0.0002) * mult();
  v *= (1 + buffLevel('azimat') * 0.5);
  v += val(cps()) * 0.01 * buffLevel('semangat');
  return fromNum(v);
}
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
  const decades = Math.log10(val(S.lifetime) / P1_UNLOCK);
  const g = Math.floor(decades * 6 + 1) * (1 + S.bintang * 0.25);
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
  S.beans += Math.max(1, Math.round(g / 2));   // prestige feeds the buff economy
  S.prestiges++;
  S.money = { m: 0, e: 0 };
  S.lifetime = { m: 0, e: 0 };
  S.clicks = 0;
  BUILDINGS.forEach(b => S.counts[b.id] = 0);
  sfxP1(); toast(t().toastP1(g) + ' · +' + Math.max(1, Math.round(g / 2)) + ' 🫘'); checkAchievements(); render(); save();
}

function doP2() {
  const g = p2Gain();
  if (g <= 0) return;
  S.bintang += g;
  S.beans += g * 2;
  S.tokens = 0;
  S.money = { m: 0, e: 0 };
  S.lifetime = { m: 0, e: 0 };
  S.clicks = 0;
  BUILDINGS.forEach(b => S.counts[b.id] = 0);
  sfxP2(); toast(t().toastP2(g)); checkAchievements(); render(); save();
}

let achQ = [], achUp = false;

function sparks() {
  const card = document.querySelector('.achpop-card');
  const r = card ? card.getBoundingClientRect() : null;
  const cx = r ? r.x + r.width / 2 : window.innerWidth / 2;
  const cy = r ? r.y + r.height / 2 : 90;
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
  $('achPopSub').textContent = '+' + (a.w || 1) + '% ' + (S.lang === 'bm' ? 'pendapatan, kekal' : 'earnings, permanently');
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

/* ---------------- offline claim ---------------- */
function showOffline() {
  if (!pendingOffline || pendingOffline.gain.m === 0) return;
  $('offAmount').textContent = fmtRM(pendingOffline.gain);
  const mins = Math.round(pendingOffline.secs / 60);
  const hrs = Math.floor(mins / 60);
  const label = hrs > 0
    ? hrs + (S.lang === 'bm' ? ' jam ' : 'h ') + (mins % 60) + (S.lang === 'bm' ? ' minit' : 'm')
    : mins + (S.lang === 'bm' ? ' minit' : ' min');
  $('offSub').textContent = (S.lang === 'bm' ? 'Kedai berjalan selama ' : 'The kedai ran for ') + label + '.';
  $('offlineModal').classList.add('show');
}

function claimOffline() {
  if (!pendingOffline) return;
  S.money = add(S.money, pendingOffline.gain);
  S.lifetime = add(S.lifetime, pendingOffline.gain);
  toast('+' + fmtRM(pendingOffline.gain));
  pendingOffline = null;
  $('offlineModal').classList.remove('show');
  render(); save();
}

/* ---------------- store ---------------- */
const STORE = [
  { id: 'pack_s', icon: '\ud83e\udded', en: 'Small Bean Pack',  bm: 'Pek Biji Kecil',  price: 'RM 5',  beans: 25 },
  { id: 'pack_m', icon: '\ud83e\uded8', en: 'Medium Bean Pack', bm: 'Pek Biji Sederhana', price: 'RM 12', beans: 75 },
  { id: 'pack_l', icon: '\ud83e\uded9', en: 'Large Bean Pack',  bm: 'Pek Biji Besar',  price: 'RM 30', beans: 250 },
  { id: 'pack_xl', icon: '\ud83c\udf92', en: 'Sack of Beans',   bm: 'Guni Biji',       price: 'RM 60', beans: 700 },
];

function adsLeft() {
  const today = new Date().toISOString().slice(0, 10);
  if (S.adsDate !== today) { S.adsDate = today; S.adsToday = 0; }
  return Math.max(0, 10 - S.adsToday);
}

function renderStore() {
  lastStoreSig = storeSig();
  adsLeft();
  $('storeItems').innerHTML = STORE.map(function (p) {
    return '<div class="buff">' +
      '<div class="icon">' + p.icon + '</div>' +
      '<div class="bn">' + (S.lang === 'bm' ? p.bm : p.en) + '</div>' +
      '<div class="bd">+' + p.beans + ' Biji Kopi · permanent currency</div>' +
      '<div class="bc"><span class="cost">' + p.price + '</span>' +
      '<button data-pack="' + p.id + '">' + (S.lang === 'bm' ? 'BELI' : 'BUY') + '</button></div>' +
    '</div>';
  }).join('');

  $('adLeft').textContent = adsLeft();
  const active = boostActive();
  if (active) {
    const mins = Math.max(0, Math.round((S.boostUntil - Date.now()) / 60000));
    $('boostState').innerHTML = '<span>' + (S.boostMult || 1) + '×</span> ' + mins + (S.lang === 'bm' ? ' minit lagi' : ' min left');
  } else {
    $('boostState').textContent = S.lang === 'bm' ? 'Tiada boost aktif' : 'No active boost';
  }
  $('watchAdBtn').disabled = adsLeft() <= 0 || adWatching;
}

let adWatching = false;
function watchAd() {
  if (adWatching || adsLeft() <= 0) return;
  adWatching = true;
  const btn = $('watchAdBtn');
  btn.disabled = true;
  $('watchAdBtn').textContent = S.lang === 'bm' ? 'Menonton...' : 'Watching...';
  const bar = $('adProgress');
  let pct = 0;
  const iv = setInterval(function () {
    pct += 5;
    bar.style.width = Math.min(100, pct) + '%';
    if (pct >= 100) {
      clearInterval(iv);
      bar.style.width = '0%';
      S.adsToday++;
      S.adsTotal = (S.adsTotal || 0) + 1;
      const m = Math.min(50, 5 * S.adsToday);
      S.boostMult = m;
      S.boostUntil = Date.now() + 2 * 3600 * 1000;
      adWatching = false;
      btn.textContent = S.lang === 'bm' ? 'Tonton iklan' : 'Watch ad';
      toast(S.lang === 'bm' ? m + '× selama 2 jam!' : m + '× income for 2 hours!');
      render(); save();
    }
  }, 250);
}

function buyPack(id) {
  const p = STORE.filter(function (x) { return x.id === id; })[0];
  if (!p) return;
  if (!confirm((S.lang === 'bm' ? 'Demo sahaja — tiada bayaran sebenar.\n\nTerima ' : 'Demo only — no real payment is taken.\n\nReceive ') + p.beans + ' Biji Kopi?')) return;
  S.beans += p.beans;
  S.purchases.push({ id: id, at: Date.now(), price: p.price });
  sfxAch();
  toast('+' + p.beans + ' Biji Kopi');
  render(); save();
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
    S.beans = d.beans | 0;
    S.buffs = d.buffs || {};
    S.goals = d.goals || {};
    S.boostUntil = d.boostUntil || 0;
    S.boostMult = d.boostMult || 1;
    S.adsToday = d.adsToday | 0;
    S.adsDate = d.adsDate || '';
    S.adsTotal = d.adsTotal | 0;
    S.brewBeans = d.brewBeans | 0;
    S.purchases = d.purchases || [];
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
    const capH = OFFLINE_CAP_HOURS + buffLevel('jam') * 2;
    const rate = Math.min(0.95, OFFLINE_RATE + buffLevel('naga') * 0.25);
    const capped = Math.min(elapsed, capH * 3600);
    if (capped > 60) {
      pendingOffline = { gain: mul(cps(), fromNum(capped * rate)), secs: capped };
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
    if (buyAmount === 1) {
      $('cost-' + b.id).textContent = fmtRM(cost);
    } else {
      const unit = costFor(b, owned, 1);
      $('cost-' + b.id).textContent = fmtRM(unit) + ' each · ' + fmtRM(cost) + ' for ' + amount.toLocaleString('en-MY');
    }
    el.classList.toggle('afford', afford);
    el.classList.toggle('locked', i > 0 && owned === 0 && !gte(S.money, fromNum(b.base * 0.2)));
    el.querySelector('.buybtn').disabled = !afford;
  });
}

let achSig = '';
function achSignature() {
  return S.lang + '|' + ACHIEVEMENTS.map(function (a) { return S.ach[a.id] ? '1' : '0'; }).join('');
}
function updateMissionBadge() {
  const el = $('tabMission');
  if (!el) return;
  const ready = GOALS.filter(function (g) { return !S.goals[g.id] && g.ok(S); }).length;
  el.innerHTML = (S.lang === 'bm' ? 'Misi' : 'Missions') +
    (ready > 0 ? ' <span class="badge">' + ready + '</span>' : '');
}

function updateAchBadge() {
  const badge = $('achBadge');
  if (badge) badge.textContent = achCount() + '/' + ACHIEVEMENTS.length;
  const bb = $('beanBadge');
  if (bb) bb.textContent = S.beans;
}

function missionSlots() {
  const types = BUILDINGS.filter(function (b) { return (S.counts[b.id] || 0) > 0; }).length;
  return Math.min(5, 2 + types);
}

function activeGoals() {
  return GOALS.filter(function (g) { return !S.goals[g.id]; }).slice(0, missionSlots());
}

function buyBuff(id) {
  const b = BUFFS.filter(function (x) { return x.id === id; })[0];
  if (!b) return;
  const cost = buffCost(b);
  if (S.beans < cost) return;
  S.beans -= cost;
  S.buffs[id] = buffLevel(id) + 1;
  sfxAch();
  setTimeout(function () {
    const el = $('buffcard-' + id);
    if (el) { el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 700); }
  }, 30);
  toast((S.lang === 'bm' ? 'Berkat naik ke L' : 'Blessing raised to L') + S.buffs[id]);
  render(); save();
}

function claimGoal(id) {
  const g = GOALS.filter(function (x) { return x.id === id; })[0];
  if (!g || S.goals[id] || !g.ok(S)) return;
  S.goals[id] = true;
  S.beans += g.reward;
  SFX.cawangan();
  toast('+' + g.reward + ' ' + (S.lang === 'bm' ? 'Biji Kopi' : 'Biji Kopi'));
  render(); save();
}

let lastStoreSig = '';
function storeSig() { return S.lang + '|' + adsLeft() + '|' + (boostActive() ? Math.round(S.boostUntil / 60000) : 0); }

let lastMissionSig = '';
function missionSig() {
  return S.lang + '|' + missionSlots() + '|' +
    activeGoals().map(function (g) { return g.id + (g.ok(S) ? '1' : '0'); }).join(',') + '|' +
    Object.keys(S.goals).length;
}

let buffSig = '';
function buffSignature() {
  const goals = activeGoals().map(function (g) { return g.id + (g.ok(S) ? '1' : '0'); }).join(',');
  return S.lang + '|' + S.beans + '|' + JSON.stringify(S.buffs) + '|' + goals;
}

function renderBuffs() {
  buffSig = buffSignature();
  const d = t();
  const guide = $('buffGuide');
  if (guide) {
    const nextAch = ACHIEVEMENTS.filter(function (a) { return !S.ach[a.id]; }).length;
    guide.innerHTML = S.lang === 'bm'
      ? 'Anda ada <b>' + S.beans + '</b> biji. Dapat +1 setiap 1,000 bancuhan, +2 hingga +10 dari misi, dan ganjaran prestij.'
      : 'You have <b>' + S.beans + '</b> beans. Earn <b>+1 per 1,000 brews</b>, <b>+2 to +10</b> from missions, and prestige bonuses.';
  }
  const bc = $('beanCount');
  if (bc) bc.textContent = S.beans;
  const bb = $('beanBadge');
  if (bb) bb.textContent = S.beans;

  $('buffList').innerHTML = BUFFS.map(function (b) {
    const lvl = buffLevel(b.id);
    const cost = buffCost(b);
    const afford = S.beans >= cost;
    const eff = BUFF_EFF[b.id] ? BUFF_EFF[b.id](lvl) : '';
    return '<div class="buff ' + (lvl > 0 ? 'owned' : '') + '" id="buffcard-' + b.id + '">' +
      '<div class="icon">' + b.icon + '</div>' +
      '<div class="bn">' + (S.lang === 'bm' ? b.bm : b.en) + '</div>' +
      '<div class="bd">' + (S.lang === 'bm' ? b.bmD : b.enD) + '</div>' +
      '<div class="beff">' + (lvl > 0
        ? (S.lang === 'bm' ? 'Kini: ' : 'Now: ') + '<b>' + eff + '</b>'
        : (S.lang === 'bm' ? 'Belum dimiliki' : 'Not owned')) + '</div>' +
      '<div class="bc">' +
        '<span class="cost">' + cost + ' biji</span>' +
        '<span class="lvlchip' + (lvl > 0 ? ' on' : '') + '">Lv ' + lvl + '</span>' +
        '<button data-buff="' + b.id + '" ' + (afford ? '' : 'disabled') + '>' +
          (S.lang === 'bm' ? 'BELI' : 'BUY') +
        '</button>' +
      '</div>' +
    '</div>';
  }).join('');

}

function renderMissions() {
  lastMissionSig = missionSig();
  const goals = activeGoals();
  const slots = missionSlots();
  $('goalList').innerHTML = goals.length ? goals.map(function (g) {
    const pr = g.p(S);
    const done = g.ok(S);
    const fmtn = function (x) { return x >= 10000 ? fmt(fromNum(x)) : Math.round(x).toLocaleString('en-MY'); };
    return '<div class="goal ' + (done ? 'done' : '') + '">' +
      '<div class="gtxt">' + (S.lang === 'bm' ? g.bm : g.en) +
        '<div class="gprog">' + fmtn(pr[0]) + ' / ' + fmtn(pr[1]) + '</div></div>' +
      '<span class="reward">+' + g.reward + ' 🫘</span>' +
      '<button data-goal="' + g.id + '" ' + (done ? '' : 'disabled') + '>' +
        (done ? (S.lang === 'bm' ? 'TUNTUT' : 'CLAIM') : (S.lang === 'bm' ? 'PROSES' : 'IN PROGRESS')) +
      '</button>' +
    '</div>';
  }).join('') : '<div class="muted">' + (S.lang === 'bm' ? 'Semua misi selesai.' : 'All missions complete.') + '</div>';

  let locked = '';
  for (let i = goals.length; i < slots; i++) {
    locked += '<div class="goal locked">' +
      '<div class="gtxt">' + (S.lang === 'bm' ? 'Slot kosong' : 'Empty slot') +
      '<div class="gprog">' + (S.lang === 'bm' ? 'Semua misi sedang berjalan' : 'All active missions shown') + '</div></div>' +
      '<span class="reward">—</span><button disabled>—</button></div>';
  }
  if (GOALS.filter(function (g) { return !S.goals[g.id]; }).length > goals.length) {
    locked += '<div class="goal locked"><div class="gtxt">' +
      (S.lang === 'bm' ? 'Slot seterusnya' : 'Next slot') +
      '<div class="gprog">' + (S.lang === 'bm'
        ? 'Beli satu jenis kedai baharu untuk buka slot misi'
        : 'Buy a new outlet type to unlock another mission slot') + '</div></div>' +
      '<span class="reward">🔒</span><button disabled>—</button></div>';
  }
  const slotInfo = $('slotInfo');
  if (slotInfo) slotInfo.textContent = (S.lang === 'bm' ? 'Slot misi: ' : 'Mission slots: ') + slots + ' / 5';
  $('goalList').innerHTML += locked;
}

function ladderInfo(grp) {
  const list = ACHIEVEMENTS.filter(function (a) { return a.grp === grp; });
  const done = list.filter(function (a) { return S.ach[a.id]; }).length;
  const next = list.filter(function (a) { return !S.ach[a.id]; })[0];
  return { list: list, done: done, next: next };
}

function ladderTitle(grp) {
  if (grp === 'brew') return S.lang === 'bm' ? 'Larian Bancuhan' : 'Brew Ladder';
  const row = EQ_TIERS.filter(function (r) { return r[0] === grp; })[0];
  if (!row) return grp;
  return row[2];
}

function ladderLine(grp, compact) {
  const info = ladderInfo(grp);
  const next = info.next;
  const pr = next ? next.p(S) : [1, 1];
  const pct = next ? Math.min(100, (pr[0] / Math.max(pr[1], 1)) * 100) : 100;
  const fmtn = function (x) { return x >= 10000 ? fmt(fromNum(x)) : Math.round(x).toLocaleString('en-MY'); };
  const sub = next
    ? (S.lang === 'bm' ? 'Seterusnya: ' : 'Next: ') + (S.lang === 'bm' ? next.bm : next.en)
    : (S.lang === 'bm' ? 'Selesai' : 'Complete');
  return '<div class="ach ladder ' + (next ? '' : 'done') + '">' +
    '<div class="t">' + ladderTitle(grp) + '</div>' +
    '<div class="d">' + sub + '</div>' +
    '<div class="nbar"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
    '<div class="st">' + fmtn(pr[0]) + ' / ' + fmtn(pr[1]) + ' · ' + info.done + '/' + info.list.length +
      ' ' + (S.lang === 'bm' ? 'dibuka' : 'unlocked') + '</div>' +
  '</div>';
}

function renderAch() {
  achSig = achSignature();
  const groups = ['brew'].concat(EQ_TIERS.map(function (r) { return r[0]; }));
  const ladders = groups.map(function (g) { return ladderLine(g, false); }).join('');

  const singlesSorted = ACHIEVEMENTS.filter(function (a) { return !a.grp; })
    .sort(function (x, y) { return (S.ach[x.id] ? 1 : 0) - (S.ach[y.id] ? 1 : 0); });
  const singles = singlesSorted.map(function (a) {
    const done = !!S.ach[a.id];
    return '<div class="ach ' + (done ? 'done' : '') + '">' +
      '<div class="t">' + (S.lang === 'bm' ? a.bm : a.en) + '</div>' +
      '<div class="d">+' + (a.w || 1) + '% ' + (S.lang === 'bm' ? 'pendapatan' : 'earnings') + '</div>' +
      '<div class="st">' + (done ? '✓ ' + t().achDone : t().achNot) + '</div>' +
    '</div>';
  }).join('');

  const groupsSorted = groups.slice().sort(function (x, y) {
    return (ladderInfo(x).next ? 0 : 1) - (ladderInfo(y).next ? 0 : 1);
  });
  const laddersSorted = groupsSorted.map(function (g) { return ladderLine(g, false); }).join('');
  $('achList').innerHTML = laddersSorted + singles;
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
    [t().sAch, achCount() + '/' + ACHIEVEMENTS.length + ' (+' + achBonus().toFixed(2).replace('.00','') + '%)'],
    [t().sBuildings, BUILDINGS.reduce(function (n, b) { return n + (S.counts[b.id] || 0); }, 0).toLocaleString('en-MY')],
    [t().sPrestiges, String(S.prestiges)],
    [t().sClicks, S.clicks.toLocaleString('en-MY')],
    [t().sPlaytime, playtime()],
  ];
  const bk = $('multBreak');
  if (bk) {
    const parts = [
      [S.lang === 'bm' ? 'Warung Token' : 'Warung Tokens', S.tokens, '+' + (S.tokens * 10) + '%', 'x' + (1 + S.tokens * 0.1).toFixed(2)],
      [S.lang === 'bm' ? 'Bintang Francais' : 'Franchise Stars', S.bintang, '+' + (S.bintang * 50) + '%', 'x' + (1 + S.bintang * 0.5).toFixed(2)],
      [S.lang === 'bm' ? 'Pencapaian' : 'Achievements', achCount(), '+' + achBonus().toFixed(2).replace('.00','') + '%', 'x' + (1 + achBonus() / 100).toFixed(2)],
      [S.lang === 'bm' ? 'Berkat' : 'Buffs', buffTotal(), '', 'x' + buffIncomeMult().toFixed(2)],
      [S.lang === 'bm' ? 'Iklan' : 'Ad boost', boostActive() ? 1 : 0, '', boostActive() ? 'x' + (S.boostMult || 1) : 'x1'],
    ];
    bk.innerHTML = parts.map(function (p) {
      return '<div class="bsrow ' + (p[1] > 0 ? 'active' : 'off') + '">' +
        '<span class="n">' + p[0] + (p[2] ? ' <i>' + p[2] + '</i>' : '') + '</span>' +
        '<span class="v">' + p[3] + '</span></div>';
    }).join('') + '<div class="bsrow total"><span class="n">' + (S.lang === 'bm' ? 'JUMLAH' : 'TOTAL') +
      '</span><span class="v">x' + mult().toFixed(2) + '</span></div>';
  }

  const bs = $('buffStatus');
  if (bs) {
    bs.innerHTML = BUFFS.map(function (b) {
      const lvl = buffLevel(b.id);
      return '<div class="bsrow ' + (lvl > 0 ? 'active' : 'off') + '">' +
        '<span class="n">' + b.icon + ' ' + (S.lang === 'bm' ? b.bm : b.en) + '</span>' +
        '<span class="v">' + (lvl > 0 ? 'L' + lvl : '—') + '</span></div>';
    }).join('');
  }

  $('statGrid').innerHTML = rows.map(function (r) {
    return '<div class="stat"><div class="k">' + r[0] + '</div><div class="v">' + r[1] + '</div></div>';
  }).join('');
}

function renderPrestige() {
  const g1 = p1Gain();
  $('prestigeInfo').textContent = g1 > 0 ? t().p1Ready(g1) : t().p1Locked;
  $('prestigeBtn').disabled = g1 <= 0;
  const ready = g1 > 0 && (g1 >= S.tokens + 2 || val(S.lifetime) >= P1_UNLOCK * 8);
  $('prestigeBtn').classList.toggle('ready', ready);
  if (ready) $('prestigeInfo').textContent = (S.lang === 'bm' ? '\u2b50 Masa sesuai! ' : '\u2b50 Good time to reset! ') + t().p1Ready(g1);
  $('prestigeBtn').textContent = g1 > 0 ? t().p1Btn + ' (+' + g1 + ')' : t().p1Btn;

  const g2 = p2Gain();
  $('prestige2Info').textContent = g2 > 0 ? t().p2Ready(g2) : t().p2Locked;
  $('prestige2Btn').disabled = g2 <= 0;
  $('prestige2Btn').textContent = g2 > 0 ? t().p2Btn + ' (+' + g2 + ')' : t().p2Btn;
}

function renderNotices() {
  const fmtn = function (x) { return x >= 10000 ? fmt(fromNum(x)) : Math.round(x).toLocaleString('en-MY'); };
  const cands = [];

  const groups = EQ_TIERS.map(function (r) { return r[0]; });
  groups.forEach(function (g) {
    const info = ladderInfo(g);
    if (!info.next) return;
    const pr = info.next.p(S);
    cands.push({
      label: ladderTitle(g),
      num: fmtn(pr[0]) + ' / ' + fmtn(pr[1]),
      pct: Math.min(100, (pr[0] / Math.max(pr[1], 1)) * 100)
    });
  });

  ACHIEVEMENTS.filter(function (a) { return !a.grp && !S.ach[a.id]; }).forEach(function (a) {
    const pr = a.p ? a.p(S) : [0, 1];
    cands.push({
      label: S.lang === 'bm' ? a.bm : a.en,
      num: fmtn(pr[0]) + ' / ' + fmtn(pr[1]),
      pct: Math.min(100, (pr[0] / Math.max(pr[1], 0.0001)) * 100)
    });
  });

  cands.sort(function (x, y) { return y.pct - x.pct; });
  const rows = cands.slice(0, 4);

  $('milestones').innerHTML = rows.length
    ? rows.map(function (r) {
        return '<li class="notice">' +
          '<div class="nrow"><span>' + r.label + '</span>' +
          '<span class="nnum">' + r.num + '</span></div>' +
          '<div class="nbar"><i style="width:' + r.pct.toFixed(1) + '%"></i></div>' +
        '</li>';
      }).join('')
    : '<li>' + (S.lang === 'bm' ? 'Semua pencapaian dibuka!' : 'All achievements unlocked!') + '</li>';
}

let lastRingTier = -1;
const RING_C = 2 * Math.PI * 112;   // circumference of r=112

function updateRing() {
  const brew = ACHIEVEMENTS.filter(function (a) { return a.grp === 'brew'; });
  const done = brew.filter(function (a) { return S.ach[a.id]; }).length;
  const next = brew.filter(function (a) { return !S.ach[a.id]; })[0];
  const pr = next ? next.p(S) : [1, 1];
  const pct = next ? Math.min(1, pr[0] / Math.max(pr[1], 1)) : 1;

  const fill = $('ringFill');
  const btn = $('brewBtn');
  if (!fill || !btn) return;

  fill.style.strokeDasharray = RING_C.toFixed(1);
  fill.style.strokeDashoffset = (RING_C * (1 - pct)).toFixed(1);
  btn.className = 'brew tier-' + Math.min(done, 8);

  if (done !== lastRingTier) {
    if (lastRingTier >= 0) {
      btn.classList.add('ring-burst');
      setTimeout(function () { btn.classList.remove('ring-burst'); }, 800);
    }
    lastRingTier = done;
  }
}

function render() {
  $('money').textContent = fmtRM(S.money);
  const cb = $('curBeans'), ct = $('curTokens'), cs = $('curStars');
  if (cb) cb.innerHTML = '🫘 <b>' + S.beans + '</b>';
  if (ct) {
    ct.classList.toggle('hide', !(S.tokens > 0 || S.prestiges > 0));
    ct.innerHTML = '🏷️ <b>' + S.tokens + '</b>';
  }
  if (cs) {
    cs.classList.toggle('hide', !(S.bintang > 0));
    cs.innerHTML = '⭐ <b>' + S.bintang + '</b>';
  }
  updateRing();
  $('cps').textContent = fmt(cps());
  $('clickGain').textContent = '+ ' + fmtRM(clickPower());
  const bc = $('brewCount');
  if (bc) bc.textContent = S.clicks.toLocaleString('en-MY') + (S.lang === 'bm' ? ' bancuhan' : ' brews');
  renderShop();
  renderPrestige();
  renderNotices();
  updateAchBadge();
  updateMissionBadge();
  if ($('panel-achievements').classList.contains('active') && achSignature() !== achSig) renderAch();
  if ($('panel-buffs').classList.contains('active') && buffSignature() !== buffSig) renderBuffs();
  if ($('panel-mission').classList.contains('active') && missionSig() !== lastMissionSig) renderMissions();
  if ($('panel-shop').classList.contains('active') && storeSig() !== lastStoreSig) renderStore();
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
  if (vl) {
    let stamp = '';
    try {
      const d = new Date(document.lastModified);
      if (!isNaN(d.getTime())) {
        stamp = d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {}
    const tip = S.lang === 'bm' ? 'muat semula jika tidak berubah' : 'hard-refresh if stale';
    vl.innerHTML = 'Kopi Kosong Empire · build <b>' + VERSION + '</b>' +
      (stamp ? ' · updated ' + stamp : '') + ' · ' + tip;
  }
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
  const brewStep = Math.floor(S.clicks / 1000);
  if (brewStep > (S.brewBeans || 0)) {
    const gained = brewStep - (S.brewBeans || 0);
    S.beans += gained;
    S.brewBeans = brewStep;
    toast('+' + gained + ' 🫘 ' + (S.lang === 'bm' ? 'setiap 1,000 bancuhan' : 'per 1,000 brews'));
  }

  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; save(); checkAchievements(); }
  render();
  if (pendingOffline) setTimeout(showOffline, 600);
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
    if (btn.dataset.tab === 'buffs') renderBuffs();
    if (btn.dataset.tab === 'mission') renderMissions();
    if (btn.dataset.tab === 'shop') renderStore();
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
    /* ---- troubleshoot panel ---- */
  const devOut = $('devOut');
  const devMsg = function (txt) { devOut.textContent = txt; devOut.classList.add('show'); };

  BUILDINGS.forEach(function (b) {
    const o = document.createElement('option');
    o.value = b.id;
    o.textContent = S.lang === 'bm' ? b.name : b.nameEn;
    $('devItem').appendChild(o);
  });

  $('devClicksBtn').addEventListener('click', function () {
    const v = parseInt($('devClicks').value, 10);
    if (isNaN(v) || v < 0) return devMsg('Enter a number of brews.');
    S.clicks = v;
    checkAchievements(); render(); save();
    devMsg('clicks = ' + v + '\nachievements unlocked: ' + achCount() + '/' + ACHIEVEMENTS.length +
           '\nbonus: +' + achBonus().toFixed(2) + '%');
  });

  $('devMoneyBtn').addEventListener('click', function () {
    const v = parseFloat($('devMoney').value);
    if (isNaN(v) || v < 0) return devMsg('Enter an amount in RM.');
    S.money = fromNum(v);
    S.lifetime = fromNum(Math.max(v, val(S.lifetime)));
    render(); save();
    devMsg('cash = ' + fmtRM(S.money) + '\nlifetime = ' + fmtRM(S.lifetime));
  });

  $('devGiveBtn').addEventListener('click', function () {
    const id = $('devItem').value;
    const q = parseInt($('devQty').value, 10);
    if (isNaN(q) || q < 0) return devMsg('Enter a quantity.');
    S.counts[id] = (S.counts[id] || 0) + q;
    checkAchievements(); render(); save();
    devMsg(id + ' +' + q + ' → now ' + S.counts[id]);
  });

  $('devUnlockAll').addEventListener('click', function () {
    ACHIEVEMENTS.forEach(function (a) { S.ach[a.id] = true; });
    render(); save();
    devMsg('All ' + ACHIEVEMENTS.length + ' achievements unlocked.\nbonus: +' + achBonus().toFixed(2) + '%');
  });

  $('devDump').addEventListener('click', function () {
    const raw = JSON.stringify(S);
    devMsg('build: ' + VERSION +
      '\nlang: ' + S.lang + '  sound: ' + S.soundOn +
      '\ncash: ' + fmtRM(S.money) + '  lifetime: ' + fmtRM(S.lifetime) +
      '\nincome: ' + fmtRM(cps()) + '/s  click: ' + fmtRM(clickPower()) +
      '\nclicks: ' + S.clicks + '  tokens: ' + S.tokens + '  stars: ' + S.bintang +
      '\nmultiplier: x' + mult().toFixed(3) +
      '\nachievements: ' + achCount() + '/' + ACHIEVEMENTS.length + ' (+' + achBonus().toFixed(2) + '%)' +
      '\ncounts: ' + JSON.stringify(S.counts) +
      '\nsave size: ' + raw.length + ' bytes');
  });

  $('soundBtn').textContent = S.soundOn ? '🔊' : '🔇';
    $('soundToggle').textContent = S.soundOn ? 'ON' : 'OFF';
    $('soundToggle').classList.toggle('on', S.soundOn);
    if (S.soundOn) { audio(); sfxTap(); }
    save();
  }
  $('soundBtn').addEventListener('click', toggleSound);
  $('soundToggle').addEventListener('click', toggleSound);

  $('claimOffline').addEventListener('click', claimOffline);
  $('watchAdBtn').addEventListener('click', watchAd);
  $('storeItems').addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-pack]');
    if (btn) buyPack(btn.dataset.pack);
  });

  $('beanHelp').addEventListener('click', function (e) {
    e.stopPropagation();
    document.querySelector('.beanbar').classList.toggle('open');
  });
  document.addEventListener('click', function (e) {
    const bar = document.querySelector('.beanbar');
    if (bar && !bar.contains(e.target)) bar.classList.remove('open');
  });

  $('buffList').addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-buff]');
    if (btn) buyBuff(btn.dataset.buff);
  });
  $('goalList').addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-goal]');
    if (btn) claimGoal(btn.dataset.goal);
  });

  $('updateBtn').addEventListener('click', function () {
    save();
    const u = new URL(location.href);
    u.searchParams.set('u', Date.now().toString());
    location.replace(u.toString());
  });

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

  /* ---- troubleshoot panel ---- */
  const devOut = $('devOut');
  const devMsg = function (txt) { devOut.textContent = txt; devOut.classList.add('show'); };

  BUILDINGS.forEach(function (b) {
    const o = document.createElement('option');
    o.value = b.id;
    o.textContent = S.lang === 'bm' ? b.name : b.nameEn;
    $('devItem').appendChild(o);
  });

  $('devClicksBtn').addEventListener('click', function () {
    const v = parseInt($('devClicks').value, 10);
    if (isNaN(v) || v < 0) return devMsg('Enter a number of brews.');
    S.clicks = v;
    checkAchievements(); render(); save();
    devMsg('clicks = ' + v + '\nachievements unlocked: ' + achCount() + '/' + ACHIEVEMENTS.length +
           '\nbonus: +' + achBonus().toFixed(2) + '%');
  });

  $('devMoneyBtn').addEventListener('click', function () {
    const v = parseFloat($('devMoney').value);
    if (isNaN(v) || v < 0) return devMsg('Enter an amount in RM.');
    S.money = fromNum(v);
    S.lifetime = fromNum(Math.max(v, val(S.lifetime)));
    render(); save();
    devMsg('cash = ' + fmtRM(S.money) + '\nlifetime = ' + fmtRM(S.lifetime));
  });

  $('devGiveBtn').addEventListener('click', function () {
    const id = $('devItem').value;
    const q = parseInt($('devQty').value, 10);
    if (isNaN(q) || q < 0) return devMsg('Enter a quantity.');
    S.counts[id] = (S.counts[id] || 0) + q;
    checkAchievements(); render(); save();
    devMsg(id + ' +' + q + ' → now ' + S.counts[id]);
  });

  $('devUnlockAll').addEventListener('click', function () {
    ACHIEVEMENTS.forEach(function (a) { S.ach[a.id] = true; });
    render(); save();
    devMsg('All ' + ACHIEVEMENTS.length + ' achievements unlocked.\nbonus: +' + achBonus().toFixed(2) + '%');
  });

  $('devDump').addEventListener('click', function () {
    const raw = JSON.stringify(S);
    devMsg('build: ' + VERSION +
      '\nlang: ' + S.lang + '  sound: ' + S.soundOn +
      '\ncash: ' + fmtRM(S.money) + '  lifetime: ' + fmtRM(S.lifetime) +
      '\nincome: ' + fmtRM(cps()) + '/s  click: ' + fmtRM(clickPower()) +
      '\nclicks: ' + S.clicks + '  tokens: ' + S.tokens + '  stars: ' + S.bintang +
      '\nmultiplier: x' + mult().toFixed(3) +
      '\nachievements: ' + achCount() + '/' + ACHIEVEMENTS.length + ' (+' + achBonus().toFixed(2) + '%)' +
      '\ncounts: ' + JSON.stringify(S.counts) +
      '\nsave size: ' + raw.length + ' bytes');
  });

  $('soundBtn').textContent = S.soundOn ? '🔊' : '🔇';
  $('soundToggle').textContent = S.soundOn ? 'ON' : 'OFF';
  $('soundToggle').classList.toggle('on', S.soundOn);

  window.addEventListener('beforeunload', function () { if (!hardReset) save(); });

  // iOS double-tap zoom: swallow the gesture as a last line of defence
  let lastTap = 0;
  document.addEventListener('touchend', function (e) {
    // never swallow taps on real controls - that would eat clicks
    if (e.target.closest('button, a, input, select, textarea, .tabs, .shop-list')) { lastTap = 0; return; }
    const now = Date.now();
    if (now - lastTap < 320) e.preventDefault();
    lastTap = now;
  }, { passive: false });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('visibilitychange', function () { if (document.hidden) save(); });

  if (!hadSave) setTimeout(function () { toast(t().toastWelcome); }, 700);

  render();
  if (pendingOffline) setTimeout(showOffline, 600);
  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', init);
