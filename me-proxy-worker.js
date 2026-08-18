/**
 * ZurVault → Magic Eden proxy
 * ---------------------------
 * Magic Eden's public API doesn't send Access-Control-Allow-Origin,
 * so browsers block direct requests from zurvault.com (CORS).
 * This Worker forwards requests to ME and adds the missing header.
 *
 * It also caches successful per-collection responses at Cloudflare's edge
 * (via the Cache API), keyed on the upstream Magic Eden URL rather than the
 * Worker's own request URL — so the cache is shared across every visitor
 * instead of being fragmented per-caller.
 *
 * On top of that, this Worker runs a Cron Trigger (configure in the
 * Cloudflare dashboard: Worker Settings → Triggers → Cron Triggers,
 * currently every 20 minutes) that fetches listings + activities for every
 * collection in DC_COLLECTIONS itself and writes each collection's result
 * to its own Workers KV entry (`collection:{symbol}`) — independently, as
 * soon as that one collection succeeds, not accumulated into one shared
 * blob written at the end. That means one collection getting rate-limited
 * by Magic Eden has zero effect on any other collection: it just keeps
 * serving its last-known-good KV entry until a future cron cycle succeeds
 * for it. GET /v2/dc-summary lists every `collection:*` KV entry and merges
 * them into one response — index.html makes ONE request instead of looping
 * through ~200 collections × 2 endpoints itself client-side, which is what
 * was actually driving Worker request count against the free tier (caching
 * alone doesn't reduce request *count*, since the Worker still executes
 * once per incoming client request regardless of whether it's served from
 * cache internally).
 *
 * DEPLOY:
 * 1. Go to https://dash.cloudflare.com → Workers & Pages → Create → Worker
 * 2. Delete the default code, paste this whole file in, click Deploy
 * 3. Note the URL Cloudflare gives you, e.g. https://zurvault-me-proxy.YOURNAME.workers.dev
 * 4. In dc.html / discover.html, change ME_BASE to that URL instead of
 *    https://api-mainnet.magiceden.dev/v2
 * 5. Create a KV namespace (Workers & Pages → KV → Create), bind it to this
 *    Worker as `DC_CACHE` (Worker Settings → Variables → KV Namespace
 *    Bindings), and add a Cron Trigger under Worker Settings → Triggers
 *    (currently every 20 minutes — cron expression: 5 stars separated by
 *    spaces, with "star-slash-20" as the first field). Without the Cron
 *    Trigger, GET /v2/dc-summary will just keep returning the notReady state —
 *    nothing populates KV on its own.
 *
 * USAGE from the browser stays identical for the pass-through proxy —
 * just call:
 *   {WORKER_URL}/v2/tokens/{mint}
 *   {WORKER_URL}/v2/collections/{symbol}/listings
 * etc. This Worker forwards the path 1:1 to Magic Eden. The exceptions are
 * {WORKER_URL}/v2/dc-summary (served entirely from KV, never touches Magic
 * Eden in the request path) and {WORKER_URL}/v2/__trigger-refresh?key=
 * {symbol} — a debug endpoint that refreshes one collection's KV entry
 * on demand and returns the result directly, for testing a specific
 * collection without waiting for or re-running the full cron batch.
 */

const ME_ORIGIN = "https://api-mainnet.magiceden.dev";

// Only allow your own site to use this proxy — swap in your real domain(s).
const ALLOWED_ORIGINS = [
  "https://zurvault.com",
  "https://phriar.github.io",
  "http://localhost:8000",
];

// Collection listings/activities aren't user-specific, so a short shared
// edge TTL cuts request volume a lot without serving meaningfully stale data.
const EDGE_CACHE_SECONDS = 60;

// NOTE on verifying the per-collection proxy cache works: don't look for
// Cloudflare's own `cf-cache-status` header — that reflects Cloudflare's
// *automatic* edge cache for full HTTP responses (governed by zone Cache
// Rules), which is a separate layer that a workers.dev script doesn't
// control and won't reliably engage for JSON/API paths. This Worker's
// caching runs *inside* the script via the Cache API (caches.default), so
// the Worker's fetch handler still executes on every request either way —
// it just skips the upstream Magic Eden call on a hit. Check the
// X-ZurVault-Cache response header instead (HIT / MISS / BYPASS) to
// confirm it's working.

