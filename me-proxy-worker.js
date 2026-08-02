/**
 * ZurVault → Magic Eden proxy
 * ---------------------------
 * Magic Eden's public API doesn't send Access-Control-Allow-Origin,
 * so browsers block direct requests from zurvault.com (CORS).
 * This Worker forwards requests to ME and adds the missing header.
 *
 * It also caches successful responses at Cloudflare's edge (via the Cache
 * API), keyed on the upstream Magic Eden URL rather than the Worker's own
 * request URL — so the cache is shared across every visitor instead of
 * being fragmented per-caller. index.html alone fetches listings +
 * activities for ~200 collections on every load (plus a background
 * refresh every 5 minutes), which was hitting this Worker — and Magic
 * Eden — fresh on every single request.
 *
 * DEPLOY:
 * 1. Go to https://dash.cloudflare.com → Workers & Pages → Create → Worker
 * 2. Delete the default code, paste this whole file in, click Deploy
 * 3. Note the URL Cloudflare gives you, e.g. https://zurvault-me-proxy.YOURNAME.workers.dev
 * 4. In dc.html / discover.html, change ME_BASE to that URL instead of
 *    https://api-mainnet.magiceden.dev/v2
 *
 * USAGE from the browser stays identical — just call:
 *   {WORKER_URL}/v2/tokens/{mint}
 *   {WORKER_URL}/v2/collections/{symbol}/listings
 * etc. This Worker forwards the path 1:1 to Magic Eden.
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

// NOTE on verifying this works: don't look for Cloudflare's own
// `cf-cache-status` header — that reflects Cloudflare's *automatic* edge
// cache for full HTTP responses (governed by zone Cache Rules), which is a
// separate layer that a workers.dev script doesn't control and won't
// reliably engage for JSON/API paths. This Worker's caching runs *inside*
// the script via the Cache API (caches.default), so the Worker's fetch
// handler still executes on every request either way — it just skips the
// upstream Magic Eden call on a hit. Check the X-ZurVault-Cache response
// header instead (HIT / MISS / BYPASS) to confirm it's working.

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
            "X-ZurVault-Cache": "HIT", // our own marker — see note below on why cf-cache-status won't show this
          },
        });
      }
    }

    try {
      const meResponse = await fetch(targetUrl, {
        headers: { "Accept": "application/json" },
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
};
