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
 * collection in DC_COLLECTIONS itself, aggregates the result, and writes it
 * to Workers KV. index.html then makes ONE request to GET /v2/dc-summary
 * instead of looping through ~200 collections × 2 endpoints itself —
 * that loop used to run client-side on every page load and every 5-minute
 * refresh, which is what was actually driving Worker request count against
 * the free tier (caching alone doesn't reduce request *count*, since the
 * Worker still executes once per incoming client request regardless of
 * whether it's served from cache internally).
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
 * etc. This Worker forwards the path 1:1 to Magic Eden. The one exception
 * is {WORKER_URL}/v2/dc-summary, which is served entirely from KV (see
 * above) and never touches Magic Eden in the request path at all.
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
  { sub: "Inkling", symbol: "palm_garden_inklings" },
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
  { sub: "Fernando Tatis Jr. (429/1000)", symbol: "2023_team_series_icons" },
  { sub: "Peacemaker Tries Hard 1 45", symbol: "peacemaker_tries_hard_2023_1" },
  { sub: "Absolute Power (2024)", symbol: "dc3_super_power_packs_series_absolute_power" },
  { sub: "Crisis on Infinite Earths 3 2602", symbol: "dc3_super_power_packs_series_1_crisis_on_infinite_earths" },
  { sub: "2023 MLB AllStar 4994", symbol: "2023_allstar_icons" },
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
  { sub: "2025 MLB Opening Day 1705", symbol: "2025_mlb_tickets" },
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
  { sub: "Dark Nights Death Metal 1 437", symbol: "UNRESOLVED_9DEvWH" },
  { sub: "DC Comics Presents 26 633", symbol: "dc_comics_presents_19781986_26" },
  { sub: "Whiz Comics (1940-1952)", symbol: "whiz_comics_19401952_2" },
  { sub: "Absolute Superman (2024-)", symbol: "absolute_superman_2024_6" },
  { sub: "Batman (2016-)", symbol: "batman_2016_161" },
  { sub: "From the DC Vault Death in 232", symbol: "from_the_dc_vault_death_in_the_family_robin_lives_2024_2" },
  { sub: "2024 MLB Opening Day Pin 1182", symbol: "2024_opening_day_pin" },
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
  { sub: "Aaron Civale (19/425)", symbol: "2022_leadoff_icons" },
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

const KV_KEY = "dc-summary";
const KV_TTL_SECONDS = 2400; // 2x the 20-min cron interval — a safety net if a cron run fails, not the real freshness window (that's the cron cadence itself)
const BATCH_SIZE = 10; // collections processed concurrently per batch — tune based on real 429 rates / cron run duration you observe after deploying
const RUN_DEADLINE_MS = 45000; // self-imposed budget so a slow run still writes partial results instead of nothing — if `partial: true` shows up a lot in the KV value, either this needs raising (if your plan allows longer scheduled-event execution) or the workload needs trimming (lower ACTIVITIES_MAX_PAGES / SALES_WINDOW_SECS)
const SALES_WINDOW_SECS = 7 * 24 * 60 * 60; // Recent Sales looks back one week
const ACTIVITIES_MAX_PAGES = 5; // safety cap — a very active collection could otherwise page forever

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Short, bounded retry — this runs inside a cron job with a real time
// budget, unlike a one-off user-facing request, so we don't want a single
// stubborn 429 eating tens of seconds of backoff.
//
// Sends a browser-like User-Agent: Cloudflare Workers' default outbound
// fetch() doesn't send one at all, and some APIs (Magic Eden's included,
// possibly) treat unidentified/datacenter-origin traffic more strictly
// than they treat normal browser requests.
async function fetchJSONDirect(url, retries = 2) {
  for (let attempt = 0; ; attempt++) {
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
        soldAt: a.blockTime || null,
        pdpUrl: `https://magiceden.io/item-details/${a.tokenMint}`,
      });
    }
  }
  return sales;
}