// ---------------------------------------------------------------------
// DC_COLLECTIONS — kept in sync BY HAND with the same array in index.html.
// index.html needs its own copy to populate the sub-collection filter
// dropdown instantly with no network round-trip; this Worker needs its own
// copy because the scheduled() cron handler below runs independently of
// any visitor's page load and has to know what to fetch on its own. When
// you resolve a new collection via discover.html, update BOTH copies.
// ---------------------------------------------------------------------
const DC_COLLECTIONS = [
  { sub: "DC FanDome (2021)", symbol: "dc_fandome_2021_collection" },
  { sub: "All-Star Superman (225/285)", symbol: "allstar_superman_crafted_edition" },
  { sub: "The Flash 123 49", symbol: "the_flash_123_multiverse_edition" },
  { sub: "Batman Full Circle 1 568", symbol: "dc3_super_power_packs_series_batman_year_two" },
  { sub: "Green Lantern 87 688", symbol: "green_lantern_19601986_87" },
  { sub: "Terry Dodson Harley Quinn M 5", symbol: "UNRESOLVED_FJ4vu4" },
  { sub: "Batman The Legacy Cowl 3 976", symbol: "batman_the_legacy_cowl_2022_3" },
  { sub: "Superman (1939-2011)", symbol: "superman_19392011_199" },
  { sub: "From the DC Vault Death in 164", symbol: "from_the_dc_vault_death_in_the_family_robin_lives_2024_3" },
  { sub: "Detective Comics 38 1302", symbol: "detective_comics_19372011_38" },
  { sub: "Wonder Woman Justice Lea 384", symbol: "UNRESOLVED_5TXPpa" },
  { sub: "Titans Beast World 2 3058", symbol: "dc3_super_power_packs_series_titans_beast_world" },
  { sub: "Lookin' Shark (17/1299)", symbol: "the_harley_quinn_charm_offensive" },
  { sub: "Showcase (1956-1978)", symbol: "showcase_19561978_4" },
  { sub: "Old Gotham Map (103/888)", symbol: "gcdk_mysteries_a_mysterious_pulse" },
  { sub: "Batman The Killing Joke 1 467", symbol: "batman_the_killing_joke_1988_1" },
  { sub: "Superman Unl 1 611", symbol: "superman_unlimited_2025_1" },
  { sub: "Crisis on Infinite Earths 7 2732", symbol: "dc3_super_power_packs_series_2_crisis_on_infinite_earths" },
  { sub: "Batman (1940-2011)", symbol: "batman_19402011_181" },
  { sub: "Absolute Batman (2024-)", symbol: "absolute_batman_2024_4" },
  { sub: "Batman The Legacy Cowl 2 870", symbol: "batman_the_legacy_cowl_2022_2" },
  { sub: "Batman (1940-2011)", symbol: "batman_19402011_405" },
  { sub: "Batman (1940-2011)", symbol: "batman_19402011_5" },
  { sub: "Tales of the Teen Titans 44 42", symbol: "tales_of_the_teen_titans_19801988_44" },
  { sub: "Chinatown (563/1154)", symbol: "gotham_city_district_knightwatch_sigils" },
  { sub: "The Brave and the Bold 67 966", symbol: "the_brave_and_the_bold_19551983_67" },
  { sub: "Justice League Unl 1 359", symbol: "justice_league_unlimited_2024_1" },
  { sub: "Abs Wonder Woman 2 113", symbol: "absolute_wonder_woman_2024_2" },
  { sub: "Aquaman 59 160", symbol: "aquaman_59_multiverse_edition" },
  { sub: "Batman 428 Robin Lives 1 11358", symbol: "batman_428_robin_lives_2023_1" },
  { sub: "Terry Dodson Harley Quin 9", symbol: "UNRESOLVED_3CXW7Y" },
  { sub: "Aquaman (1962-1978)", symbol: "aquaman_19621978_1" },
  { sub: "Justice League Unl 6 201", symbol: "justice_league_unlimited_2024_6" },
  { sub: "Batman (1940-2011)", symbol: "dc3_super_power_packs_series_batman" },
  { sub: "Batman (2016-)", symbol: "batman_2016_159" },
  { sub: "Batman: The Legacy Cowl", symbol: "batman_the_legacy_cowl" },
  { sub: "Flash Comics (1940-1949)", symbol: "flash_comics_19401949_1" },
  { sub: "Blackest Night 1 376", symbol: "blackest_night_20092010_1" },
  { sub: "Justice League Unl 2 8", symbol: "justice_league_unlimited_2024_2" },
  { sub: "Absolute Batman (2024-)", symbol: "absolute_batman_2024_7" },
  { sub: "Absolute Batman (2024-)", symbol: "absolute_batman_2024_8" },
  { sub: "Overdrive Patch 2.0 (5668/11544)", symbol: "the_legacy_cowl_collection" },
  { sub: "Spirit World (2023)", symbol: "dc3_super_power_packs_series_dawn_of_dc" },
  { sub: "Wooden Stake (448/650)", symbol: "batman_dracula" },
  { sub: "DCeased (2019)", symbol: "dceased_2019_1" },
  { sub: "Batman (1940-2011)", symbol: "batman_19402011_1" },
  { sub: "Supergirl Woman of Tomorrow 553", symbol: "supergirl_woman_of_tomorrow_20212022_1" },
  { sub: "Batman (1940-2011)", symbol: "batman_19402011_406" },
  { sub: "Detective Comics 58 1047", symbol: "detective_comics_19372011_58" },
  { sub: "Justice League of America 2302", symbol: "dc3_super_power_packs_series_jla_the_nail" },
  { sub: "Batman Gotham by Gaslight The 86", symbol: "batman_gotham_by_gaslight_the_kryptonian_age_2024_2" },
  { sub: "Batman (1940-2011)", symbol: "batman_19402011_9" },
  { sub: "Absolute Batman (2024-)", symbol: "absolute_batman_2024_1" },
  { sub: "Summer of Superman Special 1 242", symbol: "summer_of_superman_special_2025_1" },
  { sub: "Sensation Comics 1 1260", symbol: "sensation_comics_19421952_1" },
  { sub: "Batman (1940-2011)", symbol: "batman_19402011_428" },
  { sub: "Justice League The Atom 10", symbol: "justice_league_the_atom_project_2025_1" },
  { sub: "Superman: Lost (2023-)", symbol: "dc3_super_power_packs_series_superman" },
  { sub: "Batman Day 2023 (5576/6907)", symbol: "batman_day_2023" },
  { sub: "Batman Vengeance of Bane 1 331", symbol: "batman_vengeance_of_bane_1992_1" },
  { sub: "Detective Comics 31 210", symbol: "detective_comics_19372011_31" },
  { sub: "Batman Gotham by Gaslight 232", symbol: "batman_gotham_by_gaslight_the_kryptonian_age_2024_1" },
  { sub: "Team Unl Justice League U 321", symbol: "UNRESOLVED_7inpAY" },
  { sub: "Teen Titans (2016-2020)", symbol: "teen_titans_20162020_12" },
  { sub: "Justice League Unl 4 65", symbol: "justice_league_unlimited_2024_4" },
  { sub: "Absolute Batman (2024-)", symbol: "absolute_batman_2024_11" },
  { sub: "The Flash The Fastest Man 1623", symbol: "the_flash_the_fastest_man_alive_2022_1" },
  { sub: "Batman: The Long Halloween 570", symbol: "batman_the_long_halloween" },
  { sub: "AllStar Superman 1 802", symbol: "allstar_superman_20052008_1" },
  { sub: "Abs Martian Manhunter 2 153", symbol: "absolute_martian_manhunter_2025_2" },
  { sub: "The Brave and the Bold 54 783", symbol: "the_brave_and_the_bold_19551983_54" },
  { sub: "Absolute Batman (2024-)", symbol: "absolute_batman_2024_5" },
  { sub: "Batman: Year One (87/220)", symbol: "batman_year_one" },
  { sub: "Batman 1 Crafted", symbol: "batman_2025_1_crafted_edition" },
  { sub: "AllStar Comics 3 774", symbol: "allstar_comics_19401978_3" },
  { sub: "All-Star Superman (1798/1938)", symbol: "allstar_superman" },
  { sub: "Batman (2025-)", symbol: "batman_2025_1" },
  { sub: "Batman Gotham by Gaslight The 13", symbol: "batman_gotham_by_gaslight_the_kryptonian_age_2024_4" },
  { sub: "Flashpoint (2011)", symbol: "flashpoint_2011_1" },
  { sub: "Weird War Tales 93 141", symbol: "weird_war_tales_19711983_93" },
  { sub: "Justice League of America 1 701", symbol: "justice_league_of_america_19601987_1" },
  { sub: "Titans 1 Bernard Chang WIP 1124", symbol: "dawn_of_dc_wip_covers_2023" },
  { sub: "The Brave and the Bold 57 468", symbol: "the_brave_and_the_bold_19551983_57" },
  { sub: "Titans (2023)", symbol: "titans_2023_1" },
  { sub: "Supergirl (2025-)", symbol: "supergirl_2025_4" },
  { sub: "Batman (2011-2016)", symbol: "batman_20112016_5" },
  { sub: "The Flash (1959-1985)", symbol: "the_flash_19591985_123" },
  { sub: "Abs Martian Manhunter 6 47", symbol: "absolute_martian_manhunter_2025_6" },
  { sub: "Justice League (2011-2016)", symbol: "justice_league_20112016_1" },
  { sub: "DC All In Special (2024)", symbol: "dc_all_in_special_2024_1" },
  { sub: "The New Teen Titans 1 469", symbol: "the_new_teen_titans_19801988_1" },
  { sub: "Peacemaker Tries Hard 1 45", symbol: "peacemaker_tries_hard_2023_1" },
  { sub: "Absolute Power (2024)", symbol: "dc3_super_power_packs_series_absolute_power" },
  { sub: "Crisis on Infinite Earths 3 2602", symbol: "dc3_super_power_packs_series_1_crisis_on_infinite_earths" },
  { sub: "Hawkman (1964-1968)", symbol: "hawkman_19641968_4" },
  { sub: "Justice League vs Suicid 2 1606", symbol: "dc3_super_power_packs_series_justice_league_vs_suicide_squad" },
  { sub: "Batman (2016-)", symbol: "batman_2016_160" },
  { sub: "THE DC BAT COWL COLLECTION 5491", symbol: "the_dc_bat_cowl_collection_year_1_2023" },
  { sub: "Elseworlds: Batman Vol. 2 275", symbol: "elseworlds_batman_vol_2" },
  { sub: "Bat Cowl", symbol: "the_bat_cowl_collection" },
  { sub: "Batman Achievement Badge 150", symbol: "achievements" },
  { sub: "Wonder Woman 204 367", symbol: "wonder_woman_19421986_204" },
  { sub: "Absolute Superman (2024-)", symbol: "absolute_superman_2024_1" },
  { sub: "Showcase (1956-1978)", symbol: "showcase_19561978_22" },
  { sub: "The Brave and the Bold 28 16", symbol: "the_brave_and_the_bold_19551983_28" },
  { sub: "Batman Beyond (1999)", symbol: "batman_beyond_1999_1" },
  { sub: "Absolute Flash (2025-)", symbol: "absolute_flash_2025_1" },
  { sub: "Green Lantern (2023)", symbol: "green_lantern_2023_1" },
  { sub: "Harleen (2019)", symbol: "harleen_2019_1" },
  { sub: "Batman Gotham by Gaslight 498", symbol: "batman_gotham_by_gaslight_the_kryptonian_age_2024_5" },
  { sub: "Wonder Woman (1942-1986)", symbol: "wonder_woman_19421986_1" },
  { sub: "The Demon (1972-1973)", symbol: "the_demon_19721973_1" },
  { sub: "Action Comics 242 1806", symbol: "action_comics_19382011_242" },
  { sub: "Knight Terrors Batman 1 5525", symbol: "dc3_super_power_packs_series_knight_terrors" },
  { sub: "Batman (2016-)", symbol: "batman_2016_158" },
  { sub: "Harley Quinn 1 11643", symbol: "harley_quinn_20002004_1" },
  { sub: "The Flash (1959-1985)", symbol: "the_flash_19591985_105" },
  { sub: "Batman (1940-2011)", symbol: "batman_19402011_423" },
  { sub: "Hawkgirl (2023-)", symbol: "dc3_super_power_packs_series_dawn_of_dc_2" },
  { sub: "Abs Wonder Woman 3 35", symbol: "absolute_wonder_woman_2024_3" },
  { sub: "Detective Comics 140 1208", symbol: "detective_comics_19372011_140" },
  { sub: "Dark Nights Death Metal 1 437", symbol: "dark_nights_death_metal_20202021_1" },
  { sub: "DC Comics Presents 26 633", symbol: "dc_comics_presents_19781986_26" },
  { sub: "Whiz Comics (1940-1952)", symbol: "whiz_comics_19401952_2" },
  { sub: "Absolute Superman (2024-)", symbol: "absolute_superman_2024_6" },
  { sub: "Batman (2016-)", symbol: "batman_2016_161" },
  { sub: "From the DC Vault Death in 232", symbol: "from_the_dc_vault_death_in_the_family_robin_lives_2024_2" },
  { sub: "Batman Dark Victory Issue 0 645", symbol: "batman_dark_victory_issue_0_2025_sdcc_edition_2025_1" },
  { sub: "Batman Gotham by Gaslight 251", symbol: "batman_gotham_by_gaslight_the_kryptonian_age_2024_6" },
  { sub: "Batman Justice League Unl 261", symbol: "UNRESOLVED_GDtNBe" },
  { sub: "Absolute Batman (2024-)", symbol: "absolute_batman_2024_10" },
  { sub: "Abs Wonder Woman 4 271", symbol: "absolute_wonder_woman_2024_4" },
  { sub: "Green Arrow (2023)", symbol: "green_arrow_2023_1" },
  { sub: "Absolute Superman (2024-)", symbol: "absolute_superman_2024_4" },
  { sub: "Justice League Unl Epic Arti 19", symbol: "UNRESOLVED_3AeD6X" },
  { sub: "Mera Queen of Atlantis 1 4311", symbol: "dc3_super_power_packs_series_aquaman" },
  { sub: "DC SDCC 2025 Daily Planet 238", symbol: "dc_sdcc_2025_daily_planet_newspaper_1" },
  { sub: "Justice League The Atom 70", symbol: "justice_league_the_atom_project_2025_2" },
  { sub: "Aquaman (2025-)", symbol: "aquaman_2025_1" },
  { sub: "Batman The Joker The Deadly 243", symbol: "batman_the_joker_the_deadly_duo_2022_1" },
  { sub: "The Court of Owls Mask (847/912)", symbol: "the_court_of_owls_mask" },
  { sub: "Poison Ivy (2022-)", symbol: "poison_ivy_2022_1" },
  { sub: "House of Mystery 174 188", symbol: "house_of_mystery_19511983_174" },
  { sub: "Dark Crisis on Infinite 153", symbol: "dark_crisis_on_infinite_earths_1_2022" },
  { sub: "Red Hood (2025-)", symbol: "red_hood_2025_1" },
  { sub: "Batman The Legacy Cowl The 29", symbol: "batman_the_legacy_cowl_the_deluxe_edition" },
  { sub: "Absolute Batman (2024-)", symbol: "absolute_batman_2024_6" },
  { sub: "Batman (1940-2011)", symbol: "batman_19402011_610" },
  { sub: "Abs Martian Manhunter 3 319", symbol: "absolute_martian_manhunter_2025_3" },
  { sub: "Catwoman The Legacy Cowl 1 681", symbol: "catwoman_the_legacy_cowl_1" },
  { sub: "Batman (1940-2011)", symbol: "batman_19402011_608" },
  { sub: "Batman Gotham by Gaslight 1 1727", symbol: "batman_gotham_by_gaslight_1989_1" },
  { sub: "Batman 159 Ashcan Special 107", symbol: "batman_2016_159_ashcan_special_edition" },
  { sub: "Absolute Superman (2024-)", symbol: "absolute_superman_2024_5" },
  { sub: "Action Comics 93 295", symbol: "action_comics_19382011_93" },
  { sub: "AllAmerican Comics 16 399", symbol: "allamerican_comics_19391948_16" },
  { sub: "Future State Wonder Woman 1 525", symbol: "future_state_wonder_woman_2021_1" },
  { sub: "House of Secrets 92 1226", symbol: "house_of_secrets_19561978_92" },
  { sub: "Detective Comics (1937-)", symbol: "detective_comics_1937_40" },
  { sub: "Military Comics 1 207", symbol: "military_comics_19411945_1" },
  { sub: "Abs Batman Ashcan Special 358", symbol: "absolute_batman_ashcan_special_edition_2024_1" },
  { sub: "Immortal Legend Batman 1 60", symbol: "immortal_legend_batman_2025_1" },
  { sub: "Batman 608 160", symbol: "batman_608_multiverse_edition" },
  { sub: "Crisis on Infinite Earths 74", symbol: "crisis_on_infinite_earths" },
  { sub: "Justice League Unl 3 292", symbol: "justice_league_unlimited_2024_3" },
  { sub: "Tricked Out Treat (896/13500)", symbol: "the_harley_quinn_freakin_awesome_boxes_of_mayhem" },
  { sub: "Absolute Batman (2024-)", symbol: "absolute_batman_2024_9" },
  { sub: "MAD Magazine (1952-2017)", symbol: "mad_magazine_19522017_1" },
  { sub: "Batman Vol 1 The Court of 212", symbol: "batman_vol_1_the_court_of_owls" },
  { sub: "Batman One Bad Day Penguin 1 649", symbol: "batman_one_bad_day_penguin_2022_1" },
  { sub: "Superman (1987-2006)", symbol: "superman_19872006_75" },
  { sub: "Absolute Batman (2024-)", symbol: "absolute_batman_2024_3" },
  { sub: "Absolute Superman (2024-)", symbol: "UNRESOLVED_DrfNjs" },
  { sub: "More Fun Comics 73 20", symbol: "more_fun_comics_19361947_73" },
  { sub: "Superman Justice League Un 35", symbol: "UNRESOLVED_AbjnYk" },
  { sub: "Absolute Batman (2024-)", symbol: "absolute_batman_2024_2" },
  { sub: "Absolute Batman (2024-)", symbol: "absolute_batman_2024_12" },
  { sub: "Catwoman The Legacy Cowl 488", symbol: "catwoman_the_legacy_cowl_convention_exclusive" },
  { sub: "Superman (1939-2011)", symbol: "superman_19392011_1" },
  { sub: "From the DC Vault Death in 63", symbol: "from_the_dc_vault_death_in_the_family_robin_lives_2024_4" },
  { sub: "Green Lantern 59 280", symbol: "green_lantern_19601986_59" },
  { sub: "Action Comics 23 545", symbol: "action_comics_19382011_23" },
  { sub: "Batman Shadow of the Bat 57 721", symbol: "batman_shadow_of_the_bat_19921999_57" },
  { sub: "Absolute Superman (2024-)", symbol: "absolute_superman_2024_2" },
  { sub: "DC Elseworlds 2024 Sampler 179", symbol: "dc_elseworlds_2024_sampler" },
  { sub: "From the DC Vault Death in 195", symbol: "UNRESOLVED_94jECF" },
  { sub: "The Spectre (1992-1998)", symbol: "the_spectre_19921998_54" },
  { sub: "Batman (1940-2011)", symbol: "batman_19402011_407" },
  { sub: "DC Worlds Collide Special 1108", symbol: "dc_worlds_collide_special_edition_2025_1" },
  { sub: "Superman 1 1238", symbol: "superman_1_multiverse_edition" },
  { sub: "Batman Gotham by Gaslight 171", symbol: "batman_gotham_by_gaslight_the_kryptonian_age_2024_3" },
  { sub: "Abs Green Lantern 3 149", symbol: "UNRESOLVED_EMQVY8" },
  { sub: "Abs Wonder Woman 1 473", symbol: "absolute_wonder_woman_2024_1" },
  { sub: "Abs Martian Manhunter 1 238", symbol: "absolute_martian_manhunter_2025_1" },
  { sub: "Superman (2023)", symbol: "superman_2023_1" },
  { sub: "Legends (1986-1987)", symbol: "legends_19861987_1" },
  { sub: "Green Lantern 52 428", symbol: "dc3_super_power_packs_series_villains" },
  { sub: "Batman (1940-2011)", symbol: "batman_19402011_655" },
  { sub: "Wonder Woman (1987-2006)", symbol: "wonder_woman_19872006_1" },
];

