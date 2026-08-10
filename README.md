# ZurVault

zurvault.com — a small static site for browsing and displaying a Solana NFT comic-book collection (digital comics minted via candy.io, mostly DC titles). No build step, no package manager, no framework — each page is a single self-contained HTML file with inline CSS/JS.

## Pages

| File | What it does |
|---|---|
| `index.html` | Landing page. Neon hero (See Latest Drops / Browse the Long Box) above the live "For Sale" and "Recent Sales (7d)" feed across every tracked DC sub-collection. Grid/List view toggle. |
| `collections.html` / `collection.html` / `collections-map.js` / `character-map.js` | Two ways to browse on one page: a "Series" tab (`collections-map.js`, mostly mechanical `sub`-prefix matching, some entries derived from `character-map.js`'s curation instead — see that file's header) and a "Characters" tab (`character-map.js`, hand-curated — absorbed from the retired `characters.html`/`character.html`). Detail page handles both: `collection.html?s=bat-cowl` or `collection.html?c=batman`, each with `history`/`keyIssues` (series) or `highlights` (characters). |
| `artists.html` / `artist.html` | Same idea again, grouped by cover artist (`artist.html?a=Jim%20Lee`, matched on exact name). No static map — built live off `/v2/dc-summary` like `long-box.html`'s rarity filter, since Cover Artist varies per listing (variant covers), not per collection, the way character/series do. |
| `long-box.html` | Cross-collection "cheapest first" browse across every tracked collection at once — searchable min/max SOL price range, name search, and rarity tier filter (Common/Uncommon/Rare/Epic/Legendary, **For Sale only**, no rarity data available for sold items). Grid/List toggle. Absorbed the standalone rarity.html page — retired once this covered everything it did. |
| `dollar-bin.html` | The original, simpler "cheapest first" browse — revived 2026-08-10 by user request after `long-box.html` (its own later fork of the same file) replaced the 3 preset price buttons with a full search/rarity filter. Just "Under 0.05/0.1/0.25 SOL" pills + Grid/List toggle, deliberately minimal. Cross-linked with `long-box.html` and `index.html`. |
| `spotlight.html` / `spotlights-data.js` | Templated long-form write-up page (`spotlight.html?id=...`) for curated pieces about a specific comic. |
| `guide.html` | Static "how to buy on Magic Eden, then read on candy.io" walkthrough. |
| `comics.html` | Standalone in-browser comic reader (CBZ/CBR/image drag-drop, or loaded via `?url=`). Not in the primary nav — candy.io is the primary reading experience now, this is a fallback. |
| `candy-watcher.html` | Live/backfill dashboard watching Solana for new candy.io mint activity. Not in the primary nav — an internal/power-user tool. |
| `discover.html` | **Internal tool, not linked from site nav.** Scans a wallet, resolves on-chain collections to Magic Eden symbols, and outputs a `DC_COLLECTIONS` config array to paste into `index.html`/`me-proxy-worker.js`. |
| `site-nav.js` | Shared top banner (injected via `<script>`). Primary nav: Listings, Grails, Collections, Artists, Long Box, Dollar Bin, Spotlight, How To — `discover.html`, `comics.html`, and `candy-watcher.html` still work at their direct URLs but aren't in the banner. |
| `me-proxy-worker.js` | Source for the Cloudflare Worker (`zurvault-proxy.stholt.workers.dev`) that proxies Magic Eden and runs the scheduled DC-collections aggregation. **In this repo, but deployed separately by hand — see Configuration below, and the pending-deploy reminder in "Things to remember."** |
| `CNAME` | GitHub Pages custom domain (`zurvault.com`). |

## Architecture

