# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ZurVault (zurvault.com) is a static site for browsing and viewing a Solana NFT comic-book collection (DC Comics digital comics minted on-chain, largely via candy.io). There is no build step, no package manager, and no server-side code — every page is a single self-contained `.html` file with inline `<style>` and `<script>`. Deployment is just serving these files as static assets (e.g. GitHub Pages, per `CNAME`).

## Running locally

There's no dev server or build command. Open the HTML files directly in a browser, or serve the directory statically, e.g.:

```
python3 -m http.server 8000
```

There is no test suite, linter, or formatter configured in this repo.

## Pages

- `index.html` — landing page. Shows live Magic Eden listings across all known DC sub-collections (`DC_COLLECTIONS` array of `{sub, symbol}` pairs defined inline). Links out to Slideshow and Viewer.
- `discover.html` — a tooling page (not linked from primary nav) that scans a wallet's owned assets via Helius, groups them by on-chain collection, and attempts to resolve each to a Magic Eden symbol so the result can be pasted into `index.html`'s `DC_COLLECTIONS` array. Entries that fail to resolve are marked `UNRESOLVED_<mint-prefix>` and need manual lookup on Magic Eden.
- `viewer.html` — connects to a Phantom wallet (or a hardcoded wallet), fetches owned NFTs via Helius RPC, and renders them in a filterable/sortable grid or list with a lightbox. Detects comic-reader-compatible assets and links them into `comics.html`.
- `slideshow.html` — same underlying wallet/NFT-fetching approach as `viewer.html`, but presents the collection as an auto-advancing fullscreen slideshow (`INTERVAL`, currently 10s).
- `comics.html` — a standalone client-side comic reader. Accepts drag-and-drop images/CBZ/CBR (unpacked in-browser via JSZip) or a comic loaded from a URL query param (`?url=...&title=...`), as set by `viewer.html` for on-chain comic assets stored on Arweave.
- `candy-watcher.html` — a Solana transaction watcher/dashboard. Polls RPC for mint activity, flags assets by URI pattern (`candy.io`, `api.candy.io`, etc. via `CANDY_PATTERNS`) or Arweave-hosted metadata, and highlights "seeded" update authorities. Has a backfill mode for scanning a historical date range in batches.

## Architecture notes

- **No shared code between pages.** Each HTML file duplicates its own CSS and JS. When fixing a bug or updating a pattern (e.g. a fetch helper, a status-indicator widget, a card renderer), check whether the same pattern exists in the other files — `index.html`, `discover.html`, `viewer.html`, and `slideshow.html` all independently implement similar "fetch NFT/listing data → render grid" logic and are not kept in sync automatically.
- **Magic Eden calls go through a proxy.** Direct browser calls to Magic Eden's API are CORS-blocked, so `index.html` and `discover.html` route through a Cloudflare Worker at `https://zurvault-proxy.stholt.workers.dev/v2` (see the `ME_PROXY_BASE`/`ME_BASE` constants). The worker source (`me-proxy-worker.js`, referenced in code comments) is not part of this repo — it's deployed separately.
- **Solana RPC calls go directly to Helius**, not through the proxy. `viewer.html` and `slideshow.html` hardcode a Helius API key in a `HELIUS_KEY` constant; `candy-watcher.html` and `discover.html` instead prompt the user to paste their own key into an `<input type="password">` (kept session-only, not persisted).
- **`DC_COLLECTIONS` is the source of truth for which sub-collections are tracked.** It's a large inline array of `{ sub, symbol }` pairs in `index.html`, where `symbol` is a Magic Eden collection symbol. Entries with a `symbol` starting with `UNRESOLVED_` are intentionally skipped when fetching listings (no confirmed ME symbol yet) — resolve these via `discover.html` and paste the regenerated array back in.
- **Rate limiting is handled with fixed `sleep()` delays** between sequential API calls (e.g. 350ms between Magic Eden collection fetches, 600ms between symbol resolutions) rather than batching or backoff — preserve this pacing if adding more collections/calls to avoid getting rate-limited.
- Visual style is consistent across pages (dark background, violet/gold accent `#8f6fe8`, monospace + serif font pairing, subtle noise/grain overlay) but each page defines its own CSS from scratch rather than sharing a stylesheet.