// ---------------------------------------------------------------------
// SCHEDULED AGGREGATION (cron) — populates KV, read by GET /v2/dc-summary
// ---------------------------------------------------------------------

// Each collection gets its own KV entry (collection:{symbol}) instead of
// one shared blob — see the file header for why. 30-60 min is generous
// relative to the 20-min cron cadence: a collection that fails one or two
// cycles in a row still serves its last-known-good data instead of
// disappearing from results.
const collectionKey = (symbol) => `collection:${symbol}`;
const KV_TTL_SECONDS = 2400; // 40 min
const CLICK_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days — see /v2/click-log below

// Daily floor-price history, one KV blob per collection (mirrors
// collection:{symbol} above, not the sale:*/click:* one-key-per-event
// pattern) — /v2/dc-history has to list+merge every collection's history
// on each request the same way /v2/dc-summary does, so keeping one blob
// per collection instead of one key per day keeps that read the same
// shape/cost as the already-proven dc-summary merge instead of ballooning
// it to (collections × days) keys.
const historyKey = (symbol) => `history:${symbol}`;
const HISTORY_MAX_POINTS = 90; // ~3 months of daily checkups
// The points array is already self-trimming for display purposes, so this
// TTL's only real job is garbage-collecting history:{symbol} for a
// collection later removed from DC_COLLECTIONS (nothing else would ever
// clear it). Every live write is a plain put() that resets the TTL, so
// this never fires against an actively-tracked collection. 120 days =
// the 90-day trim window plus a cushion, same "TTL should generously
// outlast the interval it needs to survive" reasoning as KV_TTL_SECONDS's
// 2x-cron-cadence margin above.
const HISTORY_TTL_SECONDS = 60 * 60 * 24 * 120; // 120 days
const BATCH_SIZE = 5; // collections processed concurrently per batch — kept conservative given the 429s we saw; the real rate gate is throttleMagicEden() below, this just bounds how many writes are in flight at once
const SALES_WINDOW_SECS = 7 * 24 * 60 * 60; // Recent Sales looks back one week
const ACTIVITIES_MAX_PAGES = 5; // safety cap — a very active collection could otherwise page forever
// Used by /v2/click-stats to flag a click as a "possible sale" — a sale of
// the same mint landing within this window AFTER the click, not "sold at
// any point later, however unrelated." Forward-only (a sale before the
// click can't have been caused by it); ~5 min is generous enough to cover
// browsing the listing on Magic Eden and confirming a wallet tx, without
// being so wide it starts matching coincidental unrelated sales.
const SALE_CLICK_WINDOW_SECS = 5 * 60;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Confirmed via a live run's captured error: Magic Eden enforces an
// explicit "requests per minute" limit ("You have exceeded the requests in
// 1 min limit!"), not bot/UA detection. BATCH_SIZE=10 collections firing 2
// requests each (listings + activities) is up to 20 requests in a single
// burst at the start of every batch — enough to trip a per-*minute* limit
// immediately, and the short per-request retry backoff (well under a
// second) can't possibly wait out a per-minute window. A global rate
// limiter — pacing every actual fetch() call, independent of how many
// batches/collections are conceptually "in flight" — is what's actually
// needed here, the same lesson from throttling the client-side proxy
// calls earlier. Concurrency and request *rate* are different things.
const MAGIC_EDEN_MAX_REQUESTS_PER_SEC = 3; // conservative starting point — Magic Eden's exact limit isn't documented; tune based on the failed/ok counts refreshAllCollections logs on each run
let meRequestTimestamps = [];
async function throttleMagicEden() {
  while (true) {
    const now = Date.now();
    meRequestTimestamps = meRequestTimestamps.filter((t) => now - t < 1000);
    if (meRequestTimestamps.length < MAGIC_EDEN_MAX_REQUESTS_PER_SEC) {
      meRequestTimestamps.push(now);
      return;
    }
    await sleep(1000 - (now - meRequestTimestamps[0]) + 10);
  }
}