```
Browser ──> GitHub Pages (static HTML/CSS/JS, no build)
              │
              ├─ index.html, collection.html, collections.html,     ┐
              │  artist.html, long-box.html, dollar-bin.html          ├─> Cloudflare Worker: GET /v2/dc-summary
              │  (each just filters/sorts the same merged            ┘   (reads pre-aggregated JSON from KV —
              │   response client-side — no per-page Worker route)       no Magic Eden calls in the request path)
              │
              └─ discover.html / per-item lookups ──> Cloudflare Worker: GET /v2/...
                                  (pass-through proxy to Magic Eden, edge-cached)

Cloudflare Worker (zurvault-proxy)
  ├─ fetch()      — CORS + pass-through proxy to Magic Eden, Cache API (60s edge cache)
  │                 + the dedicated /v2/dc-summary route (lists + merges every
  │                 collection:* KV entry, 30s edge cache on the merged result)
  │                 + /v2/__trigger-refresh?key=<symbol> debug endpoint
  └─ scheduled()  — Cron Trigger, every 20 min: loops DC_COLLECTIONS in small
                     concurrent batches, throttled to Magic Eden's real rate
                     limit, and writes each collection's own KV entry
                     (collection:{symbol}) independently the moment it
                     succeeds — one rate-limited collection has zero effect
                     on any other collection's data. Each listing written
                     also carries a normalized `rarity` field now (see the
                     pending-deploy reminder below) — buildDCSummary's merge
                     needed no changes for this since it passes whatever
                     fields exist straight through.
```

The key design point: `index.html` used to loop through ~200 collections client-side on every page load, which is what actually drove Worker request volume against Cloudflare's free tier (caching the Worker's *own* responses doesn't reduce request *count* — every invocation counts regardless of internal cache hits). That loop now runs **inside the Worker itself**, on its own schedule, decoupled from visitor traffic. The browser makes exactly one request (`/v2/dc-summary`) instead of ~400.

## Configuration

Nothing here is automated — GitHub Pages deploys the static files automatically on push to `main`, but **the Cloudflare Worker is a separate deployment you do by hand.** Pushing to this repo never touches the live Worker.

### GitHub Pages
- Deploys straight from `main`, no Actions workflow, no build step.
- Custom domain via `CNAME` → `zurvault.com`.

### Cloudflare Worker (`zurvault-proxy.stholt.workers.dev`)
1. Cloudflare dashboard → Workers & Pages → the Worker → paste the current `me-proxy-worker.js` → Deploy.
2. **KV namespace**, bound to the Worker as `DC_CACHE` (Worker → Settings → Variables → KV Namespace Bindings). Without this binding, `/v2/dc-summary` will error on every request.
3. **Cron Trigger**: `*/20 * * * *` (Worker → Settings → Triggers). Without this, `/v2/dc-summary` will keep returning the `notReady` state forever — nothing else populates KV.
4. `ALLOWED_ORIGINS` in the Worker source controls CORS: currently `https://zurvault.com`, `https://phriar.github.io`, and `http://localhost:8000` (for local dev). Add any new origin here before it'll work.

### Helius API key
`discover.html` and `candy-watcher.html` prompt the user to paste their own key (kept session-only, never persisted or hardcoded). No other page makes RPC calls of any kind.

### DC_COLLECTIONS
The list of tracked sub-collections is a `{sub, symbol}` array that's **duplicated** in two places:
- `index.html` — needed instantly for the sub-collection filter dropdown, no network round-trip.
- `me-proxy-worker.js` — needed by the `scheduled()` cron handler, which runs independently of any page load.

**Whenever you resolve a new collection via `discover.html`, update both files.** They should stay byte-identical; nothing enforces that automatically. Non-DC entries (a handful of MLB/sports-card promos previously got in by mistake) don't belong here — this site is DC only.

### character-map.js / collections-map.js
Both curated by hand — which `DC_COLLECTIONS` symbols belong to which character or series, plus curated highlight text per entry (`highlights` for characters, `history`/`keyIssues` for collections). Not derived automatically; see each file's header for what's deliberately left uncategorized (anthologies, crossover events, non-comic entries) and why. Both feed the same `collections.html`/`collection.html` pair now (Series tab/`?s=` vs. Characters tab/`?c=`) rather than two separate page pairs — and a handful of `collections-map.js` entries (batman, wonder-woman, green-lantern, aquaman) are themselves derived from `character-map.js`'s symbol lists rather than pure mechanical `sub`-prefix matching, because `DC_COLLECTIONS`' `sub` field is inconsistently formatted for those characters — see `collections-map.js`'s header for the full explanation.

