"""One-time: mark replaceable images in src/page.html (data-ci="<id>") and create content/15-hinh-anh.json.
Usage: python -I cms/add_images.py
"""
import json, os, sys
from collections import OrderedDict
sys.stdout.reconfigure(encoding="utf-8")
from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "src", "page.html")
soup = BeautifulSoup(open(P, encoding="utf-8").read(), "html.parser")
items = []

def add(cid, label, src, kind):
    items.append(OrderedDict([("id", cid), ("vi_tri", label), ("loai", kind), ("anh", "/" + src.lstrip("/"))]))

def mark(els, cid):
    for el in els:
        el["data-ci"] = cid

# logos
mark(soup.select("header .logo img.lg-color"), "logo-menu"); add("logo-menu", "Logo ở menu (nền sáng) – PNG/SVG nền trong", "assets/img/brand/xlink-wordmark.png", "logo")
mark(soup.select("header .logo img.lg-white"), "logo-menu-toi"); add("logo-menu-toi", "Logo ở menu khi cuộn qua khối tối (chữ trắng) – PNG/SVG nền trong", "assets/img/brand/xlink-wordmark-white.png", "logo")
mark(soup.select("footer img.footer-logo, footer .footer-word img"), "logo-chan-trang"); add("logo-chan-trang", "Logo ở chân trang (chữ trắng) – PNG/SVG nền trong", "assets/img/brand/xlink-logo-white.png", "logo")
mark(soup.select(".ask-av img"), "icon-tro-ly"); add("icon-tro-ly", "Biểu tượng nút Trợ lý (vuông, nền trong)", "assets/img/brand/xlink-mark.png", "logo")
# share image
og = soup.find("meta", attrs={"property": "og:image"})
og["data-ci-attr"] = "content:anh-chia-se"; add("anh-chia-se", "Ảnh hiện khi chia sẻ link lên Zalo/Facebook (nên 1200×630)", og["content"], "og")
# feature screenshots (12 nhóm chức năng)
names = {"org": "Sơ đồ tổ chức", "timesheet": "Bảng công", "payroll": "Tiền lương", "recruit": "Tuyển dụng", "contract": "Hồ sơ & hợp đồng",
         "ninebox": "Ma trận 9-Box", "dashboard": "Tổng quan", "ai": "Trợ lý AI"}
for img in soup.select("#tinh-nang .shot-frame img"):
    key = os.path.basename(img["src"]).split(".")[0]
    cid = "chuc-nang-" + key
    img["data-ci"] = cid
    add(cid, f"12 chức năng · ảnh chụp {names.get(key, key)} (ảnh ngang, khoảng 1280×530)", img["src"], "shot")
# marquee tiles (each tile appears several times: same id for all copies)
seen = OrderedDict()
for li in soup.select("#giai-phap .mq li.shot"):
    img = li.find("img"); key = os.path.basename(img["src"]).split(".")[0]
    cid = "dai-anh-" + key
    img["data-ci"] = cid
    if cid not in seen:
        seen[cid] = (li.find("span").get_text(strip=True), img["src"])
for cid, (lab, src) in seen.items():
    add(cid, f"Dải ảnh chạy ngang · {lab} (ảnh ngang nhỏ, khoảng 440×276)", src, "tile")
# footer background
mark(soup.select("footer .footer-art img"), "nen-chan-trang"); add("nen-chan-trang", "Ảnh nền mờ ở chân trang (ảnh ngang lớn)", "assets/img/dashboard.webp", "wide")

open(P, "w", encoding="utf-8").write(str(soup))
json.dump(OrderedDict([("khoi", "Hình ảnh"), ("items", items)]), open(os.path.join(ROOT, "content", "15-hinh-anh.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(len(items), "images;", len(soup.select("[data-ci]")), "img tags marked")