// Short, bounded retry — this runs inside a cron job with a real time
// budget, unlike a one-off user-facing request, so we don't want a single
// stubborn 429 eating tens of seconds of backoff. The throttle above is
// what actually avoids tripping the limit in the first place; this is
// just a safety net for whatever residual risk remains.
//
// Also sends a browser-like User-Agent, on the theory that unidentified
// traffic might be treated more strictly — harmless to keep even though
// the rate limit turned out to be the real, confirmed cause.
async function fetchJSONDirect(url, retries = 2) {
  for (let attempt = 0; ; attempt++) {
    await throttleMagicEden();
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    if (res.ok) return res.json();
    if (res.status === 429 && attempt < retries) {
      await sleep(400 * Math.pow(2, attempt)); // 400ms, 800ms
      continue;
    }
    const bodySnippet = await res.text().catch(() => "");
    throw new Error(`${url}: HTTP ${res.status}${bodySnippet ? " — " + bodySnippet.slice(0, 150) : ""}`);
  }
}

async function fetchCollectionListingsDirect(symbol) {
  return fetchJSONDirect(`${ME_ORIGIN}/v2/collections/${symbol}/listings?offset=0&limit=100`);
}

async function fetchCollectionActivitiesDirect(symbol) {
  let all = [];
  for (let page = 0; page < ACTIVITIES_MAX_PAGES; page++) {
    const batch = await fetchJSONDirect(`${ME_ORIGIN}/v2/collections/${symbol}/activities?offset=${page * 100}&limit=100`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all = all.concat(batch);
    const oldest = batch[batch.length - 1];
    const oldestAge = Date.now() / 1000 - (oldest?.blockTime || 0);
    if (batch.length < 100 || oldestAge > SALES_WINDOW_SECS) break;
  }
  return all;
}

function deriveListedTimes(activities) {
  const map = new Map();
  for (const a of activities) {
    if (a?.type === "list" && a?.tokenMint && !map.has(a.tokenMint)) {
      map.set(a.tokenMint, a.blockTime || null);
    }
  }
  return map;
}

// Different candy.io drops format their "Rarity" trait very inconsistently
// (confirmed against live data across dozens of collections): some are
// bare "EPIC"/"UNCOMMON" (all-caps, no suffix), others are "Common
// (40.400)" (title case, with a rarity-weight percentage tacked on), and
// at least one drop's base tier is labeled "CORE" instead of "Common".
// Strip any trailing "(...)" and alias core/base/standard to common — so
// every collection reports one of five consistent values instead of each
// drop's own raw string.
//
// The "(40.400)" isn't a per-token score — confirmed against live data
// that every listing sharing a tier within one collection carries the
// exact same number (e.g. every "Common" in a given drop reads "(39.820)")
// — it's that drop's fixed supply-distribution percentage for the tier
// ("39.82% of this print run is Common"). Worth keeping: "Legendary,
// 4.8% of supply" is a much more useful signal than "Legendary" alone.
// Not every drop's metadata includes it, so this is null more often than not.
const RARITY_ALIASES = {
  common: "common", core: "common", base: "common", standard: "common",
  uncommon: "uncommon",
  rare: "rare",
  epic: "epic",
  legendary: "legendary",
};
const RARITY_LABELS = { common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", legendary: "Legendary" };

function normalizeRarity(attributes) {
  const attr = (attributes || []).find((a) => /^rarity$/i.test(a?.trait_type || ""));
  if (!attr) return { tier: null, pct: null };
  const raw = String(attr.value || "").trim();
  const match = /^(.*?)\s*\(([\d.]+)\)\s*$/.exec(raw);
  const cleaned = (match ? match[1] : raw).trim().toLowerCase();
  const key = RARITY_ALIASES[cleaned];
  return key ? { tier: RARITY_LABELS[key], pct: match ? parseFloat(match[2]) : null } : { tier: null, pct: null };
}

// Cover Artist, unlike Character/Series, turned out NOT to be constant
// across a whole collection — confirmed against live data that collections
// with variant covers (e.g. justice_league_20112016_1, batman_2016_158)
// carry several different Cover Artist credits across their own listings.
// A prior static per-collection map (artist-map.js, since retired) sampled
// one listing per collection and wrongly attributed every other variant's
// listings to whichever artist that one sample happened to have. This
// extracts it per listing instead, the same way Rarity is handled, so
// filtering by artist only ever matches a listing's own actual credit.
//
// Multi-artist credits (e.g. "Leandro Fernandez, Dave McCaig") are split
// into individual names. Name-suffix fragments (", Jr.", ", Sr.", ", II"/
// "III"/"IV") stay attached to the preceding name rather than splitting
// into their own bogus entry — an earlier pass without this fix produced
// a standalone "Jr." credit from "Romulo Fajardo, Jr.". A few casing/
// diacritic variants seen in the raw data are normalized by hand.
const ARTIST_NAME_ALIASES = {
  "george perez": "George Pérez",
  "hi-fi": "Hi-Fi",
  "stjepan sejic": "Stjepan Šejić",
  "stjepan šejic": "Stjepan Šejić",
};
const ARTIST_NAME_EXCLUDE = new Set(["na", "n/a", "various", ""]);

function extractCoverArtists(attributes) {
  const attr = (attributes || []).find((a) => /^cover artist$/i.test(a?.trait_type || ""));
  if (!attr) return [];
  const raw = String(attr.value || "").replace(/\s+/g, " ").trim();
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const names = [];
  for (const part of parts) {
    if (/^(Jr\.?|Sr\.?|II|III|IV)$/i.test(part) && names.length > 0) {
      names[names.length - 1] += ", " + part;
    } else {
      names.push(part);
    }
  }
  return names
    .map((n) => {
      const key = n.toLowerCase();
      if (ARTIST_NAME_EXCLUDE.has(key)) return null;
      return ARTIST_NAME_ALIASES[key] || n;
    })
    .filter(Boolean);
}

function deriveSales(activities, col) {
  const cutoff = Date.now() / 1000 - SALES_WINDOW_SECS;
  const sales = [];
  for (const a of activities) {
    if ((a?.type === "buyNow" || a?.type === "acceptBid") && a?.tokenMint && (a.blockTime || 0) >= cutoff) {
      sales.push({
        sub: col.sub,
        symbol: col.symbol,
        image: a.image || "",
        price: a.price ?? null,
        mint: a.tokenMint,
        buyer: a.buyer || null,
        soldAt: a.blockTime || null,
        pdpUrl: `https://magiceden.io/item-details/${a.tokenMint}`,
      });
    }
  }
  return sales;
}

// Fetches one collection's listings + activities and writes its own KV
// entry — fully independent of every other collection. A failure here
// (429, network error, whatever) just means this collection's existing KV
// entry (from whenever it last succeeded) is left untouched; it has zero
// effect on any other collection's data or on whether GET /v2/dc-summary
// returns anything. Returns a small result object rather than throwing, so
// callers (the batch loop below, and the debug trigger endpoint) don't need
// their own try/catch.
async function refreshOneCollection(col, env) {
  try {
    const [data, activities] = await Promise.all([
      fetchCollectionListingsDirect(col.symbol),
      fetchCollectionActivitiesDirect(col.symbol).catch(() => []),
    ]);
    const listedTimes = deriveListedTimes(Array.isArray(activities) ? activities : []);
    const listings = (Array.isArray(data) ? data : []).map((item) => {
      const mint = item?.tokenMint || item?.token?.mintAddress || "";
      const rarityInfo = normalizeRarity(item?.token?.attributes);
      return {
        sub: col.sub,
        symbol: col.symbol,
        name: item?.token?.name || "Untitled",
        image: item?.token?.image || item?.extra?.img || "",
        price: item?.price ?? null,
        mintAddress: mint,
        listedAt: listedTimes.get(mint) || null,
        pdpUrl: `https://magiceden.io/item-details/${mint}`,
        // Only listings carry attributes from Magic Eden's response —
        // activities (what sales are derived from, below) don't include
        // token.attributes at all, so sold items have no rarity/cover-artist
        // captured here. Getting either onto sales would mean a separate
        // per-mint metadata fetch for every sale, which isn't worth the
        // added load on top of the rate limiting this file already fights
        // — deferred, same as rarity.
        rarity: rarityInfo.tier,
        rarityPct: rarityInfo.pct,
        coverArtists: extractCoverArtists(item?.token?.attributes),
      };
    });
    const sales = deriveSales(Array.isArray(activities) ? activities : [], col);
    const entry = { symbol: col.symbol, sub: col.sub, listings, sales, updatedAt: Date.now() };
    await env.DC_CACHE.put(collectionKey(col.symbol), JSON.stringify(entry), { expirationTtl: KV_TTL_SECONDS });

    // Persist each sale as its own KV entry, mirroring how clicks are
    // tracked (see /v2/click-log below) — deriveSales() only reflects
    // Magic Eden's live 7-day activity window and this collection's whole
    // KV entry is overwritten every cron cycle, so without a separate
    // record a sale would age out of view long before enough weekly
    // history could accumulate for /v2/click-stats' conversion chart.
    // Keyed by mint+soldAt (not a random suffix) so re-writing the same
    // sale on every cron cycle it's still within the 7-day window is a
    // harmless idempotent overwrite, never a duplicate entry. Same
    // CLICK_TTL_SECONDS (90 days) as clicks, so a full matching window of
    // weekly history is available once this has run for a while.
    //
    // Runs alongside updateCollectionHistory() (below) — independent of
    // each other and of the collection:* write above, no reason to
    // serialize them.
    await Promise.all([
      updateCollectionHistory(col, listings, env),
      ...sales
        .filter((s) => s.mint && s.soldAt)
        .map((s) =>
          env.DC_CACHE.put(`sale:${col.symbol}:${s.mint}:${s.soldAt}`, "1", { expirationTtl: CLICK_TTL_SECONDS })
        ),
    ]);

    return { ok: true, symbol: col.symbol, listingCount: listings.length, saleCount: sales.length };
  } catch (err) {
    console.error(`refreshOneCollection: ${col.symbol} failed:`, err.message);
    return { ok: false, symbol: col.symbol, error: err.message };
  }
}

// Derives today's floor (min priced listing) from data already fetched
// this cycle — no extra Magic Eden calls. Dedupes by UTC calendar date: if
// the stored array's last point is already today, overwrite it in place
// (repeated cron cycles the same day just refine today's reading);
// otherwise append a new point. Trims to HISTORY_MAX_POINTS oldest-first
// so the array — and the KV value size — stay bounded regardless of how
// long this has been running.
async function updateCollectionHistory(col, listings, env) {
  const priced = listings.filter((l) => l.price != null).map((l) => l.price);
  if (priced.length === 0) return; // no priced listings this cycle — leave prior history untouched rather than write a misleading floor
  const floor = Math.min(...priced);
  const today = new Date().toISOString().slice(0, 10); // UTC "YYYY-MM-DD"

  const raw = await env.DC_CACHE.get(historyKey(col.symbol));
  let points = [];
  if (raw) {
    try {
      points = JSON.parse(raw).points || [];
    } catch {
      points = [];
    }
  }
  const point = { date: today, floor, listingCount: listings.length };
  if (points.length && points[points.length - 1].date === today) {
    points[points.length - 1] = point;
  } else {
    points.push(point);
  }
  if (points.length > HISTORY_MAX_POINTS) {
    points = points.slice(points.length - HISTORY_MAX_POINTS);
  }
  await env.DC_CACHE.put(
    historyKey(col.symbol),
    JSON.stringify({ updatedAt: Date.now(), points }),
    { expirationTtl: HISTORY_TTL_SECONDS }
  );
}

// Loops every resolved collection in concurrent batches of BATCH_SIZE,
// refreshing each independently. No deadline, no rotation — each
// collection's write already lands the moment it succeeds, so there's
// nothing to lose if this loop takes a while or the invocation ends before
// reaching the end of the list; whatever wasn't reached this cycle just
// gets picked up on the next one, same as any collection that failed.
async function refreshAllCollections(env) {
  const toFetch = DC_COLLECTIONS.filter((c) => !c.symbol.startsWith("UNRESOLVED"));
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((col) => refreshOneCollection(col, env)));
    for (const r of results) {
      if (r.ok) ok++;
      else failed++;
    }
  }
  console.log(`refreshAllCollections: ${ok} succeeded, ${failed} failed (of ${toFetch.length})`);
}

