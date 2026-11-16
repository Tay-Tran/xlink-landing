// GitHub login for Decap CMS (/admin), step 2: exchange the code for a token and hand it to the CMS window.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)decap_oauth_state=([^;]+)/);
  if (!code || !state || !cookie || cookie[1] !== state) return page("error", { message: "Phiên đăng nhập không hợp lệ, hãy thử lại." });

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "xlink-cms" },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${url.origin}/api/callback` }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) return page("error", { message: data.error_description || "GitHub không trả về mã truy cập." });
  return page("success", { token: data.access_token, provider: "github" });
}

function page(status, content) {
  const msg = `authorization:github:${status}:${JSON.stringify(content)}`;
  const html = `<!doctype html><meta charset="utf-8"><title>Đăng nhập</title><p>${status === "success" ? "Đăng nhập thành công, đang quay lại trang quản trị…" : "Đăng nhập không thành công."}</p>
<script>
(function () {
  var msg = ${JSON.stringify(msg)};
  function receive(e) {
    if (e.origin !== window.location.origin) return; // only hand the token to /admin on this same site
    window.opener.postMessage(msg, e.origin);
    window.removeEventListener("message", receive, false);
    setTimeout(function () { window.close(); }, 300);
  }
  window.addEventListener("message", receive, false);
  if (window.opener) window.opener.postMessage("authorizing:github", "*");
})();
</script>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Set-Cookie": "decap_oauth_state=; Path=/api; Max-Age=0" } });
}
