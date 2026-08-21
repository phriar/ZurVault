# ZurVault

zurvault.com — a small static site for browsing and displaying a Solana NFT comic-book collection (digital comics minted via candy.io, mostly DC titles). No build step, no package manager, no framework — each page is a single self-contained HTML file with inline CSS/JS.

## Pages

| File | What it does |
|---|---|
| `index.html` | Landing page. Neon hero (See Latest Drops / Browse the Long Box) above the live "For Sale" and "Recent Sales (7d)" feed across every tracked DC sub-collection. Grid/List view toggle. |
| `collections.html` / `collection.html` / `collections-map.js` / `character-map.js` | Two ways to browse on one page: a "Series" tab (`collections-map.js`, mostly mechanical `sub`-prefix matching, some entries derived from `character-map.js`'s curation instead — see that file's header) and a "Characters" tab (`character-map.js`, hand-curated — absorbed from the retired `characters.html`/`character.html`). Detail page handles both: `collection.html?s=bat-cowl` or `collection.html?c=batman`, each with `history`/`keyIssues` (series) or `highlights` (characters). |
| `artists.html` / `artist.html` | Same idea again, grouped by cover artist (`artist.html?a=Jim%20Lee`, matched on exact name). No static map — built live off `/v2/dc-summary` like `long-box.html`'s rarity filter, since Cover Artist varies per listing (variant covers), not per collection, the way character/series do. |
| `long-box.html` | Cross-collection "cheapest first" browse across every tracked collection at once — searchable min/max SOL price range, name search, rarity tier filter (Common/Uncommon/Rare/Epic/Legendary, **For Sale only**, no rarity data available for sold items), and an Item Type filter (added 2026-08-19 — Collectible/Pack/Comic/etc., built dynamically from whatever values are actually live rather than a fixed list, and hidden entirely when fewer than 2 types are present). Grid/List toggle. Absorbed the standalone rarity.html page — retired once this covered everything it did. |
| `dollar-bin.html` | The original, simpler "cheapest first" browse — revived 2026-08-10 by user request after `long-box.html` (its own later fork of the same file) replaced the 3 preset price buttons with a full search/rarity filter. Just "Under 0.05/0.1/0.25 SOL" pills + Grid/List toggle, deliberately minimal. Cross-linked with `long-box.html` and `index.html`. |
| `packs.html` | Added 2026-08-19, promoted to the primary nav the same day. Cross-collection "cheapest first" browse scoped to `itemType === 'Pack'` listings only — modeled directly on `dollar-bin.html` (Grid/List toggle, name/collection search instead of price pills, no Worker changes needed since `itemType` already flows through `/v2/dc-summary`). **For Sale only, no Sold tab** — Magic Eden's sales/activity data doesn't carry item-type attributes the way listings do (same gap Rarity already has for sold items), so a "Recently Sold Packs" view isn't buildable from what this site currently tracks; deliberately not attempted rather than built half-right. |
| `dashboard.html` | Added 2026-08-15. Cross-collection floor-price trend dashboard — one sparkline row per tracked collection, sorted by biggest mover, so a daily market checkup doesn't require opening a tab per collection. Magic Eden only (no Tensor integration), via the Worker's `GET /v2/dc-history`. **Not yet in the primary nav** — same unlinked-but-fully-functional pattern as `discover.html`/`candy-watcher.html`, while it's being ironed out. History can't be backfilled (Magic Eden's API has no historical floor-price data) and is written once per UTC day, so expect one flat point per collection for the first day or two, real %-change readings from day 3, and a genuine ~7-day "biggest movers" signal only after about a week — see "Things to remember." |
| `spotlight.html` / `spotlights-data.js` | Templated long-form write-up page (`spotlight.html?id=...`) for curated pieces about a specific comic. |
| `guide.html` | Static "how to buy on Magic Eden, then read on candy.io" walkthrough. |
| `comics.html` | Standalone in-browser comic reader (CBZ/CBR/image drag-drop, or loaded via `?url=`). Not in the primary nav — candy.io is the primary reading experience now, this is a fallback. |
| `candy-watcher.html` | Live/backfill dashboard watching Solana for new candy.io mint activity. Not in the primary nav — an internal/power-user tool. |
| `discover.html` | **Internal tool, not linked from site nav.** Scans a wallet, resolves on-chain collections to Magic Eden symbols, and outputs a `DC_COLLECTIONS` config array to paste into `index.html`/`me-proxy-worker.js`. |
| `site-nav.js` | Shared top banner (injected via `<script>`). Primary nav (as of 2026-08-19): Listings, Artists, Long Box, Dollar Bin, Packs, How To — `discover.html`, `comics.html`, `candy-watcher.html`, `click-stats.html`, `dashboard.html`, `grails.html`, `collections.html`, and `spotlight.html` still work at their direct URLs (and via cross-links from other pages) but aren't in the banner. |
| `click-stats.html` | Added pre-2026-08-16, expanded that date and 2026-08-18. Outbound-click and conversion analytics — every click on a Magic Eden listing/sale card, individually, via the Worker's `GET /v2/click-stats`. Daily/hourly/day-of-week activity charts, a weekly click-to-possible-sale conversion chart, a Top Clicked Listings leaderboard (cover art enriched client-side from `/v2/dc-summary`), a per-collection conversion-rate breakdown, and a Possible-Sale Volume block (possible sales, rate, SOL volume, estimated USD volume via a live Coinbase spot price) — the "buyer activity flowing through the ecosystem" figure. A "Tracking since &lt;date&gt;" line sits under the headline counts so the 90-day/12-week window labels don't visually overstate how much history has actually accumulated yet. Written to double as a real report (not just an internal debug page) — explicitly scoped to click/conversion data only; session duration, page views, and visitor counts aren't instrumented anywhere on this site. **Not in the primary nav** — same unlinked-but-fully-functional pattern as `discover.html`/`candy-watcher.html`/`dashboard.html`. |
| `me-proxy-worker.js` | Source for the Cloudflare Worker (`zurvault-proxy.stholt.workers.dev`) that proxies Magic Eden and runs the scheduled DC-collections aggregation. **In this repo, but deployed separately by hand — see Configuration below, and "Currently pending" in "Things to remember."** |
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
              ├─ dashboard.html ─────────────────────────────────────> Cloudflare Worker: GET /v2/dc-history
              │  (unlinked from nav for now — see "Things to               (lists + merges every history:{symbol}
              │   remember"; reads a separate per-collection history        KV blob, same edge-cache pattern as
              │   blob, not dc-summary's live snapshot)                     dc-summary but its own cache key)
              │
              └─ discover.html / per-item lookups ──> Cloudflare Worker: GET /v2/...
                                  (pass-through proxy to Magic Eden, edge-cached)

Cloudflare Worker (zurvault-proxy)
  ├─ fetch()      — CORS + pass-through proxy to Magic Eden, Cache API (60s edge cache)
  │                 + /v2/dc-summary (lists + merges every collection:* KV
  │                 entry, 30s edge cache) + /v2/dc-history (same list+merge+
  │                 edge-cache pattern, over history:* KV entries instead,
  │                 own cache key so the two never collide)
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
                     fields exist straight through. Also derives that day's
                     floor price from the same listings (no extra Magic
                     Eden calls) and writes/overwrites one point in
                     history:{symbol} — one point per UTC calendar day, not
                     per cron cycle, added 2026-08-15 for dashboard.html.
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

### Cover Artist, Rarity, and Item Type have no static map — deliberately
Unlike character/series, all three vary per individual listing rather than per collection (a collection with variant covers can span several different Cover Artist credits — confirmed live: `batman_2016_158` has 4 different variant artists alongside Jim Lee within the same collection; Item Type similarly confirmed live: `tales_of_the_teen_titans_19801988_44` has both `Collectible` and `Pack` listings live at once). A static per-collection `artist-map.js` existed briefly and was deleted once this was discovered — sampling one listing per collection wrongly attributed every other variant's listings to whichever artist that one sample had. `artists.html`/`artist.html`, `long-box.html`'s rarity filter, and `long-box.html`'s Item Type filter (added 2026-08-19, see `extractItemType()` in `me-proxy-worker.js`) are all built the same way now: live off `/v2/dc-summary`, matching on each listing's own `coverArtists`/`rarity`/`itemType` field. Item Type's filter pills are built dynamically from whatever distinct values are actually present in the current data (`buildItemTypePills()`) rather than a fixed list like rarity's — candy.io drops aren't guaranteed to use consistent vocabulary here the way the 5 rarity tiers are. Before adding a new "browse by X" page, check whether the attribute is actually constant across a collection before reaching for a static map.

## Things to remember

> **⚠️ Currently pending: `me-proxy-worker.js` needs another manual redeploy.** Confirmed still not live as of 2026-08-19 (`curl .../v2/click-stats | grep solUsdPrice` still returns `null`). Three changes stacked up since the last confirmed deploy:
> 1. `/v2/click-stats` additional fields: `byHour`, `byWeekday`, `topListings`, `collectionBreakdown` (existing `click:*`/`sale:*` KV scans, no new reads/writes) and `possibleSaleCount`, `possibleSaleVolumeSol`, `possibleSaleVolumeUnknownCount`, `solUsdPrice`, `possibleSaleVolumeUsd`, `earliestClickDay` (GMV feature — also changes `sale:*` KV key format going forward to `sale:{symbol}:{mint}:{soldAt}:{price}`; sales written before this deploys won't have a price captured, no backfill possible).
> 2. SOL/USD price source switched from CoinGecko (confirmed reliably returning nothing when called from this Worker) to Coinbase's public spot-price endpoint.
> 3. `itemType` added to every listing (`extractItemType()`), which `long-box.html`'s new Item Type filter depends on entirely — until deployed, that filter row just won't appear (fewer than 2 distinct types ever seen, since the field doesn't exist yet).
> 4. `dc3_super_power_packs_series_villains`'s `sub` fixed from `"Green Lantern 52 428"` (a stray single-sample label — see `DC_COLLECTIONS`' comment there) to `"DC Super Power Packs: Villains"`, so its Penguin/Flash-villain listings stop showing up under a "Green Lantern" search on `long-box.html`. Until redeployed, live listings from this collection still carry the old mislabeled `sub`.
>
> `click-stats.html` and `long-box.html` already expect all of the above; until redeployed the new sections/filters just render empty or stay hidden — no errors, just quietly incomplete. This note should be deleted once the deploy has actually happened; if unsure, check: `curl -s https://zurvault-proxy.stholt.workers.dev/v2/click-stats | grep -o '"solUsdPrice":[0-9.]*'` (a real number, not `null`/missing, means the Coinbase switch is live) and `curl -s https://zurvault-proxy.stholt.workers.dev/v2/dc-summary | grep -o '"itemType":"[^"]*"' | sort -u` (any output means itemType is live).

- **`click-stats.html` breakdowns (added 2026-08-17).** `topListings` groups `listingClicks` by mint (not by individual click) and sorts by click count — "what people actually want," not just a chronological feed. `collectionBreakdown`'s `conversionRate` is `possibleSales ÷ listingClicks` (listing-level clicks only — collection-level "browse" clicks have no single sale to attribute) and is explicitly `null`, never a fake `0`, for a collection with no listing-level clicks yet; `click-stats.html` renders that as a dash. Cover art/titles on the Top Clicked Listings leaderboard come from a client-side lookup against `/v2/dc-summary` (click data itself only ever stores `symbol`+`mint`, see `/v2/click-log`) — refetched independently on a slower 5-minute interval since it's cosmetic-only enrichment, not the 45s interval the click data itself refreshes on.
- **Item Type filter on `long-box.html` (added 2026-08-19).** Discovered because a user's own wallet started receiving "Pack" items and asked whether the site could surface those — turned out `Item Type` (`Collectible`/`Pack`/`Comic` seen so far) is a per-token attribute like Rarity/Cover Artist, not a separate product needing its own `DC_COLLECTIONS` entries; `extractItemType()` just needed to exist. Filter pills are built fresh on every page load from whatever distinct `itemType` values are actually present (`buildItemTypePills()` in `long-box.html`) and the whole pill row hides itself when fewer than 2 types are live — most collections are 100% `Collectible` right now, so don't be surprised if the filter is invisible on a typical visit; it's not broken, there's just nothing to filter yet for that particular data snapshot.
- **Possible-Sale GMV (added 2026-08-18).** `sale:*` KV values now carry the sale price *in the key itself* (`sale:{symbol}:{mint}:{soldAt}:{price}`), not the value — same "encode everything in the key, no per-entry `.get()` on read" pattern the rest of this KV namespace already uses, so the GMV total stays a pure `.list()` scan. `possibleSaleCount`/`possibleSaleVolumeSol` are deduped **per underlying sale, not per click** (`matchedSales` in `/v2/click-stats`) — a listing viewed by several people right before it sells is one sale, so summing per-click would double-count its price. This means `possibleSaleCount` can differ from (usually be ≤) the click-based "possible sale" counts still used by the Weekly Conversion chart and `recentListingClicks`' `possibleSale` flags, which intentionally weren't changed to this semantics — they're about click-cohort behavior over time, a different and still-valid question from "how much real commerce did this drive." USD is a rough estimate: `getSolUsdPrice()` fetches Coinbase's current spot price (edge-cached 10 min, `me-proxy-worker.js`) — not CoinGecko, which was tried first and confirmed (2026-08-18) to reliably return nothing when called from this Worker, consistent with CoinGecko's known rate-limiting of shared cloud/edge IP ranges — applied to every sale regardless of its actual date, not a historical per-sale rate. `click-stats.html`'s "Tracking since" line uses `earliestClickDay` (oldest day currently in the 90-day KV window) specifically so the "(90d window)" label doesn't visually imply months of history while the product is new — see the comment on that field in the Worker for why it's *not* a fixed launch-date constant and what that means once the window actually fills up.
- **Buyer wallet address on sales (added 2026-08-16, confirmed live).** `deriveSales()` captures `buyer` from Magic Eden's own `activities` response (no new API call — the field was already in the payload). `index.html`/`collection.html`'s Sold tabs show it as "Sold to `<shortMint(buyer)>`", falling back to the old mint-based label when `buyer` is absent (older cached sales written before this deployed). **Always abbreviated, in both list and grid view** — a full unabbreviated address was shipped briefly (2026-08-16-17) and reverted 2026-08-18 after zurvault.com got hit with a Google Safe Browsing "Social Engineering" flag; the full address was the prime suspect (same "address displayed next to a price/transaction" pattern the `slideshow.html` incident already burned this site on once), though the flagged sample URLs (`grails.html`, `long-box.html`) don't actually contain any buyer-address code, so this is a strong lead, not a confirmed root cause — see the entry below.
- **Worker changes need manual redeploy.** Committing/pushing `me-proxy-worker.js` to GitHub has zero effect on the live Worker until you paste it into the Cloudflare dashboard yourself. This has bitten this project more than once — always double check after a Worker-touching change whether the deploy step actually happened, rather than assuming a `git push` covered it.
- **Primary nav** (`site-nav.js`, as of 2026-08-19): Listings, Artists, Long Box, Dollar Bin, Packs, How To. `discover.html`, `comics.html`, `candy-watcher.html`, `click-stats.html`, and `dashboard.html` are secondary/power-user tools or in-progress pages that were never linked in the first place. `grails.html`, `collections.html`, and `spotlight.html` joined the unlinked group 2026-08-19 by user request — not deleted, still fully functional at their direct URLs and via cross-links from other pages (e.g. `index.html`'s spotlight teaser), just removed from the persistent top banner. `characters.html`/`character.html` were retired outright (not just unlinked) — character browsing now lives inside `collections.html`/`collection.html`.
- **Third Safe Browsing flag, 2026-08-18 — "Social Engineering," domain-wide.** Chrome started showing "Dangerous site" for `zurvault.com` itself (both http/https root), plus `grails.html` and `long-box.html` as Google's sampled evidence URLs. Prime suspect: the full, unabbreviated buyer wallet address shipped 2026-08-16 in `index.html`/`collection.html`'s Sold list view (same "address displayed next to a price/transaction" shape as the `slideshow.html` incident below) — reverted 2026-08-18 back to the always-abbreviated `shortMint()` form. **Not confirmed as root cause**: neither sampled URL (`grails.html`, `long-box.html`) actually contains buyer-address code — `long-box.html` has no sales/buyer data at all — which fits a domain-wide flag with arbitrary crawled-page samples better than one specific offending page. Whatever the true cause, **the code fix alone does not clear the flag** — same lesson as below, a Google Search Console (Security Issues) review request is required and hasn't been done as of this note. If this recurs after the review clears, treat any UI element that pairs a wallet/mint address with a price or "sold/transaction" word as suspect first, abbreviated or not.
- **Slideshow feature — currently removed entirely, not just unlinked.** Google Safe Browsing flagged the original version under "Deceptive pages" — a visible wallet-address input sitting next to a "Connect Phantom" button structurally resembles wallet-drainer phishing kits to their classifier, even though the feature was 100% read-only. It was first replaced with a static "Coming Back Soon" placeholder (`slideshow.html`) while the old implementation (Phantom connect, `?wallet=<public-address>` kiosk mode, `localStorage`-persisted address, Helius lookups) lived on unlinked at `slideshow-legacy.html`. After a second, unrelated Safe Browsing flag on 2026-08-09, both files were removed from the repo entirely (unlinked from `site-nav.js` and deleted, not left reachable at their own direct URLs) and archived locally outside the repo instead. Requesting a review in Google Search Console (Security Issues) is required after any fix like this — the flag never clears on its own just because a page changed. **Don't recreate this feature without addressing the underlying UI pattern first.**
- **Rate limits, two layers**: Magic Eden's own (confirmed via a live 429: an explicit requests-per-minute limit), and the Worker's per-collection `caches.default` edge cache (60s TTL) that shields it from repeat calls. The cron aggregation calls Magic Eden directly in small concurrent batches (`BATCH_SIZE = 5`), globally throttled (`MAGIC_EDEN_MAX_REQUESTS_PER_SEC`) — if a collection's KV entry keeps going stale, check the Worker's logs (`refreshOneCollection` console.errors the real reason) or hit `/v2/__trigger-refresh?key=<symbol>` to test it directly.
- **Rarity is per-token, not per-collection** — it varies copy-to-copy within the same comic issue, unlike Character/Artist/Series which are fixed per issue. That's why it can't be captured in a static hand-curated map and instead has to flow through live: NFT metadata → (server-side) `me-proxy-worker.js`'s `normalizeRarity()` → `/v2/dc-summary` → `long-box.html`'s rarity filter. Different candy.io drops format the raw trait inconsistently (bare `"EPIC"`, `"Common (40.400)"` with a weight percentage, `"CORE"` as one drop's name for the base tier) — `normalizeRarity()` handles this once for every page that reads `/v2/dc-summary`.
- No test suite, linter, or formatter — verification is manual (see below).
- **`dashboard.html` / `history:{symbol}` price history (added 2026-08-15).** One floor-price point per collection per UTC calendar day, written by the same `scheduled()` cron cycle that already fetches listings — no extra Magic Eden calls. Deliberately *not* one KV key per day (like `sale:*`/`click:*`); it's one blob per collection, appended/overwritten in place, so `/v2/dc-history` can list+merge it the same cheap way `/v2/dc-summary` already does. There's no way to backfill — Magic Eden's API has no historical floor-price data — so a fresh deploy always starts from a single flat point per collection. The dashboard's %-change badge and "Biggest Movers" sort intentionally show nothing (`Gathering history…`) until a collection has ≥3 daily points (day 3+ after deploy), and the comparison isn't a genuine 7-day reading until ~a week of cron cycles has actually run. Not linked from `site-nav.js` yet on purpose — check back in about a week before promoting it into `PAGES`.

## What's in use

- **Hosting**: GitHub Pages, custom domain via `CNAME`.
- **Proxy/compute**: Cloudflare Workers (`zurvault-proxy`), Workers KV, Cron Triggers.
- **Data sources**: Magic Eden public API (listings/activities, via the proxy), Helius RPC (owned-NFT lookups, direct from the browser).
- **Wallet**: no wallet integration currently deployed. The old Phantom integration (browser extension + mobile in-app browser, plus a read-only kiosk mode) is archived locally, outside the repo — see "Things to remember."
- **Assets**: arweave.net (NFT images, including the batcowl brand art), Google Fonts.
- **Libraries**: JSZip (via cdnjs, `comics.html` only) — otherwise no dependencies, no `node_modules`.
- **Explorers linked out to**: Magic Eden, Solscan, XRAY (Helius).

## Verifying things are working

**A pushed static-file change (`.html`/`.js`, not the Worker) not showing up on zurvault.com after GitHub Pages should have deployed?** Discovered 2026-08-19 (`site-nav.js` edit): the custom domain sits behind Cloudflare's CDN cache — response headers show `cf-cache-status: HIT` and `cache-control: max-age=14400` (4 hours) for static assets, a completely separate caching layer from the Worker's own `caches.default` edge cache described elsewhere in this doc. GitHub Pages' origin can have the new file within seconds of a push while zurvault.com keeps serving a stale cached copy for up to 4 hours. To confirm the origin actually has the new content without waiting: `curl "https://zurvault.com/path/to/file.js?cachebust=$(date +%s)"` — a query string Cloudflare hasn't cached under forces a fresh fetch from origin. If that shows the right content, the deploy worked and it's purely a cache-freshness wait (or a manual Cloudflare dashboard cache purge) standing between it and a normal browser visit — not a real bug.

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
No output on the first means the live Worker predates `normalizeRarity()` entirely — `long-box.html`'s rarity filter will show 0 results for every tier. No output on the second (but the first works) means the tier data is live but the follow-up `rarityPct` change isn't yet. (Both are confirmed live as of 2026-08-16 — this check is kept as a general diagnostic, not because it's currently pending.)

**Has the `buyer` field on sales been deployed yet?**
```
curl -s https://zurvault-proxy.stholt.workers.dev/v2/dc-summary | grep -o '"buyer":"[^"]*"' | head -3
```
No output means the live Worker predates this change — `index.html`/`collection.html`'s Sold tabs will fall back to showing the mint address ("Sold · `<mint>`") instead of the buyer's wallet ("Sold to `<buyer>`"), which is the intended graceful-degradation behavior, not a bug. (Confirmed live as of 2026-08-16.) Note a collection with zero sales in the current 7-day window will also show no output here even once deployed — check a couple of collections before concluding it's not live. A `collection:*` KV entry only picks up the field once it's actually refreshed after the deploy — if a check right after deploying still shows nothing, force one collection through immediately with `curl "https://zurvault-proxy.stholt.workers.dev/v2/__trigger-refresh?key=<symbol>"` rather than waiting for the next cron cycle or assuming the deploy didn't take.

**Have the new `click-stats.html` breakdowns been deployed yet?**
```
curl -s https://zurvault-proxy.stholt.workers.dev/v2/click-stats | grep -o '"topListings":\[[^]]*\]' | head -c 200
```
Empty output means the live Worker predates this change — `click-stats.html`'s Browsing Patterns charts, Top Clicked Listings, and Conversion Rate by Collection sections will just render empty/zero, everything else on the page (daily chart, weekly conversion, recent clicks feed) keeps working as before. `[]` (present but empty) with real click data elsewhere is unusual — check whether any clicks in the current window have a real mint (not just `_collection`-sentinel collection-level clicks).

**Is the Possible-Sale GMV feature capturing real prices, or just zeros?**
```
curl -s https://zurvault-proxy.stholt.workers.dev/v2/click-stats | grep -o '"possibleSaleVolumeSol":[0-9.]*'
```
`0` is expected and correct if there haven't been any possible-sale events since this deployed yet (price capture can't backfill sales that happened before the `sale:*` key format changed) — not a bug. To confirm the feature itself is wired up rather than just quiet: `curl -s https://zurvault-proxy.stholt.workers.dev/v2/click-stats | grep -o '"solUsdPrice":[0-9.]*'` should show a real, current-looking SOL price (Coinbase spot price, edge-cached 10 min) — `null`/missing here means the price fetch itself is failing (check the Worker's execution logs for `getSolUsdPrice failed:`), not that there's no possible-sale data yet.

**Is the price-history feature (`dashboard.html`) actually running?**
```
curl -s https://zurvault-proxy.stholt.workers.dev/v2/dc-history | head -c 500
```
- `"notReady": true` or `"collections": []` → no `history:*` KV entries exist yet — either the Worker deploy with this feature hasn't happened, or the cron hasn't completed a cycle since it did.
- Real data → each collection's `points` array should have exactly one entry per UTC calendar day since deploy (not one per 20-min cron cycle — same-day writes overwrite in place). To force one collection through immediately instead of waiting for the cron: `curl "https://zurvault-proxy.stholt.workers.dev/v2/__trigger-refresh?key=<symbol>"` then re-curl `dc-history` and confirm that symbol shows up with today's date.
- Fewer than 3 points for a given collection is expected and not a bug — `dashboard.html` intentionally shows "Gathering history…" instead of a %-change badge until then.

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
