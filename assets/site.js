// ReadyPlayer — language / theme switching + copy buttons. No framework.
(() => {
  const root = document.documentElement;

  // language: saved choice wins; otherwise follow the browser
  const savedLang = localStorage.getItem("rp-lang");
  const lang = savedLang || (/^zh\b/i.test(navigator.language || "") ? "zh" : "en");
  root.setAttribute("data-lang", lang === "zh" ? "zh" : "en");

  // theme: saved choice wins; default dark
  const savedTheme = localStorage.getItem("rp-theme");
  if (savedTheme === "light") root.setAttribute("data-theme", "light");

  window.rpSetLang = (l) => {
    root.setAttribute("data-lang", l);
    localStorage.setItem("rp-lang", l);
  };
  window.rpToggleTheme = () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    localStorage.setItem("rp-theme", next);
  };

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
