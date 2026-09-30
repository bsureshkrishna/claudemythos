"""Merge data/content/*.json into myths.js (used by the page) and myths.json.

Checks every concept and culture id, reports thin or overlong entries, and verifies each
image against the Wikimedia Commons API, keeping its thumbnail URL, author and licence.
Images that don't resolve are dropped. Commons lookups are cached in data/image-cache.json.

    python tools/build.py            # build, using the image cache
    python tools/build.py --refresh  # re-query Commons for every image
"""
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CACHE = DATA / "image-cache.json"
API = "https://commons.wikimedia.org/w/api.php"
UA = "MythosNotebook/0.1 (personal study project)"
THUMB_WIDTH = 640


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def words(s):
    return len(s.split())


def plain(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    return " ".join(html.unescape(s).split())


def commons_lookup(titles):
    """Return {requested title: image info or None} for up to 50 titles."""
    params = {
        "action": "query", "format": "json", "formatversion": "2", "redirects": "1",
        "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": str(THUMB_WIDTH),
        "iiextmetadatafilter": "Artist|LicenseShortName|UsageTerms",
        "titles": "|".join(titles),
    }
    req = urllib.request.Request(f"{API}?{urllib.parse.urlencode(params)}", headers={"User-Agent": UA})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                q = json.load(r)["query"]
            break
        except urllib.error.HTTPError as e:
            # Commons rate-limits bursts; back off (honouring Retry-After) and try again.
            if e.code != 429 or attempt == 5:
                raise
            wait = int(e.headers.get("Retry-After") or 0) or 10 * 2 ** attempt
            print(f"  Commons rate limit, waiting {wait}s")
            time.sleep(wait)
    alias = {}
    for kind in ("normalized", "redirects"):
        for m in q.get(kind, []):
            alias[m["from"]] = m["to"]
    pages = {p["title"]: p for p in q.get("pages", [])}
    out = {}
    for t in titles:
        final = t
        while final in alias:
            final = alias[final]
        p = pages.get(final)
        ii = p and not p.get("missing") and p.get("imageinfo")
        if not ii:
            out[t] = None
            continue
        info, meta = ii[0], ii[0].get("extmetadata", {})
        out[t] = {
            "src": info.get("thumburl") or info["url"],
            "page": info["descriptionurl"],
            "artist": plain(meta.get("Artist", {}).get("value", ""))[:120],
            "license": plain(meta.get("LicenseShortName", {}).get("value", "")),
        }
    return out


def verify_images(files, refresh):
    cache = {} if refresh or not CACHE.exists() else load(CACHE)
    todo = sorted(f for f in files if f not in cache)
    for i in range(0, len(todo), 50):
        cache.update(commons_lookup(todo[i:i + 50]))
        # Save after every request so an interrupted run keeps what it already looked up.
        CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
        time.sleep(2)
    return cache


def main():
    refresh = "--refresh" in sys.argv
    outline = load(DATA / "outline.json")
    cultures = load(DATA / "cultures.json")
    culture_ids = {c["id"] for c in cultures}
    written = {}
    for f in sorted((DATA / "content").glob("*.json")):
        for c in load(f)["concepts"]:
            if c["id"] in written:
                print(f"! duplicate concept {c['id']} in {f.name}")
            written[c["id"]] = c

    problems, concepts = [], []
    for n, o in enumerate(outline, 1):
        c = written.pop(o["id"], None)
        if not c:
            problems.append(f"missing concept {o['id']}")
            continue
        versions = []
        for v in c.get("versions", []):
            where = f"{o['id']}/{v.get('culture')}"
            if v.get("culture") not in culture_ids:
                problems.append(f"{where}: unknown culture, dropped")
                continue
            # A culture may have several versions (Orpheus and Alcestis; Yoruba and Akan); only exact repeats go.
            if any(x["culture"] == v["culture"] and x["title"] == v["title"] for x in versions):
                problems.append(f"{where}: repeated title {v['title']!r}, dropped")
                continue
            if not all(v.get(k) for k in ("title", "teaser", "text", "sources")):
                problems.append(f"{where}: missing title/teaser/text/sources, dropped")
                continue
            if not 90 <= words(v["text"]) <= 210:
                problems.append(f"{where}: text is {words(v['text'])} words")
            versions.append(v)
        if not versions:
            problems.append(f"{o['id']}: no usable versions")
        concepts.append({**o, "n": n, "summary": c.get("summary", ""), "versions": versions})
    for extra in written:
        problems.append(f"concept {extra} is not in outline.json, ignored")

    files = {v["image"]["file"] for c in concepts for v in c["versions"] if v.get("image", {}).get("file")}
    images = verify_images(files, refresh)
    dropped = 0
    for c in concepts:
        for v in c["versions"]:
            img = v.pop("image", None)
            if not img or not img.get("file"):
                continue
            found = images.get(img["file"])
            if found:
                v["image"] = {**found, "caption": img.get("caption", "")}
            else:
                dropped += 1
                problems.append(f"{c['id']}/{v['culture']}: image not found on Commons, dropped: {img['file']}")

    data = {
        "title": "Mythos",
        "subtitle": "A notebook of shared myths",
        "cultures": cultures,
        "concepts": concepts,
    }
    (ROOT / "myths.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    (ROOT / "myths.js").write_text("window.MYTHOS = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")

    nv = sum(len(c["versions"]) for c in concepts)
    ni = sum(1 for c in concepts for v in c["versions"] if v.get("image"))
    per = {k: sum(1 for c in concepts for v in c["versions"] if v["culture"] == k) for k in culture_ids}
    for p in problems:
        print("!", p)
    print(f"{len(concepts)} concepts, {nv} versions, {ni} images ({dropped} dropped)")
    print("per culture:", ", ".join(f"{k} {per[k]}" for k in sorted(per, key=per.get, reverse=True)))


if __name__ == "__main__":
    main()
