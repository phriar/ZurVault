/* ============================================================
   ZurVault Grail Comics — curated "key issues" data, shared by
   grails.html. Editorial content Candy/ME have no reason to build:
   collector context on WHY an issue matters, not just listing data.

   Every `symbol` below must match a `symbol` in DC_COLLECTIONS (see
   index.html / me-proxy-worker.js) — that's how grails.html joins
   this static write-up against live floor price / last sale /
   cover image from GET /v2/dc-summary. Pricing and images are never
   hardcoded here; if it's not coming from the live feed, it doesn't
   belong in this file.

   `characters` entries carry an optional `characterId` — a hand-set
   match against character-map.js's keys, the same judgment-call
   convention that file already uses (see its own header comment).
   This is deliberately NOT derived by string-matching the character
   name at runtime: half these names carry a parenthetical ("Flash
   (Barry Allen)") that a mechanical match would either choke on or
   guess wrong, the exact failure mode that produced the old Cover
   Artist bug (see CLAUDE.md). Leave characterId unset if the
   character has no character.html hub page yet.

   To add a grail: append an entry, confirm the symbol exists in
   DC_COLLECTIONS, and hand-check characterId against character-map.js
   rather than assuming a match.
   ============================================================ */
const GRAIL_COMICS = [
  {
    symbol: "showcase_19561978_4",
    title: "Showcase #4",
    year: 1956,
    era: "Dawn of the Silver Age",
    characters: [{ name: "Flash (Barry Allen)", characterId: "flash" }],
    significance: "Widely credited as the single issue that launched the Silver Age of comics — the debut of Barry Allen as the Flash, replacing the Golden Age Jay Garrick version.",
  },
  {
    symbol: "showcase_19561978_22",
    title: "Showcase #22",
    year: 1959,
    era: "Dawn of the Silver Age",
    characters: [{ name: "Green Lantern (Hal Jordan)", characterId: "green-lantern" }],
    significance: "Introduced Hal Jordan as the Silver Age Green Lantern, cementing Showcase's role as DC's tryout title for reinventing its Golden Age heroes.",
  },
  {
    symbol: "detective_comics_19372011_38",
    title: "Detective Comics #38",
    year: 1940,
    era: "Golden Age",
    characters: [{ name: "Robin (Dick Grayson)" }],
    significance: "First appearance of Robin, the original Boy Wonder — the introduction of the sidekick archetype that would define superhero comics for decades.",
  },
  {
    symbol: "batman_19402011_1",
    title: "Batman #1",
    year: 1940,
    era: "Golden Age",
    characters: [{ name: "Catwoman" }, { name: "The Joker" }],
    significance: "One of the most significant single issues in comics history — debuts both Catwoman and the Joker in the same book, DC's first ongoing solo Batman title.",
  },
  {
    symbol: "more_fun_comics_19361947_73",
    title: "More Fun Comics #73",
    year: 1941,
    era: "Golden Age",
    characters: [{ name: "Aquaman", characterId: "aquaman" }, { name: "Green Arrow" }],
    significance: "First appearance of both Aquaman and Green Arrow, sharing an anthology debut nearly two decades before either would headline their own book.",
  },
  {
    symbol: "flash_comics_19401949_1",
    title: "Flash Comics #1",
    year: 1940,
    era: "Golden Age",
    characters: [{ name: "Flash (Jay Garrick)", characterId: "flash" }, { name: "Hawkman", characterId: "hawkman" }],
    significance: "Debut of the original Golden Age Flash, Jay Garrick, and Hawkman — one of the foundational anthology titles of DC's earliest superhero era.",
  },
  {
    symbol: "allstar_comics_19401978_3",
    title: "All-Star Comics #3",
    year: 1940,
    era: "Golden Age",
    characters: [{ name: "Justice Society of America" }],
    significance: "First appearance of the Justice Society of America — comics' first superhero team-up, predating the Justice League by two decades.",
  },
  {
    symbol: "the_brave_and_the_bold_19551983_28",
    title: "The Brave and the Bold #28",
    year: 1960,
    era: "Dawn of the Silver Age",
    characters: [{ name: "Justice League of America", characterId: "justice-league" }],
    significance: "First appearance of the Justice League of America, the Silver Age reinvention of the team concept that would go on to anchor the entire DC Universe.",
  },
  {
    symbol: "house_of_secrets_19561978_92",
    title: "House of Secrets #92",
    year: 1971,
    era: "Bronze Age Horror",
    characters: [{ name: "Swamp Thing (Alex Olsen)" }],
    significance: "First appearance of Swamp Thing, in a standalone horror one-shot by Len Wein and Bernie Wrightson.",
    note: "This is the original Alex Olsen version. The ongoing Swamp Thing series (1972) introduces the better-known Alec Holland incarnation — a distinct but related character origin worth noting to collectors.",
  },
  {
    symbol: "whiz_comics_19401952_2",
    title: "Whiz Comics #2",
    year: 1940,
    era: "Golden Age",
    characters: [{ name: "Captain Marvel / Shazam" }],
    significance: "First newsstand appearance of Captain Marvel (Shazam) — issue #1 was a promotional ashcan, making #2 the true first published appearance.",
  },
  {
    symbol: "action_comics_19382011_242",
    title: "Action Comics #242",
    year: 1958,
    era: "Silver Age",
    characters: [{ name: "Brainiac" }],
    significance: "First appearance and origin of Brainiac, plus the debut of the bottled city of Kandor — one of Superman's most enduring rogues and mythology elements.",
  },
  {
    symbol: "the_flash_19591985_123",
    title: "The Flash #123",
    year: 1961,
    era: "Silver Age",
    characters: [{ name: "Flash (Jay Garrick & Barry Allen)", characterId: "flash" }],
    significance: "\"Flash of Two Worlds\" — the story that introduced the DC multiverse concept (Earth-One/Earth-Two), reshaping how DC continuity would work for the next 60+ years.",
  },
];

// Lookup helper: find a grail entry by DC_COLLECTIONS symbol.
function getGrailBySymbol(symbol) {
  return GRAIL_COMICS.find((g) => g.symbol === symbol) || null;
}

// Group helper: for the hub page's era filter tabs. Returns eras in
// chronological order (by each era's earliest year), not object
// insertion order, so the tabs read Golden -> Silver -> Bronze rather
// than whatever order entries happen to appear in the array above.
function getGrailsByEra() {
  const grouped = GRAIL_COMICS.reduce((acc, comic) => {
    (acc[comic.era] = acc[comic.era] || []).push(comic);
    return acc;
  }, {});
  const eras = Object.keys(grouped).sort((a, b) => {
    const minYear = (era) => Math.min(...grouped[era].map((c) => c.year));
    return minYear(a) - minYear(b);
  });
  const ordered = {};
  eras.forEach((era) => { ordered[era] = grouped[era]; });
  return ordered;
}
