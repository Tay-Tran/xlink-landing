"""One-time: turn vi.html + i18n dictionaries into src/page.html (template) + content/*.json (editable in /admin).

Each text unit (same definition as i18n/build.py) gets data-c="<id>" plus data-cl/data-ct = number of
leading/trailing text-less children kept from the template (icons). Units with icons in the middle stay
static (translated by the i18n dictionaries at build time).
Usage: python -I cms/extract_content.py vi.html
"""
import json, re, sys, os, glob
from collections import OrderedDict
sys.stdout.reconfigure(encoding="utf-8")
from bs4 import BeautifulSoup, NavigableString, Tag, Comment

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1]
T, A = {}, {}
for f in sorted(glob.glob(os.path.join(ROOT, "i18n", "*.json"))):
    d = json.load(open(f, encoding="utf-8"))
    if isinstance(d, dict) and isinstance(d.get("units"), dict):
        T.update(d["units"]); A.update(d.get("attrs", {}))

soup = BeautifulSoup(open(SRC, encoding="utf-8").read(), "html.parser")
SKIP = {"script", "style", "svg", "code", "kbd"}

# content files, in page order: (key, label, css selector of the root)
SECTIONS = [
    ("00-seo", "SEO – tiêu đề tab, mô tả khi chia sẻ", None),
    ("01-menu", "Menu trên cùng", "header.site-header"),
    ("02-hero", "01 · Hero – tiêu đề và nút", ".hero .hero-head"),
    ("03-hero-app", "01 · Hero – giao diện app minh hoạ", ".hero .hero-product"),
    ("04-thach-thuc", "02 · Thách thức", "#thach-thuc"),
    ("05-giai-phap", "03 · Giải pháp – 3 trụ cột", "#giai-phap"),
    ("06-tinh-nang", "04 · 12 nhóm chức năng", "#tinh-nang"),
    ("07-tro-ly-ai", "Trợ lý AI (khung hỏi thử)", "#tro-ly"),
    ("08-nhan-tai", "05 · Chu trình nhân tài", "#nhan-tai"),
    ("09-vai-tro", "06 · 4 vai trò + Not just the pay", "#vai-tro"),
    ("10-vi-sao", "07 · Vì sao XLINK", "#vi-sao"),
    ("11-trien-khai", "08 · Triển khai", "#trien-khai"),
    ("12-dang-ky", "09 · Đăng ký + form", "#dang-ky"),
    ("13-chan-trang", "Chân trang", "footer"),
    ("14-tro-ly-noi", "Trợ lý hỏi đáp nổi (góc phải)", None),  # .ask + its <template>s
]
roots = {}
for key, _, sel in SECTIONS:
    if sel:
        roots[key] = soup.select_one(sel)
def section_of(el):
    for key, _, sel in SECTIONS:
        r = roots.get(key)
        if r is not None and (el is r or r in el.parents):
            return key
    return "14-tro-ly-noi"

KIND = {"h1": "Tiêu đề chính", "h2": "Tiêu đề khối", "h3": "Tiêu đề nhỏ", "h4": "Tiêu đề cột", "p": "Đoạn chữ", "li": "Ý / dòng",
        "a": "Link", "button": "Nút", "label": "Nhãn ô nhập", "legend": "Nhãn nhóm", "strong": "Chữ đậm", "b": "Chữ đậm",
        "small": "Chữ nhỏ", "span": "Chữ", "em": "Nhãn", "th": "Tiêu đề bảng", "td": "Ô bảng", "option": "Lựa chọn",
        "figcaption": "Chú thích ảnh", "title": "Tiêu đề tab"}

def has_direct_text(el):
    return any(isinstance(c, NavigableString) and not isinstance(c, Comment) and c.strip() for c in el.children)
def visible_text(el):
    if not isinstance(el, Tag):
        return str(el).strip()
    return "".join(str(s) for s in el.descendants if isinstance(s, NavigableString) and not isinstance(s, Comment)).strip()

items = OrderedDict((k, []) for k, _, _ in SECTIONS)
counter = {}
static = 0

def walk(el):
    global static
    for c in list(el.children):
        if not isinstance(c, Tag) or c.name in SKIP:
            continue
        if has_direct_text(c):
            parts, ph = [], []
            kids = [k for k in c.children if not isinstance(k, Comment)]
            for k in kids:
                if isinstance(k, Tag) and (k.name in SKIP or not visible_text(k)):
                    ph.append(str(k)); parts.append("[[S%d]]" % (len(ph) - 1))
                else:
                    parts.append(str(k))
            inner = "".join(parts).strip()
            if not re.search(r"[A-Za-zÀ-ỹ]", re.sub(r"<[^>]+>|\[\[S\d+\]\]", "", inner)):
                continue
            if c.name == "a" and c.get("lang") in ("vi", "en"):
                continue
            en = T.get(inner, inner)
            # leading / trailing icon placeholders stay in the template
            lead = 0
            while inner.startswith("[[S%d]]" % lead):
                inner = inner[len("[[S%d]]" % lead):]; en = en.replace("[[S%d]]" % lead, "", 1); lead += 1
            inner, en = inner.strip(), en.strip()
            trail = 0
            m = re.search(r"\[\[S(\d+)\]\]\s*$", inner)
            while m:
                inner = inner[:m.start()].rstrip(); en = re.sub(r"\[\[S%s\]\]\s*$" % m.group(1), "", en).rstrip(); trail += 1
                m = re.search(r"\[\[S(\d+)\]\]\s*$", inner)
            if "[[S" in inner:
                static += 1
                continue
            key = section_of(c)
            counter[key] = counter.get(key, 0) + 1
            cid = "%s-%03d" % (key.split("-", 1)[1], counter[key])
            c["data-c"] = cid
            if lead: c["data-cl"] = str(lead)
            if trail: c["data-ct"] = str(trail)
            items[key].append(OrderedDict([("id", cid), ("loai", KIND.get(c.name, c.name)), ("vi", inner), ("en", en)]))
        else:
            walk(c)

walk(soup)

# SEO: title + meta description / og as editable values
title = soup.title
seo = items["00-seo"]
for m in soup.find_all("meta"):
    name = m.get("name") or m.get("property")
    if name in ("description", "og:title", "og:description"):
        cid = {"description": "seo-mo-ta", "og:title": "seo-og-tieu-de", "og:description": "seo-og-mo-ta"}[name]
        m["data-c-attr"] = "content:" + cid
        v = m["content"]
        seo.append(OrderedDict([("id", cid), ("loai", {"description": "Mô tả cho Google", "og:title": "Tiêu đề khi chia sẻ", "og:description": "Mô tả khi chia sẻ"}[name]), ("vi", v), ("en", A.get(v, v))]))
# the <title> unit was captured inside 14-tro-ly-noi (no section root); move it to SEO
for key in list(items):
    for it in list(items[key]):
        if it["loai"] == "Tiêu đề tab":
            items[key].remove(it); it["loai"] = "Tiêu đề tab trình duyệt"; seo.insert(0, it)

os.makedirs(os.path.join(ROOT, "src"), exist_ok=True)
os.makedirs(os.path.join(ROOT, "content"), exist_ok=True)
open(os.path.join(ROOT, "src", "page.html"), "w", encoding="utf-8").write(str(soup))
labels = {k: l for k, l, _ in SECTIONS}
total = 0
for key, lst in items.items():
    json.dump(OrderedDict([("khoi", labels[key]), ("items", lst)]), open(os.path.join(ROOT, "content", key + ".json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    total += len(lst)
    print("%-16s %4d" % (key, len(lst)))
print("editable:", total, "| static (icon in middle):", static)
