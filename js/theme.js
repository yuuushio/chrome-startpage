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

  // must match the html selector *values*
  const THEMES = ["default", "solarized-dark", "gruvbox", "nord-dark"];
  const THEME_KEY = "theme";
  const TAB_KEY = "activeTab";
  const themeDir = "css/";
  const imageConfig = JSON.parse(
    document.getElementById("theme-image-map").textContent,
  );
  const imageEl = document.getElementById("theme-image");
  let currentTheme = null;
  const loadedThemes = new Set();
  let TAB_LIST = [];
  let BOOKMARK_CONFIG = []; // parsed array of tab objects
  let activeTabId = null; // string like "1", "2", etc.
  const tabLinkElements = new Map(); // tabId -> array of <a> elements (template)

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
    if (searchTrigger) {
      searchTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        searchDropdown.classList.toggle("open");
      });
    }
    document.addEventListener("click", () =>
      searchDropdown.classList.remove("open"),
    );
    if (searchInput) {
      searchInput.addEventListener("keydown", handleSearchInput);
    }
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

  function loadThemeSheet(theme) {
    // if (loadedThemes.has(theme)) return;
    if (loadedThemes.has(theme)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${themeDir}/theme.${theme}.css`;
      link.onload = () => {
        loadedThemes.add(theme);
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
    if (!THEMES.includes(theme) || theme === currentTheme) return;
    currentTheme = theme;

    const kept = root.className
      .split(/\s+/)
      .filter((c) => c && !c.startsWith(THEME_PREFIX));
    kept.push(`${THEME_PREFIX}${theme}`);
    root.className = kept.join(" ");

    loadThemeSheet(theme).then(() => {
      if (theme === currentTheme) applyNeumorph();
    });

    if (imageEl && imageConfig[theme]) {
      const { src, height } = imageConfig[theme];
      imageEl.src = src;
      imageEl.style.height = height;
    }
    localStorage.setItem(THEME_KEY, theme);
    updateDropdownSelection(theme);
  }

  function openDropdown() {
    if (!dropdown) return;
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
    if (labelEl) labelEl.textContent = theme;
    menu.querySelectorAll(".menu-item").forEach((btn) => {
      const is = btn.dataset.value === theme;
      btn.classList.toggle("active", is);
      btn.setAttribute("aria-selected", is ? "true" : "false");
    });
  }

  function buildThemeDropdown() {
    if (!menu) return;
    // derive options from imageConfig but constrain to known THEMES
    const themeKeys = Object.keys(imageConfig).filter((k) =>
      THEMES.includes(k),
    );
    menu.textContent = "";
    themeKeys.forEach((key) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "menu-item";
      btn.textContent = key;
      btn.dataset.value = key;
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", "false");
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        setTheme(key);
        updateDropdownSelection(key);
        closeDropdown();
      });
      menu.appendChild(btn);
    });
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || THEMES[0];
    buildThemeDropdown(); // must come before updating label
    setTheme(saved);
    // wire dropdown toggle
    if (trigger) {
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDropdown();
      });
    }
  }

  function prepareBookmarkTemplate(config) {
    // Build anchor elements once per tab and stash them
    config.forEach((group) => {
      const tabId = String(group.tab);
      const links = Array.isArray(group.links) ? group.links : [];
      const anchors = links.map((ln) => {
        const a = document.createElement("a");
        a.href = ln.url || "#";
        a.textContent = ln.name || ln.url || "";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.setAttribute("data-tab", tabId);
        return a;
      });
      tabLinkElements.set(tabId, anchors);
    });
  }

  function renderTabs() {
    tabContainer.textContent = "";
    const frag = document.createDocumentFragment();
    BOOKMARK_CONFIG.forEach((tabObj) => {
      const tabId = String(tabObj.tab);
      const btn = document.createElement("button");
      btn.type = "button";
      // no dependency on .tab-button for your CSS; extra class is harmless if you keep it, but active is is-active
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

  function getEffectiveColumnCount(tabObj) {
    if (
      tabObj.columns &&
      Number.isInteger(tabObj.columns) &&
      tabObj.columns > 0
    ) {
      return tabObj.columns;
    }
    // fallback defaults
    return tabObj.layout === "row" ? 3 : 4;
  }

  function stabilizeBookmarksHeight() {
    if (!linkContainer || !BOOKMARK_CONFIG.length) return;
    const containerWidth = linkContainer.clientWidth;

    const measurer = document.createElement("div");
    measurer.style.position = "absolute";
    measurer.style.visibility = "hidden";
    measurer.style.top = "0";
    measurer.style.left = "-9999px";
    measurer.style.width = containerWidth + "px";
    document.body.appendChild(measurer);

    let maxContentH = 0;

    BOOKMARK_CONFIG.forEach((tabObj) => {
      const tabId = String(tabObj.tab);
      measurer.textContent = "";
      measurer.className = "";
      const layoutClass =
        tabObj.layout === "row" ? "layout-row" : "layout-column";
      measurer.classList.add(layoutClass);
      measurer.style.setProperty(
        "--col-count",
        getEffectiveColumnCount(tabObj),
      );

      const anchors = tabLinkElements.get(tabId) || [];
      anchors.forEach((a) => {
        const c = a.cloneNode(true);
        c.classList.add("is-visible");
        measurer.appendChild(c);
      });

      // force layout and measure
      const h = measurer.getBoundingClientRect().height;
      if (h > maxContentH) maxContentH = h;
    });

    document.body.removeChild(measurer);

    // account for linkContainer's own padding/border if content-box
    const style = getComputedStyle(linkContainer);
    let extra = 0;
    if (style.boxSizing === "content-box") {
      extra += parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      extra +=
        parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    }
    const finalHeight = Math.ceil(maxContentH + extra);
    linkContainer.style.height = finalHeight + "px";
    linkContainer.style.overflowY = "auto";
  }

  function activateTab(tabId) {
    if (!tabLinkElements.has(String(tabId))) return;
    activeTabId = String(tabId);
    document.documentElement.setAttribute("data-active-tab", activeTabId);
    localStorage.setItem(TAB_KEY, activeTabId);

    // tab button state
    document.querySelectorAll("[data-tab-btn]").forEach((btn) => {
      const is = btn.getAttribute("data-tab-btn") === activeTabId;
      btn.classList.toggle("is-active", is);
      btn.setAttribute("aria-selected", is ? "true" : "false");
    });

    // ensure flex layout; strip legacy grid classes
    linkContainer.classList.add("links");

    // render only active tab links and mark visible
    const anchors = tabLinkElements.get(activeTabId) || [];
    const frag = document.createDocumentFragment();
    for (const a of anchors) {
      const c = a.cloneNode(true);
      c.classList.add("is-visible");
      frag.appendChild(c);
    }
    linkContainer.replaceChildren(frag);
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

  // replace your drawClock with this parts-based version; no offset math anywhere
  function drawClockParts(ctx, { h, m, s, isPM }) {
    const styles = getComputedStyle(document.documentElement);
    const size = ctx.canvas.width;
    const r = size / 2;

    ctx.clearRect(0, 0, size, size);
    // face
    ctx.beginPath();
    ctx.arc(r, r, r - 1, 0, Math.PI * 2);
    ctx.fillStyle = styles.getPropertyValue("--bg-500").trim() || "#f9f9f9";
    ctx.fill();
    const tick = styles.getPropertyValue("--xgray-2").trim() || "#000";
    ctx.strokeStyle = tick;
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(r + Math.cos(a) * (r - 10), r + Math.sin(a) * (r - 10));
      ctx.lineTo(r + Math.cos(a) * (r - 4), r + Math.sin(a) * (r - 4));
      ctx.stroke();
    }

    const hand = styles.getPropertyValue("--xlg-1").trim() || "#000";
    const sec = (
      (isPM
        ? styles.getPropertyValue("--sec-pm") || styles.getPropertyValue("--br")
        : styles.getPropertyValue("--sec-am") ||
          styles.getPropertyValue("--nr")) || "#000"
    ).trim();

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

    prepareBookmarkTemplate(BOOKMARK_CONFIG);
    initTheme();
    initSearchPrompt();
    renderTabs();
    // stabilizeBookmarksHeight();
    initTabs();
    startClocks();
    updateTime(); // initialize immediately
    setInterval(updateTime, 1000);
  });

  const ro = new ResizeObserver(
    debounce(() => {
      // clear previously fixed height so measurement is accurate
      linkContainer.style.height = "";
      // stabilizeBookmarksHeight();
      // reapply current tab so visible links stay
      if (activeTabId) activateTab(activeTabId);
    }, 100),
  );
  if (linkContainer) ro.observe(linkContainer);
})();
