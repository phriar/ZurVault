/* ============================================================
   ZurVault collections (comic series) map — shared by collections.html
   (its "Series" tab) and collection.html (`?s=<id>`). Same pattern as
   character-map.js, but grouped by series/imprint instead of character.
   collections.html/collection.html also render a "Characters" tab/`?c=`
   param straight off character-map.js's CHARACTER_MAP — see that file's
   header. The two maps are independent; a few entries below are derived
   from CHARACTER_MAP's curation rather than pure mechanical matching
   (see the "batman"/"wonder-woman"/"green-lantern"/"aquaman" note
   further down).

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
   mentioned only in the history blurb for context; it now has its own
   dedicated entry below ("brave-and-the-bold") instead of going unbucketed.

   `keyIssues` follows the same {symbol, note} shape as CHARACTER_MAP's
   `highlights` in character-map.js — collection.html renders it the same
   way.

   "Bat Cowl" (first entry, deliberately, per site feedback) is different
   in kind from everything else here — it's not a comic-issue run at all,
   just the two symbols whose `sub` is literally "Bat Cowl" or starts with
   "THE DC BAT COWL COLLECTION" (a generative/PFP-style collection, not
   individual issues), so it has no `history`/`keyIssues` fields.

   "Batman: The Legacy Cowl" is the same kind of generative/PFP-style
   collectible line as Bat Cowl, not a comic-issue run — despite the name
   similarity to Bat Cowl, it's a separate, unrelated collection, and now
   has its own entry below ("batman-the-legacy-cowl") covering all 7 of
   its symbols (batman_the_legacy_cowl_2022_2/3, batman_the_legacy_cowl,
   the_legacy_cowl_collection, batman_the_legacy_cowl_the_deluxe_edition,
   catwoman_the_legacy_cowl_1, catwoman_the_legacy_cowl_convention_exclusive).

   Four entries below — "batman", "wonder-woman", "green-lantern", and
   "aquaman" — are matched differently from the mechanical `sub`-prefix
   convention used everywhere else in this file. DC_COLLECTIONS' `sub`
   field is inconsistently formatted even within a single series: some
   symbols carry a clean "Title (Year-Year)" sub, while sibling symbols of
   the exact same run carry a mangled "Title issue# bignum" sub with no
   parenthetical at all — e.g. green_lantern_19601986_87's sub is
   literally "Green Lantern 87 688", not "Green Lantern (1960-1986)" — so
   a literal sub-prefix match here would silently drop real members. These
   four are instead derived by hand from character-map.js's own
   already-vetted CHARACTER_MAP symbol lists for that character, filtered
   down to just the character's eponymous ongoing title(s) — excluding
   anything that already belongs to a separately tracked collection
   (Absolute line, Sensation Comics, Legacy Cowl, Bat Cowl, Detective
   Comics, Brave and the Bold, Gotham by Gaslight, one-shot graphic
   novels, and crafted/ashcan/multiverse-edition variants). "batman"'s
   bucket additionally includes batman_19402011_406 ("Batman
   (1940-2011)"), a symbol that fits the pattern but isn't currently in
   CHARACTER_MAP.batman — a pre-existing gap in that file's curation, left
   as-is since character-map.js's content isn't touched here.

   General promotion rule for adding a brand-new series entry at all: only
   once a literal comic title repeats across MORE than 2 tracked symbols.
   This is why Green Lantern (3), Wonder Woman (3), Crisis on Infinite
   Earths (3), Batman: Gotham by Gaslight (7), and The Brave and the Bold
   (4) all earned entries, while Green Arrow (only 1 tracked symbol) did
   not and stays out of both this file and character-map.js. Aquaman (2
   tracked symbols) is a deliberate exception to that bar, kept because it
   was explicitly requested by name.

   To add a new series: add an entry below (id should be url-safe) — no
   manual per-page link needed, collections.html's Series tab renders
   every entry in this map automatically. Object key order is render
   order on that tab, so whichever entry should show first goes first.
   ============================================================ */
