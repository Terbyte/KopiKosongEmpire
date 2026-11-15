# Kopi Kosong Empire

A Malaysian kopitiam incremental / idle game. Plain HTML + CSS + JavaScript —
no build step, no dependencies, no server. Open `index.html` and play.

**Theme:** an old kopitiam on a rainy afternoon. English is the default language,
with Bahasa Melayu available in Settings.

---

## How to play

1. Click the cup to **brew kopi** and earn ringgit.
2. Buy equipment and outlets — each one earns RM every second.
3. Prices rise **×1.15** per unit owned (standard idle-game curve).
4. Buy in stacks: **×1 / ×5 / ×10 / ×100 / MAX** (MAX buys as many as you can afford).
5. **Balik Kampung** (prestige 1): reset cash and equipment for **Warung Tokens**,
   +10% to all earnings each. Unlocks at RM 10M earned in one run.
6. **Franchise Expansion** (prestige 2): spend **100 Warung Tokens** for **Franchise
   Stars**, +50% each, forever, and faster token gain. Resets everything below it.
7. **Achievements** (19) — each gives a permanent +1% to earnings.
8. Offline progress: 50% rate for up to 8 hours while the tab is closed.

## Files

| File | Purpose |
|---|---|
| `index.html` | UI structure: cup, tabs, shop, achievements, stats, settings |
| `style.css` | Kopitiam theme: wood, neon sign, rain, marble counter |
| `game.js` | All logic: big numbers, economy, prestige, saves, sound, i18n |
| `test.js` | Playwright test — clicks, buys, tabs, language switch, console errors |
| `README.md` | This file |

## Run locally

```bash
python3 -m http.server 5173
# open http://localhost:5173
```

No `npm install` needed to play. `package.json` exists only for Playwright testing.

## Test

```bash
npm i -D playwright && npx playwright install chromium
node test.js
```

Expected: money rises after clicks, kettle buys, achievement badge updates,
language switches to BM ("Kedai"/"Simpan") and back, `errors: []`.

## Deploy (free)

Static site — any host works:

- **GitHub Pages** — push this folder, enable Pages on `main` / root
- **Cloudflare Pages** or **Netlify** — drag and drop the folder
- **Own server** — copy to `/var/www/kopitiam` and point nginx at it

## Technical notes

### Big numbers
Amounts are stored as `{m, e}` — mantissa 1–10 and an exponent, e.g. `1.5e12`.
JavaScript floats lose precision past `1e308`; this representation does not.
`add`, `mul`, `cmp`, `val` in `game.js` operate on the pair directly.

### Currency
The game currency is **RM** (Malaysian ringgit). Base click starts at RM 0.05.
Saves from v1 (which used sen) are migrated automatically by dividing by 100.

### Save format
`localStorage['kopitiam-kosong-v2']` — JSON: money, lifetime, counts, clicks,
tokens, bintang, prestiges, achievements, language, sound, timestamps.
Export/Import produces a base64 blob for moving progress between devices.

### Offline progress
On load: `elapsed = now - lastSeen`, capped at 8 hours, credited at 50% of
current income.

### Balance knobs (`game.js`)
```js
const COST_MULT = 1.15;        // price growth per unit
const CLICK_BASE = 0.05;       // starting click value in RM
const OFFLINE_CAP_HOURS = 8;   // max offline credit
const OFFLINE_RATE = 0.5;      // 50% while away
const P1_UNLOCK = 1e7;         // RM lifetime for first prestige
const P2_UNLOCK_TOKENS = 100;  // tokens needed for second prestige
```

### Localisation
All UI strings live in the `T` object (`en` and `bm`). Building descriptions
carry `en` and `bm` fields. Adding a language = add a key to `T` and a button
to `#langSeg`.

### Sound
Fully synthesised with WebAudio — no audio files, no licensing issues.
Each action has its own voice:

| Action | Sound |
|---|---|
| Brew (click) | water into the cup + ceramic clink |
| Kettle | metallic tap + steam |
| Cloth Filter | soft muffled swoosh |
| Coffee Machine | motor growl + steam burst |
| Roti Canai Griddle | hot sizzle |
| Loyal Regulars | two voices chatting |
| Delivery Rider | scooter horn, two beeps |
| Branch Outlet | cash register ka-ching |
| National Franchise | four-note fanfare |

Toggle in the header or Settings; the choice is saved. Audio starts only after
the first tap (browser autoplay policy).

## Ideas for later

- Third prestige layer / idle "offline earnings" upgrades
- Auto-buyers per building
- Achievements with real mechanical effects (not just +1%)
- Cloud saves (small backend or OneDrive sync)
- Shareable challenge seeds
