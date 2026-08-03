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

- `index.html` — landing page. Shows live Magic Eden listings + recent sales across all known DC sub-collections (`DC_COLLECTIONS` array of `{sub, symbol}` pairs defined inline), fetched from the Worker's `GET /v2/dc-summary` (see below) rather than calling Magic Eden per-collection itself.
- `characters.html` / `character.html` — the collector-facing front end: a directory of characters (Batman, Superman, etc., from `character-map.js`) and a templated per-character page (`character.html?c=batman`) showing that character's For Sale / Recently Sold, filtered from the same `/v2/dc-summary` data `index.html` uses.
- `spotlight.html` / `spotlights-data.js` — templated long-form write-up page (`spotlight.html?id=...`) for curated pieces about a specific comic.
- `guide.html` — static "how to buy on Magic Eden, then read on candy.io" walkthrough.
- `discover.html` — a tooling page (not linked from primary nav) that scans a wallet's owned assets via Helius, groups them by on-chain collection, and attempts to resolve each to a Magic Eden symbol so the result can be pasted into `index.html`'s `DC_COLLECTIONS` array (and `me-proxy-worker.js`'s copy — see below). Entries that fail to resolve are marked `UNRESOLVED_<mint-prefix>` and need manual lookup on Magic Eden.
- `slideshow.html` — connects to a Phantom wallet (or a `?wallet=` kiosk address, see Configuration in README.md) and presents the collection as an auto-advancing fullscreen slideshow (`INTERVAL`, currently 10s) — meant for reusing an old tablet as a physical "cover frame" display.
- `comics.html` — a standalone client-side comic reader. Accepts drag-and-drop images/CBZ/CBR (unpacked in-browser via JSZip) or a comic loaded from a URL query param (`?url=...&title=...`). candy.io is the primary reading experience going forward; this remains as a standalone fallback.
- `candy-watcher.html` — a Solana transaction watcher/dashboard. Polls RPC for mint activity, flags assets by URI pattern (`candy.io`, `api.candy.io`, etc. via `CANDY_PATTERNS`) or Arweave-hosted metadata, and highlights "seeded" update authorities. Has a backfill mode for scanning a historical date range in batches.
- `me-proxy-worker.js` — source for the Cloudflare Worker (`zurvault-proxy.stholt.workers.dev`). **In this repo, but not auto-deployed** — pushing to GitHub only updates the static pages via GitHub Pages; the Worker itself is redeployed by hand (paste into the Cloudflare dashboard). See README.md for the full configuration/deploy story.

## Architecture notes

- **Some shared code, most pages still standalone.** `site-nav.js` (top banner), `character-map.js`, and `spotlights-data.js` are genuinely shared includes. Beyond that, each HTML file still duplicates its own CSS and JS — when fixing a bug or updating a pattern (a fetch helper, a status-indicator widget, a card renderer), check whether the same pattern exists in other files, since they're not kept in sync automatically.
- **Magic Eden calls go through a proxy, and the ~200-collection scan runs server-side.** Direct browser calls to Magic Eden's API are CORS-blocked, so pages route through a Cloudflare Worker at `https://zurvault-proxy.stholt.workers.dev` (`ME_PROXY_BASE`/`ME_BASE` constants). `index.html` and `character.html` don't loop through collections client-side at all anymore — the Worker's `scheduled()` Cron Trigger does that itself (see `me-proxy-worker.js`), writing one KV entry per collection, and `GET /v2/dc-summary` merges them into the response the frontend reads.
- **Solana RPC calls go directly to Helius**, not through the proxy. `slideshow.html` hardcodes a Helius API key in a `HELIUS_KEY` constant; `candy-watcher.html` and `discover.html` instead prompt the user to paste their own key into an `<input type="password">` (kept session-only, not persisted).
- **`DC_COLLECTIONS` is duplicated by hand** in `index.html` (drives the sub-collection filter UI instantly) and `me-proxy-worker.js` (the Cron Trigger needs its own copy). Entries with a `symbol` starting with `UNRESOLVED_` are intentionally skipped (no confirmed ME symbol yet) — resolve these via `discover.html` and update both copies.
- **`character-map.js`** curates which `DC_COLLECTIONS` symbols belong to which character — not mechanically derived, hand-reviewed. See its file header for what's deliberately left uncategorized (anthologies, crossover events, non-comic entries) and why.
- Visual style is consistent across pages (dark background, violet accent palette `--gold`/`--deep`/`--cyan`, monospace + serif font pairing, subtle noise/grain overlay) but most pages still define their own CSS from scratch rather than sharing a stylesheet.