### Cover Artist and Rarity have no static map — deliberately
Unlike character/series, both vary per individual listing rather than per collection (a collection with variant covers can span several different Cover Artist credits — confirmed live: `batman_2016_158` has 4 different variant artists alongside Jim Lee within the same collection). A static per-collection `artist-map.js` existed briefly and was deleted once this was discovered — sampling one listing per collection wrongly attributed every other variant's listings to whichever artist that one sample had. `artists.html`/`artist.html` and `long-box.html`'s rarity filter are all built the same way now: live off `/v2/dc-summary`, matching on each listing's own `coverArtists`/`rarity` field. Before adding a new "browse by X" page, check whether the attribute is actually constant across a collection before reaching for a static map.

## Things to remember

> **⚠️ Currently pending: `me-proxy-worker.js` needs another manual redeploy.** Three changes are sitting in git ahead of the live Worker: (1) `rarityPct` — the tier's fixed supply-distribution percentage, e.g. "Legendary, 4.8% of supply", where a collection's metadata includes it (`long-box.html` already renders it when present, it's just missing until deployed); (2) `coverArtists` on every listing, which `artists.html`/`artist.html` depend on **entirely** — without this deployed, those two pages will show empty/zero results, not stale-but-working data. Same paste-into-Cloudflare-dashboard step as always. This note should be deleted once that deploy has actually happened; if unsure, check both: `curl -s https://zurvault-proxy.stholt.workers.dev/v2/dc-summary | grep -o '"coverArtists":\[[^]]*\]' | head -3` and `| grep -o '"rarityPct":[0-9.]*' | head -1` — anything other than empty output on each means that piece is live.

