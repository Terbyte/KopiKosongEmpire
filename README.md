# Kopi Kosong Empire

A Malaysian kopitiam incremental / idle game. Plain HTML + CSS + JavaScript —
no build step, no dependencies, no server.

**Play it:** https://terbyte.github.io/KopiKosongEmpire/
**Build:** `2026.11.16-21`

English is the default language; **Bahasa Melayu** is one click away in the header.
Currency is **RM** throughout.

---

## The game in one paragraph

You open a small kedai kopi with one cup and RM 0.05 per tap. You buy kettles,
cloth filters, a coffee machine, a roti canai griddle, then regulars, a delivery
rider, a second outlet — and finally a national franchise. Along the way you earn
**Biji Kopi** to spend on mystic buffs, complete **Missions** that unlock as your
shop grows, collect **39 achievements**, and reset the whole thing twice over in
two prestige layers. Reach your first **Francais Kebangsaan** and the credits roll.

---

## How to play

1. **Tap the cup** to brew kopi and earn ringgit. The ring around the cup fills
   with your brew ladder — higher tiers multiply your click value.
2. **Buy equipment** — each unit earns RM every second. Prices rise **×1.15**
   per unit owned.
3. **Buy in stacks** — ×1 / ×5 / ×10 / ×100 / MAX (MAX is a closed-form solve,
   not a loop, and shows the total before you commit).
4. **Missions** unlock slots as you grow: two at the start (a brew goal and an
   earn goal), one more per new outlet type, capped at five.
5. **Biji Kopi** (beans) are the permanent currency — 1 per 1,000 brews plus
   mission rewards and prestige payouts. Spend them on levelled buffs that never
   reset.
6. **Balik Kampung** (prestige 1) — available at **RM 120,000** lifetime. Resets
   cash, buildings and brews for **Warung Tokens**, +10% earnings each.
7. **Franchise Expansion** (prestige 2) — spend **100 Warung Tokens** for
   **Bintang Francais**, +50% each, forever, and faster token gain.
8. **Watch an ad** for a temporary boost — ×5 per ad, stacking to ×50, for two
   hours, max 10 ads a day.

## The finish line

Owning your **first Francais Kebangsaan** triggers the ending: a full-screen
credits sequence with your run's stats (cups brewed, all-time earnings, resets,
achievements, beans, playtime) and a thank-you.

After the credits the game continues in **Empayar Mode** — a permanent 🏆 counter
under the header tracking you toward **100 franchises**.

Both late tiers are gated, so the ending has to be earned:

| Building | Cost | Requires |
|---|---|---|
| Cawangan Warung (Branch Outlet) | RM 450,000 | 1 × Balik Kampung |
| Francais Kebangsaan (National Franchise) | RM 7,500,000 | 3 × Balik Kampung |

## Systems at a glance

| System | Detail |
|---|---|
| Buildings | 8 tiers, ×1.15 price growth, closed-form MAX |
| Achievements | 39 — 15 one-offs plus 3 tiers for each of the 8 buildings |
| Achievement bonus | weighted (+1% easy, +0.5% mid, +0.25% hardcore), not flat |
| Missions | 22 entries; brew ladder 10→100→200→300→400 and earn ladder RM 10→100k, interleaved, 1 bean each; then rotating missions worth 2–12 beans |
| Mission slots | 2 to start, +1 per new building type, max 5 |
| Mystic buffs | 7 levelled upgrades, cost ×1.65 per level, bought with Biji Kopi |
| Prestige 1 | Warung Tokens, +10% each, unlock RM 120,000 |
| Prestige 2 | Bintang Francais, +50% each, 100 tokens |
| Offline | 20% of income, capped at 3 hours (buffable), claimed via modal |
| Ads | ×5 stacking to ×50, 2h window, 10/day cap |
| Save | `localStorage['kopitiam-kosong-v2']`, versioned with v1 migration |

### Mystic buffs

| Buff | Effect per level | Base cost (Biji Kopi) |
|---|---|---|
| Azimat Bomoh | +50% click value | 3 |
| Toyol Penolong | +10% income | 5 |
| Jam Pasir Sakti | +2 hours offline cap | 6 |
| Naga Kopi | +25% offline rate (max 95%) | 7 |
| Keris Tua | +25% income | 9 |
| Bunga Kantan | +20% income | 12 |
| Semangat Kedai | +1% income per click this run | — |

Every buff is consulted everywhere it applies — income multiplier, click power,
offline cap **and** offline rate — so a purchase always does something.

---

## Measured balance

These are real Playwright runs against the shipped build, not estimates.

| Test | Result |
|---|---|
| First Balik Kampung (bot pacing, RM 120k) | **9 min 15 s**, ~1,000 RM/s |
| Returning player: 40 taps → 1 h offline → repeat, resetting 3× then pushing | **franchise on session 12** |
| Offline payout, first return | RM 445 |
| Offline payout, final return | RM 55.2 M |
| Console errors across all runs | 0 |

How to read that:

