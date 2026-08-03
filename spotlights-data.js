/* ============================================================
   ZurVault spotlight write-ups — shared by characters.html (teases the
   latest entry) and spotlight.html (renders one by ?id=).

   To publish a new spotlight: add an entry to the top of this array
   (newest first). `characterId` should match a key in character-map.js
   if you want the write-up to link back to that character's page;
   `collectionSymbol` should be a real symbol from DC_COLLECTIONS if you
   want it to link to that specific listing on Magic Eden.

   `body` is plain HTML (a handful of <p> tags is fine) — this file is
   just a JS array, not a CMS, so keep formatting simple.
   ============================================================ */
const SPOTLIGHTS = [
  {
    id: "example-killing-joke",
    title: "Why The Killing Joke Still Matters",
    author: "ZurVault",
    characterId: "batman",
    collectionSymbol: "batman_the_killing_joke_1988_1",
    heroImage: "https://arweave.net/uyG3Nvb1UKTtm3q-tdHs4GNYOiEyaSTc7O0zhsc9gIQ",
    publishedAt: "2026-08-01",
    body:
      "<p>[Placeholder entry — replace this with a real write-up. This demonstrates the format: a title, an author byline, a hero image, and a body made of simple paragraphs.]</p>" +
      "<p>A spotlight is a chance to go deeper than a listing card can — why a specific issue matters, what to look for in variants, or why it's a good entry point for a new collector.</p>",
  },
];
