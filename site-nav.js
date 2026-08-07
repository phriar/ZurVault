/* ============================================================
   ZurVault shared top banner. Include right after <body> opens:
     <script src="site-nav.js" data-active="index"></script>
   data-active values: index | discover | characters | collections | artists | rarity | dollar-bin | spotlight | guide | slideshow | slideshow-legacy | comics | candy | grails

   Self-injects its own <style> + markup, so every page shares one
   consistent site identity strip instead of duplicating markup.
   Exposes window.ZurVaultNav.hide()/.show() for pages with
   immersive fullscreen views (lightbox, slideshow playback, comic
   reader) to duck the banner out of the way.
   ============================================================ */
(function () {
  var script = document.currentScript;
  var active = script.getAttribute('data-active') || '';

  var COWL_URL = 'https://arweave.net/uyG3Nvb1UKTtm3q-tdHs4GNYOiEyaSTc7O0zhsc9gIQ';

  // Primary nav is intentionally short — the site's focus is the
  // series-collector experience (Listings, Grails, Collections,
  // Slideshow). discover.html, comics.html, candy-watcher.html, and
  // now characters.html/character.html are deliberately unlisted here
  // (config-generation tool, reading fallback now that candy.io is
  // primary, a power-user watcher tool, and — for Characters —
  // superseded by Grails as the front-door curated-discovery page,
  // respectively) — all of them still work fine at their direct URLs
  // and still include site-nav.js, they're just not in the banner.
  var PAGES = [
    { id: 'index',       label: 'Listings',      href: 'index.html' },
    { id: 'grails',      label: 'Grails',        href: 'grails.html' },
    { id: 'collections', label: 'Collections',   href: 'collections.html' },
    { id: 'artists',     label: 'Artists',       href: 'artists.html' },
    { id: 'rarity',      label: 'Rarity',        href: 'rarity.html' },
    { id: 'dollar-bin',  label: 'Dollar Bin',    href: 'dollar-bin.html' },
    { id: 'spotlight',   label: 'Spotlight',     href: 'spotlight.html?id=why-the-killing-joke-still-matters' },
    { id: 'guide',       label: 'How To',        href: 'guide.html' },
    { id: 'slideshow',   label: 'Slideshow',     href: 'slideshow.html' },
  ];

  var style = document.createElement('style');
  style.textContent =
    '#zv-banner{position:fixed;top:0;left:0;right:0;z-index:400;height:46px;' +
      'display:flex;align-items:center;justify-content:space-between;gap:14px;' +
      'padding:0 16px;background:rgba(6,6,6,0.82);backdrop-filter:blur(14px);' +
      '-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,0.08);' +
      'font-family:"DM Mono","JetBrains Mono",monospace;box-sizing:border-box;' +
      'transition:transform .2s ease,opacity .2s ease;}' +
    '#zv-banner.zv-hidden{transform:translateY(-100%);opacity:0;pointer-events:none;}' +
    '#zv-banner *{box-sizing:border-box;}' +
    '#zv-banner .zv-brand{display:flex;align-items:center;gap:8px;text-decoration:none;flex-shrink:0;}' +
    '#zv-banner .zv-mark{width:24px;height:24px;border-radius:50%;flex-shrink:0;' +
      'background-image:url(\'' + COWL_URL + '\');background-size:180%;background-position:center 30%;' +
      'border:1px solid rgba(143,111,232,0.45);}' +
    '#zv-banner .zv-word{font-size:.7rem;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,0.78);}' +
    '#zv-banner .zv-links{display:flex;align-items:center;gap:2px;overflow-x:auto;scrollbar-width:none;}' +
    '#zv-banner .zv-links::-webkit-scrollbar{display:none;}' +
    '#zv-banner .zv-link{font-size:.58rem;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;' +
      'color:rgba(255,255,255,0.4);padding:6px 9px;white-space:nowrap;border-bottom:1px solid transparent;' +
      'transition:color .15s,border-color .15s;}' +
    '#zv-banner .zv-link:hover{color:#4de8ff;}' +
    '#zv-banner .zv-link.active{color:rgba(255,255,255,0.88);border-color:#6b2fd6;cursor:default;pointer-events:none;}' +
    'body.zv-has-banner{padding-top:46px;}';
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
    '</div>';

  script.insertAdjacentHTML('afterend', html);
  document.body.classList.add('zv-has-banner');

  var banner = document.getElementById('zv-banner');
  window.ZurVaultNav = {
    hide: function () { banner.classList.add('zv-hidden'); },
    show: function () { banner.classList.remove('zv-hidden'); }
  };
})();
