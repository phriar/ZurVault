/* ============================================================
   ZurVault collections (comic series) map — shared by collections.html
   and collection.html. Same pattern as character-map.js, but grouped by
   series/imprint instead of character.

   Starting with DC's "Absolute Universe" line — unlike the character
   mapping, this grouping is mechanical: every symbol here is identified
   just by its `sub` label in DC_COLLECTIONS literally starting with
   "Absolute"/"Abs ". The one deliberate exclusion: "Absolute Power
   (2024)" (symbol dc3_super_power_packs_series_absolute_power) is a
   separate 2024 crossover *event* miniseries, not part of the ongoing
   Absolute Universe imprint these five titles belong to — don't add it
   here even though the name matches.

   `blurb` claims are a first draft, not verified fact — same caveat as
   guide.html. Creative-team credits are only named where confidence is
   solid (Batman/Superman/Wonder Woman); Flash and Martian Manhunter are
   kept general on purpose. Verify before treating as authoritative.

   To add a new series: add an entry below (id should be url-safe), then
   link to it from collections.html.
   ============================================================ */
const COLLECTIONS_MAP = {
  "absolute-batman": {
    name: "Absolute Batman",
    blurb:
      "Part of DC's \"Absolute Universe\" line launched in late 2024 — an alternate-universe reimagining of Batman's origin, written by Scott Snyder with art by Nick Dragotta. One of the line's flagship titles and widely reported as one of DC's best-reviewed and best-selling launches in years.",
    symbols: [
      "absolute_batman_2024_1", "absolute_batman_2024_2", "absolute_batman_2024_3",
      "absolute_batman_2024_4", "absolute_batman_2024_5", "absolute_batman_2024_6",
      "absolute_batman_2024_7", "absolute_batman_2024_8", "absolute_batman_2024_9",
      "absolute_batman_2024_10", "absolute_batman_2024_11", "absolute_batman_2024_12",
      "absolute_batman_ashcan_special_edition_2024_1",
    ],
  },
  "absolute-superman": {
    name: "Absolute Superman",
    blurb:
      "Also part of the Absolute Universe launch — a reimagined take on Superman's origin, written by Jason Aaron with art by Rafa Sandoval. Released alongside Absolute Batman and Absolute Wonder Woman as one of the line's founding titles.",
    symbols: [
      "absolute_superman_2024_1", "absolute_superman_2024_2", "absolute_superman_2024_4",
      "absolute_superman_2024_5", "absolute_superman_2024_6",
    ],
  },
  "absolute-wonder-woman": {
    name: "Absolute Wonder Woman",
    blurb:
      "The third of the Absolute Universe's founding titles — a reimagined Wonder Woman written by Kelly Thompson with art by Hayden Sherman.",
    symbols: [
      "absolute_wonder_woman_2024_1", "absolute_wonder_woman_2024_2",
      "absolute_wonder_woman_2024_3", "absolute_wonder_woman_2024_4",
    ],
  },
  "absolute-flash": {
    name: "Absolute Flash",
    blurb:
      "Part of the same Absolute Universe imprint, joining the line in 2025 — a reimagined take on the Flash. Still early — only its first issue is tracked here so far.",
    symbols: ["absolute_flash_2025_1"],
  },
  "absolute-martian-manhunter": {
    name: "Absolute Martian Manhunter",
    blurb:
      "Part of the same Absolute Universe imprint, joining the line in 2025 — a reimagined take on J'onn J'onzz.",
    symbols: [
      "absolute_martian_manhunter_2025_1", "absolute_martian_manhunter_2025_2",
      "absolute_martian_manhunter_2025_3", "absolute_martian_manhunter_2025_6",
    ],
  },
};