- **Worker changes need manual redeploy.** Committing/pushing `me-proxy-worker.js` to GitHub has zero effect on the live Worker until you paste it into the Cloudflare dashboard yourself. This has bitten this project more than once — always double check after a Worker-touching change whether the deploy step actually happened, rather than assuming a `git push` covered it.
- **Primary nav** (`site-nav.js`): Listings, Grails, Collections, Artists, Long Box, Spotlight, How To, Slideshow — `discover.html`, `comics.html`, and `candy-watcher.html` are deliberately unlinked (not deleted, still fully functional at their direct URLs), as secondary/power-user tools outside the main collector experience. `characters.html`/`character.html` were retired outright (not just unlinked) — character browsing now lives inside `collections.html`/`collection.html`.
- **Slideshow feature — currently removed entirely, not just unlinked.** Google Safe Browsing flagged the original version under "Deceptive pages" — a visible wallet-address input sitting next to a "Connect Phantom" button structurally resembles wallet-drainer phishing kits to their classifier, even though the feature was 100% read-only. It was first replaced with a static "Coming Back Soon" placeholder (`slideshow.html`) while the old implementation (Phantom connect, `?wallet=<public-address>` kiosk mode, `localStorage`-persisted address, Helius lookups) lived on unlinked at `slideshow-legacy.html`. After a second, unrelated Safe Browsing flag on 2026-08-09, both files were removed from the repo entirely (unlinked from `site-nav.js` and deleted, not left reachable at their own direct URLs) and archived locally outside the repo instead. Requesting a review in Google Search Console (Security Issues) is required after any fix like this — the flag never clears on its own just because a page changed. **Don't recreate this feature without addressing the underlying UI pattern first.**
- **Rate limits, two layers**: Magic Eden's own (confirmed via a live 429: an explicit requests-per-minute limit), and the Worker's per-collection `caches.default` edge cache (60s TTL) that shields it from repeat calls. The cron aggregation calls Magic Eden directly in small concurrent batches (`BATCH_SIZE = 5`), globally throttled (`MAGIC_EDEN_MAX_REQUESTS_PER_SEC`) — if a collection's KV entry keeps going stale, check the Worker's logs (`refreshOneCollection` console.errors the real reason) or hit `/v2/__trigger-refresh?key=<symbol>` to test it directly.
- **Rarity is per-token, not per-collection** — it varies copy-to-copy within the same comic issue, unlike Character/Artist/Series which are fixed per issue. That's why it can't be captured in a static hand-curated map and instead has to flow through live: NFT metadata → (server-side) `me-proxy-worker.js`'s `normalizeRarity()` → `/v2/dc-summary` → `long-box.html`'s rarity filter. Different candy.io drops format the raw trait inconsistently (bare `"EPIC"`, `"Common (40.400)"` with a weight percentage, `"CORE"` as one drop's name for the base tier) — `normalizeRarity()` handles this once for every page that reads `/v2/dc-summary`.
- No test suite, linter, or formatter — verification is manual (see below).

## What's in use

- **Hosting**: GitHub Pages, custom domain via `CNAME`.
- **Proxy/compute**: Cloudflare Workers (`zurvault-proxy`), Workers KV, Cron Triggers.
- **Data sources**: Magic Eden public API (listings/activities, via the proxy), Helius RPC (owned-NFT lookups, direct from the browser).
- **Wallet**: no wallet integration currently deployed. The old Phantom integration (browser extension + mobile in-app browser, plus a read-only kiosk mode) is archived locally, outside the repo — see "Things to remember."
- **Assets**: arweave.net (NFT images, including the batcowl brand art), Google Fonts.
- **Libraries**: JSZip (via cdnjs, `comics.html` only) — otherwise no dependencies, no `node_modules`.
- **Explorers linked out to**: Magic Eden, Solscan, XRAY (Helius).

## Verifying things are working

**Local dev**: `python3 -m http.server 8000` from the repo root — `localhost:8000` is already in the Worker's `ALLOWED_ORIGINS`.

**Is the Worker's aggregation actually running?**
```
curl -s https://zurvault-proxy.stholt.workers.dev/v2/dc-summary | head -c 500
```
- `"notReady": true` → no `collection:*` KV entries exist at all yet (fresh deploy, or the Cron Trigger has never completed a successful run). Check it's configured (Worker → Settings → Triggers) and look at the Worker's execution logs for errors.
- Real data → check `updatedAt` (the *oldest* successfully-refreshed collection's timestamp, so "everything is at least this fresh") is reasonably recent. Each collection refreshes independently, so it's normal for this to lag the cron cadence somewhat rather than matching it exactly.
- To check one specific collection directly instead of the merged aggregate: `curl "https://zurvault-proxy.stholt.workers.dev/v2/__trigger-refresh?key=<symbol>"` — refreshes it on the spot and returns the real success/failure result.

**Has the `rarity` / `rarityPct` field been deployed yet?**
```
curl -s https://zurvault-proxy.stholt.workers.dev/v2/dc-summary | grep -o '"rarity":"[^"]*"' | head -3
curl -s https://zurvault-proxy.stholt.workers.dev/v2/dc-summary | grep -o '"rarityPct":[0-9.]*' | head -3
```
No output on the first means the live Worker predates `normalizeRarity()` entirely — `long-box.html`'s rarity filter will show 0 results for every tier. No output on the second (but the first works) means the tier data is live but the follow-up `rarityPct` change isn't yet — see the pending-deploy reminder above.

**Is the per-collection proxy cache working?**
```
curl -sI "https://zurvault-proxy.stholt.workers.dev/v2/collections/batman_19402011_1/listings" | grep -i x-zurvault-cache
```
Call it twice — first should be `MISS`, second (within 60s) should be `HIT`. Don't look for Cloudflare's own `cf-cache-status` header here; it doesn't reflect this Worker's internal Cache API usage (see the comment near the top of `me-proxy-worker.js`).

**Is the live site loading correctly?**
- Open `index.html` (or zurvault.com), check the status line at the top of the listings grid — it should show a listings/sales count and an "updated HH:MM" time, not an error.
- "Could not reach the listings service" → the Worker itself is unreachable, misconfigured CORS, or the KV binding is missing.
- "Still setting up" → see the `notReady` check above.
- A sub-collection that shows nothing in the dropdown filter but you know has real listings → verify the symbol directly: `curl https://zurvault-proxy.stholt.workers.dev/v2/collections/{symbol}/listings` — if that's empty/wrong, the symbol in `DC_COLLECTIONS` is probably stale and needs re-resolving via `discover.html`.

**Browser console**: all pages log fetch errors via `console.error` — check DevTools console first for any page that isn't behaving, before assuming it's a backend issue.
