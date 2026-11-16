// XLink landing – interactions
(() => {
  // ===== Cấu hình nơi nhận form đăng ký =====
  // Dán URL Google Apps Script / Formspree / API của bạn vào đây. Để trống = chưa gửi đi đâu.
  const FORM_ENDPOINT = "";

  // ---------- language: the page sets <html lang="vi|en">; strings in this file follow it ----------
  const LANG_EN = document.documentElement.lang === "en";
  const L = (vi, en) => (LANG_EN ? en : vi);
  const reduceMotionEarly = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- hero app: a small "live" scene inside each panel (numbers count up, cards move, chat replays) ----------
  const HERO_ORIG = new Map();
  let sceneTimers = [];
  const later = (ms, fn) => sceneTimers.push(setTimeout(fn, ms));
  const NUM_LOCALE = LANG_EN ? "en-US" : "vi-VN";
  const parseNum = s => {
    const t = LANG_EN ? s.replace(/,/g, "") : s.replace(/\./g, "").replace(",", ".");
    return { v: parseFloat(t), dec: (t.split(".")[1] || "").length };
  };
  const fmt = (v, dec) => v.toLocaleString(NUM_LOCALE, { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const countUp = (el, dur = 900) => {
    const node = [...el.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.textContent));
    const m = node && node.textContent.match(/^(\s*)([\d.,]+)([\s\S]*)$/);
    if (!m) return;
    const { v, dec } = parseNum(m[2]);
    if (!isFinite(v)) return;
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      node.textContent = m[1] + fmt(v * e, dec) + m[3];
      if (p < 1) requestAnimationFrame(step);
    };
    node.textContent = m[1] + fmt(0, dec) + m[3];
    requestAnimationFrame(step);
  };
  const bump = el => { el.classList.remove("is-bump"); void el.offsetWidth; el.classList.add("is-bump"); };
  const intOf = el => parseInt(el.textContent.replace(/\D/g, ""), 10) || 0;
  const setNum = (el, n) => { if (!el) return; el.textContent = fmt(n, 0); bump(el); };
  // lift a kanban card, fly it to another column (FLIP), update both counters
  const moveCard = (panel, from, pick, to, at) => later(at, () => {
    const cols = [...panel.querySelectorAll(".kanban > section")];
    const list = cols[from] ? [...cols[from].querySelectorAll(".card-c")] : [];
    const card = pick < 0 ? list[list.length - 1] : list[pick];
    if (!card || !cols[to]) return;
    const liftTo = { transform: "translateY(-6px) rotate(2deg) scale(1.03)", boxShadow: "0 18px 30px -12px rgba(8,42,39,.35)" };
    const lift = card.animate([{ transform: "none" }, liftTo], { duration: 320, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" });
    later(420, () => {
      const first = card.getBoundingClientRect();
      lift.cancel();
      cols[to].querySelector("h3").after(card);
      const last = card.getBoundingClientRect();
      const dx = first.left - last.left, dy = first.top - last.top;
      card.animate([{ transform: `translate(${dx}px, ${dy}px) rotate(2deg) scale(1.03)`, boxShadow: liftTo.boxShadow }, { transform: "none", boxShadow: "0 1px 2px rgba(0,0,0,.05)" }],
        { duration: 720, easing: "cubic-bezier(.16,1,.3,1)" });
      const cf = cols[from].querySelector("h3 b"), ct = cols[to].querySelector("h3 b");
      setNum(cf, intOf(cf) - 1); setNum(ct, intOf(ct) + 1);
    });
  });
  const heroScene = panel => {
    sceneTimers.forEach(clearTimeout); sceneTimers = [];
    if (!HERO_ORIG.has(panel)) HERO_ORIG.set(panel, panel.innerHTML); else panel.innerHTML = HERO_ORIG.get(panel);
    if (reduceMotionEarly) return;
    panel.querySelectorAll(".w-big, .w-stats b, .w-count, .kanban h3 b").forEach((el, i) => later(200 + i * 60, () => countUp(el)));
    switch (panel.id) {
      case "h-p1": later(2300, () => {
        const li = panel.querySelector(".w-list li"), tag = li && li.querySelector(".tag");
        if (tag) { tag.className = "tag tag-ok is-pop"; tag.textContent = L("Đã duyệt", "Approved"); li.classList.add("is-done"); }
        const c = panel.querySelector(".w-count"); setNum(c, intOf(c) - 1);
      }); break;
      case "h-p2": later(2500, () => {
        const b = panel.querySelectorAll(".w-stats b"); setNum(b[0], intOf(b[0]) + 1); setNum(b[2], intOf(b[2]) - 1);
      }); break;
      case "h-p3": later(2300, () => {
        const st = [...panel.querySelectorAll(".w-steps li")], i = st.findIndex(x => x.classList.contains("now"));
        if (i >= 0 && st[i + 1]) { st[i].classList.replace("now", "done"); st[i + 1].classList.add("now", "is-pop"); }
      }); break;
      case "h-p4": moveCard(panel, 0, 1, 1, 1500); moveCard(panel, 1, -1, 2, 3300); break;
      case "h-p6": {
        const u = panel.querySelector(".msg-user"), bot = panel.querySelector(".msg-bot");
        if (!u || !bot) break;
        const full = u.textContent; u.textContent = ""; u.classList.add("is-typing-in"); bot.hidden = true;
        let k = 0;
        later(450, () => {
          const iv = setInterval(() => { k += 2; u.textContent = full.slice(0, k); if (k >= full.length) { clearInterval(iv); u.classList.remove("is-typing-in"); } }, 28);
          sceneTimers.push(iv);
        });
        const typing = document.createElement("p");
        typing.className = "ai-typing"; typing.innerHTML = "<i></i><i></i><i></i>";
        later(450 + full.length * 14 + 250, () => u.after(typing));
        later(450 + full.length * 14 + 1050, () => {
          typing.remove(); bot.hidden = false;
          [...bot.children, ...bot.querySelectorAll("li")].forEach((el, i) => el.style.setProperty("--i", i));
        });
        break;
      }
    }
  };

  // language menu in the header
  document.querySelectorAll(".lang").forEach(box => {
    const b = box.querySelector(".lang-btn"), menu = box.querySelector(".lang-menu");
    const set = open => { menu.hidden = !open; b.setAttribute("aria-expanded", String(open)); };
    b.addEventListener("click", e => { e.stopPropagation(); set(menu.hidden); });
    document.addEventListener("click", e => { if (!box.contains(e.target)) set(false); });
    box.addEventListener("keydown", e => { if (e.key === "Escape") { set(false); b.focus(); } });
  });

  // ---------- mobile nav ----------
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("menu");
  // phones: full-screen menu under the header; header turns solid white and the page behind stops scrolling
  const setMenu = open => {
    toggle?.setAttribute("aria-expanded", String(open));
    nav?.classList.toggle("is-open", open);
    document.querySelector(".site-header")?.classList.toggle("menu-open", open);
    document.documentElement.classList.toggle("nav-lock", open);
  };
  toggle?.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  nav?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && nav?.classList.contains("is-open")) { setMenu(false); toggle?.focus(); } });
  window.matchMedia("(min-width: 861px)").addEventListener("change", e => { if (e.matches) setMenu(false); });

  // ---------- header border on scroll ----------
  const header = document.querySelector(".site-header");
  // header turns dark over dark blocks; data-dark = fraction of the block where it becomes dark
  const darkBlocks = [...document.querySelectorAll("[data-dark]")];
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
    const probe = header.offsetHeight / 2;
    const dark = darkBlocks.some(b => {
      const r = b.getBoundingClientRect();
      return probe >= r.top + r.height * (parseFloat(b.dataset.dark) || 0) && probe < r.bottom;
    });
    header.classList.toggle("is-dark", dark);
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  // ---------- tabs (with optional autoplay) ----------
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // phones: an accordion's visual sits right under the open item (Personio mobile pattern); desktop keeps it in its own column
  const accPhone = window.matchMedia("(max-width: 860px)");
  const placeVisual = (root, tab, keepTab) => {
    const vis = root.classList.contains("talent-box") && root.querySelector(".talent-visual");
    if (!vis || !tab) return;
    const before = keepTab ? tab.getBoundingClientRect().top : 0;
    if (accPhone.matches) { if (tab.nextElementSibling !== vis) tab.after(vis); }
    else if (vis.parentElement !== root) root.append(vis);
    if (keepTab) { const d = tab.getBoundingClientRect().top - before; if (Math.abs(d) > 1) window.scrollBy(0, d); }
  };
  const placeAll = () => document.querySelectorAll(".talent-box[data-tabs]").forEach(r => placeVisual(r, r.querySelector('[role="tab"][aria-selected="true"]'), false));
  accPhone.addEventListener?.("change", placeAll);
  document.querySelectorAll("[data-tabs]").forEach(root => {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const list = root.querySelector('[role="tablist"]');
    const delay = Number(root.dataset.autoplay) || 0;
    let timer = null;
    const select = (tab, focus) => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
      // mirror the selection in the mock app's sidebar
      const pid = tab.getAttribute("aria-controls");
      // staggered entrance of the widgets inside the shown panel
      const panel = document.getElementById(pid);
      if (panel && root.classList.contains("hero-product")) heroScene(panel);
      if (panel && !reduceMotion && root.classList.contains("feat-box")) {
        panel.querySelectorAll(".fcard, .feat-shot").forEach((el, i) => el.style.setProperty("--i", i));
        panel.classList.remove("is-entering"); void panel.offsetWidth; panel.classList.add("is-entering");
      }
      if (panel && !reduceMotion && root.classList.contains("hero-product")) {
        const parts = [...new Set(panel.querySelectorAll(".app-date, .app-hello, .w, .w-stats > div, .w-steps, .w-grid > *, .kanban > section, .app-chat .msg-user, .vcard"))];
        (parts.length ? parts : [...panel.children]).forEach((el, i) => el.style.setProperty("--i", i));
        panel.classList.remove("is-entering"); void panel.offsetWidth; panel.classList.add("is-entering");
      }
      root.querySelectorAll("[data-side-for]").forEach(li => li.classList.toggle("is-on", li.dataset.sideFor === pid));
      placeVisual(root, tab, true);
      root.closest("section")?.querySelectorAll("[data-cycle]").forEach(c => c.classList.toggle("is-on", "tl-" + c.dataset.cycle === tab.id));
      // keep the active pill visible inside a horizontally scrolling tab bar, without moving the page
      if (list && list.scrollWidth > list.clientWidth) {
        list.scrollTo({ left: tab.offsetLeft - list.clientWidth / 2 + tab.offsetWidth / 2, behavior: "smooth" });
      }
    };
    const stop = () => { clearInterval(timer); timer = null; root.classList.remove("is-playing"); };
    if (root.classList.contains("hero-product")) select(tabs.find(t => t.getAttribute("aria-selected") === "true") || tabs[0]);
    if (delay && !reduceMotion) {
      root.style.setProperty("--auto", delay + "ms");
      root.classList.add("is-playing");
      timer = setInterval(() => {
        const i = tabs.findIndex(t => t.getAttribute("aria-selected") === "true");
        const next = tabs[(i + 1) % tabs.length];
        select(next);
        // restart the progress bar animation on the new pill
        const bar = next.querySelector(".tab-progress");
        if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; }
      }, delay);
      root.addEventListener("pointerdown", stop, { once: true });
      root.addEventListener("keydown", stop, { once: true });
      document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
    }
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => { stop(); select(t); });
      t.addEventListener("keydown", e => {
        const k = e.key;
        let j = null;
        if (k === "ArrowDown" || k === "ArrowRight") j = (i + 1) % tabs.length;
        if (k === "ArrowUp" || k === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
        if (k === "Home") j = 0;
        if (k === "End") j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); select(tabs[j], true); }
      });
    });
  });

  placeAll();
  // talent cycle strip: each step opens its accordion item
  document.querySelectorAll("[data-cycle]").forEach(c => c.addEventListener("click", () => {
    const tab = document.getElementById("tl-" + c.dataset.cycle);
    if (!tab) return;
    tab.click();
    if (accPhone.matches) tab.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  }));

  // ---------- 9-box ----------
  const BOX = LANG_EN ? {
    9: ["Stars, successors", "High competency, high performance. XLINK puts this group on the priority succession list and suggests retaining them with bigger challenges."],
    8: ["High performers", "High performance, moderate competency. Suggests widening their scope and management training to prepare the next step."],
    7: ["Specialists", "Strong in the current role but limited growth potential. Suggests fair recognition and keeping them in a deep-expertise role."],
    6: ["High potential", "High competency, moderate performance. Suggests an accelerated development plan (IDP) and strategic projects."],
    5: ["Core players", "The backbone of the organization. Suggests keeping motivation up, fair rewards and advanced training."],
    4: ["Needs a push", "Moderate or low competency and performance. Suggests clear expectations, short-term goals and close follow-up."],
    3: ["Misplaced, low motivation", "High competency but low performance. Suggests finding the cause and considering a move to a better-fitting role."],
    2: ["Off track", "Needs coaching to improve performance. Suggests 1:1 mentoring and removing process and tool blockers."],
    1: ["Needs improvement", "Low performance and competency. From this screen, the manager creates a Performance Improvement Plan (PIP) with clear checkpoints."],
  } : {
    9: ["Ngôi sao, người kế nhiệm", "Năng lực cao, hiệu suất cao. XLINK đưa nhóm này vào danh sách ưu tiên kế nhiệm, gợi ý giữ chân và giao thử thách lớn hơn."],
    8: ["Nhân sự thành tích cao", "Hiệu suất cao, năng lực ở mức vừa. Gợi ý mở rộng phạm vi công việc và đào tạo kỹ năng quản lý để chuẩn bị bước tiến mới."],
    7: ["Chuyên gia", "Làm tốt việc hiện tại nhưng năng lực phát triển còn hạn chế. Gợi ý ghi nhận đúng mức và giữ ở vai trò chuyên môn sâu."],
    6: ["Tiềm năng cao", "Năng lực cao, hiệu suất đang ở mức vừa. Gợi ý lập kế hoạch phát triển tăng tốc (IDP), giao dự án chiến lược."],
    5: ["Trụ cột ổn định", "Lực lượng nòng cốt của tổ chức. Gợi ý duy trì động lực, khen thưởng công bằng và tạo điều kiện đào tạo nâng cao."],
    4: ["Cần thúc đẩy", "Năng lực và hiệu suất đều ở mức vừa hoặc thấp. Gợi ý làm rõ kỳ vọng, đặt mục tiêu ngắn hạn và theo dõi sát."],
    3: ["Sai vị trí, thiếu động lực", "Năng lực cao nhưng hiệu suất thấp. Gợi ý tìm nguyên nhân thiếu động lực, xem xét luân chuyển sang vị trí phù hợp hơn."],
    2: ["Đang chệch hướng", "Cần huấn luyện để cải thiện hiệu suất. Gợi ý kèm cặp 1-1, tháo gỡ rào cản về quy trình và công cụ."],
    1: ["Cần cải thiện", "Hiệu suất và năng lực đều thấp. Từ màn hình này, quản lý lập Kế hoạch cải thiện (PIP) có mốc theo dõi rõ ràng."],
  };
  const boxes = [...document.querySelectorAll(".nb")];
  const title = document.getElementById("nb-title");
  const text = document.getElementById("nb-text");
  boxes.forEach(b => b.addEventListener("click", () => {
    boxes.forEach(x => { x.classList.toggle("is-active", x === b); x.setAttribute("aria-pressed", String(x === b)); });
    const [t, d] = BOX[b.dataset.box];
    title.textContent = t; text.textContent = d;
  }));

  // ---------- AI chat: show the answer once the chat scrolls into view ----------
  const chat = document.querySelector("[data-chat]");
  if (chat && "IntersectionObserver" in window && !reduceMotion) {
    chat.classList.add("is-waiting");
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        setTimeout(() => chat.classList.replace("is-waiting", "is-typing"), 500);
        setTimeout(() => chat.classList.replace("is-typing", "is-answered"), 1700);
        io.disconnect();
      }
    }, { threshold: 0.25 });
    io.observe(chat);
  }

  // ---------- video playlist ----------
  const video = document.getElementById("main-video");
  const items = [...document.querySelectorAll(".pl-item")];
  items.forEach(it => it.addEventListener("click", () => {
    items.forEach(x => { x.classList.toggle("is-playing", x === it); x.toggleAttribute("aria-current", x === it); });
    video.poster = it.dataset.poster;
    video.src = it.dataset.src;
    video.play().catch(() => {});
    if (window.matchMedia("(max-width: 1024px)").matches) video.scrollIntoView({ behavior: "smooth", block: "center" });
  }));

  // ---------- segmented toggle (talent block) ----------
  const segBtns = [...document.querySelectorAll("[data-seg]")];
  segBtns.forEach(btn => btn.addEventListener("click", () => {
    segBtns.forEach(b => { const on = b === btn; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); });
    document.querySelectorAll("[data-group]").forEach(g => { g.hidden = g.dataset.group !== btn.dataset.seg; });
  }));

  // ---------- hero email → main demo form ----------
  // every "email + Đặt lịch demo" mini form opens the full form in a dialog, email prefilled
  const dlg = document.getElementById("demo-dialog");
  // phones: the dialog is a full-screen sheet that follows the visible area when the keyboard opens
  const dlgPhone = window.matchMedia("(max-width: 640px)");
  const dlgFit = () => {
    if (!dlg || !dlg.open || !dlgPhone.matches) return;
    const vv = window.visualViewport;
    dlg.style.setProperty("--dlg-h", Math.round(vv ? vv.height : window.innerHeight) + "px");
    dlg.style.setProperty("--dlg-top", Math.round(vv ? vv.offsetTop : 0) + "px");
  };
  if (window.visualViewport) { visualViewport.addEventListener("resize", dlgFit); visualViewport.addEventListener("scroll", dlgFit); }
  dlg?.addEventListener("focusin", e => {
    if (!dlgPhone.matches || !e.target.matches("input, select, textarea")) return;
    setTimeout(() => { dlgFit(); if (document.activeElement === e.target) e.target.scrollIntoView({ block: "center", behavior: "smooth" }); }, 300);
  });
  dlg?.addEventListener("close", () => document.documentElement.classList.remove("dlg-lock"));
  const openDemo = email => {
    const target = document.getElementById("f-email");
    if (email && target) target.value = email;
    if (dlg && typeof dlg.showModal === "function") {
      dlg.showModal();
      dlg.scrollTop = 0;
      document.documentElement.classList.toggle("dlg-lock", dlgPhone.matches);
      dlgFit();
      // on phones do not pop the keyboard on open
      if (!dlgPhone.matches) setTimeout(() => document.getElementById("f-name")?.focus(), 30);
    } else {
      document.getElementById("dang-ky")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    }
  };
  document.querySelectorAll("[data-hero-email], [data-open-form]").forEach(f => f.addEventListener("submit", e => {
    e.preventDefault();
    openDemo(f.querySelector("input").value.trim());
  }));
  document.querySelectorAll("[data-open-demo]").forEach(b => b.addEventListener("click", () => openDemo("")));
  dlg?.querySelector(".dlg-close")?.addEventListener("click", () => dlg.close());
  dlg?.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

  // ---------- floating assistant (scripted answers from this page; free text routes to the demo form) ----------
  const ask = document.querySelector("[data-ask]");
  if (ask) {
    const EN = document.documentElement.lang === "en";
    const btn = ask.querySelector(".ask-btn");
    const panel = ask.querySelector(".ask-panel");
    const body = ask.querySelector(".ask-body");
    const form = ask.querySelector(".ask-input");
    const input = form.querySelector("input");
    let busy = null;
    // phones: full-screen panel that follows the visible area when the keyboard opens
    const phone = window.matchMedia("(max-width: 640px)");
    const fit = () => {
      if (!ask.classList.contains("is-open") || !phone.matches) return;
      const vv = window.visualViewport;
      panel.style.setProperty("--ask-h", Math.round(vv ? vv.height : window.innerHeight) + "px");
      panel.style.setProperty("--ask-top", Math.round(vv ? vv.offsetTop : 0) + "px");
      body.scrollTop = body.scrollHeight;
    };
    if (window.visualViewport) { visualViewport.addEventListener("resize", fit); visualViewport.addEventListener("scroll", fit); }
    input.addEventListener("focus", () => setTimeout(fit, 250));
    const setOpen = open => {
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      ask.classList.toggle("is-open", open);
      document.documentElement.classList.toggle("ask-lock", open && phone.matches);
      if (open) {
        fit();
        // on phones do not pop the keyboard on open; the visitor taps the field when ready
        if (!phone.matches) setTimeout(() => input.focus({ preventScroll: true }), 60);
      } else btn.focus({ preventScroll: true });
    };
    btn.addEventListener("click", () => setOpen(panel.hidden));
    ask.querySelector(".ask-x").addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) setOpen(false); });
    // show the launcher once the visitor scrolls past the first screen
    const reveal = () => ask.classList.toggle("is-shown", window.scrollY > 480 || !panel.hidden);
    window.addEventListener("scroll", reveal, { passive: true }); reveal();

    const guess = q => {
      const t = q.toLowerCase();
      // integrations / hardware / anything specific the page does not state: hand over to a specialist
      if (/tích hợp|kết nối với|máy chấm công|vân tay|khuôn mặt|api|integrat|webhook|sso|fingerprint|device/.test(t)) return "fallback";
      if (/giá|chi phí|bao nhiêu tiền|báo giá|price|pricing|cost/.test(t)) return "price";
      if (/triển khai|bao lâu|chuyển sang|onboard|implement|setup|set up|migrat/.test(t)) return "deploy";
      if (/\bai\b|trợ lý|assistant/.test(t)) return "ai";
      if (/demo|lịch|gọi|liên hệ|contact|book|call/.test(t)) return "demo";
      if (/phân hệ|tính năng|module|lương|chấm công|hồ sơ|tuyển|kpi|feature|payroll|attendance|recruit/.test(t)) return "modules";
      return "fallback";
    };
    const reply = (question, key) => {
      clearTimeout(busy);
      body.querySelector(".ask-chips")?.remove();
      const u = document.createElement("p"); u.className = "ask-msg ask-user"; u.textContent = question;
      const typing = document.createElement("p"); typing.className = "ai-typing ask-typing";
      typing.innerHTML = '<span class="sr">' + (EN ? "Assistant is typing" : "Trợ lý đang trả lời") + '</span><i></i><i></i><i></i>';
      body.append(u, typing); body.scrollTop = body.scrollHeight;
      busy = setTimeout(() => {
        typing.remove();
        const a = document.createElement("div"); a.className = "ask-msg ask-bot";
        a.append(document.getElementById("ask-" + key).content.cloneNode(true));
        body.append(a); body.scrollTop = body.scrollHeight;
        if (key === "demo") openDemo("");
      }, reduceMotion ? 0 : 650);
    };
    ask.querySelectorAll("[data-a]").forEach(c => c.addEventListener("click", () => reply(c.textContent, c.dataset.a)));
    form.addEventListener("submit", e => {
      e.preventDefault();
      const q = input.value.trim(); if (!q) return;
      input.value = ""; reply(q, guess(q));
    });
    body.addEventListener("click", e => {
      if (e.target.closest("[data-ask-demo]")) openDemo("");
      if (e.target.closest(".ask-link")) setOpen(false);
    });
  }

  // ---------- video carousel ----------
  document.querySelectorAll("[data-carousel]").forEach(car => {
    const track = car.querySelector(".vcar-track");
    const cards = [...track.children];
    const dotsBox = car.querySelector(".vcar-dots");
    const prev = car.querySelector('[data-dir="-1"]');
    const next = car.querySelector('[data-dir="1"]');
    const dots = cards.map((c, i) => {
      const d = document.createElement("button");
      d.type = "button"; d.setAttribute("role", "tab");
      d.setAttribute("aria-label", L("Thẻ ", "Card ") + (i + 1));
      d.addEventListener("click", () => go(i));
      dotsBox.append(d);
      return d;
    });
    const pad = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const current = () => {
      const x = track.scrollLeft;
      let best = 0, dist = Infinity;
      cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft - pad() - x); if (d < dist) { dist = d; best = i; } });
      return best;
    };
    const go = i => {
      i = Math.max(0, Math.min(cards.length - 1, i));
      track.scrollTo({ left: cards[i].offsetLeft - pad(), behavior: reduceMotion ? "auto" : "smooth" });
    };
    const sync = () => {
      const i = current();
      dots.forEach((d, k) => d.setAttribute("aria-selected", String(k === i)));
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    };
    prev.addEventListener("click", () => go(current() - 1));
    next.addEventListener("click", () => go(current() + 1));
    track.addEventListener("scroll", () => requestAnimationFrame(sync), { passive: true });
    window.addEventListener("resize", sync);
    sync();
    // drag with the mouse (touch and trackpads already scroll natively)
    let drag = null, dragged = false;
    track.addEventListener("pointerdown", e => {
      dragged = false;
      if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest("video, a, button")) return;
      drag = { x: e.clientX, left: track.scrollLeft };
      dragged = false;
    });
    window.addEventListener("pointermove", e => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!dragged && Math.abs(dx) > 5) { dragged = true; track.classList.add("is-dragging"); }
      if (dragged) { track.scrollLeft = drag.left - dx; e.preventDefault(); }
    });
    window.addEventListener("pointerup", () => {
      if (!drag) return;
      const moved = dragged; drag = null;
      if (moved) { track.classList.remove("is-dragging"); go(current()); }
    });
    track.addEventListener("click", e => { if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; } }, true);
    track.addEventListener("dragstart", e => e.preventDefault());
    // ---- autoplay: advance one card every 5 s (Personio), pause on hover / off-screen / after a video is opened
    const AUTO = 5000;
    let auto = null, inView = false, hovering = false, userStopped = false;
    const tick = () => {
      const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
      go(atEnd ? 0 : current() + 1);
    };
    const stopAuto = () => { clearInterval(auto); auto = null; car.classList.remove("is-auto"); };
    const startAuto = () => {
      stopAuto();
      if (reduceMotion || userStopped || !inView || hovering) return;
      void car.offsetWidth; car.classList.add("is-auto");
      auto = setInterval(() => { tick(); car.classList.remove("is-auto"); void car.offsetWidth; car.classList.add("is-auto"); }, AUTO);
    };
    car.style.setProperty("--auto", AUTO + "ms");
    car.addEventListener("mouseenter", () => { hovering = true; stopAuto(); });
    car.addEventListener("mouseleave", () => { hovering = false; startAuto(); });
    car.addEventListener("focusin", () => { hovering = true; stopAuto(); });
    car.addEventListener("focusout", () => { hovering = false; startAuto(); });
    // any manual control (buttons, dots, touch, swipe, wheel, keyboard) pauses autoplay, then it resumes after 8 s idle
    let resumeT = null;
    const pauseFor = (ms = 8000) => { stopAuto(); clearTimeout(resumeT); resumeT = setTimeout(startAuto, ms); };
    [prev, next, ...dots].forEach(b => b.addEventListener("click", () => pauseFor()));
    ["pointerdown", "touchstart", "wheel", "keydown"].forEach(t => track.addEventListener(t, () => pauseFor(), { passive: true }));
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? startAuto() : stopAuto(); }, { threshold: .35 }).observe(car);
    }

    // ---- muted background preview in each video card, playing only while the card is on screen
    const videoCards = cards.filter(c => c.classList.contains("vc-video"));
    if (!reduceMotion && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => entries.forEach(({ target: c, isIntersecting }) => {
        if (c.classList.contains("is-playing")) return;
        let bg = c.querySelector(".vc-bg");
        if (isIntersecting) {
          if (!bg) {
            bg = document.createElement("video");
            bg.className = "vc-bg"; bg.muted = true; bg.loop = true; bg.playsInline = true; bg.preload = "metadata";
            bg.setAttribute("aria-hidden", "true"); bg.tabIndex = -1;
            bg.poster = c.querySelector("img")?.currentSrc || "";
            bg.src = c.dataset.preview || c.dataset.src;
            bg.addEventListener("playing", () => c.classList.add("has-bg"), { once: true });
            c.querySelector("img").after(bg);
          }
          bg.play().catch(() => {});
        } else if (bg) bg.pause();
      }), { root: track, threshold: .6 });
      videoCards.forEach(c => io.observe(c));
    }

    // ---- play a video card in place, with sound and controls; stops the autoplay
    videoCards.forEach(c => c.addEventListener("click", () => {
      if (c.classList.contains("is-playing")) return;
      userStopped = true; stopAuto();
      track.querySelectorAll(".vc-video.is-playing").forEach(o => { o.classList.remove("is-playing"); o.querySelector("video.vc-full")?.remove(); });
      c.querySelector(".vc-bg")?.pause();
      const v = document.createElement("video");
      v.className = "vc-full"; v.src = c.dataset.src; v.controls = true; v.playsInline = true; v.autoplay = true;
      c.append(v); c.classList.add("is-playing");
      v.play().catch(() => {});
    }));
  });

  // ---------- interactive assistant demo ----------
  const demo = document.querySelector("[data-ai-demo]");
  if (demo) {
    const intro = demo.querySelector(".ai-intro");
    const thread = demo.querySelector(".ai-thread");
    const reset = demo.querySelector(".ai-reset");
    const head = demo.querySelector(".ai-demo-head");
    const wires = document.querySelector(".ai-wires");
    const NS = "http://www.w3.org/2000/svg";
    let timer = null;

    // data dots travelling along the wires, from the assistant out to each source
    const addDot = (path, dur, begin, repeat, cls) => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("r", "3.5"); c.setAttribute("class", cls); c.setAttribute("opacity", "0");
      const m = document.createElementNS(NS, "animateMotion");
      const o = document.createElementNS(NS, "animate");
      [m, o].forEach(a => { a.setAttribute("dur", dur + "s"); a.setAttribute("begin", begin); a.setAttribute("repeatCount", repeat); });
      const mp = document.createElementNS(NS, "mpath"); mp.setAttribute("href", "#" + path.id); m.append(mp);
      o.setAttribute("attributeName", "opacity"); o.setAttribute("values", "0;1;1;0"); o.setAttribute("keyTimes", "0;.15;.8;1");
      c.append(m, o); wires.append(c);
      return c;
    };
    const paths = wires ? [...wires.querySelectorAll("path")] : [];
    paths.forEach((p, i) => { p.id = "aiw-" + i; });
    if (wires && !reduceMotion) {
      paths.forEach((p, i) => [0, 1].forEach(k => {
        const dur = 2.6 + ((i * 7 + k * 5) % 10) / 10;
        addDot(p, dur.toFixed(1), (k * dur / 2 + i * .37).toFixed(2) + "s", "indefinite", "aiw-dot");
      }));
    }
    // a quick burst of dots while the assistant "looks up" the data
    const burst = () => {
      if (!wires || reduceMotion) return;
      const now = wires.getCurrentTime ? wires.getCurrentTime() : 0;
      const extra = paths.flatMap((p, i) => [0, 1, 2].map(k => addDot(p, ".9", (now + k * .3 + i * .06).toFixed(2) + "s", "1", "aiw-dot aiw-fast")));
      setTimeout(() => extra.forEach(d => d.remove()), 2600);
    };

    // close button in the header (Personio shows an × once a question is asked)
    const close = document.createElement("button");
    close.type = "button"; close.className = "ai-close"; close.hidden = true;
    close.setAttribute("aria-label", L("Đóng câu trả lời, chọn câu hỏi khác", "Close the answer and pick another question"));
    close.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>';
    head.append(close);

    const back = () => {
      clearTimeout(timer);
      thread.hidden = true; thread.innerHTML = "";
      intro.hidden = false; reset.hidden = true; close.hidden = true;
      demo.classList.remove("is-active");
      demo.querySelector("[data-q]")?.focus();
    };

    demo.querySelectorAll("[data-q]").forEach(btn => btn.addEventListener("click", () => {
      clearTimeout(timer);
      intro.hidden = true;
      thread.hidden = false;
      reset.hidden = true;
      close.hidden = false;
      demo.classList.add("is-active");
      thread.innerHTML = "";
      const q = document.createElement("p");
      q.className = "msg msg-user"; q.textContent = btn.textContent;
      const typing = document.createElement("p");
      typing.className = "ai-typing";
      typing.innerHTML = '<span class="sr">' + L("Trợ lý đang tra dữ liệu", "The assistant is looking up data") + '</span><i></i><i></i><i></i>';
      thread.append(q, typing);
      burst();
      timer = setTimeout(() => {
        typing.remove();
        const a = document.createElement("div");
        a.className = "msg msg-bot";
        a.append(document.getElementById("ans-" + btn.dataset.q).content.cloneNode(true));
        // stagger: paragraphs, then table rows / list items; chart bars grow one after another
        let n = 0;
        [...a.children].forEach(el => el.style.setProperty("--i", n++));
        a.querySelectorAll("tbody tr, .w-list li").forEach(el => el.style.setProperty("--i", n++));
        a.querySelectorAll(".mini-bars i").forEach((b, k) => b.style.setProperty("--b", k));
        thread.append(a);
        reset.hidden = false;
      }, reduceMotion ? 0 : 800);
    }));
    reset.addEventListener("click", back);
    close.addEventListener("click", back);
  }

  // ---------- onboarding cards: small scenes that play when a card comes into view (replay on re-entry) ----------
  const onbCards = [...document.querySelectorAll(".onb-card")];
  if (onbCards.length && !reduceMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-anim");
    const io = new IntersectionObserver(entries => entries.forEach(({ target: card, isIntersecting }) => {
      if (isIntersecting) {
        if (card.classList.contains("is-live")) return;
        card.classList.add("is-live");
        const small = card.querySelector(".onb-art-avatars small");
        if (small) countUp(small, 1100);
      } else {
        card.classList.remove("is-live");
      }
    }), { threshold: .45 });
    onbCards.forEach(c => io.observe(c));
  }

  // ---------- challenge carousel: each card's illustration plays when the card comes into view ----------
  const chCards = [...document.querySelectorAll(".chal2 .vc.fx")];
  if (chCards.length && !reduceMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-anim");
    const cio = new IntersectionObserver(es => es.forEach(({ target, isIntersecting }) => target.classList.toggle("is-live", isIntersecting)), { threshold: .55 });
    chCards.forEach(c => cio.observe(c));
  }

  // ---------- key points strip: columns rise in when it enters the viewport ----------
  const p3 = document.querySelector(".pillars3");
  if (p3 && !reduceMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-anim");
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { p3.classList.add("is-live"); o.disconnect(); } }, { threshold: .3 }).observe(p3);
  }

  // ---------- scroll reveal for cards (.rv) ----------
  const rvs = [...document.querySelectorAll(".rv")];
  if (rvs.length && !reduceMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-rv");
    const groups = new Map();
    rvs.forEach(el => { const k = el.parentElement; groups.set(k, (groups.get(k) || 0) + 1); el.style.setProperty("--rv", groups.get(k) - 1); });
    const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); rio.unobserve(e.target); } }), { threshold: .15, rootMargin: "0px 0px -6% 0px" });
    rvs.forEach(el => rio.observe(el));
  }

  // ---------- form ----------
  const form = document.getElementById("demo-form");
  const msg = form?.querySelector(".form-msg");
  const MESSAGES = {
    name: L("Nhập họ và tên.", "Enter your full name."),
    title: L("Nhập chức danh.", "Enter your job title."),
    company: L("Nhập tên doanh nghiệp.", "Enter your company name."),
    phone: L("Nhập số điện thoại, ví dụ 0901 234 567.", "Enter a phone number, e.g. +84 901 234 567."),
    email: L("Nhập email đúng dạng, ví dụ ten@congty.vn.", "Enter a valid email, e.g. name@company.com."),
    size: L("Chọn quy mô nhân sự.", "Choose your company size."),
  };
  const phoneOk = v => (LANG_EN ? /^\+?[\d\s().-]{8,18}$/ : /^(\+?84|0)[\d\s.-]{8,12}$/).test(v.trim());
  const setErr = (el, text) => {
    const field = el.closest(".field");
    let e = field.querySelector(".err");
    if (text) {
      if (!e) { e = document.createElement("span"); e.className = "err"; e.id = el.id + "-err"; field.appendChild(e); }
      e.textContent = text;
      el.setAttribute("aria-invalid", "true");
      el.setAttribute("aria-describedby", e.id);
    } else {
      e?.remove(); el.removeAttribute("aria-invalid"); el.removeAttribute("aria-describedby");
    }
  };
  const check = el => {
    const v = el.value;
    let bad = el.required && !v.trim();
    if (!bad && el.name === "email") bad = !el.checkValidity();
    if (!bad && el.name === "phone") bad = !phoneOk(v);
    setErr(el, bad ? MESSAGES[el.name] : "");
    return !bad;
  };
  form?.querySelectorAll("input, select").forEach(el => el.addEventListener("blur", () => { if (el.value) check(el); }));
  form?.addEventListener("submit", async e => {
    e.preventDefault();
    const fields = [...form.querySelectorAll("[required]")];
    const results = fields.map(check);
    const firstBad = fields[results.indexOf(false)];
    if (firstBad) { firstBad.focus(); msg.className = "form-msg bad"; msg.textContent = L("Kiểm tra lại các ô được đánh dấu.", "Please check the highlighted fields."); return; }
    const btn = form.querySelector('button[type="submit"]');
    const fd = new FormData(form);
    const data = Object.fromEntries(fd);
    data.needs = fd.getAll("needs").join(", ");
    data.source = "landing-xlink-v3"; data.time = new Date().toISOString();
    btn.disabled = true; btn.textContent = L("Đang gửi…", "Sending…");
    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
        if (!res.ok && res.type !== "opaque") throw new Error(res.status);
      } else {
        console.warn("[XLink] FORM_ENDPOINT chưa được cấu hình, dữ liệu chưa được gửi đi:", data);
      }
      form.reset();
      msg.className = "form-msg ok";
      msg.textContent = L("Đã nhận đăng ký trải nghiệm XLINK. Đội ngũ TOPLINKS sẽ liên hệ tư vấn cho bạn sớm nhất.", "Thanks, we have your request. The TOPLINKS team will contact you shortly.");
      { const box = msg.closest("dialog"); if (box && box.open) box.scrollTop = box.scrollHeight; else msg.scrollIntoView({ block: "nearest" }); }
    } catch (err) {
      msg.className = "form-msg bad";
      msg.textContent = L("Chưa gửi được đăng ký do lỗi kết nối. Thử lại sau ít phút.", "We could not send your request because of a connection error. Please try again in a few minutes.");
    } finally {
      btn.disabled = false; btn.textContent = L("Đăng ký demo ngay", "Book a demo now");
    }
  });
})();