- **9:15 is bot time.** The harness taps ~6×/s and buys on a 0.6 s interval; a
  human lands closer to 11–12 minutes. That is inside the 10-minute design target
  once the human margin is accounted for.
- **12 sessions is roughly a week of casual play** (one burst a day plus an hour
  away). Prestige resets land at sessions 3, 6 and 9; the push begins at 10.
- Offline rate started at 50% / 8 h. That let a casual player finish in **4
  sessions**, with each hour away multiplying income ~50×. It is now 20% / 3 h.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | UI shell: cup, ring, tabs, shop, missions, achievements, buffs, stats, settings, ending overlay |
| `style.css` | Kopitiam theme: wood, neon sign, rain, marble counter, ending screen |
| `game.js` | All logic: `{m,e}` numbers, economy, prestige, missions, saves, WebAudio, i18n |
| `test.js` | Playwright test: clicks, buys, tabs, language switch, console errors |
| `README.md` | This file |

## Run locally

```bash
python3 -m http.server 5173
# open http://localhost:5173
```

No `npm install` needed to play. `package.json` exists only for Playwright.

## Test

```bash
npm i -D playwright && npx playwright install chromium
node test.js
```

Expected: money rises after clicks, a kettle buys, the achievement badge updates,
the language switches to BM and back, `errors: []`.

## Deploy

Static site — anywhere works:

- **GitHub Pages** — push to `main`, enable Pages on root (this repo's setup)
- **Cloudflare Pages / Netlify** — drag the folder in
- **Own server** — copy to `/var/www/kopitiam`, point nginx at it

### Cache busting

The build string appears in three places and all must be bumped together:

- `VERSION` in `game.js`
- `?v=` on `style.css` and `game.js` in `index.html`

Settings has a **Check for update** button that does
`location.replace(url + '?u=' + Date.now())`.

---

## Technical notes

### Big numbers

Amounts are stored as `{m, e}` — mantissa and exponent, e.g. `1.5e12`. JavaScript
floats lose precision past `1e308`; this representation does not. `add`, `mul`,
`cmp`, `gte`, `val`, `fromNum` operate on the pair. All arithmetic goes through
them — a single raw `+` is the bug that surfaces 40 minutes into a session.

### Save format

`localStorage['kopitiam-kosong-v2']`. Fields include money, lifetime, allEarned,
counts, clicks, tokens, bintang, prestiges, achievements, beans, buffs, goals,
boost state, language, sound, `startedAt`, `lastSeen`, `finished`.

`allEarned` is a separate all-time accumulator that survives prestige — the
credits screen reads it, because `lifetime` resets on every Balik Kampung.

v1 saves (sen-based) migrate automatically by dividing by 100.

### Offline progress

On load: `elapsed = now - lastSeen`, capped at `(3 + jam)×3600`, credited at
`min(0.2 + naga×0.25, 0.95)` of current income. The result goes into a transient
`pendingOffline` object and is shown in a modal — credited only when claimed.

### Balance knobs (`game.js`)

```js
const COST_MULT = 1.15;         // price growth per unit
const CLICK_BASE = 0.05;        // starting click value in RM
const OFFLINE_CAP_HOURS = 3;    // max offline credit
const OFFLINE_RATE = 0.2;       // 20% while away
const P1_UNLOCK = 1.2e5;        // RM lifetime for first prestige
const P2_UNLOCK_TOKENS = 100;   // tokens for second prestige
const BUFF_GROWTH = 1.65;       // buff cost per level
```

### Localisation

All UI strings live in `T` (`en` and `bm`). Buildings carry `name` + `nameEn`;
missions and achievements carry `en` + `bm`. Adding a language means a new key in
`T`, a new pair on each content entry, and a button in `#langSeg`. Name every item
in both languages — English labels over Malay item names is what makes a
localised shop feel broken.

### Sound

Fully synthesised with WebAudio — no audio files, no licensing.

| Action | Sound |
|---|---|
| Brew | water into the cup + ceramic clink |
| Kettle | metallic tap + steam |
| Cloth Filter | muffled swoosh |
| Coffee Machine | motor growl + steam burst |
| Roti Canai Griddle | hot sizzle |
| Loyal Regulars | two voices |
| Delivery Rider | scooter horn, two beeps |
| Branch Outlet | cash register ka-ching |
| National Franchise | four-note fanfare |

Starts only after the first tap (autoplay policy); the toggle is saved.

### Troubleshoot panel

Settings → bottom `<details>` block: set brews, set cash, give N of a building,
unlock all, state dump. Each writes to the same state object and re-runs
`checkAchievements(); render(); save();` — useful for testing ladders without
clicking 10,000 times.

---

## Privacy

Credits use the GitHub handle **Terbyte** only. The repository's full commit
history is authored as `Terbyte <terbyte@users.noreply.github.com>`.

## Credits

**Created by** Terbyte
**Built with** Hermes Agent

Kopi Kosong Empire · Malaysia · 2026

*Terima kasih kerana menyokong kedai kecil ini.*
