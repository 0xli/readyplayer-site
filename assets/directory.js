// ReadyPlayer directory renderer — Projects & People.
//
// Data is NEVER hardcoded in HTML. It loads from api.readyplayer.network first
// (so approved member listings and database updates show up without redeploying
// Pages) and falls back cleanly to the bundled JSON config in web/data/*.json.
(() => {
  const API =
    /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
      ? "http://127.0.0.1:3050"
      : "https://api.readyplayer.network";

  function safeUrl(raw) {
    const s = String(raw || "").trim();
    if (!s) return null;
    try {
      const u = new URL(s);
      return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
    } catch {
      return null;
    }
  }

  function hostOf(raw) {
    try { return new URL(raw).hostname.replace(/^www\./, ""); }
    catch { return ""; }
  }

  function el(tag, props = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "text") n.textContent = v;
      else if (k === "class") n.className = v;
      else n.setAttribute(k, String(v));
    }
    for (const k of kids) if (k != null) n.append(k);
    return n;
  }

  /** Bilingual text node: renders both .zh and .en spans so site.js language
   *  switching updates instantly with no re-render needed. */
  function bi(val, fallback = "") {
    if (val && typeof val === "object") {
      const frag = document.createDocumentFragment();
      frag.append(
        el("span", { class: "zh", text: val.zh || val.en || fallback }),
        el("span", { class: "en", text: val.en || val.zh || fallback }),
      );
      return frag;
    }
    return document.createTextNode(String(val || fallback));
  }

  async function fetchJson(url, timeoutMs = 1800) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { signal: ctl.signal, headers: { accept: "application/json" } });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadKind(kind) {
    const fromApi = await fetchJson(`${API}/api/${kind}`, 1800);
    if (fromApi && Array.isArray(fromApi.items)) return fromApi.items;
    const fromFile = await fetchJson(`data/${kind}.json`, 4000);
    return Array.isArray(fromFile?.items) ? fromFile.items : [];
  }

  function kindBadge(item) {
    if (item.badge) return item.badge;
    return item.kind === "editor"
      ? { zh: "编辑精选", en: "Editor's Choice" }
      : { zh: "会员", en: "Member" };
  }

  function renderProjectCard(item) {
    const href = safeUrl(item.url);
    const domain = href ? hostOf(href) : "";
    const extraLinks = (item.links || [])
      .map((l) => ({ ...l, href: safeUrl(l.url) }))
      .filter((l) => l.href && l.href !== href);

    const title = href
      ? el("a", { class: "card-link", href, target: "_blank", rel: "noopener" }, item.name, " ↗")
      : el("span", { text: item.name });

    const header = el("header", { class: "dir-head" },
      el("div", { class: "dir-title-wrap" },
        el("h3", { class: "dir-title" }, title),
        domain ? el("p", { class: "dir-meta" }, domain, item.author ? ` · ${item.author}` : "") : null,
      ),
      el("span", { class: `dir-badge${item.kind === "editor" ? " is-editor" : ""}` }, bi(kindBadge(item))),
    );

    const body = el("p", { class: "dir-desc" }, bi(item.summary));

    const tags = [];
    if (item.category) tags.push(el("span", { class: "dir-tag", text: item.category }));
    if (item.stage) tags.push(el("span", { class: "dir-tag", text: item.stage }));

    const footerKids = [];
    if (tags.length) footerKids.push(el("div", { class: "dir-tags" }, ...tags));
    if (extraLinks.length) {
      const linksWrap = el("div", { class: "dir-actions" });
      for (const l of extraLinks) {
        linksWrap.append(
          el("a", { class: "dir-sublink", href: l.href, target: "_blank", rel: "noopener" },
            bi(l.label, hostOf(l.href)),
            el("span", { class: "visually-hidden", text: ` (${item.name})` }),
          ),
        );
      }
      footerKids.push(linksWrap);
    }

    const card = el("article", { class: "dir-card", "data-kind": item.kind || "member" }, header, body);
    if (footerKids.length) card.append(el("footer", { class: "dir-foot" }, ...footerKids));
    return card;
  }

  function renderPersonCard(item) {
    const href = safeUrl(item.url);
    const primaryLinks = (item.links || [])
      .map((l) => ({ ...l, href: safeUrl(l.url) }))
      .filter((l) => l.href);

    const title = href
      ? el("a", { class: "card-link", href, target: "_blank", rel: "noopener" }, item.name)
      : el("span", { text: item.name });

    const metaParts = [];
    if (item.handle) metaParts.push(`@${item.handle.replace(/^@/, "")}`);
    const metaNode = el("p", { class: "dir-meta" });
    if (metaParts.length) metaNode.append(metaParts[0]);
    if (item.location) {
      if (metaParts.length) metaNode.append(" · ");
      metaNode.append(bi(item.location));
    }

    const header = el("header", { class: "dir-head" },
      el("div", { class: "dir-title-wrap" },
        el("h3", { class: "dir-title" }, title),
        (metaParts.length || item.location) ? metaNode : null,
      ),
      el("span", { class: `dir-badge${item.kind === "editor" ? " is-editor" : ""}` }, bi(kindBadge(item))),
    );

    const content = el("div", { class: "dir-body" },
      item.headline ? el("p", { class: "dir-headline" }, bi(item.headline)) : null,
      item.bio ? el("p", { class: "dir-desc" }, bi(item.bio)) : null,
    );

    const secondaryLinks = primaryLinks.filter((l) => l.href !== href);
    const footer = el("footer", { class: "dir-foot" });
    if (item.role) footer.append(el("div", { class: "dir-tags" }, el("span", { class: "dir-tag", text: item.role })));
    if (secondaryLinks.length || (!href && primaryLinks.length)) {
      const actions = el("div", { class: "dir-actions" });
      for (const l of (href ? secondaryLinks : primaryLinks)) {
        actions.append(
          el("a", { class: "dir-sublink", href: l.href, target: "_blank", rel: "noopener" },
            bi(l.label, l.kind || hostOf(l.href)),
            el("span", { class: "visually-hidden", text: ` (${item.name})` }),
          ),
        );
      }
      footer.append(actions);
    } else if (href) {
      footer.append(el("span", { class: "dir-hint", text: "LinkedIn ↗", "aria-hidden": "true" }));
    }

    const card = el("article", { class: "dir-card", "data-kind": item.kind || "member" }, header, content);
    if (footer.childNodes.length) card.append(footer);
    return card;
  }

  function renderInto(container, kind, items, { filter = "all", limit = 0 } = {}) {
    let list = items;
    if (filter !== "all") list = list.filter((x) => (x.kind || "member") === filter);
    if (limit > 0) {
      const featured = list.filter((x) => x.featured !== false);
      list = (featured.length ? featured : list).slice(0, limit);
    }
    container.textContent = "";
    if (!list.length) {
      container.append(el("p", { class: "dir-empty" }, bi({
        zh: "这个分类暂时还没有条目。",
        en: "No entries in this category yet.",
      })));
      return 0;
    }
    const render = kind === "people" ? renderPersonCard : renderProjectCard;
    for (const item of list) container.append(render(item));
    return list.length;
  }

  async function mountDirectory(container) {
    const kind = container.dataset.directory;
    if (kind !== "projects" && kind !== "people") return;
    const limit = Number(container.dataset.limit || 0);
    const statusEl = container.dataset.status ? document.getElementById(container.dataset.status) : null;
    const filterBar = container.dataset.filters ? document.getElementById(container.dataset.filters) : null;

    const items = await loadKind(kind);
    let active = "all";

    const update = () => {
      const n = renderInto(container, kind, items, { filter: active, limit });
      if (statusEl) {
        statusEl.textContent = "";
        statusEl.append(bi({
          zh: `共 ${n} 项`,
          en: `${n} ${n === 1 ? "entry" : "entries"}`,
        }));
      }
    };

    if (filterBar) {
      const buttons = [...filterBar.querySelectorAll("button[data-filter]")];
      for (const btn of buttons) {
        btn.addEventListener("click", () => {
          active = btn.dataset.filter || "all";
          for (const b of buttons) b.setAttribute("aria-pressed", String(b === btn));
          update();
        });
      }
    }

    update();
  }

  document.addEventListener("DOMContentLoaded", () => {
    for (const el of document.querySelectorAll("[data-directory]")) {
      mountDirectory(el);
    }
  });
})();
