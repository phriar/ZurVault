/* ============================================================
   ZurVault character map — shared by characters.html and character.html.
   Curated by hand against DC_COLLECTIONS (see index.html / me-proxy-worker.js)
   — most `sub` labels literally contain the character name, but this is a
   judgment call on every entry, not a mechanical derivation.

   Deliberately excluded rather than force-tagged:
     - anthology titles with no single lead (Showcase, House of Mystery,
       House of Secrets, Weird War Tales, More Fun Comics, All-American
       Comics, All-Star Comics, DC Comics Presents, MAD Magazine, DC
       Elseworlds Sampler, DC All In Special)
     - pure crossover/event books spanning many characters (Crisis on
       Infinite Earths x3, Dark Crisis, Absolute Power, DCeased, Legends,
       DC Worlds Collide, Blackest Night)
     - entries that aren't comics at all (MLB-branded NFTs, "Achievements")
     - UNRESOLVED_* symbols (no confirmed Magic Eden symbol yet — see
       discover.html)
     - single-collection "own character" candidates that could become their
       own bucket later but aren't worth a page yet: Green Arrow, Poison
       Ivy, The Demon, The Spectre, Peacemaker, Shazam/Whiz Comics
     - a few too-ambiguous-to-guess entries (Old Gotham Map, Inkling,
       Spirit World, Titans WIP Covers, "Green Lantern 52" whose actual
       symbol is a villains-themed pack, not confirmed Green Lantern)

   To add a character: add an entry below, then link to it from
   characters.html (id must match the `c` query param character.html reads).
   ============================================================ */
