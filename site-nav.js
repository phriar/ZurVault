/* ============================================================
   ZurVault shared top banner. Include right after <body> opens:
     <script src="site-nav.js" data-active="index"></script>
   data-active values: index | discover | collections | artists | long-box | dollar-bin | spotlight | guide | comics | candy | grails | packs | quests

   Self-injects its own <style> + markup, so every page shares one
   consistent site identity strip instead of duplicating markup.
   Exposes window.ZurVaultNav.hide()/.show() for pages with
   immersive fullscreen views (lightbox, slideshow playback, comic
   reader) to duck the banner out of the way.

   Also owns outbound Magic Eden click tracking (fire-and-forget
   navigator.sendBeacon(), no redirect, no preventDefault — see the
   comment near ME_CLICK_LOG_URL below) since it's already loaded on
   every page. To track a link: add data-track="me" and
   data-track-context="<symbol>" to it, plus data-track-mint="<mint>"
   if it's a specific listing/sale card rather than a collection-level
   "browse on Magic Eden" link — nothing else changes.
   ============================================================ */
(function () {
  var script = document.currentScript;
  var active = script.getAttribute('data-active') || '';

  var COWL_URL = 'https://arweave.net/uyG3Nvb1UKTtm3q-tdHs4GNYOiEyaSTc7O0zhsc9gIQ';

  // Primary nav is intentionally short. discover.html, comics.html,
  // candy-watcher.html, click-stats.html, and dashboard.html are
  // deliberately unlisted here (config-generation tool, reading fallback
  // now that candy.io is primary, a power-user watcher tool, an internal
  // report, and a page still being ironed out, respectively) — all still
  // work fine at their direct URLs and still include site-nav.js, they're
  // just not in the banner. grails.html, collections.html, and
  // spotlight.html joined that same unlisted-but-functional group
  // 2026-08-19 by user request (own direct-URL cross-links from other
  // pages — e.g. index.html's spotlight teaser, collection.html's
  // back-link — are untouched and still work; only the persistent top-
  // banner entry was removed). packs.html moved the other direction the
  // same day: added to the primary nav after shipping unlinked first.
  // characters.html/character.html, by contrast, were retired outright,
  // not just unlisted — character browsing now lives inside
  // collections.html as a "Characters" tab (?tab=characters) and inside
  // collection.html via ?c=<id>, both still under the `collections` nav
  // id even though that id is no longer in PAGES below. slideshow.html
  // was pulled the same way on 2026-08-09 — removed from the repo, not
  // just unlinked, alongside slideshow-legacy.html — while the Safe
  // Browsing review is active. quests.html shipped straight into the
  // primary nav (2026-08-21) rather than launching unlisted first, since
  // Candy's live weekly quests are time-sensitive — a page nobody can
  // find until a later promotion isn't useful for something with a
  // deadline.
  var PAGES = [
    { id: 'index',       label: 'Listings',      href: 'index.html' },
    { id: 'artists',     label: 'Artists',       href: 'artists.html' },
    { id: 'long-box',    label: 'Long Box',      href: 'long-box.html' },
    { id: 'dollar-bin',  label: 'Dollar Bin',    href: 'dollar-bin.html' },
    { id: 'packs',       label: 'Packs',         href: 'packs.html' },
    { id: 'quests',      label: 'Quests',        href: 'quests.html' },
    { id: 'guide',       label: 'How To',        href: 'guide.html' },
  ];

  var style = document.createElement('style');
  style.textContent =
    '#zv-banner{position:fixed;top:0;left:0;right:0;z-index:400;height:52px;' +
      'display:flex;align-items:center;justify-content:space-between;gap:14px;' +
      'padding:0 16px;background:rgba(6,6,6,0.82);backdrop-filter:blur(14px);' +
      '-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,0.08);' +
      'font-family:"DM Mono","JetBrains Mono",monospace;box-sizing:border-box;' +
      'transition:transform .2s ease,opacity .2s ease;}' +
    '#zv-banner.zv-hidden{transform:translateY(-100%);opacity:0;pointer-events:none;}' +
    '#zv-banner *{box-sizing:border-box;}' +
    '#zv-banner .zv-brand{display:flex;align-items:center;gap:8px;text-decoration:none;flex-shrink:0;}' +
    '#zv-banner .zv-mark{width:26px;height:26px;border-radius:50%;flex-shrink:0;' +
      'background-image:url(\'' + COWL_URL + '\');background-size:180%;background-position:center 30%;' +
      'border:1px solid rgba(143,111,232,0.45);}' +
    '#zv-banner .zv-word{font-size:.85rem;letter-spacing:.26em;text-transform:uppercase;color:rgba(255,255,255,0.78);}' +
    '#zv-banner .zv-links{display:flex;align-items:center;gap:2px;overflow-x:auto;scrollbar-width:none;}' +
    '#zv-banner .zv-links::-webkit-scrollbar{display:none;}' +
    '#zv-banner .zv-link{font-size:.72rem;letter-spacing:.09em;text-transform:uppercase;text-decoration:none;' +
      'color:rgba(255,255,255,0.4);padding:7px 10px;white-space:nowrap;border-bottom:1px solid transparent;' +
      'transition:color .15s,border-color .15s;}' +
    '#zv-banner .zv-link:hover{color:#4de8ff;}' +
    '#zv-banner .zv-link.active{color:rgba(255,255,255,0.88);border-color:#6b2fd6;cursor:default;pointer-events:none;}' +
    'body.zv-has-banner{padding-top:52px;}' +
    '#zv-disclaimer{padding:7px 16px;background:rgba(77,232,255,0.05);border-bottom:1px solid rgba(77,232,255,0.16);' +
      'font-family:"DM Mono","JetBrains Mono",monospace;font-size:.66rem;line-height:1.5;letter-spacing:.01em;' +
      'color:rgba(255,255,255,0.55);text-align:center;}';
  document.head.appendChild(style);

  var links = PAGES.map(function (p) {
    var cls = 'zv-link' + (p.id === active ? ' active' : '');
    var href = p.id === active ? 'javascript:void(0)' : p.href;
    return '<a class="' + cls + '" href="' + href + '">' + p.label + '</a>';
  }).join('');

  var html =
    '<div id="zv-banner">' +
      '<a class="zv-brand" href="index.html" aria-label="ZurVault home">' +
        '<span class="zv-mark"></span><span class="zv-word">ZurVault</span>' +
      '</a>' +
      '<nav class="zv-links">' + links + '</nav>' +
    '</div>' +
    // Not fixed like #zv-banner — flows normally right below the fixed
    // banner's reserved padding-top space, so it needs no offset math of
    // its own and just pushes the rest of the page down. Deliberately on
    // every page, above the fold, not buried in a footer: this project
    // aggregates live third-party Magic Eden pricing/listings and shows
    // DC-branded comic art, and a visitor should never be able to mistake
    // it for an official storefront.
    '<div id="zv-disclaimer">Unofficial fan project &mdash; not affiliated with or endorsed by DC Comics, Warner Bros. Discovery, or Magic Eden. Prices, listings, and sales shown are live third-party data; all purchases happen on Magic Eden, not here.</div>';

  script.insertAdjacentHTML('afterend', html);
  document.body.classList.add('zv-has-banner');

  var banner = document.getElementById('zv-banner');
  var disclaimer = document.getElementById('zv-disclaimer');
  window.ZurVaultNav = {
    hide: function () { banner.classList.add('zv-hidden'); if (disclaimer) disclaimer.style.display = 'none'; },
    show: function () { banner.classList.remove('zv-hidden'); if (disclaimer) disclaimer.style.display = ''; }
  };

  // ----------------------------------------------------------------
  // Outbound Magic Eden click tracking. Magic Eden only — Candy.io
  // isn't a buy destination right now, so Candy links are never
  // instrumented (no data-track attribute is ever added to one).
  //
  // Fire-and-forget only: no preventDefault(), no URL rewriting, no
  // redirect through our own domain. The link's real href is exactly
  // what the browser follows, at the same instant it would without
  // this listener — the beacon is a side effect of the click, not a
  // gate in front of it. If sendBeacon is unsupported, blocked, or the
  // Worker is unreachable, the click still navigates completely
  // normally; nothing here can break or delay it.
  //
  // Delegated on document (capture phase, so it fires even if a page's
  // own click handler on the same element calls stopPropagation() in
  // the bubble phase) rather than bound to individual links, since
  // every listings-consuming page replaces its results via innerHTML
  // on every render — per-element listeners would need re-attaching
  // constantly; delegation just works regardless of how often the DOM
  // underneath gets swapped out.
  var ME_CLICK_LOG_URL = 'https://zurvault-proxy.stholt.workers.dev/v2/click-log';

  document.addEventListener('click', function (e) {
    if (!navigator.sendBeacon) return;
    var el = e.target.closest && e.target.closest('[data-track="me"]');
    if (!el) return;
    try {
      var symbol = el.getAttribute('data-track-context') || 'unknown';
      // data-track-mint is only present on links to a specific listing/sale
      // card — collection-level "browse on Magic Eden" CTAs have no single
      // mint, so this comes back empty for those and the Worker files it
      // under a "_collection" sentinel rather than a per-listing entry.
      var mint = el.getAttribute('data-track-mint') || '';
      navigator.sendBeacon(ME_CLICK_LOG_URL, JSON.stringify({ symbol: symbol, mint: mint }));
    } catch (err) {
      // Tracking must never be able to break a click — swallow and move on.
    }
  }, true);
})();