// Lists every collection:* KV entry and merges them into the aggregate
// shape the frontend expects. Each entry has its own updatedAt (from
// whenever it last successfully refreshed); the top-level updatedAt is the
// oldest of those, i.e. "everything here is at least this fresh" — more
// honest than Date.now(), since individual collections can legitimately
// lag behind by a cycle or two without that being a problem worth hiding.
async function buildDCSummary(env) {
  const list = await env.DC_CACHE.list({ prefix: "collection:" });
  if (list.keys.length === 0) {
    return JSON.stringify({ listings: [], sales: [], updatedAt: null, failed: [], notReady: true });
  }
  const entries = await Promise.all(list.keys.map((k) => env.DC_CACHE.get(k.name)));
  const listings = [];
  const sales = [];
  let oldestUpdatedAt = null;
  for (const raw of entries) {
    if (!raw) continue;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (Array.isArray(parsed.listings)) listings.push(...parsed.listings);
    if (Array.isArray(parsed.sales)) sales.push(...parsed.sales);
    if (parsed.updatedAt && (oldestUpdatedAt === null || parsed.updatedAt < oldestUpdatedAt)) {
      oldestUpdatedAt = parsed.updatedAt;
    }
  }
  return JSON.stringify({ listings, sales, updatedAt: oldestUpdatedAt, failed: [] });
}

