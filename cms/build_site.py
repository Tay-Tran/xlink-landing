"""Build the site into dist/ from src/page.html + content/*.json (+ i18n dictionaries for the few static units).

Output: dist/vi.html (Vietnamese), dist/index.html (English, default), plus assets/, admin/, _headers.
Usage: python -I cms/build_site.py        (run from anywhere)
"""
import json, re, sys, os, glob, shutil
sys.stdout.reconfigure(encoding="utf-8")
from bs4 import BeautifulSoup, NavigableString, Tag, Comment

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
TEMPLATE = open(os.path.join(ROOT, "src", "page.html"), encoding="utf-8").read()

C = {}
for f in sorted(glob.glob(os.path.join(ROOT, "content", "*.json"))):
    for it in json.load(open(f, encoding="utf-8"))["items"]:
        C[it["id"]] = it
T, A = {}, {}
for f in sorted(glob.glob(os.path.join(ROOT, "i18n", "*.json"))):
    d = json.load(open(f, encoding="utf-8"))
    if isinstance(d, dict) and isinstance(d.get("units"), dict):
        T.update(d["units"]); A.update(d.get("attrs", {}))

SKIP = {"script", "style", "svg", "code", "kbd"}
def has_direct_text(el):
    return any(isinstance(c, NavigableString) and not isinstance(c, Comment) and c.strip() for c in el.children)
def visible_text(el):
    if not isinstance(el, Tag):
        return str(el).strip()
    return "".join(str(s) for s in el.descendants if isinstance(s, NavigableString) and not isinstance(s, Comment)).strip()
def is_icon(k):
    return isinstance(k, Tag) and (k.name in SKIP or not visible_text(k))

def fill(el, value):
    lead, trail = int(el.get("data-cl", 0)), int(el.get("data-ct", 0))
    kids = [k for k in el.children if not isinstance(k, Comment)]
    tags = [k for k in kids if isinstance(k, Tag)]
    keep_lead = [k for k in tags if is_icon(k)][:lead]
    keep_trail = [k for k in reversed(tags) if is_icon(k)][:trail][::-1]
    for k in list(el.children):
        k.extract()
    for k in keep_lead:
        el.append(k)
    for n in list(BeautifulSoup(value, "html.parser").contents):
        el.append(n)
    for k in keep_trail:
        el.append(k)

def static_walk(el, missing):
    """English for units that are not editable (icons in the middle): same rule as i18n/build.py."""
    for c in list(el.children):
        if not isinstance(c, Tag) or c.name in SKIP or c.has_attr("data-c"):
            continue
        if has_direct_text(c):
            parts, ph = [], []
            for k in c.children:
                if isinstance(k, Comment):
                    continue
                if is_icon(k):
                    ph.append(str(k)); parts.append("[[S%d]]" % (len(ph) - 1))
                else:
                    parts.append(str(k))
            inner = "".join(parts).strip()
            if not re.search(r"[A-Za-zÀ-ỹ]", re.sub(r"<[^>]+>|\[\[S\d+\]\]", "", inner)) and inner not in T:
                continue
            if c.name == "a" and c.get("lang") in ("vi", "en"):
                continue
            en = T.get(inner)
            if en is None:
                missing.append(inner[:80]); continue
            for i, p in enumerate(ph):
                en = en.replace("[[S%d]]" % i, p)
            c.clear()
            for n in list(BeautifulSoup(en, "html.parser").contents):
                c.append(n)
        else:
            static_walk(c, missing)

# ---------- images (content/15-hinh-anh.json, edited in /admin) ----------
UPLOADS = "assets/img/uploads/"
MAXW = {"shot": 1600, "tile": 440, "wide": 1600, "og": 1200, "logo": 600}
_img_cache, used_uploads = {}, set()

