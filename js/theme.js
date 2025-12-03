(() => {
  "use strict";

  const root = document.documentElement;
  const tabContainer = document.getElementById("tab-buttons");
  const linkContainer = document.getElementById("tab-links");
  const bookmarkData = document.getElementById("bookmark-data");
  const dropdown = document.getElementById("theme-dropdown");
  const trigger = dropdown?.querySelector(".trigger");
  const menu = dropdown?.querySelector(".menu");

  const searchDropdown = document.getElementById("search-prompt-dropdown");
  const searchTrigger = document.getElementById("search-prompt-trigger");
  const searchMenu = document.getElementById("search-prompt-menu");
  const searchInput = document.getElementById("search-prompt-input");
  const SEARCH_STORAGE_KEY = "preferredSearchEngine";
  const SEARCH_DEFAULT = "google";

  let SEARCH_ENGINES;
  try {
    SEARCH_ENGINES = JSON.parse(
      document.getElementById("search-engines-config").textContent,
    );
  } catch (err) {
    console.error("Invalid search-engines-config JSON", err);

    SEARCH_ENGINES = {
      google: "https://www.google.com/search?q=",
      yandex: "https://yandex.com/search/?text=",
    };
  }

  let currentSearchEngine = null;

  const THEME_KEY = "theme";
  const TAB_KEY = "activeTab";

  // theme registry
  const imageEl = document.getElementById("theme-image");
  let THEME_REG = [];
  let THEME_MAP = new Map();
  (function loadThemeRegistry() {
    const el = document.getElementById("themes-config");
    if (el) {
      try {
        const arr = JSON.parse(el.textContent) || [];
        if (Array.isArray(arr)) THEME_REG = arr;
      } catch (_) {}
    }
    // fallback for legacy setups
    if (!THEME_REG.length) {
      THEME_REG = [
        { key: "default", label: "Default", href: "css/theme.default.css" },
        {
          key: "solarized-dark",
          label: "Solarized Dark",
          href: "css/theme.solarized-dark.css",
        },
        { key: "gruvbox", label: "Gruvbox", href: "css/theme.gruvbox.css" },
        {
          key: "nord-dark",
          label: "Nord Dark",
          href: "css/theme.nord-dark.css",
        },
        { key: "aphelion", label: "Aphelion", href: "css/theme.aphelion.css" },
      ];
    }
    THEME_MAP = new Map(THEME_REG.map((t) => [t.key, t]));
  })();

  let DENSITY_PRESETS = {
    compact: { cellMin: "10ch", gap: "0.4rem 0.4rem" },
    cozy: { cellMin: "14ch", gap: "0.7rem 0.6rem" }, // default-equivalent
    roomy: { cellMin: "18ch", gap: "0.9rem 0.8rem" },
  };

  (() => {
    const el = document.getElementById("density-presets");
    if (!el) return;
    try {
      const user = JSON.parse(el.textContent);
      if (user && typeof user === "object") {
        DENSITY_PRESETS = { ...DENSITY_PRESETS, ...user };
      }
    } catch {}
  })();

  let currentTheme = null;
  const loadedThemes = new Set();
  let TAB_LIST = [];
  let BOOKMARK_CONFIG = []; // parsed array of tab objects
  let activeTabId = null; // string like "1", "2", etc.

  document.querySelectorAll("input").forEach((el) => {
    el.setAttribute("autocomplete", "off");
    el.setAttribute("spellcheck", "false");
    el.setAttribute("autocorrect", "off");
    el.setAttribute("autocapitalize", "off");
  });
  const scale = (hex, k) => {
    // 3 mults, 3 clamps, branchless
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) * k) | 0;
    const g = Math.min(255, ((n >> 8) & 255) * k) | 0;
    const b = Math.min(255, (n & 255) * k) | 0;
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  };

  const neumorph = (b) => ({
    gradDark: scale(b, 0.92),
    gradLight: scale(b, 1.08),
    shadowDark: scale(b, 0.67),
    shadowLite: scale(b, 1.33),
  });

  function buildSearchMenu() {
    if (!searchMenu) return;
    searchMenu.innerHTML = "";
    Object.keys(SEARCH_ENGINES).forEach((key) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-engine-item";
      btn.textContent = key
        .split("-")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
      btn.dataset.value = key;
      btn.addEventListener("click", () => selectSearchEngine(key));
      searchMenu.appendChild(btn);
    });
  }

  function loadSearchEngine() {
    const saved = localStorage.getItem(SEARCH_STORAGE_KEY);
    currentSearchEngine =
      saved && SEARCH_ENGINES[saved] ? saved : SEARCH_DEFAULT;
    updateSearchTrigger();
  }

  function updateSearchTrigger() {
    if (!searchTrigger) return;
    searchTrigger.textContent = currentSearchEngine
      .split("-")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");
    Array.from(searchMenu.children).forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.value === currentSearchEngine),
    );
  }

  function resolveDensity(density) {
    if (!density) return null;

    // Named preset
    if (typeof density === "string") {
      if (DENSITY_PRESETS[density]) return DENSITY_PRESETS[density];
      // Raw CSS length (e.g. "12ch", "16px", "1rem")
      if (/^\d+(\.\d+)?(ch|px|rem|em|%)$/.test(density)) {
        return { cellMin: density };
      }
      return null;
    }

    // Advanced object: { cellMin, gap }
    if (typeof density === "object") {
      const out = {};
      if (typeof density.cellMin === "string") out.cellMin = density.cellMin;
      if (typeof density.gap === "string") out.gap = density.gap;
      return Object.keys(out).length ? out : null;
    }
    return null;
  }

  function applyTabDensity(tabObj) {
    const spec = resolveDensity(tabObj && tabObj.density);
    if (!spec) {
      linkContainer.style.removeProperty("--cell-min");
      linkContainer.style.removeProperty("--links-gap");
      linkContainer.removeAttribute("data-density");
      return;
    }
    if (spec.cellMin)
      linkContainer.style.setProperty("--cell-min", spec.cellMin);
    if (spec.gap) linkContainer.style.setProperty("--links-gap", spec.gap);
    linkContainer.setAttribute(
      "data-density",
      tabObj.density?.toString() || "",
    );
  }

  function selectSearchEngine(key) {
    currentSearchEngine = key;
    localStorage.setItem(SEARCH_STORAGE_KEY, key);
    updateSearchTrigger();
    searchDropdown.classList.remove("open");
    searchInput.focus();
  }

  function handleSearchInput(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) {
      searchInput.focus();
      return;
    }
    window.open(
      SEARCH_ENGINES[currentSearchEngine] + encodeURIComponent(q),
      "_blank",
    );
    searchInput.value = "";
  }

  function initSearchPrompt() {
    buildSearchMenu();
    loadSearchEngine();

    if (searchInput) {
      searchInput.addEventListener("keydown", handleSearchInput);
    }
  }
  let outside = null;
  function open() {
    searchDropdown.classList.add("open");
    outside = (ev) => {
      if (!searchDropdown.contains(ev.target)) close();
    };
    document.addEventListener("click", outside);
  }
  function close() {
    searchDropdown.classList.remove("open");
    if (outside) {
      document.removeEventListener("click", outside);
      outside = null;
    }
  }
  if (searchTrigger) {
    searchTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      searchDropdown.classList.contains("open") ? close() : open();
    });
  }
  function applyNeumorph() {
    // Matches neumorphism.io defaults
    const base = getComputedStyle(root).getPropertyValue("--bg").trim();
    const c = neumorph(base);

    root.style.setProperty("--neu-grad-dark", c.gradDark);
    root.style.setProperty("--neu-grad-light", c.gradLight);
    root.style.setProperty("--neu-shadow-dark", c.shadowDark);
    root.style.setProperty("--neu-shadow-lite", c.shadowLite);
  }

  function loadThemeSheet(themeKey) {
    if (loadedThemes.has(themeKey)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      const rec = THEME_MAP.get(themeKey);
      link.href = rec && rec.href ? rec.href : `css/theme.${themeKey}.css`;
      link.onload = () => {
        loadedThemes.add(themeKey);
        resolve();
      };
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }
  function applyDarkenedBg(selector, cssVar, amount) {
    const base = getComputedStyle(document.documentElement)
      .getPropertyValue(cssVar)
      .trim();
    if (!base) return;
    const darker = darken(base, amount);
    document.querySelectorAll(selector).forEach((el) => {
      el.style.backgroundColor = darker;
    });
  }

  const THEME_PREFIX = "theme-";
  function setTheme(theme) {
    if (!THEME_MAP.has(theme) || theme === currentTheme) return;
    currentTheme = theme;

    const kept = root.className
      .split(/\s+/)
      .filter((c) => c && !c.startsWith(THEME_PREFIX));
    kept.push(`${THEME_PREFIX}${theme}`);
    root.className = kept.join(" ");

    loadThemeSheet(theme).then(() => {
      if (theme !== currentTheme) return;
      applyNeumorph();
      refreshClockStyle();
      // force a repaint so the face updates immediately
      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => {
          const canvases = document.querySelectorAll(".clock-block canvas");
          canvases.forEach((cv) => {
            const ctx = cv.getContext("2d");
            // draw current time once; steady loop will take over next tick
            const now = new Date();
            const parts = {
              h: now.getHours(),
              m: now.getMinutes(),
              s: now.getSeconds(),
              isPM: now.getHours() >= 12,
            };
            drawClockParts(ctx, parts);
          });
        });
      }
    });

    if (imageEl) {
      const rec = THEME_MAP.get(theme);
      const img = rec && rec.image ? rec.image : null;
      if (img && img.src) imageEl.src = img.src;
      if (img && img.height) imageEl.style.height = img.height;
    }
    localStorage.setItem(THEME_KEY, theme);
    updateDropdownSelection(theme);
  }

  function openDropdown() {
    if (!dropdown) return;
    buildThemeDropdown();
    dropdown.classList.add("open");
    trigger?.setAttribute("aria-expanded", "true");
    document.addEventListener("click", outsideClick);
  }
  function closeDropdown() {
    if (!dropdown) return;
    dropdown.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", outsideClick);
  }
  function toggleDropdown() {
    dropdown?.classList.contains("open") ? closeDropdown() : openDropdown();
  }
  function outsideClick(e) {
    if (!dropdown) return;
    if (!dropdown.contains(e.target)) closeDropdown();
  }

  function updateDropdownSelection(theme) {
    if (!trigger || !menu) return;
    const labelEl = trigger.querySelector(".label");
    if (labelEl) {
      const rec = THEME_MAP.get(theme);
      labelEl.textContent = (rec && rec.label) || theme;
    }
    menu.querySelectorAll(".menu-item").forEach((btn) => {
      const is = btn.dataset.value === theme;
      btn.classList.toggle("active", is);
      btn.setAttribute("aria-selected", is ? "true" : "false");
    });
  }

  let themeMenuBuilt = false;
  function buildThemeDropdown() {
    if (!menu) return;
    const frag = document.createDocumentFragment();
    for (const rec of THEME_REG) {
      const key = rec.key;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "menu-item";
      btn.textContent = rec.label || key;
      btn.dataset.value = key;
      btn.setAttribute("role", "option");
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        setTheme(key);
        closeDropdown();
      });
      frag.appendChild(btn);
    }
    menu.replaceChildren(frag);
  }

  function initTheme() {
    const fallback = THEME_REG[0] ? THEME_REG[0].key : "default";
    const saved = localStorage.getItem(THEME_KEY) || fallback;
    buildThemeDropdown();
    setTheme(saved);
    // wire dropdown toggle
    if (trigger) {
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDropdown();
      });
    }
  }

  // keep only parsed JSON; build DOM per activation
  function renderLinksForTab(tabId) {
    const tab = BOOKMARK_CONFIG.find((t) => String(t.tab) === String(tabId));
    const frag = document.createDocumentFragment();
    if (tab && Array.isArray(tab.links)) {
      for (const ln of tab.links) {
        const a = document.createElement("a");
        a.href = ln.url || "#";
        a.textContent = ln.name || ln.url || "";
        a.className = "is-visible";
        frag.appendChild(a);
      }
    }
    linkContainer.replaceChildren(frag);
  }

  function renderTabs() {
    tabContainer.textContent = "";
    const frag = document.createDocumentFragment();
    BOOKMARK_CONFIG.forEach((tabObj) => {
      const tabId = String(tabObj.tab);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-tab-btn", tabId);
      btn.setAttribute("role", "tab");
      btn.setAttribute(
        "aria-selected",
        tabId === activeTabId ? "true" : "false",
      );
      btn.textContent = tabObj.label || tabId;
      if (tabId === activeTabId) btn.classList.add("is-active");
      btn.addEventListener("click", () => {
        if (activeTabId === tabId) return;
        activateTab(tabId);
        btn.focus();
      });
      frag.appendChild(btn);
    });
    tabContainer.appendChild(frag);
  }

  function activateTab(tabId) {
    activeTabId = String(tabId);
    const tabObj = BOOKMARK_CONFIG.find((t) => String(t.tab) === activeTabId);

    // tab button state
    document.querySelectorAll("[data-tab-btn]").forEach((btn) => {
      const is = btn.getAttribute("data-tab-btn") === activeTabId;
      btn.classList.toggle("is-active", is);
      btn.setAttribute("aria-selected", is ? "true" : "false");
    });

    // apply density first for a single layout
    applyTabDensity(tabObj);

    // render links for the active tab
    linkContainer.classList.add("links");
    renderLinksForTab(activeTabId);

    // persist selection
    document.documentElement.setAttribute("data-active-tab", activeTabId);
    localStorage.setItem(TAB_KEY, activeTabId);
  }

  function initTabs() {
    const saved = localStorage.getItem(TAB_KEY);
    const fallback = BOOKMARK_CONFIG.length
      ? String(BOOKMARK_CONFIG[0].tab)
      : "1";
    const initial = BOOKMARK_CONFIG.find((t) => String(t.tab) === saved)
      ? saved
      : fallback;
    activeTabId = String(initial);
    renderTabs();
    activateTab(activeTabId);
    // arrow navigation
    tabContainer.addEventListener("keydown", (e) => {
      const buttons = Array.from(
        tabContainer.querySelectorAll("[data-tab-btn]"),
      );
      if (!buttons.length) return;
      let idx = buttons.findIndex(
        (b) => b.getAttribute("data-tab-btn") === activeTabId,
      );
      if (idx === -1) idx = 0;
      if (e.key === "ArrowRight") {
        idx = (idx + 1) % buttons.length;
        activateTab(buttons[idx].getAttribute("data-tab-btn"));
        buttons[idx].focus();
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        idx = (idx - 1 + buttons.length) % buttons.length;
        activateTab(buttons[idx].getAttribute("data-tab-btn"));
        buttons[idx].focus();
        e.preventDefault();
      }
    });
  }

  function initGlobalSearchFocus() {
    if (!searchInput) return;

    // treat anything matching this as a real control the user intended to use
    const INTERACTIVE =
      "a,button,input,textarea,select,label,details,summary," +
      '[role="button"],[role="menuitem"],[role="option"],[contenteditable],' +
      ".dropdown,.menu,.menu *,.search-engine-menu,.search-engine-menu *," +
      ".tabs,.tabs *";

    document.addEventListener(
      "click",
      (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        if (t.closest(INTERACTIVE)) return;
        if (document.activeElement === searchInput) return;
        // do not jump the page if the input is out of view
        searchInput.focus({ preventScroll: true });
      },
      true, // capture so it runs before other handlers without interfering
    );
  }

  function getTimezonesConfig() {
    const configEl = document.getElementById("timezone-config");
    if (!configEl) return {};
    try {
      return JSON.parse(configEl.textContent);
    } catch (e) {
      console.error("[clock] invalid timezone config");
      return {};
    }
  }

  function makeZonedHMSGetter(tz) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return () => {
      let h = 0,
        m = 0,
        s = 0;
      for (const p of fmt.formatToParts(new Date())) {
        if (p.type === "hour") h = p.value | 0;
        if (p.type === "minute") m = p.value | 0;
        if (p.type === "second") s = p.value | 0;
      }
      return { h, m, s, isPM: h >= 12 };
    };
  }

  function createClockCanvas(id, label) {
    const container = document.createElement("div");
    container.className = "clock-block";

    const canvas = document.createElement("canvas");
    canvas.id = `clock-${id}`;
    canvas.width = 90;
    canvas.height = 90;

    const caption = document.createElement("div");
    caption.className = "clock-label";
    caption.textContent = label;

    container.appendChild(canvas);
    container.appendChild(caption);
    return { container, canvas };
  }

  let CLOCK_STYLE = null;
  function refreshClockStyle() {
    const cs = getComputedStyle(document.documentElement);
    // defer until themed CSS is applied; empty string means not ready
    const face = cs.getPropertyValue("--bg-500").trim();
    if (!face) return false;
    CLOCK_STYLE = {
      face,
      tick: cs.getPropertyValue("--xgray-2").trim() || "#000",
      hand: cs.getPropertyValue("--xnordblue-2").trim() || "#000",
      secAM:
        cs.getPropertyValue("--sec-am").trim() ||
        cs.getPropertyValue("--nr").trim() ||
        "#000",
      secPM:
        cs.getPropertyValue("--sec-pm").trim() ||
        cs.getPropertyValue("--br").trim() ||
        "#000",
    };
    return true;
  }

  // keep the cache in sync with theme swaps
  const themeObserver = new MutationObserver(() => {
    refreshClockStyle();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  function drawClockParts(ctx, { h, m, s, isPM }) {
    if (!CLOCK_STYLE && !refreshClockStyle()) {
      // stylesheet not ready yet; paint nothing this frame
      return;
    }
    const size = ctx.canvas.width;
    const r = size / 2;

    ctx.clearRect(0, 0, size, size);
    // face
    ctx.beginPath();
    ctx.arc(r, r, r - 1, 0, Math.PI * 2);
    ctx.fillStyle = CLOCK_STYLE.face;
    ctx.fill();

    ctx.strokeStyle = CLOCK_STYLE.tick;
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(r + Math.cos(a) * (r - 10), r + Math.sin(a) * (r - 10));
      ctx.lineTo(r + Math.cos(a) * (r - 4), r + Math.sin(a) * (r - 4));
      ctx.stroke();
    }

    const hand = CLOCK_STYLE.hand;
    const sec = isPM ? CLOCK_STYLE.secPM : CLOCK_STYLE.secAM;

    const to = (u, max) => (Math.PI * 2 * u) / max - Math.PI / 2;
    const draw = (ang, len, wid, col) => {
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.lineWidth = wid;
      ctx.strokeStyle = col;
      ctx.moveTo(r, r);
      ctx.lineTo(r + Math.cos(ang) * len, r + Math.sin(ang) * len);
      ctx.stroke();
    };

    const mm = m + s / 60;
    const hh = (h % 12) + mm / 60;
    draw(to(hh, 12), r * 0.5, 4, hand);
    draw(to(mm, 60), r * 0.7, 3, hand);
    draw(to(s, 60), r * 0.8, 1, sec);
  }

  function startClocks() {
    const tzMap = JSON.parse(
      document.getElementById("timezone-config").textContent,
    );
    const sidebar = document.querySelector(".clock-container");
    if (!sidebar) return;

    const clocks = [];
    for (const [key, info] of Object.entries(tzMap)) {
      if (!info?.tz) continue;
      const { container, canvas } = createClockCanvas(key, info.label);
      sidebar.appendChild(container);
      const ctx = canvas.getContext("2d");
      clocks.push({ ctx, get: makeZonedHMSGetter(info.tz) });
    }

    function renderAll() {
      for (const c of clocks) {
        const t = c.get();
        drawClockParts(c.ctx, t);
      }
    }

    const MAX_FRAMES = 10;
    const MAX_MS = 450;
    let frames = 0;
    const t0 = performance.now();

    function prime() {
      renderAll();
      frames++;
      if (frames < MAX_FRAMES && performance.now() - t0 < MAX_MS) {
        requestAnimationFrame(prime);
      } else {
        steady();
      }
    }

    function steady() {
      function tick() {
        renderAll();
        const now = Date.now();
        setTimeout(tick, 1000 - (now % 1000)); // align to the next second
      }
      tick();
    }

    requestAnimationFrame(prime);
  }

  function updateTime() {
    const now = new Date();
    const timeEl = document.getElementById("time");
    const dateEl = document.getElementById("date");

    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }
  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }
  document.addEventListener("DOMContentLoaded", () => {
    try {
      BOOKMARK_CONFIG = JSON.parse(bookmarkData.textContent);
    } catch (e) {
      console.error("failed to parse bookmark-data", e);
      BOOKMARK_CONFIG = [];
    }
    if (!Array.isArray(BOOKMARK_CONFIG)) BOOKMARK_CONFIG = [];

    initTheme();
    initSearchPrompt();
    initGlobalSearchFocus();
    renderTabs();
    // stabilizeBookmarksHeight();
    initTabs();
    refreshClockStyle();
    startClocks();
    updateTime(); // initialize immediately
    setInterval(updateTime, 1000);
  });

  const ro = new ResizeObserver(
    debounce(() => {
      if (activeTabId) activateTab(activeTabId);
    }, 100),
  );
  if (linkContainer) ro.observe(linkContainer);
})();