// Lists every history:* KV entry and merges them into the per-collection
// sparkline shape the dashboard reads — same list+Promise.all(get)+edge-
// cache pattern as buildDCSummary above, and for the same reason: merging
// ~198 individual KV entries per request is too costly to redo on every
// uncached hit. updatedAt is the oldest of each collection's own
// updatedAt, same honesty framing as buildDCSummary's.
async function buildDCHistory(env) {
  const list = await env.DC_CACHE.list({ prefix: "history:" });
  if (list.keys.length === 0) {
    return JSON.stringify({ collections: [], updatedAt: null, notReady: true });
  }
  const symbolToSub = new Map(DC_COLLECTIONS.map((c) => [c.symbol, c.sub]));
  const entries = await Promise.all(list.keys.map((k) => env.DC_CACHE.get(k.name)));
  const collections = [];
  let oldestUpdatedAt = null;
  for (let i = 0; i < list.keys.length; i++) {
    const raw = entries[i];
    if (!raw) continue;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed.points) || parsed.points.length === 0) continue;
    const symbol = list.keys[i].name.slice("history:".length);
    collections.push({ sub: symbolToSub.get(symbol) || symbol, symbol, points: parsed.points });
    if (parsed.updatedAt && (oldestUpdatedAt === null || parsed.updatedAt < oldestUpdatedAt)) {
      oldestUpdatedAt = parsed.updatedAt;
    }
  }
  return JSON.stringify({ collections, updatedAt: oldestUpdatedAt });
}

