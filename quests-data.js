/* ============================================================
   ZurVault Quest data — hand-updated weekly by Simon to mirror
   Candy's live Collection Quests (same weekly, collection-specific,
   deadline + reward shape as the MLB Gold Series quests). Read by
   quests.html only.

   Each `collections` entry is a bare Magic Eden `symbol` string (not
   a {sub, symbol} pair) — quests.html resolves the display label
   ("sub") the same live way grails.html joins market data, off
   GET /v2/dc-summary, rather than hand-duplicating a label here that
   could drift from DC_COLLECTIONS. If a symbol currently has no
   listings/sales in the live feed, quests.html falls back to showing
   the raw symbol as its label and logs a console.warn — same
   surfaced-not-silent convention grails.html uses for the same gap.

   `start` / `close` are ISO 8601 timestamps (UTC). A quest is:
     - upcoming  if now < start
     - active    if start <= now < close
     - closed    if now >= close
   quests.html computes this live on every load rather than a status
   field here, so a quest never goes stale just because nobody edited
   this file the moment it opened or closed.

   `requirementType` — OPEN QUESTION, not yet confirmed by Simon/Machew
   (see the build brief): does completing a multi-collection quest mean
   owning at least one of EACH required collection, or owning some
   total count across the list regardless of distribution? Two values
   are supported so both patterns can be modeled once confirmed:
     - "one-of-each": own >=1 copy from every symbol in `collections`.
       `requiredCount` is ignored/omitted.
     - "any-n": own >=1 copy each from any `requiredCount` distinct
       symbols in `collections` (order/identity of which ones doesn't
       matter, just the count of distinct collections touched).
   Also unconfirmed: whether ANY copy of a required collection
   qualifies, or only copies with a specific rarity/trait. Until
   Candy's verification rules are confirmed, quests.html checks plain
   collection membership only (does the wallet own >=1 asset resolving
   to that symbol) — see quests.html's computeQuestStatus().

   To add/update a quest: append or edit an entry below. Every symbol
   should also exist in DC_COLLECTIONS (index.html / me-proxy-worker.js)
   so its listings actually show up in /v2/dc-summary — a symbol Candy
   quests against that ZurVault doesn't track yet needs adding there
   first (see discover.html for resolving an unknown symbol).
   ============================================================ */
const QUESTS = [
  {
    id: "week-2026-08-18",
    title: "Dark Knight Roll Call",
    reward: "500 Candy Gold Points + entry into the weekly Legendary raffle",
    start: "2026-08-18T00:00:00Z",
    close: "2026-08-25T00:00:00Z",
    requirementType: "one-of-each",
    collections: [
      "absolute_batman_2024_1",
      "batman_2016_158",
      "batman_the_legacy_cowl_2022_3",
    ],
  },
  {
    id: "week-2026-08-25",
    title: "Justice League Assemble",
    reward: "750 Candy Gold Points",
    start: "2026-08-25T00:00:00Z",
    close: "2026-09-01T00:00:00Z",
    requirementType: "any-n",
    requiredCount: 2,
    collections: [
      "justice_league_unlimited_2024_1",
      "justice_league_unlimited_2024_2",
      "justice_league_unlimited_2024_3",
      "justice_league_20112016_1",
    ],
  },
];
