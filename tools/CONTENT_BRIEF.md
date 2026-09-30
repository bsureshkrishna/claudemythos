# Mythos Notebook — content brief

Each concept is one page in a comparative-mythology notebook. The concept page states the shared idea;
each culture's version gets its own page. Readers page left/right through one culture's versions,
so every version must stand on its own.

## Voice

Short and scholarly, but fun: vivid concrete detail, a good closing line, no jokes for their own sake,
no modern slang, no "buckle up". Think a well-read friend with footnotes. Present tense for retellings.

## Accuracy rules (most important)

- Include a version only if it is genuinely attested in a named primary source or well-established
  ethnographic record. **Never invent a myth, name, episode, or citation to fill a slot.**
- Leaving a culture out is always fine. A concept typically has 4–10 versions; not every culture fits.
- Cite the work (and book/tablet/chapter/stanza only if you are sure). Examples:
  "Gylfaginning 51", "Epic of Gilgamesh, Tablet XI", "Popol Vuh", "Rigveda 10.90", "Hesiod, Theogony".
- If a parallel is loose, late, contested, or shows possible Christian/colonial influence, say so in `caveat`.
  (E.g. the Norse "flood" of Ymir's blood; Frazer-style "dying-and-rising gods" critiqued by J. Z. Smith.)
- `west-african`, `north-american`, `polynesian`, `celtic`, `indian`, `slavic` are umbrellas:
  always set `people` to the specific people/tradition ("Yoruba", "Akan", "Haudenosaunee", "Lakota",
  "Māori", "Hawaiian", "Irish", "Welsh", "Vedic", "Purāṇic", "Buddhist Jātaka", "East Slavic").
  Never present one nation's story as "Native American myth" in general.
- Do not include sacred material that a community restricts (e.g. restricted Aboriginal or Pueblo
  ceremonial knowledge). Stick to widely published stories.

## Cultures (use these exact ids)

norse, greek, indian, mesopotamian, egyptian, levantine (Hebrew Bible & Canaanite/Ugaritic),
anatolian (Hittite & Hurrian), persian (Avestan/Pahlavi/Shāhnāmeh), celtic, slavic, finnic (Finnish/Karelian),
chinese, japanese, maya, aztec, andean, west-african, polynesian, north-american

## Output file format

Write UTF-8 JSON to the path you were given:

```json
{
  "concepts": [
    {
      "id": "great-flood",
      "summary": "80–110 words. The shared idea, how widespread it is, and one scholarly note on why the parallels exist (shared descent, diffusion, or independent invention), without overclaiming.",
      "versions": [
        {
          "culture": "mesopotamian",
          "people": "Babylonian",
          "title": "Utnapishtim's Ark",
          "teaser": "At most 14 words, used on the concept page as a one-line hook.",
          "text": "120–170 words retelling this culture's version, with the key names and one telling detail. Plain text; paragraphs separated by \\n\\n.",
          "names": ["Utnapishtim", "Ea", "Enlil"],
          "sources": ["Epic of Gilgamesh, Tablet XI", "Atrahasis"],
          "caveat": "Optional one sentence. Omit the key when not needed.",
          "image": {"file": "File:Exact Commons filename.jpg", "caption": "What it shows, artist and date if known"}
        }
      ]
    }
  ]
}
```

- `people` is optional for non-umbrella cultures; omit it when it would just repeat the culture name.
- Order versions from the oldest attested source to the youngest, roughly.
- Keep `title` short (2–6 words), naming the story, not the culture.

## Images (optional but encouraged: aim for an image on roughly half the versions)

Only use files that really exist on Wikimedia Commons, and prefer public-domain artworks, manuscripts,
museum objects, or reliefs. Search with (always send a User-Agent):

    curl -s -A "MythosNotebook/0.1 (personal study project)" "https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=10&format=json&srsearch=Utnapishtim"

Then confirm the exact title exists (the result must not contain "missing"):

    curl -s -A "MythosNotebook/0.1 (personal study project)" "https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata&format=json&titles=File:Some_name.jpg"

Skip the image rather than guess. Do not pick modern fan art, photos of people, or anything clearly
copyrighted without a free licence. Images of sacred objects from living traditions are fine when they are
public museum pieces. The build script re-verifies every file and drops any that fail.
