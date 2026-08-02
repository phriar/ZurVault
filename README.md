# ZurVault

zurvault.com — a small static site for browsing and displaying a Solana NFT comic-book collection (digital comics minted via candy.io, mostly DC titles). No build step, no package manager, no framework — each page is a single self-contained HTML file with inline CSS/JS.

## Pages

| File | What it does |
|---|---|
| `index.html` | Landing page. Live "For Sale" and "Recent Sales (7d)" feed across every tracked DC sub-collection. |
| `viewer.html` | Browse a wallet's full NFT collection as a searchable/filterable grid, with a lightbox and comic-reader entry point. |
| `slideshow.html` | Full-screen auto-advancing slideshow of a wallet's NFTs — also the kiosk/tablet display mode. |
| `comics.html` | Standalone in-browser comic reader (CBZ/CBR/image drag-drop, or loaded via `?url=` from viewer.html). |
| `candy-watcher.html` | Live/backfill dashboard watching Solana for new candy.io mint activity. |
| `discover.html` | **Internal tool, not linked from site nav.** Scans a wallet, resolves on-chain collections to Magic Eden symbols, and outputs a `DC_COLLECTIONS` config array to paste into `index.html`/`me-proxy-worker.js`. |
| `site-nav.js` | Shared top banner (injected via `<script>`) linking every page except `discover.html`, which is intentionally excluded — it's a builder tool, not a visitor feature. |
| `me-proxy-worker.js` | Source for the Cloudflare Worker (`zurvault-proxy.stholt.workers.dev`) that proxies Magic Eden and runs the scheduled DC-collections aggregation. **Deployed separately — see Configuration below.** |
| `CNAME` | GitHub Pages custom domain (`zurvault.com`). |

## Architecture

```
Browser ──> GitHub Pages (static HTML/CSS/JS, no build)
              │
              ├─ index.html ──> Cloudflare Worker: GET /v2/dc-summary
              │                   (reads pre-aggregated JSON from KV —
              │                    no Magic Eden calls in the request path)
              │
              ├─ viewer.html / slideshow.html ──> Helius RPC directly
              │                   (owned-NFT lookups, via a client-side key)
              │
              └─ discover.html / per-item lookups ──> Cloudflare Worker: GET /v2/...
                                  (pass-through proxy to Magic Eden, edge-cached)

Cloudflare Worker (zurvault-proxy)
  ├─ fetch()      — CORS + pass-through proxy to Magic Eden, Cache API (60s edge cache)
  │                 + the dedicated /v2/dc-summary route (serves from KV only)
  └─ scheduled()  — Cron Trigger, every 20 min: loops DC_COLLECTIONS, fetches
                     listings + 7-day activities per collection directly from
                     Magic Eden, aggregates, writes result to Workers KV
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
`viewer.html` and `slideshow.html` hardcode a Helius RPC key (`HELIUS_KEY`) client-side to fetch a connected/kiosk wallet's owned NFTs directly from Solana. This key is visible to anyone viewing page source — that's an accepted tradeoff of a purely static site with no backend for this particular feature, not an oversight. `discover.html` and `candy-watcher.html` instead prompt the user to paste their own key (kept session-only).

### DC_COLLECTIONS
The list of tracked sub-collections is a `{sub, symbol}` array that's **duplicated** in two places:
- `index.html` — needed instantly for the sub-collection filter dropdown, no network round-trip.
- `me-proxy-worker.js` — needed by the `scheduled()` cron handler, which runs independently of any page load.

**Whenever you resolve a new collection via `discover.html`, update both files.** They should stay byte-identical; nothing enforces that automatically.

## Things to remember

- **Worker changes need manual redeploy.** Committing/pushing `me-proxy-worker.js` to GitHub has zero effect on the live Worker until you paste it into the Cloudflare dashboard yourself.
- **`discover.html` is deliberately unlinked** from `site-nav.js`'s banner — it's your tool, not a visitor feature. It still works at its direct URL.
- **Kiosk mode** (`slideshow.html`, `viewer.html`): append `?wallet=<public-address>` to bypass Phantom entirely, or use the "Don't have Phantom? View with a public address instead" toggle on the connect screen — it saves the address to `localStorage` so a tablet only needs it entered once. `?reset=1` clears the saved kiosk wallet.
- **Be careful with UI near wallet-connect elements.** `slideshow.html` was once flagged by Google Safe Browsing under "Deceptive pages" because a visible wallet-address input sitting next to a "Connect Phantom" button structurally resembles wallet-drainer phishing kits — even though the site is 100% read-only. The fix (manual entry tucked behind a toggle, a prominent "we never ask for your seed phrase" disclaimer, a link to the public source) is the pattern to preserve in any future changes to that screen.
- **Rate limits, two layers**: Magic Eden's own (undocumented) limits, and the Worker's per-collection `caches.default` edge cache (60s TTL) that shields it from repeat calls. The cron aggregation calls Magic Eden directly in bounded concurrent batches (`BATCH_SIZE = 10`) — if you ever see a lot of failures in `dc-summary`'s `failed` array, this is the first thing to look at and tune.
- No test suite, linter, or formatter — verification is manual (see below).

## What's in use

- **Hosting**: GitHub Pages, custom domain via `CNAME`.
- **Proxy/compute**: Cloudflare Workers (`zurvault-proxy`), Workers KV, Cron Triggers.
- **Data sources**: Magic Eden public API (listings/activities, via the proxy), Helius RPC (owned-NFT lookups, direct from the browser).
- **Wallet**: Phantom (browser extension + mobile in-app browser), with a read-only kiosk mode that needs no wallet at all.
- **Assets**: arweave.net (NFT images, including the batcowl brand art), Google Fonts.
- **Libraries**: JSZip (via cdnjs, `comics.html` only) — otherwise no dependencies, no `node_modules`.
- **Explorers linked out to**: Magic Eden, Solscan, XRAY (Helius).

## Verifying things are working

**Local dev**: `python3 -m http.server 8000` from the repo root — `localhost:8000` is already in the Worker's `ALLOWED_ORIGINS`.

**Is the Worker's aggregation actually running?**
```
curl -s https://zurvault-proxy.stholt.workers.dev/v2/dc-summary | head -c 500
```
- `"notReady": true` → the Cron Trigger hasn't completed a successful run yet. Check it's configured (Worker → Settings → Triggers) and look at the Worker's execution logs for errors.
- Real data → check `updatedAt` is recent (within the last ~20-25 min). If it's stale, the cron is either not firing or failing — check the Cron Trigger's run history in the dashboard.
- A non-empty `failed` array lists sub-collection names whose fetch failed that run — occasional entries are normal (transient 429s); a consistently large list means `BATCH_SIZE` is too aggressive for Magic Eden's current tolerance and should be lowered.

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
