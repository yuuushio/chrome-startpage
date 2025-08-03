(() => {
  "use strict";

  const root = document.documentElement;
  const themeSelector = document.getElementById("theme-selector");
  const tabContainer = document.getElementById("tab-buttons");
  const linkContainer = document.getElementById("tab-links");
  const bookmarkData = document.getElementById("bookmark-data");

  const THEMES = ["default", "solarized-dark", "gruvbox"];
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

  function setTheme(theme) {
    if (!THEMES.includes(theme) || theme === currentTheme) return;

    currentTheme = theme;

    THEMES.forEach((t) => root.classList.remove(`theme-${t}`));
    root.className = `theme-${theme}`;
    // root.classList.add(`theme-${theme}`);

    // applyNeumorphColours();
    // loadThemeCSS(theme).then(applyNeumorphColours);
    loadThemeSheet(theme).then(() => {
      //  order enforced here
      if (theme === currentTheme) applyNeumorph(); //  ignore stale loads
    });

    if (imageEl && imageConfig[theme]) {
      const { src, height } = imageConfig[theme];
      imageEl.src = src;
      imageEl.style.height = height;
    }
    localStorage.setItem(THEME_KEY, theme);
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || THEMES[0];
    const selector = document.getElementById("theme-selector");
    selector.value = saved;
    // loadThemeSheet(saved);
    setTheme(saved);
    // if (themeSelector) themeSelector.value = saved;
    selector.addEventListener("change", (e) => {
      const theme = e.target.value;
      loadThemeSheet(theme);
      setTheme(theme);
    });
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
    // ensure current width is captured
    const containerWidth = linkContainer.clientWidth;

    // create a single offscreen measurer
    const measurer = document.createElement("div");
    // copy any classes that affect width/typography if needed; we only need layout classes per tab later
    measurer.style.position = "absolute";
    measurer.style.visibility = "hidden";
    measurer.style.top = "0";
    measurer.style.left = "-9999px";
    measurer.style.width = containerWidth + "px";
    // ensure it uses same font/inheritance
    document.body.appendChild(measurer);

    let maxH = 0;

    BOOKMARK_CONFIG.forEach((tabObj) => {
      const tabId = String(tabObj.tab);
      measurer.textContent = ""; // clear previous
      // apply layout like in activateTab
      measurer.className = ""; // reset
      const layoutClass =
        tabObj.layout === "row" ? "layout-row" : "layout-column";
      measurer.classList.add(layoutClass);
      if (
        tabObj.columns &&
        Number.isInteger(tabObj.columns) &&
        tabObj.columns > 0
      ) {
        measurer.style.setProperty("--col-count", tabObj.columns);
      } else {
        measurer.style.removeProperty("--col-count");
      }
      // inject clones of that tab's anchors
      const anchors = tabLinkElements.get(tabId) || [];
      anchors.forEach((a) => {
        const c = a.cloneNode(true);
        c.classList.add("is-visible"); // match visibility rules if your CSS relies on it
        measurer.appendChild(c);
      });
      // force style recalc before measuring
      const h = measurer.getBoundingClientRect().height;
      if (h > maxH) maxH = h;
    });

    document.body.removeChild(measurer);
    if (maxH > 0) {
      linkContainer.style.height = Math.ceil(maxH) + "px";
      linkContainer.style.overflowY = "auto"; // optional: prevent overflow if content slightly grows
    }
  }

  function activateTab(tabId) {
    if (!tabLinkElements.has(String(tabId))) return;
    activeTabId = String(tabId);
    root.setAttribute("data-active-tab", activeTabId);
    localStorage.setItem(TAB_KEY, activeTabId);

    // buttons: toggle is-active
    document.querySelectorAll("[data-tab-btn]").forEach((btn) => {
      const is = btn.getAttribute("data-tab-btn") === activeTabId;
      btn.classList.toggle("is-active", is);
      btn.setAttribute("aria-selected", is ? "true" : "false");
    });

    // links: rebuild container according to layout
    const tabObj = BOOKMARK_CONFIG.find((t) => String(t.tab) === activeTabId);
    if (!tabObj) return;

    // layout handling (your CSS currently doesn’t define layout-row/column; safe to leave or add later)
    linkContainer.classList.remove("layout-row", "layout-column");
    const layout = tabObj.layout === "row" ? "layout-row" : "layout-column";
    linkContainer.classList.add(layout);

    const colCount = getEffectiveColumnCount(tabObj);
    linkContainer.style.setProperty("--col-count", colCount);

    // replace children and mark visible
    const anchors = tabLinkElements.get(activeTabId) || [];
    const clones = anchors.map((a) => {
      const c = a.cloneNode(true);
      c.classList.add("is-visible"); // THIS is required for your CSS to show it
      return c;
    });
    linkContainer.replaceChildren(...clones);
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

  function drawClock(ctx, tzOffsetMinutes) {
    const styles = getComputedStyle(document.documentElement);

    const now = new Date(Date.now() + tzOffsetMinutes * 60 * 60 * 1000);
    const sec = now.getUTCSeconds();
    const min = now.getUTCMinutes();
    const hr = now.getUTCHours() % 12;

    const size = ctx.canvas.width;

    const radius = size / 2;
    ctx.clearRect(0, 0, size, size);

    // Clock face
    ctx.beginPath();
    ctx.arc(radius, radius, radius - 1, 0, 2 * Math.PI);
    ctx.fillStyle = styles.getPropertyValue("--dark2").trim() || "#f9f9f9";
    ctx.fill();
    const timeTicksColor = styles.getPropertyValue("--base03").trim() || "#000";
    const handColor = styles.getPropertyValue("--base04").trim() || "#000";

    const secStrokeColor = styles.getPropertyValue("--p1").trim() || "#000";
    ctx.strokeStyle = timeTicksColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tick marks
    ctx.strokeStyle = timeTicksColor;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const x1 = radius + Math.cos(angle) * (radius - 10);
      const y1 = radius + Math.sin(angle) * (radius - 10);
      const x2 = radius + Math.cos(angle) * (radius - 4);
      const y2 = radius + Math.sin(angle) * (radius - 4);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    const toAngle = (unit, max) => (Math.PI * 2 * unit) / max - Math.PI / 2;

    const drawHand = (angle, length, width, color) => {
      ctx.beginPath();
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.strokeStyle = color;
      ctx.moveTo(radius, radius);
      ctx.lineTo(
        radius + Math.cos(angle) * length,
        radius + Math.sin(angle) * length,
      );
      ctx.stroke();
    };

    drawHand(toAngle(hr + min / 60, 12), radius * 0.5, 4, handColor);
    drawHand(toAngle(min + sec / 60, 60), radius * 0.7, 3, handColor);
    drawHand(toAngle(sec, 60), radius * 0.8, 1, secStrokeColor);
  }

  function startClocks() {
    const tzMap = JSON.parse(
      document.getElementById("timezone-config").textContent,
    );

    const config = getTimezonesConfig();
    // const sidebar = document.querySelector('.sidebar-top');
    const sidebar = document.querySelector(".clock-container");
    if (!sidebar) return;

    const clocks = [];

    Object.entries(config).forEach(([key, enabled]) => {
      if (!enabled || !tzMap[key]) return;
      const { container, canvas } = createClockCanvas(key, tzMap[key].label);
      sidebar.appendChild(container);
      const ctx = canvas.getContext("2d");
      clocks.push({ ctx, offset: tzMap[key].offset });
    });

    function tick() {
      clocks.forEach((c) => drawClock(c.ctx, c.offset));
      requestAnimationFrame(tick);
    }

    tick();
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
    renderTabs();
    stabilizeBookmarksHeight();
    initTabs();
    startClocks();
    updateTime(); // initialize immediately
    setInterval(updateTime, 1000);
  });

  const ro = new ResizeObserver(
    debounce(() => {
      // clear previously fixed height so measurement is accurate
      linkContainer.style.height = "";
      stabilizeBookmarksHeight();
      // reapply current tab so visible links stay
      if (activeTabId) activateTab(activeTabId);
    }, 100),
  );
  if (linkContainer) ro.observe(linkContainer);
})();