const COLLECTIONS_MAP = {
  "bat-cowl": {
    name: "Bat Cowl",
    blurb:
      "A generative Bat Cowl collection, not tied to any single comic issue — grouping the original \"Bat Cowl\" set with its \"Year 1\" companion collection.",
    symbols: ["the_bat_cowl_collection", "the_dc_bat_cowl_collection_year_1_2023"],
  },
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
  "batman": {
    name: "Batman",
    blurb:
      "Batman's own eponymous ongoing title(s) — not a one-shot or Elseworlds tale, but the mainline numbered series across its several volumes: the original 1940-2011 run, the New 52's 2011-2016 volume, the 2016-present \"Rebirth\" volume, and the current 2025 relaunch.",
    history:
      "Batman (1940) #1 followed his 1939 Detective Comics debut by less than a year, giving the character his own dedicated ongoing title — and in the same first issue, introduced both the Joker and Catwoman, two of his most enduring adversaries. The original volume ran continuously to 2011 before DC's New 52 relaunch restarted the numbering with a 2011-2016 volume, followed by a 2016-present volume launched alongside DC's \"Rebirth\" branding, and a newest relaunch beginning in 2025. This entry spans all of those numbered volumes; it does not include Absolute Batman, Batman: Gotham by Gaslight, Batman: The Legacy Cowl, Detective Comics, The Brave and the Bold, or one-shot graphic novels like Year One or The Killing Joke — those all have (or share) their own entries.",
    symbols: [
      "batman_19402011_1", "batman_19402011_5", "batman_19402011_9",
      "batman_19402011_181", "batman_19402011_405", "batman_19402011_406",
      "batman_19402011_407", "batman_19402011_423", "batman_19402011_428",
      "batman_19402011_608", "batman_19402011_610", "batman_19402011_655",
      "batman_20112016_5", "batman_2016_158", "batman_2016_159",
      "batman_2016_160", "batman_2016_161", "batman_2025_1",
      "dc3_super_power_packs_series_batman",
    ],
    keyIssues: [
      { symbol: "batman_19402011_1", note: "The debut issue of Batman's own ongoing title, Spring 1940 — the same issue that introduced both the Joker and Catwoman." },
      { symbol: "batman_2025_1", note: "First issue of the current, still-unfolding volume — the most accessible jumping-on point if you're new to the character." },
    ],
  },
  "batman-gotham-by-gaslight": {
    name: "Batman: Gotham by Gaslight",
    blurb:
      "An alternate-history Batman set in 1889 Gotham, facing off against Jack the Ripper — starting with Brian Augustyn and Mike Mignola's original 1989 one-shot, later followed by a six-issue 2024 sequel, \"The Kryptonian Age.\"",
    history:
      "Batman: Gotham by Gaslight (1989) is widely credited as the story that established what DC would later formalize as its \"Elseworlds\" line — alternate-timeline, out-of-continuity takes on established characters — even though the Elseworlds label itself wasn't applied until slightly later. Written by Brian Augustyn with art by Mike Mignola, it reimagines a Victorian-era Batman investigating a series of murders in a Gotham City stalked by Jack the Ripper. \"The Kryptonian Age\" (2024) is a six-issue expansion of that same alternate-history concept; the exact relationship between the two — direct sequel, spinoff, or loose continuation — isn't independently confirmed here.",
    symbols: [
      "batman_gotham_by_gaslight_1989_1",
      "batman_gotham_by_gaslight_the_kryptonian_age_2024_1",
      "batman_gotham_by_gaslight_the_kryptonian_age_2024_2",
      "batman_gotham_by_gaslight_the_kryptonian_age_2024_3",
      "batman_gotham_by_gaslight_the_kryptonian_age_2024_4",
      "batman_gotham_by_gaslight_the_kryptonian_age_2024_5",
      "batman_gotham_by_gaslight_the_kryptonian_age_2024_6",
    ],
    keyIssues: [
      { symbol: "batman_gotham_by_gaslight_1989_1", note: "The original 1989 one-shot — often cited as the story that kicked off DC's \"Elseworlds\" concept, ahead of the imprint's formal launch." },
    ],
  },
  "batman-the-legacy-cowl": {
    name: "Batman: The Legacy Cowl",
    blurb:
      "A generative, Bat Cowl-style collectible line built around the \"Legacy Cowl\" concept — not tied to any single comic issue, spanning Batman and Catwoman variants plus a deluxe-edition wrapper piece.",
    symbols: [
      "batman_the_legacy_cowl", "batman_the_legacy_cowl_2022_2",
      "batman_the_legacy_cowl_2022_3", "batman_the_legacy_cowl_the_deluxe_edition",
      "the_legacy_cowl_collection", "catwoman_the_legacy_cowl_1",
      "catwoman_the_legacy_cowl_convention_exclusive",
    ],
  },
  "brave-and-the-bold": {
    name: "The Brave and the Bold",
    blurb:
      "DC's classic 1955-1983 try-out anthology, famous for hosting the Justice League's true first appearance in issue #28 — a different title from \"Justice League\" itself, not a JL-branded book.",
    history:
      "The Justice League of America first assembled in The Brave and the Bold #28 (Feb/Mar 1960), months before the team got its own dedicated title, Justice League of America #1 (Oct/Nov 1960) — see the \"Justice League\" entry for that side of the story. The Brave and the Bold itself ran as a rotating team-up anthology across this whole era, pairing different DC characters together issue to issue; specific plot details for the other three issues tracked here (#54, #57, #67) aren't independently confirmed — verify against each issue's own metadata before citing further.",
    symbols: [
      "the_brave_and_the_bold_19551983_28", "the_brave_and_the_bold_19551983_54",
      "the_brave_and_the_bold_19551983_57", "the_brave_and_the_bold_19551983_67",
    ],
    keyIssues: [
      { symbol: "the_brave_and_the_bold_19551983_28", note: "The Justice League of America's actual first appearance, Feb/Mar 1960 — several months before the team's own dedicated title launched." },
    ],
  },
  "wonder-woman": {
    name: "Wonder Woman",
    blurb:
      "Wonder Woman's own eponymous ongoing title(s) — the original 1942-1986 volume and the 1987-2006 post-Crisis relaunch — not the Absolute Universe reimagining or her earlier Sensation Comics showcase, which have their own entries.",
    history:
      "Wonder Woman (1942) #1 gave the character her first ongoing solo title, following her debut a few months earlier in All Star Comics #8 and her Sensation Comics showcase role (see that entry). The original volume ran through 1986 before DC's post-Crisis continuity reboot relaunched it in 1987 — Wonder Woman (1987) #1, written and drawn by George Pérez, is one of the best-regarded takes on the character's modern origin.",
    symbols: [
      "wonder_woman_19421986_1", "wonder_woman_19421986_204", "wonder_woman_19872006_1",
    ],
    keyIssues: [
      { symbol: "wonder_woman_19421986_1", note: "The debut issue of Wonder Woman's first ongoing solo title, 1942." },
      { symbol: "wonder_woman_19872006_1", note: "George Pérez's 1987 post-Crisis relaunch — a widely-cited definitive modern origin for the character." },
    ],
  },
  "green-lantern": {
    name: "Green Lantern",
    blurb:
      "Green Lantern's classic 1960-1986 volume and the current 2023 ongoing — spanning Hal Jordan's Silver Age adventures through to a modern jumping-on point.",
    symbols: [
      "green_lantern_19601986_59", "green_lantern_19601986_87", "green_lantern_2023_1",
    ],
    keyIssues: [
      { symbol: "green_lantern_19601986_87", note: "Reportedly part of Denny O'Neil and Neal Adams's acclaimed, socially-conscious Green Lantern/Green Arrow run (issues #76-89, 1970-72) — not independently confirmed here, worth checking against the issue's own metadata." },
      { symbol: "green_lantern_2023_1", note: "The first issue of a recent ongoing run — a reasonable jumping-on point if you want current continuity rather than back issues." },
    ],
  },
  "aquaman": {
    name: "Aquaman",
    blurb:
      "Aquaman's own eponymous ongoing title(s) — his first solo series from the 1960s and the current 2025 relaunch — excluding multiverse-edition and crafted-pack variants, which stay part of the broader Aquaman grouping on the Characters tab only.",
    symbols: ["aquaman_19621978_1", "aquaman_2025_1"],
    keyIssues: [
      { symbol: "aquaman_19621978_1", note: "An early issue from Aquaman's first ongoing solo title, launched in the 1960s." },
      { symbol: "aquaman_2025_1", note: "First issue of the current ongoing series — the most accessible starting point if you're new to the character." },
    ],
  },
  "crisis-on-infinite-earths": {
    name: "Crisis on Infinite Earths",
    blurb:
      "DC's landmark 1985-86 maxiseries by Marv Wolfman and George Pérez, which collapsed the company's sprawling multiverse into a single shared continuity — one of the most consequential comics events ever published. The three symbols tracked here are crafted/pack-style products rather than confirmed individual numbered issues.",
    history:
      "Crisis on Infinite Earths (1985-86) merged DC's decades of parallel-Earth continuity into one unified universe, killing off (among others) the Golden Age Supergirl and Barry Allen's Flash along the way — deaths significant enough that both remained largely untouched in DC continuity for decades afterward. It's excluded from character-map.js's per-character groupings by design (a pure crossover event with no single lead), and Dark Crisis on Infinite Earths (2022) is a separate, unrelated later event — not part of this collection.",
    symbols: [
      "crisis_on_infinite_earths",
      "dc3_super_power_packs_series_1_crisis_on_infinite_earths",
      "dc3_super_power_packs_series_2_crisis_on_infinite_earths",
    ],
  },
};