def image_for(value, kind):
    """Return (relative src, width, height or None). Uploaded photos are resized and saved as WebP in dist."""
    rel = value.strip().lstrip("/")
    key = (rel, kind)
    if key in _img_cache:
        return _img_cache[key]
    src_path = os.path.join(ROOT, rel)
    out = (rel, None, None)
    if not os.path.exists(src_path):
        print("  WARNING: missing image", rel)
    else:
        ext = os.path.splitext(rel)[1].lower()
        try:
            from PIL import Image
        except ImportError:
            Image = None
        if Image and ext in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
            im = Image.open(src_path)
            w, h = im.size
            if rel.startswith(UPLOADS):
                stem = os.path.splitext(os.path.basename(rel))[0]
                mw = MAXW.get(kind, 1600)
                if w > mw:
                    im = im.resize((mw, round(h * mw / w)), Image.LANCZOS); w, h = im.size
                os.makedirs(os.path.join(DIST, UPLOADS, "opt"), exist_ok=True)
                if kind == "logo":
                    name = f"{stem}-{kind}.png"; im.save(os.path.join(DIST, UPLOADS, "opt", name), optimize=True)
                elif kind == "og":
                    name = f"{stem}-{kind}.jpg"; im.convert("RGB").save(os.path.join(DIST, UPLOADS, "opt", name), quality=85, optimize=True)
                else:
                    name = f"{stem}-{kind}.webp"; im.save(os.path.join(DIST, UPLOADS, "opt", name), "WEBP", quality=80, method=6)
                out = (UPLOADS + "opt/" + name, w, h)
            else:
                out = (rel, w, h)
        elif rel.startswith(UPLOADS):
            used_uploads.add(rel)  # e.g. SVG logo: copied as is
    _img_cache[key] = out
    return out

def apply_images(soup):
    for el in soup.select("[data-ci]"):
        it = C.get(el["data-ci"])
        if not it or not it.get("anh"):
            continue
        orig = el.get("src", "")
        src, w, h = image_for(it["anh"], it.get("loai", "shot"))
        if src == orig:
            continue
        el["src"] = src
        if w and h and el.has_attr("height") and it.get("loai") == "logo":
            el["width"] = str(round(int(el["height"]) * w / h))  # keep the logo's display height
    for m in soup.select("[data-ci-attr]"):
        attr, cid = m["data-ci-attr"].split(":", 1)
        it = C.get(cid)
        if it and it.get("anh"):
            m[attr] = image_for(it["anh"], it.get("loai", "og"))[0]

def build(lang):
    soup = BeautifulSoup(TEMPLATE, "html.parser")
    missing = []
    for el in soup.select("[data-c]"):
        it = C.get(el["data-c"])
        if it is None:
            missing.append("content id " + el["data-c"]); continue
        val = (it.get(lang) or "").strip() or it.get("vi", "")
        fill(el, val)
    for m in soup.select("[data-c-attr]"):
        attr, cid = m["data-c-attr"].split(":", 1)
        it = C.get(cid)
        if it:
            m[attr] = (it.get(lang) or "").strip() or it["vi"]
    if lang == "en":
        static_walk(soup, missing)
        for el in soup.find_all(True):
            for a in ("alt", "aria-label", "placeholder", "title"):
                v = el.get(a)
                if v and v in A:
                    el[a] = A[v]
        soup.html["lang"] = "en"
        for a in soup.select(".lang-menu a"):
            if a.get("lang") == "en":
                a["aria-current"] = "true"
            elif a.has_attr("aria-current"):
                del a["aria-current"]
    apply_images(soup)
    for el in soup.select("[data-c], [data-cl], [data-ct], [data-c-attr], [data-ci], [data-ci-attr]"):
        for a in ("data-c", "data-cl", "data-ct", "data-c-attr", "data-ci", "data-ci-attr"):
            if el.has_attr(a):
                del el[a]
    return str(soup), missing

os.makedirs(DIST, exist_ok=True)
for lang, name in (("vi", "vi.html"), ("en", "index.html")):
    html, missing = build(lang)
    open(os.path.join(DIST, name), "w", encoding="utf-8").write(html)
    print(name, "ok", "| missing:", len(missing))
    for m in missing[:20]:
        print("  MISSING:", m)
for d in ("assets", "admin"):
    src = os.path.join(ROOT, d)
    if os.path.isdir(src):
        # original uploads are not published (only the resized copies in uploads/opt and files used as is)
        shutil.copytree(src, os.path.join(DIST, d), dirs_exist_ok=True,
                        ignore=(lambda dirpath, names: [n for n in names if os.path.normpath(os.path.join(dirpath, n)) == os.path.normpath(os.path.join(ROOT, "assets", "img", "uploads"))]))
for rel in used_uploads:
    os.makedirs(os.path.dirname(os.path.join(DIST, rel)), exist_ok=True)
    shutil.copy(os.path.join(ROOT, rel), os.path.join(DIST, rel))
for f in ("_headers",):
    if os.path.exists(os.path.join(ROOT, f)):
        shutil.copy(os.path.join(ROOT, f), DIST)
print("dist ready:", DIST)
