# Mythos Notebook

A comparative-mythology notebook: 100 shared myth concepts (the flood, the world tree, the trickster,
the road to the dead…), each told by the cultures that have a version of it.

Static site; no framework and no build step in the browser.

Live site: https://bsureshkrishna.github.io/claudemythos/

GitHub Pages serves the repository root from the `main` branch. Push changes to `main` to publish
updates; `.nojekyll` keeps the site files served as-is.

## Reading it

The book always shows **one page per screen**, and has two levels:

- **Concept pages.** A concept, a short note on the shared idea, and the cultures that tell it.
  ← / → move between concepts.
- **Culture pages.** Click a culture to read its telling. ← / → then stay in that culture and move to
  its next or previous concept, skipping concepts it has no version of. ↑ (or the **Up** button, or the
  link at the top of the page) returns to the concept page, where you can pick another culture.
- ↓ on a concept page opens it in the culture you read last.
- Each culture also has a contents page (`#culture/norse`), reachable from the intro page or the index.
- **Browse** (`g`) shows every concept as a card; **Book** (`b`) returns. `/` focuses search.
- On touch screens, swipe to turn pages; with a mouse, use the arrow keys, the buttons, or drag a corner.

URLs track the page: `#great-flood` is a concept page, `#great-flood/norse` a culture's telling.

## Data

`myths.js` is what the browser loads; `myths.json` is the same data as plain JSON. Both are generated:

    python tools/build.py

The build merges `data/outline.json` (the 100 concepts, in order), `data/cultures.json`, and the written
entries in `data/content/*.json`. It validates ids, flags thin or overlong retellings, and checks every
image against the Wikimedia Commons API, storing the thumbnail URL, artist and licence (cached in
`data/image-cache.json`; `--refresh` re-queries). Images that don't resolve are dropped.

`tools/CONTENT_BRIEF.md` is the style and accuracy guide for writing entries.

## Sources and approach

Concepts are organised by motif, in the spirit of Stith Thompson's *Motif-Index of Folk-Literature* and
Yuri Berezkin's *Analytical Catalogue* of folklore motifs, rather than Frazer's *Golden Bough*, whose
single-origin theories are no longer accepted. Each telling cites its primary sources. Loose or contested
parallels carry a note. Similar myths are not assumed to share an origin.

## Run

    python -m http.server 8000

then open http://localhost:8000. It can also be served from GitHub Pages as-is. The two JS libraries are
pinned from jsDelivr; images are loaded from Wikimedia Commons.
