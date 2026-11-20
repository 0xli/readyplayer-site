// ReadyPlayer — shared language / theme switching (synced across
// readyplayer.network & app.readyplayer.network via a site-scoped cookie) + copy buttons.
(() => {
  const root = document.documentElement;
  const IS_RP_DOMAIN = /(?:^|\.)readyplayer\.network$/i.test(location.hostname);
  const COOKIE_ATTRS = IS_RP_DOMAIN
    ? "Domain=.readyplayer.network; Path=/; Max-Age=31536000; SameSite=Lax; Secure"
    : "Path=/; Max-Age=31536000; SameSite=Lax";

  function readCookie(name) {
    const m = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(document.cookie || "");
    return m ? decodeURIComponent(m[1]) : null;
  }

  function writeCookie(name, value) {
    try {
      document.cookie = `${name}=${encodeURIComponent(value)}; ${COOKIE_ATTRS}`;
    } catch { /* ignore restricted cookie jars */ }
  }

  function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function safeStorageSet(key, val) {
    try { localStorage.setItem(key, val); } catch { /* private mode */ }
  }

  function applyLang(l) {
    const clean = l === "zh" ? "zh" : "en";
    root.setAttribute("data-lang", clean);
    root.setAttribute("lang", clean);
    return clean;
  }

  function applyTheme(t) {
    const clean = t === "light" ? "light" : "dark";
    root.setAttribute("data-theme", clean);
    root.style.colorScheme = clean;
    return clean;
  }

  function defaultThemeByTime() {
    const h = new Date().getHours();
    // Day: 07:00–18:59 local time -> light; Night: 19:00–06:59 -> dark.
    return h >= 7 && h < 19 ? "light" : "dark";
  }

  // Shared site cookie wins so readyplayer.network and app.readyplayer.network
  // (and localhost:5174 <-> localhost:5173) always stay in sync.
  const cookieLang = readCookie("rp_lang");
  const savedLang = cookieLang || safeStorageGet("rp-lang");
  const initLang = applyLang(savedLang || (/^zh\b/i.test(navigator.language || "") ? "zh" : "en"));
  if (!cookieLang && savedLang) writeCookie("rp_lang", initLang);

  const cookieTheme = readCookie("rp_theme");
  const savedTheme = cookieTheme || safeStorageGet("rp-theme");
  const explicitTheme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : null;
  const initTheme = applyTheme(explicitTheme || defaultThemeByTime());
  if (!cookieTheme && explicitTheme) writeCookie("rp_theme", initTheme);

  window.rpSetLang = (l) => {
    const clean = applyLang(l);
    safeStorageSet("rp-lang", clean);
    writeCookie("rp_lang", clean);
  };

  window.rpToggleTheme = () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next);
    safeStorageSet("rp-theme", next);
    writeCookie("rp_theme", next);
  };

  function syncFromSharedCookie() {
    const t = readCookie("rp_theme");
    if ((t === "light" || t === "dark") && t !== root.getAttribute("data-theme")) {
      applyTheme(t);
      safeStorageSet("rp-theme", t);
    }
    const l = readCookie("rp_lang");
    if ((l === "zh" || l === "en") && l !== root.getAttribute("data-lang")) {
      if (typeof window.rpSetLang === "function") window.rpSetLang(l);
      else applyLang(l);
    }
  }

  window.addEventListener("pageshow", syncFromSharedCookie);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncFromSharedCookie();
  });

  document.addEventListener("DOMContentLoaded", () => {
    // CTO tier details live in <dialog id="cto">; #cto is a link you can send
    const cto = document.getElementById("cto");
    if (cto && cto.showModal) {
      const open = () => { if (!cto.open) cto.showModal(); };
      document.querySelectorAll("[data-open-cto]").forEach((a) => a.addEventListener("click", (e) => {
        e.preventDefault(); open(); history.replaceState(null, "", "#cto");
      }));
      cto.querySelectorAll("[data-close-cto]").forEach((a) => a.addEventListener("click", () => cto.close()));
      cto.addEventListener("click", (e) => { // backdrop only, not the dialog's own padding
        const r = cto.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) cto.close();
      });
      cto.addEventListener("close", () => {
        if (location.hash === "#cto") history.replaceState(null, "", "#pricing");
      });
      if (location.hash === "#cto") open();
      window.addEventListener("hashchange", () => { if (location.hash === "#cto") open(); });
    }

    document.querySelectorAll("[data-copy]").forEach((btn) => {
      const original = btn.textContent;
      btn.addEventListener("click", async () => {
        const text = btn.getAttribute("data-copy");
        try { await navigator.clipboard.writeText(text); }
        catch {
          const ta = document.createElement("textarea");
          ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
          document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); } catch {}
          ta.remove();
        }
        btn.classList.add("ok"); btn.textContent = "✓";
        setTimeout(() => { btn.classList.remove("ok"); btn.textContent = original; }, 1500);
      });
    });
  });
})();
