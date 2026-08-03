/* ============================================================
   ZurVault spotlight write-ups — shared by characters.html (teases the
   latest entry) and spotlight.html (renders one by ?id=).

   To publish a new spotlight: add an entry to the top of this array
   (newest first). `characterId` should match a key in character-map.js
   if you want the write-up to link back to that character's page;
   `collectionSymbol` should be a real symbol from DC_COLLECTIONS if you
   want it to link to that specific listing on Magic Eden.

   `body` is plain HTML — a handful of <p> tags is fine, and spotlight.html
   also styles <h2> (section headings), <ul>/<li>, a `char-chips` list for
   featured-character pills, and an `author-box` div for a byline card. This
   file is just a JS array, not a CMS, so keep formatting simple.
   ============================================================ */
const SPOTLIGHTS = [
  {
    id: "why-the-killing-joke-still-matters",
    title: "Why The Killing Joke Still Matters",
    author: "@cowl_updates · Bat Cowl #81123",
    characterId: "batman",
    collectionSymbol: "batman_the_killing_joke_1988_1",
    heroImage: "https://arweave.net/uyG3Nvb1UKTtm3q-tdHs4GNYOiEyaSTc7O0zhsc9gIQ",
    publishedAt: "2026-08-02",
    body:
      "<h2>Why This Story Endures</h2>" +
      "<p>Few Batman stories have left a mark on DC history like <em>The Killing Joke</em>. Written by Alan Moore with iconic artwork by Brian Bolland, it redefined the relationship between Batman and the Joker and remains one of the most influential Batman stories ever published.</p>" +
      "<p>At its core, <em>The Killing Joke</em> explores a chilling question: how far is any person from becoming the Joker? Through a haunting confrontation between Batman, the Joker, and Commissioner Gordon, the story examines trauma, morality, and the fine line between order and chaos.</p>" +
      "<p>The comic is also remembered for its lasting impact on Barbara Gordon. After the events of <em>The Killing Joke</em>, her journey eventually led to becoming Oracle — one of DC's most respected heroes. That evolution shaped decades of Batman stories and continues to influence the DC Universe today.</p>" +
      "<p>Whether you're a lifelong Batman fan or discovering the story for the first time through DC Digital Comics, <em>The Killing Joke</em> remains essential reading. Its themes, artwork, and cultural impact have made it one of the defining graphic novels of all time.</p>" +
      "<h2>Why Collectors Care</h2>" +
      "<ul>" +
      "<li>One of the most influential Batman stories ever published.</li>" +
      "<li>Features Brian Bolland's iconic artwork.</li>" +
      "<li>A defining Joker story that has inspired films, games, and modern comics.</li>" +
      "<li>An essential addition to any Batman or DC Digital Comics collection.</li>" +
      "</ul>" +
      "<h2>Featured Characters</h2>" +
      "<ul class=\"char-chips\">" +
      "<li><a class=\"char-chip\" href=\"character.html?c=batman\">🦇 Batman</a></li>" +
      "<li><span class=\"char-chip\">🃏 Joker</span></li>" +
      "<li><span class=\"char-chip\">🦇 Barbara Gordon</span></li>" +
      "<li><span class=\"char-chip\">👮 Commissioner James Gordon</span></li>" +
      "</ul>" +
      "<div class=\"author-box\">" +
      "<div class=\"a-name\">@cowl_updates</div>" +
      "<div class=\"a-cowl\">🦇 Bat Cowl #81123</div>" +
      "<div class=\"a-bio\">Collector since DC Digital Comics launched. Building ZurVault to help fans discover characters, series, and stories while supporting the DC Digital Comics community.</div>" +
      "</div>",
  },
];
