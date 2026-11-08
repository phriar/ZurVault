/* ============================================================
   ZurVault OpenSea data — shared by every listings-consuming page.

   OpenSea is the site's primary marketplace as of 2026-11-07, so every
   page that browses listings/sales reads OpenSea through this one file
   rather than each re-implementing the fetch/merge the way the Magic
   Eden side grew up (one copy per page).

   ZurOS.load() returns items normalized into the same shape the pages'
   existing Magic Eden renderers already use — sub, symbol, name, image,
   price, mintAddress/mint, listedAt/soldAt, pdpUrl, rarity, rarityPct,
   coverArtists, itemType — plus `market: 'os'`, so a page can switch
   its dataset between marketplaces without a second set of renderers.

   Source: GET /v2/os-summary (the Worker's OpenSea counterpart to
   /v2/dc-summary). Until that Worker version is deployed, it falls back
   to merging the older per-feed endpoints here in the browser — same
   result, just without per-collection sales or cover-artist data.

   `symbol` is a Magic Eden-style collection id ("harley_quinn_20002004_1")
   so character-map.js / collections-map.js symbol lists match OpenSea
   items exactly the way they match Magic Eden ones. inferSymbol() below
   must stay identical to inferSymbolFromSlug() in the Worker.

   Market choice (OpenSea vs Magic Eden) is shared across pages via
   ZurOS.getMarket()/setMarket(): ?market=me|os in the URL wins, then the
   visitor's last choice, then OpenSea.
   ============================================================ */
