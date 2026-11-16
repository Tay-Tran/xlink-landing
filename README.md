# XLINK – Landing page v3 (có trang quản trị nội dung /admin)

Trang dựng theo file "XLINK-NOI DUNG LANDING PAGE.docx": Hero · Thách thức · Giải pháp (3 trụ cột) · 12 nhóm chức năng · Trợ lý AI · Chu trình nhân tài · 4 vai trò · Vì sao XLINK · Triển khai · Đăng ký. Tiếng Anh là ngôn ngữ mặc định (`index.html`), tiếng Việt ở `vi.html`.

Bản đang chạy: https://v3.xlink-landing.pages.dev · Trang quản trị: https://v3.xlink-landing.pages.dev/admin/

## Sửa nội dung (dành cho TOPLINKS)

1. Mở `/admin/`, bấm **Đăng nhập bằng GitHub** (tài khoản GitHub phải được mời vào repo).
2. Chọn khối cần sửa (ví dụ "02 · Thách thức"), bấm mũi tên ở đoạn muốn đổi.
3. Sửa ô **Tiếng Việt** và ô **English**. Để trống ô English thì trang tiếng Anh dùng chữ tiếng Việt.
4. Bấm **Công bố → Công bố ngay**. Trang tự cập nhật sau khoảng 1–2 phút.

Lưu ý khi sửa:
- Giữ nguyên các thẻ như `<b>…</b>`, `<br>` nếu đoạn chữ có sẵn.
- Trang quản trị chỉ sửa **chữ** (779 đoạn, gồm tiêu đề tab và mô tả khi chia sẻ). Đổi bố cục, thêm khối, đổi hình minh hoạ vẫn cần sửa code.
- Một số chữ nằm trong code JavaScript, chưa sửa được trên trang quản trị: thông báo của form, giải thích từng ô 9-Box, chữ trong ảnh app chạy tự động.

## Cách trang được dựng

```
src/page.html        Khung trang (HTML) – mỗi đoạn chữ sửa được có data-c="mã"
content/*.json       Nội dung sửa được, 15 khối, mỗi đoạn có "vi" và "en"  ← trang quản trị ghi vào đây
i18n/*.json          Bản dịch cho vài đoạn cố định (có biểu tượng giữa câu) và chữ trong thuộc tính alt/aria
cms/build_site.py    Ghép khung + nội dung → dist/vi.html, dist/index.html, chép assets/, admin/, _headers
cms/extract_content.py  (dùng một lần) tách nội dung từ trang cũ ra content/
admin/               Trang quản trị Decap CMS (index.html, config.yml)
functions/api/       Đăng nhập GitHub cho trang quản trị (Cloudflare Pages Functions)
.github/workflows/   Mỗi lần lưu trên /admin: tự dựng lại và đưa lên Cloudflare
assets/              CSS, JS, ảnh, video
```

Dựng và xem trên máy:

```
python -I cms/build_site.py
python -I serve.py 5175        # phục vụ dist/, mở http://localhost:5175
```

Thử trang quản trị trên máy (ghi thẳng vào content/, không cần GitHub): chạy `npx decap-server` trong thư mục này, rồi mở http://localhost:5175/admin/ và bấm Đăng nhập.

## Thiết lập một lần để /admin chạy trên mạng

1. **Repo GitHub** (riêng tư) chứa thư mục này, nhánh `main`. Tên repo đã điền trong `admin/config.yml`: `Tay-Tran/xlink-landing`.
2. **GitHub OAuth App** (GitHub → Settings → Developer settings → OAuth Apps → New):
   - Homepage URL: `https://v3.xlink-landing.pages.dev`
   - Authorization callback URL: `https://v3.xlink-landing.pages.dev/api/callback`
3. **Cloudflare Pages** → project `xlink-landing` → Settings → Variables and Secrets: thêm `GITHUB_CLIENT_ID` và `GITHUB_CLIENT_SECRET` (lấy từ OAuth App, để dạng Secret), áp dụng cho Preview (nhánh v3 là preview).
4. **GitHub repo** → Settings → Secrets and variables → Actions: thêm `CLOUDFLARE_API_TOKEN` (token quyền *Cloudflare Pages: Edit*) và `CLOUDFLARE_ACCOUNT_ID`.
5. Mời tài khoản GitHub của người sửa nội dung vào repo (quyền Write).

Đưa lên thủ công (khi chưa nối GitHub): chạy `deploy-xlink-v3.ps1` ở thư mục cha.

## Còn để trống / cần thay

- `FORM_ENDPOINT` trong `assets/js/main.js` trống: form chưa gửi dữ liệu đi đâu.
- Tên người, số liệu trong giao diện app, các khung minh hoạ và Trợ lý demo là dữ liệu mẫu.
- Video trong `assets/video/` là bản dựng thử (khối video không dùng ở v3).