// ---------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Served from KV — populated by the scheduled() cron handler and by
    // /v2/__trigger-refresh below, never computed live from a visitor's own
    // request. Checked before the generic proxy-through logic since Magic
    // Eden has no such path itself.
    //
    // Merging ~193 individual collection:* KV entries on every request is a
    // lot more KV reads than the old single-key design (which was exactly
    // one read) — a short edge cache keeps repeat visitor requests cheap
    // without giving up the per-collection resilience this is for. 30s is
    // well under the per-collection entries' own refresh cadence, so it's
    // not adding meaningfully stale data on top of what already exists.
    if (url.pathname === "/v2/dc-summary") {
      const cache = caches.default;
      const summaryCacheKey = new Request(url.origin + "/__dc-summary-merged", { method: "GET" });
      const cachedSummary = await cache.match(summaryCacheKey);
      const body = cachedSummary ? await cachedSummary.text() : await buildDCSummary(env);
      if (!cachedSummary) {
        const toCache = new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
        });
        ctx.waitUntil(cache.put(summaryCacheKey, toCache));
      }
      return new Response(body, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    // Daily floor-price history for the dashboard's sparklines — same
    // merge-from-KV-with-a-short-edge-cache shape as /v2/dc-summary just
    // above, kept as a wholly separate endpoint/cache key so none of
    // dc-summary's existing consumers (index.html, long-box.html, etc.)
    // pay for a payload they never read.
    if (url.pathname === "/v2/dc-history") {
      const cache = caches.default;
      const historyCacheKey = new Request(url.origin + "/__dc-history-merged", { method: "GET" });
      const cachedHistory = await cache.match(historyCacheKey);
      const body = cachedHistory ? await cachedHistory.text() : await buildDCHistory(env);
      if (!cachedHistory) {
        const toCache = new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
        });
        ctx.waitUntil(cache.put(historyCacheKey, toCache));
      }
      return new Response(body, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    // Debug endpoint: refresh one collection's KV entry on demand and
    // return the real result directly in the response — for testing a
    // specific collection without waiting for or re-running the full cron
    // batch. Not meant to be permanent; remove once things have settled.
    if (url.pathname === "/v2/__trigger-refresh") {
      const symbol = url.searchParams.get("key");
      if (!symbol) {
        return new Response(JSON.stringify({ error: "missing ?key=<symbol>" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const col = DC_COLLECTIONS.find((c) => c.symbol === symbol);
      if (!col) {
        return new Response(JSON.stringify({ error: `no DC_COLLECTIONS entry with symbol "${symbol}"` }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await refreshOneCollection(col, env);
      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Outbound-to-Magic-Eden click tracking. Only ME links are ever tracked
    // here — Candy.io isn't a buy destination right now, so nothing on the
    // client ever calls this for a Candy link. POSTed via
    // navigator.sendBeacon() as a fire-and-forget beacon alongside normal
    // <a href> navigation — never a redirect the browser is routed through,
    // and never something that can block or delay a click.
    //
    // One KV entry per click, not a shared counter: KV writes to the same
    // key are rate-limited to roughly 1/sec, and a naive read-increment-write
    // counter can silently lose increments under concurrent clicks anyway.
    // Both the collection symbol AND the specific mint (when the click was
    // on an actual listing/sale card, not a collection-level "browse on ME"
    // link) live in the key itself — key:${symbol}:${mint}:${timestamp}-${rand}
    // — so /v2/click-stats below can both roll up by collection AND
    // reconstruct a per-listing click feed purely by listing and parsing key
    // names, no per-entry .get() reads needed even once this has accumulated
    // thousands of entries. Links with no specific item (spotlight.html's
    // and grails.html's "browse full collection" CTAs) use the "_collection"
    // sentinel in the mint slot instead of a real mint address.
    // CLICK_TTL_SECONDS bounds this to a rolling 90-day window.
    if (url.pathname === "/v2/click-log" && request.method === "POST") {
      let payload;
      try {
        payload = JSON.parse(await request.text());
      } catch {
        return new Response(JSON.stringify({ error: "invalid_body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Neither field is validated against live data — this runs on the hot
      // path of a real click and shouldn't risk rejecting a legitimate click
      // over data that's momentarily out of sync with this file. Sanitized
      // to safe key fragments; mint addresses are base58 already, but
      // sanitized anyway rather than trusted as-is.
      const sanitize = (s, fallback) => String(s || "").slice(0, 80).replace(/[^a-zA-Z0-9_-]/g, "_") || fallback;
      const symbol = sanitize(payload?.symbol, "unknown");
      const mint = sanitize(payload?.mint, "_collection");
      const key = `click:${symbol}:${mint}:${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      ctx.waitUntil(env.DC_CACHE.put(key, "1", { expirationTtl: CLICK_TTL_SECONDS }));
      // 204 with no body — sendBeacon never reads the response.
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Not linked from anywhere in the live site — same "direct URL only"
    // treatment as discover.html/candy-watcher.html. Tallies, the daily
    // trend, and the recent feed all come from key names only (see above),
    // so this stays cheap even with a large backlog of click entries.
    // RECENT_CLICK_FEED_LIMIT caps the individual-click feed's response
    // size; bySymbol and byDay both still cover every entry regardless of
    // that cap.
    if (url.pathname === "/v2/click-stats" && request.method === "GET") {
      const RECENT_CLICK_FEED_LIMIT = 200;
      const bySymbol = {};
      const byDay = {}; // "YYYY-MM-DD" (UTC) -> count, every click including collection-level ones
      const listingClicks = [];
      let total = 0;
      let cursor;
      do {
        const page = await env.DC_CACHE.list({ prefix: "click:", cursor, limit: 1000 });
        for (const k of page.keys) {
          const parts = k.name.slice("click:".length).split(":");
          // Two key shapes can coexist during the rolling 90-day retention
          // window: the current click:{symbol}:{mint}:{timestamp}-{rand}
          // (3 parts) and the legacy click:{symbol}:{timestamp}-{rand}
          // (2 parts, from before mint-level tracking existed). Blindly
          // taking parts[1] as "mint" for a legacy key would grab its
          // timestamp-rand string instead and produce a bogus item-details
          // link — legacy entries have no mint at all, so they're counted
          // in bySymbol/byDay same as always but never pushed into
          // listingClicks (nothing real to link to).
          let symbol, mint, tsRand;
          if (parts.length >= 3) {
            [symbol, mint, tsRand] = parts;
          } else {
            [symbol, tsRand] = parts;
            mint = null;
          }
          bySymbol[symbol] = (bySymbol[symbol] || 0) + 1;
          total++;
          const clickedAt = parseInt((tsRand || "").split("-")[0], 10) || null;
          if (clickedAt) {
            const day = new Date(clickedAt).toISOString().slice(0, 10);
            byDay[day] = (byDay[day] || 0) + 1;
          }
          if (mint && mint !== "_collection") {
            listingClicks.push({ symbol, mint, clickedAt, pdpUrl: `https://magiceden.io/item-details/${mint}` });
          }
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      listingClicks.sort((a, b) => (b.clickedAt || 0) - (a.clickedAt || 0));

      // Sales persisted per mint (see refreshOneCollection above) — cross-
      // referenced against listingClicks below to flag "possible sale"
      // clicks. Keyed on "symbol:mint" -> array of soldAt in ms, since a
      // mint can in principle resell more than once inside the retention
      // window and each sale needs its own check against SALE_CLICK_WINDOW_
      // SECS. sale:{symbol}:{mint}:{soldAt} keys store soldAt as Magic
      // Eden's blockTime, i.e. seconds — converted to ms here to compare
      // directly against clickedAt.
      const salesByKey = {};
      let saleCursor;
      do {
        const page = await env.DC_CACHE.list({ prefix: "sale:", cursor: saleCursor, limit: 1000 });
        for (const k of page.keys) {
          const parts = k.name.slice("sale:".length).split(":");
          if (parts.length < 3) continue;
          const [symbol, mint, soldAtRaw] = parts;
          const soldAt = (parseInt(soldAtRaw, 10) || 0) * 1000;
          if (!soldAt) continue;
          const mapKey = `${symbol}:${mint}`;
          (salesByKey[mapKey] || (salesByKey[mapKey] = [])).push(soldAt);
        }
        saleCursor = page.list_complete ? undefined : page.cursor;
      } while (saleCursor);

      // Flags each listing click with whether a sale of the same mint
      // landed within SALE_CLICK_WINDOW_SECS afterward — a per-listing
      // signal, not per-visitor attribution, since a listing clicked by
      // several people shortly before it sells flags all of their clicks.
      for (const c of listingClicks) {
        const sales = salesByKey[`${c.symbol}:${c.mint}`] || [];
        c.possibleSale =
          c.clickedAt != null &&
          sales.some((soldAt) => soldAt >= c.clickedAt && soldAt - c.clickedAt <= SALE_CLICK_WINDOW_SECS * 1000);
      }

      // Rolling 12-week (~84 day) view, same "always a continuous timeline"
      // approach as the 30-day daily chart — bounded by the 90-day
      // click/sale retention window. Only individual listing clicks count
      // (collection-level "_collection" clicks have no mint to cross-
      // reference against a sale).
      const WEEKLY_CONVERSION_WEEKS = 12;
      const todayUTC = (() => {
        const d = new Date();
        return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + 86400000; // end of today, exclusive
      })();
      const weeklyConversion = [];
      for (let i = WEEKLY_CONVERSION_WEEKS - 1; i >= 0; i--) {
        const weekEndMs = todayUTC - i * 7 * 86400000;
        const weekStartMs = weekEndMs - 7 * 86400000;
        weeklyConversion.push({ weekStart: new Date(weekStartMs).toISOString().slice(0, 10), clicks: 0, possibleSales: 0, weekStartMs, weekEndMs });
      }
      for (const c of listingClicks) {
        if (!c.clickedAt) continue;
        const bucket = weeklyConversion.find((w) => c.clickedAt >= w.weekStartMs && c.clickedAt < w.weekEndMs);
        if (!bucket) continue; // older than the tracked window
        bucket.clicks++;
        if (c.possibleSale) bucket.possibleSales++;
      }
      weeklyConversion.forEach((w) => {
        delete w.weekStartMs;
        delete w.weekEndMs;
      });

      return new Response(
        JSON.stringify({
          total,
          bySymbol,
          byDay,
          recentListingClicks: listingClicks.slice(0, RECENT_CLICK_FEED_LIMIT),
          recentListingClicksTruncated: listingClicks.length > RECENT_CLICK_FEED_LIMIT,
          retentionDays: CLICK_TTL_SECONDS / 86400,
          saleClickWindowSecs: SALE_CLICK_WINDOW_SECS,
          weeklyConversion,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
        }
      );
    }

    // One-time cleanup: deletes bad click: entries — both the 2-part legacy
    // key shape (logged before mint-level tracking existed) and any entry
    // with symbol "unknown" regardless of shape. The latter comes from
    // browsers that had site-nav.js cached from before the click-log
    // payload changed from {context} to {symbol, mint} — for up to 4 hours
    // after each such deploy (site-nav.js's own cache TTL), those stale
    // scripts kept POSTing the old {context: "..."} shape, which the
    // current endpoint doesn't recognize and falls back to "unknown" for.
    // Transient rollout artifact, not an ongoing bug — but still noise
    // worth purging. POST-only (not GET) so a stray crawl/bookmark visit
    // can't trigger a delete by accident. Not meant to be permanent —
    // remove this block once it's been run against the live KV namespace.
    if (url.pathname === "/v2/__cleanup-legacy-clicks" && request.method === "POST") {
      let deleted = 0;
      let kept = 0;
      let cursor;
      do {
        const page = await env.DC_CACHE.list({ prefix: "click:", cursor, limit: 1000 });
        for (const k of page.keys) {
          const parts = k.name.slice("click:".length).split(":");
          const symbol = parts[0];
          if (parts.length < 3 || symbol === "unknown") {
            await env.DC_CACHE.delete(k.name);
            deleted++;
          } else {
            kept++;
          }
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return new Response(JSON.stringify({ deleted, kept }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUrl = ME_ORIGIN + url.pathname + url.search;

    // CORS headers are Origin-specific (reflect whichever allowed origin
    // made *this* request) and must never be cached — they're added fresh
    // below on every response, whether it's a cache hit or a cache miss.
    // Only GET requests are cacheable; anything else (shouldn't happen in
    // practice, since ALLOWED methods are GET/OPTIONS) skips the cache
    // entirely and behaves exactly as before.
    const cache = caches.default;
    const cacheKey = request.method === "GET" ? new Request(targetUrl, { method: "GET" }) : null;

    if (cacheKey) {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const body = await cached.text();
        return new Response(body, {
          status: cached.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": cached.headers.get("Cache-Control") || `public, max-age=${EDGE_CACHE_SECONDS}`,
            "X-ZurVault-Cache": "HIT", // our own marker — see note above on why cf-cache-status won't show this
          },
        });
      }
    }

    try {
      const meResponse = await fetch(targetUrl, {
        headers: { Accept: "application/json" },
      });

      const body = await meResponse.text();
      const cacheControl = meResponse.ok ? `public, max-age=${EDGE_CACHE_SECONDS}` : "no-store";

      const response = new Response(body, {
        status: meResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          // cache successful responses briefly to reduce ME rate-limit pressure
          "Cache-Control": cacheControl,
          "X-ZurVault-Cache": cacheKey && meResponse.ok ? "MISS" : "BYPASS",
        },
      });

      // Store a CORS-free copy at the edge, keyed on the upstream ME URL —
      // don't block the response on this.
      if (cacheKey && meResponse.ok) {
        const toCache = new Response(body, {
          status: meResponse.status,
          headers: { "Content-Type": "application/json", "Cache-Control": cacheControl },
        });
        ctx.waitUntil(cache.put(cacheKey, toCache));
      }

      return response;
    } catch (err) {
      return new Response(JSON.stringify({ error: "proxy_fetch_failed", message: err.message }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },

  // Cron Trigger expression set in the dashboard for "every 20 minutes":
  // */20 * * * *
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshAllCollections(env));
  },
};