(function () {
  var BASE = 'https://zurvault-proxy.stholt.workers.dev/v2';
  var MARKET_KEY = 'zv-market';
  var EXCLUDED = { '2023-team-series-icons': 1, '2024-opening-day-pin': 1, 'candy-mlb': 1 };

  function inferSymbol(slug) {
    return String(slug || '')
      .toLowerCase()
      .replace(/-\d{6,}$/, '')
      .replace(/(\d{4})-(\d{4})/g, '$1$2')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  function normalize(i, kind) {
    var mint = i.mintAddress || i.mint || '';
    var slug = i.collectionSlug && i.collectionSlug !== 'candy-dc' ? i.collectionSlug : null;
    var out = {
      market: 'os',
      sub: i.sub || i.collectionName && i.collectionName !== 'Candy DC' && i.collectionName || i.character || 'Candy DC',
      symbol: i.symbol || (slug ? inferSymbol(slug) : null),
      collectionSlug: slug,
      name: i.name || 'Untitled',
      image: i.image || '',
      price: typeof i.price === 'number' ? Math.round(i.price * 10000) / 10000 : null,
      mintAddress: mint,
      mint: mint,
      pdpUrl: i.openSeaUrl || (mint ? 'https://opensea.io/item/solana/' + mint : ''),
      rarity: i.rarity || null,
      rarityPct: typeof i.rarityPct === 'number' ? i.rarityPct : null,
      character: i.character || null,
      coverArtists: Array.isArray(i.coverArtists) ? i.coverArtists : [],
      itemType: i.itemType || null,
      buyer: null
    };
    if (kind === 'sale') out.soldAt = i.soldAt || null;
    else out.listedAt = i.listedAt || null;
    return out;
  }

  function getJSON(path) {
    return fetch(BASE + '/' + path).then(function (r) {
      if (!r.ok) throw new Error(path + ': HTTP ' + r.status);
      return r.json();
    });
  }

  function fromSummary(d) {
    return {
      listings: (d.listings || []).map(function (i) { return normalize(i, 'listing'); }),
      sales: (d.sales || []).map(function (i) { return normalize(i, 'sale'); }),
      collections: d.collections || [],
      updatedAt: d.updatedAt || null,
      salesScope: 'collections',
      source: 'summary'
    };
  }

  // Pre-deploy fallback: same merge buildOsSummary() does server-side.
  function fromLegacyFeeds() {
    var soft = function (p) { return getJSON(p).catch(function () { return null; }); };
    return Promise.all([soft('opensea-named-listings'), soft('opensea-full-listings'), soft('opensea-activity'), soft('opensea-collections')])
      .then(function (r) {
        var named = r[0], full = r[1], act = r[2], dir = r[3] || {};
        if (!named && !full && !act) throw new Error('OpenSea feeds unavailable');
        var seen = {};
        var listings = [];
        [].concat((named && named.listings) || [], (full && full.listings) || []).forEach(function (l) {
          if (!l || !l.mintAddress || seen[l.mintAddress] || EXCLUDED[l.collectionSlug]) return;
          seen[l.mintAddress] = 1;
          listings.push(normalize(l, 'listing'));
        });
        var sales = ((act && act.sales) || []).map(function (s) { return normalize(s, 'sale'); });
        var collections = Object.keys(dir).filter(function (s) { return !EXCLUDED[s]; }).map(function (s) {
          return { slug: s, name: (dir[s] && dir[s].name) || s, symbol: inferSymbol(s) };
        });
        var ts = [named, full, act].map(function (x) { return (x && x.updatedAt) || 0; });
        return {
          listings: listings,
          sales: sales,
          collections: collections,
          updatedAt: Math.max.apply(null, ts) || null,
          // The legacy activity feed only covers recent catch-all sales,
          // not every collection — pages say so instead of implying a
          // collection simply had no sales.
          salesScope: 'recent',
          source: 'legacy'
        };
      });
  }

  var pending = null;
  function load(force) {
    if (pending && !force) return pending;
    pending = getJSON('os-summary')
      .then(function (d) {
        if (!d || d.notReady || !Array.isArray(d.listings)) throw new Error('os-summary not ready');
        return fromSummary(d);
      })
      .catch(function () { return fromLegacyFeeds(); });
    pending.catch(function () { pending = null; });
    return pending;
  }

  function getMarket() {
    try {
      var p = new URLSearchParams(location.search).get('market');
      if (p === 'me' || p === 'os') return p;
    } catch (e) {}
    try {
      var v = localStorage.getItem(MARKET_KEY);
      if (v === 'me' || v === 'os') return v;
    } catch (e) {}
    return 'os';
  }
  function setMarket(m) {
    try { localStorage.setItem(MARKET_KEY, m); } catch (e) {}
  }

  function marketLabel(m) { return m === 'me' ? 'Magic Eden' : 'OpenSea'; }

  // The "Marketplace ↗" cue inside a card. Magic Eden keeps its existing
  // .me-tag class so pages' existing CSS still applies; OpenSea reuses
  // the same class (one consistent cue style) with its own text.
  function marketTag(item) {
    return '<div class="me-tag">' + marketLabel(item && item.market === 'os' ? 'os' : 'me') + ' &#8599;</div>';
  }

  // data-track attributes for site-nav.js's outbound click beacon — Magic
  // Eden links only for now (the Worker's click-log/click-stats parse
  // `symbol` as a Magic Eden symbol; OpenSea tracking needs its own key
  // shape before it's switched on).
  function trackAttrs(item, mint, esc) {
    if (!item || item.market === 'os') return '';
    return ' data-track="me" data-track-context="' + esc(item.symbol || '') + '" data-track-mint="' + esc(mint || '') + '"';
  }

  // Shared OpenSea / Magic Eden segmented control. Injects its own small
  // stylesheet once (zv-market-* classes, built off each page's own
  // --gold/--cyan tokens) so it looks identical on every page without
  // every page duplicating the CSS. OpenSea is listed first: it's the
  // primary marketplace now.
  var cssDone = false;
  function injectCss() {
    if (cssDone) return;
    cssDone = true;
    var st = document.createElement('style');
    st.textContent =
      // Same look as index.html's original .market-tab segmented control.
      '.zv-market{display:flex;gap:12px;flex-wrap:wrap;padding:4px 32px 24px}' +
      '.zv-market button{font-family:"DM Mono",monospace;font-size:1rem;letter-spacing:.08em;text-transform:uppercase;' +
        'color:rgba(255,255,255,0.65);padding:14px 28px;border:1px solid var(--border,rgba(255,255,255,0.12));border-radius:10px;' +
        'cursor:pointer;transition:all .15s;background:rgba(255,255,255,0.02)}' +
      '.zv-market button:hover{color:rgba(255,255,255,0.85);border-color:rgba(143,111,232,0.4)}' +
      '.zv-market button.active{color:#fff;background:linear-gradient(135deg,var(--deep,#5b3fb5),var(--gold,#8f6fe8));border-color:transparent}' +
      '.zv-market button:focus-visible{outline:2px solid var(--cyan,#4de8ff);outline-offset:2px}' +
      '@media (max-width:600px){.zv-market{padding:4px 16px 20px}.zv-market button{flex:1;padding:12px 10px;font-size:.9rem}}' +
      // rgba(255,255,255,0.55) on #0a0a0a ≈ 6.3:1 — same audited pairing
      // as index.html's .os-activity-sub/.card .time.
      '.zv-market-note{padding:0 32px 14px;font-family:"DM Mono",monospace;font-size:.85rem;letter-spacing:.04em;color:rgba(255,255,255,0.55)}' +
      '@media (max-width:600px){.zv-market-note{padding:0 16px 12px}}';
    document.head.appendChild(st);
  }
  function mountMarketSwitch(el, current, onChange) {
    if (!el) return;
    injectCss();
    el.className = 'zv-market';
    el.setAttribute('role', 'tablist');
    el.innerHTML = ['os', 'me'].map(function (m) {
      return '<button type="button" role="tab" data-market="' + m + '" aria-selected="' + (m === current) + '"' +
        (m === current ? ' class="active"' : '') + '>' + marketLabel(m) + '</button>';
    }).join('');
    el.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var m = b.getAttribute('data-market');
        el.querySelectorAll('button').forEach(function (x) {
          var on = x === b;
          x.classList.toggle('active', on);
          x.setAttribute('aria-selected', String(on));
        });
        setMarket(m);
        onChange(m);
      });
    });
  }

  window.ZurOS = {
    mountMarketSwitch: mountMarketSwitch,
    load: load,
    inferSymbol: inferSymbol,
    getMarket: getMarket,
    setMarket: setMarket,
    marketLabel: marketLabel,
    marketTag: marketTag,
    trackAttrs: trackAttrs
  };
})();