const CHARACTER_MAP = {
  batman: {
    name: "Batman",
    symbols: [
      "dc3_super_power_packs_series_batman_year_two", "batman_the_legacy_cowl_2022_3",
      "from_the_dc_vault_death_in_the_family_robin_lives_2024_3", "detective_comics_19372011_38",
      "batman_the_killing_joke_1988_1", "batman_19402011_181", "absolute_batman_2024_4",
      "batman_the_legacy_cowl_2022_2", "batman_19402011_405", "batman_19402011_5",
      "gotham_city_district_knightwatch_sigils", "the_brave_and_the_bold_19551983_67",
      "batman_428_robin_lives_2023_1", "dc3_super_power_packs_series_batman", "batman_2016_159",
      "batman_the_legacy_cowl", "absolute_batman_2024_7", "absolute_batman_2024_8",
      "the_legacy_cowl_collection", "batman_dracula", "batman_19402011_1",
      "detective_comics_19372011_58", "batman_gotham_by_gaslight_the_kryptonian_age_2024_2",
      "batman_19402011_9", "absolute_batman_2024_1", "batman_19402011_428", "batman_day_2023",
      "batman_vengeance_of_bane_1992_1", "detective_comics_19372011_31",
      "batman_gotham_by_gaslight_the_kryptonian_age_2024_1", "absolute_batman_2024_11",
      "batman_the_long_halloween", "the_brave_and_the_bold_19551983_54", "absolute_batman_2024_5",
      "batman_year_one", "batman_2025_1_crafted_edition", "batman_2025_1",
      "batman_gotham_by_gaslight_the_kryptonian_age_2024_4", "the_brave_and_the_bold_19551983_57",
      "batman_20112016_5", "batman_2016_160", "the_dc_bat_cowl_collection_year_1_2023",
      "elseworlds_batman_vol_2", "the_bat_cowl_collection", "the_brave_and_the_bold_19551983_28",
      "batman_beyond_1999_1", "batman_gotham_by_gaslight_the_kryptonian_age_2024_5",
      "dc3_super_power_packs_series_knight_terrors", "batman_2016_158", "batman_19402011_423",
      "detective_comics_19372011_140", "batman_2016_161",
      "from_the_dc_vault_death_in_the_family_robin_lives_2024_2",
      "batman_dark_victory_issue_0_2025_sdcc_edition_2025_1",
      "batman_gotham_by_gaslight_the_kryptonian_age_2024_6", "absolute_batman_2024_10",
      "batman_the_joker_the_deadly_duo_2022_1", "the_court_of_owls_mask", "red_hood_2025_1",
      "batman_the_legacy_cowl_the_deluxe_edition", "absolute_batman_2024_6", "batman_19402011_610",
      "catwoman_the_legacy_cowl_1", "batman_19402011_608", "batman_gotham_by_gaslight_1989_1",
      "batman_2016_159_ashcan_special_edition", "detective_comics_1937_40",
      "absolute_batman_ashcan_special_edition_2024_1", "immortal_legend_batman_2025_1",
      "batman_608_multiverse_edition", "absolute_batman_2024_9", "batman_vol_1_the_court_of_owls",
      "batman_one_bad_day_penguin_2022_1", "absolute_batman_2024_3", "absolute_batman_2024_2",
      "absolute_batman_2024_12", "catwoman_the_legacy_cowl_convention_exclusive",
      "from_the_dc_vault_death_in_the_family_robin_lives_2024_4",
      "batman_shadow_of_the_bat_19921999_57", "batman_19402011_407",
      "batman_gotham_by_gaslight_the_kryptonian_age_2024_3", "batman_19402011_655",
    ],
    highlights: [
      { symbol: "batman_the_killing_joke_1988_1", note: "Alan Moore & Brian Bolland's 1988 one-shot — one of the most acclaimed (and debated) Joker stories ever told, and a huge influence on how the character's been written since." },
      { symbol: "batman_year_one", note: "Frank Miller & David Mazzucchelli's origin retelling. Widely considered the definitive modern take on how Bruce Wayne became Batman — a great entry point for new readers." },
      { symbol: "batman_the_long_halloween", note: "Loeb & Sale's year-long mob mystery, heavily referenced by Christopher Nolan's Batman films. A fan-favorite for readers who like Batman as detective first." },
    ],
  },
  superman: {
    name: "Superman",
    symbols: [
      "allstar_superman_crafted_edition", "superman_19392011_199", "superman_unlimited_2025_1",
      "summer_of_superman_special_2025_1", "dc3_super_power_packs_series_superman",
      "allstar_superman_20052008_1", "allstar_superman", "absolute_superman_2024_1",
      "action_comics_19382011_242", "absolute_superman_2024_6", "absolute_superman_2024_4",
      "dc_sdcc_2025_daily_planet_newspaper_1", "absolute_superman_2024_5",
      "action_comics_19382011_93", "superman_19872006_75", "superman_19392011_1",
      "action_comics_19382011_23", "absolute_superman_2024_2", "superman_1_multiverse_edition",
      "superman_2023_1",
    ],
    highlights: [
      { symbol: "allstar_superman", note: "Grant Morrison & Frank Quitely's 12-issue series is routinely ranked among the best Superman stories ever written — a big-idea, all-ages take on what makes the character work." },
      { symbol: "superman_19392011_1", note: "The debut issue of Superman's own ongoing title — one of the foundational books of the entire superhero genre." },
    ],
  },
  "wonder-woman": {
    name: "Wonder Woman",
    symbols: [
      "absolute_wonder_woman_2024_2", "sensation_comics_19421952_1", "wonder_woman_19421986_204",
      "wonder_woman_19421986_1", "absolute_wonder_woman_2024_3", "future_state_wonder_woman_2021_1",
      "absolute_wonder_woman_2024_4", "absolute_wonder_woman_2024_1", "wonder_woman_19872006_1",
    ],
    highlights: [
      { symbol: "wonder_woman_19421986_1", note: "The debut issue of Wonder Woman's own title, launched in 1942 — the character's first ongoing solo series." },
      { symbol: "sensation_comics_19421952_1", note: "Her Golden Age flagship anthology series, where much of her earliest and most historically significant material ran." },
    ],
  },
  flash: {
    name: "The Flash",
    symbols: [
      "the_flash_123_multiverse_edition", "flash_comics_19401949_1",
      "the_flash_the_fastest_man_alive_2022_1", "flashpoint_2011_1", "the_flash_19591985_123",
      "the_flash_19591985_105", "absolute_flash_2025_1",
    ],
    highlights: [
      { symbol: "flash_comics_19401949_1", note: "Flash Comics was the Golden Age Flash's (Jay Garrick) flagship anthology title — early foundational material for the character." },
      { symbol: "flashpoint_2011_1", note: "The 2011 event where Barry Allen's attempt to alter the past reshapes the entire DC timeline — the story that led directly into DC's \"New 52\" relaunch." },
    ],
  },
  "green-lantern": {
    name: "Green Lantern",
    symbols: ["green_lantern_19601986_87", "green_lantern_2023_1", "green_lantern_19601986_59"],
    highlights: [
      { symbol: "green_lantern_2023_1", note: "The first issue of a recent ongoing run — a reasonable jumping-on point if you want current continuity rather than back issues." },
    ],
  },
  aquaman: {
    name: "Aquaman",
    symbols: [
      "aquaman_59_multiverse_edition", "aquaman_19621978_1", "dc3_super_power_packs_series_aquaman",
      "aquaman_2025_1",
    ],
    highlights: [
      { symbol: "aquaman_19621978_1", note: "An early issue from Aquaman's first ongoing solo title, launched in the 1960s." },
      { symbol: "aquaman_2025_1", note: "First issue of the current ongoing series — the most accessible starting point if you're new to the character." },
    ],
  },
  "justice-league": {
    name: "Justice League",
    symbols: [
      "justice_league_unlimited_2024_1", "justice_league_unlimited_2024_6",
      "justice_league_unlimited_2024_2", "dc3_super_power_packs_series_jla_the_nail",
      "justice_league_unlimited_2024_4", "justice_league_of_america_19601987_1",
      "justice_league_20112016_1", "justice_league_the_atom_project_2025_1",
      "dc3_super_power_packs_series_justice_league_vs_suicide_squad",
      "justice_league_the_atom_project_2025_2", "justice_league_unlimited_2024_3",
    ],
    highlights: [
      { symbol: "justice_league_of_america_19601987_1", note: "The debut issue of the team's classic Silver Age flagship title — the League's first ongoing series." },
    ],
  },
  titans: {
    name: "Titans",
    symbols: [
      "dc3_super_power_packs_series_titans_beast_world", "tales_of_the_teen_titans_19801988_44",
      "teen_titans_20162020_12", "the_new_teen_titans_19801988_1", "titans_2023_1",
    ],
    highlights: [
      { symbol: "the_new_teen_titans_19801988_1", note: "The debut of Marv Wolfman & George Pérez's celebrated 1980s run — widely regarded as one of the best team-book runs in superhero comics, and the version that made the Titans a top-tier franchise." },
    ],
  },
  "harley-quinn": {
    name: "Harley Quinn",
    symbols: [
      "the_harley_quinn_charm_offensive", "harleen_2019_1", "harley_quinn_20002004_1",
      "the_harley_quinn_freakin_awesome_boxes_of_mayhem",
    ],
    highlights: [
      { symbol: "harleen_2019_1", note: "Stjepan Šejić's acclaimed standalone origin story, focused on Harleen Quinzel's fall from psychiatrist to Joker's accomplice — one of the best-regarded modern Harley stories." },
    ],
  },
  supergirl: {
    name: "Supergirl",
    symbols: ["supergirl_woman_of_tomorrow_20212022_1", "supergirl_2025_4"],
    highlights: [
      { symbol: "supergirl_woman_of_tomorrow_20212022_1", note: "\"Woman of Tomorrow,\" a well-received recent mini-series exploring Kara Zor-El outside Superman's shadow." },
    ],
  },
  "martian-manhunter": {
    name: "Martian Manhunter",
    symbols: [
      "absolute_martian_manhunter_2025_2", "absolute_martian_manhunter_2025_6",
      "absolute_martian_manhunter_2025_3", "absolute_martian_manhunter_2025_1",
    ],
    highlights: [
      { symbol: "absolute_martian_manhunter_2025_1", note: "First issue of the current Absolute Martian Manhunter series — a modern take and a good starting point for the character." },
    ],
  },
  hawkman: {
    name: "Hawkman & Hawkgirl",
    symbols: ["hawkman_19641968_4", "dc3_super_power_packs_series_dawn_of_dc_2"],
    highlights: [
      { symbol: "hawkman_19641968_4", note: "An issue from Hawkman's original 1960s solo series." },
    ],
  },
};
