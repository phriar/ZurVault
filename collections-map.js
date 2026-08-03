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

   Also includes four classic-run series added later: Detective Comics,
   Action Comics, Justice League, and Sensation Comics. Same mechanical
   sub-prefix convention as above (match on `sub` in DC_COLLECTIONS
   literally starting with the series name), with the same caveat that
   `blurb`/`history`/`keyIssues` text is a first draft, not verified fact.

   For "Justice League" specifically: matched on sub starting with
   "Justice League", which pulls in Justice League Unlimited (2024),
   Justice League of America (1960-1987), Justice League (2011-2016), and
   Justice League: The Atom Project (2025). Deliberately NOT included, since
   their sub label doesn't literally start with "Justice League": "Team Unl
   Justice League U" / "Batman Justice League Unl" / "Superman Justice
   League Un" (all UNRESOLVED_* anyway) and "Justice League Unl Epic Arti"
   (also UNRESOLVED_*). The team's actual first appearance, The Brave and
   the Bold #28, is NOT in this bucket either — it's a different title,
   mentioned only in the history blurb for context.

   `keyIssues` follows the same {symbol, note} shape as CHARACTER_MAP's
   `highlights` in character-map.js — collection.html renders it the same
   way.

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
  "detective-comics": {
    name: "Detective Comics",
    blurb:
      "DC's second-oldest ongoing title, launched in 1937 — the series that gave the company its \"DC\" name, and the original home of Batman starting with issue #27 in 1939.",
    history:
      "Detective Comics #1 hit newsstands in March 1937, a straight anthology of hard-boiled detective fiction from National Allied Publications, one of the predecessor companies that became DC Comics — whose initials are literally short for \"Detective Comics.\" The book ran two full years of pulp mystery stories before issue #27 (May 1939) introduced Bob Kane and Bill Finger's \"The Bat-Man\" in a six-page backup, permanently reshaping the series around him. Batman never left: the title kept his name for most of the next century, becoming one of the longest continuously-published comics in American history, and along the way introduced Robin (#38, 1940), much of Batman's rogues' gallery, and Gotham City itself as a kind of character in its own right. This original volume ran continuously from 1937 to 2011 (ending at #881) before DC's New 52 relaunch restarted the numbering — every issue tracked here is from that original run.",
    symbols: [
      "detective_comics_19372011_38", "detective_comics_19372011_58",
      "detective_comics_19372011_31", "detective_comics_19372011_140",
      "detective_comics_1937_40",
    ],
    keyIssues: [
      { symbol: "detective_comics_19372011_38", note: "Robin's (Dick Grayson's) first appearance, April 1940 — barely a year after Batman's own debut, and the template every subsequent \"kid sidekick\" in superhero comics traces back to." },
      { symbol: "detective_comics_19372011_140", note: "Widely cited as the Riddler's first appearance, October 1948 — one of the last major additions to Batman's core Golden Age rogues' gallery." },
      { symbol: "detective_comics_19372011_31", note: "Reportedly part of \"Batman Versus the Vampire,\" a two-part 1939 story from Batman's earliest, Bob Kane/Bill Finger-era run — notable as one of the character's first forays into overtly supernatural territory." },
      { symbol: "detective_comics_1937_40", note: "Tracked under a differently-formatted legacy symbol than the rest of this collection, and its metadata doesn't spell out an issue number the way the others do — worth confirming the actual issue against the piece's own image/description before treating any specific claim about it as settled." },
    ],
  },
  "action-comics": {
    name: "Action Comics",
    blurb:
      "Launched in 1938 and responsible for starting the American superhero genre outright — Action Comics #1 introduced Superman and reshaped the entire comics industry within about a year.",
    history:
      "Action Comics #1 (June 1938) is arguably the single most consequential comic book ever published: Jerry Siegel and Joe Shuster's Superman debuted on its cover lifting a car overhead, and the sales response pushed the whole fledgling comics industry toward superheroes almost overnight. The series continued as one of Superman's two flagship titles for decades, alongside his own eponymous Superman book (launched a year later, in 1939), and introduced much of his core mythology and rogues' gallery along the way — including, among the issues tracked here, Lex Luthor and Brainiac. Like Detective Comics, this original volume ran continuously from 1938 to 2011 (ending at #904) before DC's New 52 relaunch restarted the numbering; every issue here is from that original run.",
    symbols: [
      "action_comics_19382011_242", "action_comics_19382011_93", "action_comics_19382011_23",
    ],
    keyIssues: [
      { symbol: "action_comics_19382011_23", note: "Reportedly Lex Luthor's first appearance, April 1940 (originally drawn with a full head of hair) — Superman's most enduring antagonist, introduced barely two years into the character's existence." },
      { symbol: "action_comics_19382011_242", note: "Widely cited as Brainiac's debut, July 1958, in the same issue that introduced the Fortress of Solitude — two pieces of core Superman mythology still in use today." },
      { symbol: "action_comics_19382011_93", note: "A Golden Age issue from Action Comics' earliest Superman era; specific contents not independently verified here — confirm against the issue's own metadata/scans before citing further." },
    ],
  },
  "justice-league": {
    name: "Justice League",
    blurb:
      "DC's flagship team book — not one continuous series but several successive volumes across six decades, from the team's original 1960s run through modern relaunches and miniseries.",
    history:
      "The Justice League of America first assembled in The Brave and the Bold #28 (Feb/Mar 1960) — not in a Justice League-titled comic at all, since that team-up anthology series was DC's testing ground for the concept before it got its own dedicated title later the same year, Justice League of America #1 (Oct/Nov 1960), tracked here. The founding roster is generally counted as Superman, Batman, Wonder Woman, Flash (Barry Allen), Green Lantern (Hal Jordan), Aquaman, and Martian Manhunter, though the line-up has always been in flux. The franchise has been relaunched under several different volume numbers since — Justice League of America (1960-1987), a 2011-2016 volume tied to DC's New 52 (the \"New 52\" reboot line-wide), and various modern miniseries and one-shots like Justice League Unlimited (2024) and The Atom Project (2025) — which is why this collection spans several distinctly-named symbol groups instead of one continuous numbering.",
    symbols: [
      "justice_league_unlimited_2024_1", "justice_league_unlimited_2024_2",
      "justice_league_unlimited_2024_3", "justice_league_unlimited_2024_4",
      "justice_league_unlimited_2024_6", "dc3_super_power_packs_series_jla_the_nail",
      "justice_league_the_atom_project_2025_1", "justice_league_the_atom_project_2025_2",
      "justice_league_of_america_19601987_1", "justice_league_20112016_1",
      "dc3_super_power_packs_series_justice_league_vs_suicide_squad",
    ],
    keyIssues: [
      { symbol: "justice_league_of_america_19601987_1", note: "The team's first solo ongoing-series issue, Oct/Nov 1960 — though the League itself technically debuted a few months earlier in The Brave and the Bold #28, which isn't part of this collection." },
      { symbol: "justice_league_20112016_1", note: "The opening issue of the New 52 relaunch (2011), written by Geoff Johns with art by Jim Lee — DC's attempt to reintroduce the team, and the universe around it, from a clean slate." },
      { symbol: "dc3_super_power_packs_series_jla_the_nail", note: "Tied to \"JLA: The Nail\" (1998), Alan Davis's well-known Elseworlds miniseries imagining a Justice League that never includes Superman — packaged here as a crafted/pack product rather than a standard single issue." },
    ],
  },
  "sensation-comics": {
    name: "Sensation Comics",
    blurb:
      "Wonder Woman's original solo showcase title, launched in 1942 — not where she first appeared, but where she got her own ongoing series and cover-star billing for the first time.",
    history:
      "Wonder Woman actually debuted a few weeks earlier, in All Star Comics #8 (cover-dated Dec 1941/Jan 1942), created by William Moulton Marston and H.G. Peter. Sensation Comics #1 (Jan 1942) followed almost immediately and gave her the lead story and cover spot in her own ongoing anthology title for the first time, running for over a decade (through #109, 1952). It's the series most identified with her earliest Golden Age adventures, alongside her own eponymous Wonder Woman title, which launched later the same year.",
    symbols: ["sensation_comics_19421952_1"],
    keyIssues: [
      { symbol: "sensation_comics_19421952_1", note: "Wonder Woman's first appearance as a headlining, cover-featured solo character — her actual first-ever appearance was a few weeks earlier, in All Star Comics #8, which isn't part of this collection." },
    ],
  },
};