// Processes `items` in concurrent batches of `batchSize`, awaiting each
// batch before starting the next — bounded parallelism instead of a
// heavily-throttled near-serial loop, since this is calling Magic Eden's
// origin directly (not through this Worker), a different constraint than
// the caches.default logic above.
//
// Also self-limits to `deadlineMs` total: if a run is going slower than
// expected (retries stacking up, Magic Eden having a slow day, or just
// misjudging how much a single invocation can get through), it stops
// starting new batches once the deadline passes rather than risking the
// whole invocation getting cut off mid-flight with nothing written. Any
// collections not reached this cycle just get picked up on the next one.
async function runBatches(items, worker, batchSize, deadlineMs) {
  const startedAt = Date.now();
  let reached = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    if (Date.now() - startedAt > deadlineMs) break;
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(worker));
    reached += batch.length;
  }
  return { reached, total: items.length };
}

async function refreshDCSummary(env) {
  const resolved = DC_COLLECTIONS.filter((c) => !c.symbol.startsWith("UNRESOLVED"));
  // Rotate the starting point each run (deterministic from wall-clock time,
  // no state needed) so that if a run gets cut short by RUN_DEADLINE_MS,
  // it's not always the same tail end of the list that goes uncovered —
  // coverage rotates across runs instead of permanently starving whichever
  // collections happen to sit at the end of DC_COLLECTIONS.
  const rotateBy = resolved.length ? Math.floor(Date.now() / (20 * 60 * 1000)) % resolved.length : 0;
  const toFetch = resolved.slice(rotateBy).concat(resolved.slice(0, rotateBy));
  const listings = [];
  const sales = [];
  const failed = [];
  const sampleErrors = []; // first few real error messages — surfaced in the summary itself since dashboard log access isn't always handy mid-debugging

  const { reached, total } = await runBatches(
    toFetch,
    async (col) => {
      try {
        const [data, activities] = await Promise.all([
          fetchCollectionListingsDirect(col.symbol),
          fetchCollectionActivitiesDirect(col.symbol).catch(() => []),
        ]);
        const listedTimes = deriveListedTimes(Array.isArray(activities) ? activities : []);
        const items = (Array.isArray(data) ? data : []).map((item) => {
          const mint = item?.tokenMint || item?.token?.mintAddress || "";
          return {
            sub: col.sub,
            symbol: col.symbol,
            name: item?.token?.name || "Untitled",
            image: item?.token?.image || item?.extra?.img || "",
            price: item?.price ?? null,
            mintAddress: mint,
            listedAt: listedTimes.get(mint) || null,
            pdpUrl: `https://magiceden.io/item-details/${mint}`,
          };
        });
        listings.push(...items);
        sales.push(...deriveSales(Array.isArray(activities) ? activities : [], col));
      } catch (err) {
        failed.push(col.sub);
        console.error(`refreshDCSummary: ${col.symbol} failed:`, err.message);
        if (sampleErrors.length < 5) sampleErrors.push(`${col.symbol}: ${err.message}`);
      }
    },
    BATCH_SIZE,
    RUN_DEADLINE_MS
  );

  // Write unconditionally — even a partial run (some collections not
  // reached before the deadline) produces real, mostly-fresh data, which
  // beats the all-or-nothing pattern that was almost certainly the actual
  // cause of the site going blank: any interruption meant zero writes.
  const summary = { listings, sales, updatedAt: Date.now(), failed, partial: reached < total, sampleErrors };
  await env.DC_CACHE.put(KV_KEY, JSON.stringify(summary), { expirationTtl: KV_TTL_SECONDS });
  return summary;
}

// ---------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Served entirely from KV — populated by the scheduled() cron handler
    // below, never by a visitor's own request. Checked before the generic
    // proxy-through logic since Magic Eden has no such path itself.
    if (url.pathname === "/v2/dc-summary") {
      const raw = await env.DC_CACHE.get(KV_KEY);
      const body = raw || JSON.stringify({ listings: [], sales: [], updatedAt: null, failed: [], notReady: true });
      return new Response(body, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
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
    ctx.waitUntil(refreshDCSummary(env));
  },
};
