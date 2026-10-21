// Arriving from Beagle's Apps tab, on the marketing site.
//
// This page is still static — GitHub Pages, no server here — so this is
// DISPLAY ONLY and says so: it greets the visitor by the name their own
// Beagle sent, and nothing on this page is gated on it. There is no signature
// check because there is no decision here to protect.
//
// The backend now exists, but it belongs to the MEMBER APP, and the member app
// is a different origin. That matters: a launch assertion is signed over
// `decent-launch\n<origin>\n<ts>`, so one minted for readyplayer.network is
// bound to readyplayer.network and the API — which takes the origin from the
// Origin header, not the body — will refuse it at app.readyplayer.network.
// Forwarding the fragment would produce a confident-looking flow that fails
// every time. So this greets and offers a link, and the real flow runs at
// app.readyplayer.network with its own popup sign-in.
//
// Beagle's Apps-tab entry for ReadyPlayer should point at
// app.readyplayer.network for exactly this reason — then there is no hop.
(() => {
  const MAX_AGE_MS = 120_000;
  const APP = "https://app.readyplayer.network/";

  function readLaunch() {
    const m = /(?:^|[#&])beagle=([A-Za-z0-9_-]+)/.exec(location.hash || "");
    if (!m) return null;
    // Strip it whether or not it parses: a copied URL must not carry someone's
    // assertion, even an unusable one.
    try {
      const rest = (location.hash || "")
        .replace(/(?:^|[#&])beagle=[A-Za-z0-9_-]+/, "").replace(/^#?&?/, "");
      history.replaceState(null, "", location.pathname + location.search + (rest ? `#${rest}` : ""));
    } catch { /* hygiene, not correctness */ }
    try {
      const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
      const a = JSON.parse(decodeURIComponent(escape(atob(b64 + "=".repeat((4 - b64.length % 4) % 4)))));
      if (!a || !a.userid) return null;
      // Stale is treated as absent. It proves nothing either way here, but
      // greeting someone from a link they were sent last week is just wrong.
      if (Math.abs(Date.now() - Number(a.ts || 0)) > MAX_AGE_MS) return null;
      return a;
    } catch { return null; }
  }

  // ── who is signed in, according to the member app ────────────────────────
  //
  // app.readyplayer.network sets a cookie scoped to .readyplayer.network after a
  // real sign-in. Different origin, same site, so this page can read it.
  //
  // It is a DISPLAY HINT and nothing else — a name, an avatar, a truncated
  // userid. No token, no address. This page still has no backend and still
  // verifies nothing, which is fine because nothing here is gated: the worst a
  // forged cookie achieves is drawing a different name in that person's own nav
  // bar. The session itself lives in the app's localStorage, where this page
  // cannot reach it, and that is deliberate.
  function readWho() {
    const m = /(?:^|;\s*)rp_who=([^;]+)/.exec(document.cookie || "");
    if (!m) return null;
    try {
      const d = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
      return d && (d.n || d.u) ? d : null;
    } catch { return null; }
  }

  function showMember() {
    const w = readWho();
    const link = document.getElementById("rp-signin");
    if (!w || !link) return;
    const zh = document.documentElement.getAttribute("data-lang") === "zh";
    const label = String(w.n || "").trim() || `${w.u}…`;
    link.textContent = "";
    link.title = zh ? "进入会员页" : "Open the member app";
    link.style.display = "inline-flex";
    link.style.alignItems = "center";
    link.style.gap = "7px";
    link.style.color = "var(--txt)";
    if (w.a) {
      const img = document.createElement("img");
      img.src = w.a;
      img.alt = "";
      img.width = 22;
      img.height = 22;
      img.style.cssText = "border-radius:5px;object-fit:cover;border:1px solid var(--line3)";
      // A CDN that 404s must not leave a broken-image box in the nav.
      img.onerror = () => img.remove();
      link.appendChild(img);
    }
    const span = document.createElement("span");
    span.textContent = label;
    span.style.cssText = "max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    link.appendChild(span);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showMember);
  } else {
    showMember();
  }

  const who = readLaunch();
  if (!who) return;

  const zh = document.documentElement.getAttribute("data-lang") === "zh";
  const name = String(who.name || "").trim() || `${who.userid.slice(0, 8)}…`;

  const bar = document.createElement("div");
  bar.id = "rp-beagle";
  bar.setAttribute("role", "status");
  bar.innerHTML = `
    <span class="rp-b-dot"></span>
    <span class="rp-b-txt"></span>
    <a class="rp-b-go" href="${APP}"></a>
    <button type="button" class="rp-b-x" aria-label="close">×</button>`;
  bar.querySelector(".rp-b-txt").textContent = zh
    ? `${name} · 你已经装了 Beagle`
    : `${name} · you already have Beagle`;
  bar.querySelector(".rp-b-go").textContent = zh ? "进入会员页 ▸" : "Open the member app ▸";
  bar.querySelector(".rp-b-x").onclick = () => bar.remove();

  const css = document.createElement("style");
  css.textContent = `
    #rp-beagle{position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:9999;
      display:flex;align-items:center;gap:10px;padding:9px 12px 9px 14px;border-radius:999px;
      background:var(--card,#161b22);border:1px solid var(--line,#30363d);
      font:500 13.5px/1.2 Inter,system-ui,sans-serif;color:var(--txt,#e6edf3);
      box-shadow:0 6px 24px rgba(0,0,0,.35);max-width:min(92vw,560px)}
    #rp-beagle .rp-b-dot{width:8px;height:8px;border-radius:999px;background:#3fb950;flex:0 0 auto}
    #rp-beagle .rp-b-txt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #rp-beagle .rp-b-go{color:#3fb950;font-weight:700;text-decoration:none;white-space:nowrap}
    #rp-beagle .rp-b-go:hover{color:#4ecb60}
    #rp-beagle .rp-b-x{background:none;border:0;color:var(--dim,#8b949e);font-size:17px;
      line-height:1;cursor:pointer;padding:0 2px}`;
  document.head.appendChild(css);
  // This file is loaded from <head>, where document.body does not exist yet —
  // appending there throws and the greeting silently never appears. Reading
  // the fragment early is still right (strip it before anything can copy the
  // URL); only the insertion has to wait.
  if (document.body) document.body.appendChild(bar);
  else document.addEventListener("DOMContentLoaded", () => document.body.appendChild(bar));
})();
