/* ============================================================
   ZurVault shared footer add-on. Include right before </body>,
   after the page's own <footer>...</footer> markup:
     <script src="/site-footer.js"></script>

   Every page still writes its own footer content by hand (candy.io
   companion line, support-note, etc. — see site-nav.js's own header
   comment on "some shared code, most pages still standalone") — this
   just appends a single "About" link into that existing footer so
   every page points at about.html without 14 separate hand-edits.
   Root-relative href so it resolves correctly from scout/index.html
   (one directory deep) the same way site-nav.js's links do.
   ============================================================ */
(function () {
  var footer = document.querySelector('footer');
  if (!footer) return;

  var sep = document.createTextNode(' · ');
  var link = document.createElement('a');
  link.href = '/about.html';
  link.textContent = 'About';

  // Insert before the support-note paragraph (if present) so "About"
  // stays on the same line as the rest of the footer's top line,
  // instead of trailing after a block-level <p>.
  var note = footer.querySelector('p.support-note');
  if (note) {
    footer.insertBefore(sep, note);
    footer.insertBefore(link, note);
  } else {
    footer.appendChild(sep);
    footer.appendChild(link);
  }
})();
