(() => {
  'use strict';

  const root = document.documentElement;
  const themeSelector = document.getElementById('theme-selector');
  const tabContainer = document.getElementById('tab-buttons');
  const linkContainer = document.getElementById('tab-links');
  const bookmarkData = document.getElementById('bookmark-data');

  const THEMES = ['default', 'solarized-dark'];
  const THEME_KEY = 'theme';
  const TAB_KEY = 'activeTab';
  const themeDir = 'css/';
  const imageConfig = JSON.parse(document.getElementById('theme-image-map').textContent);
const imageEl = document.getElementById('theme-image');
  const loadedThemes = new Set();
  let TAB_LIST = [];

  function loadThemeCSS(theme) {
    if (loadedThemes.has(theme)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${themeDir}/theme.${theme}.css`;
    link.onload = () => loadedThemes.add(theme);
    document.head.appendChild(link);
  }

  function setTheme(theme) {
    if (!THEMES.includes(theme)) return;
    THEMES.forEach(t => root.classList.remove(`theme-${t}`));
    root.classList.add(`theme-${theme}`);

if (imageEl && imageConfig[theme]) {
  const { src, height } = imageConfig[theme];
  imageEl.src = src;
  imageEl.style.height = height;
}
    localStorage.setItem(THEME_KEY, theme);
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || THEMES[0];
    loadThemeCSS(saved);
    setTheme(saved);
    if (themeSelector) themeSelector.value = saved;
    themeSelector?.addEventListener('change', e => {
      const theme = e.target.value;
      loadThemeCSS(theme);
      setTheme(theme);
    });
  }

  function renderBookmarks(json) {
    const tabs = [], links = [];
    TAB_LIST = [];

    json.forEach(group => {
      const tab = group.tab;
      TAB_LIST.push(tab);
      tabs.push(`<button data-tab-btn="${tab}" role="tab" aria-selected="false">${group.label}</button>`);
      group.links.forEach(link =>
        links.push(`<a href="${link.url}" data-tab="${tab}" rel="noopener noreferrer">${link.name}</a>`)
      );
    });

    tabContainer.innerHTML = tabs.join('');
    linkContainer.innerHTML = links.join('');
  }

function activateTab(tab) {
  root.setAttribute('data-active-tab', tab);
  localStorage.setItem(TAB_KEY, tab);

  document.querySelectorAll('[data-tab-btn]').forEach(btn => {
    btn.classList.toggle('is-active', btn.getAttribute('data-tab-btn') === tab);
  });

  document.querySelectorAll('.links a').forEach(link => {
    const match = link.getAttribute('data-tab') === tab;
    link.classList.toggle('is-visible', match);
  });
}

  function initTabs() {
    const saved = localStorage.getItem(TAB_KEY);
    const fallback = TAB_LIST[0] || '1';
    const active = TAB_LIST.includes(saved) ? saved : fallback;
    activateTab(active);
    document.querySelectorAll('[data-tab-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        activateTab(btn.getAttribute('data-tab-btn'));
      });
    });
  }

function getTimezonesConfig() {
  const configEl = document.getElementById('timezone-config');
  if (!configEl) return {};
  try {
    return JSON.parse(configEl.textContent);
  } catch (e) {
    console.error('[clock] invalid timezone config');
    return {};
  }
}

function createClockCanvas(id, label) {
  const container = document.createElement('div');
  container.className = 'clock-block';

  const canvas = document.createElement('canvas');
  canvas.id = `clock-${id}`;
  canvas.width = 90;
  canvas.height = 90;

  const caption = document.createElement('div');
  caption.className = 'clock-label';
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

const radius = size/2;
  ctx.clearRect(0, 0, size, size);

  // Clock face
  ctx.beginPath();
  ctx.arc(radius, radius, radius - 1, 0, 2 * Math.PI);
  ctx.fillStyle = styles.getPropertyValue('--base00').trim() || '#f9f9f9';
  ctx.fill();
        const timeTicksColor = styles.getPropertyValue('--base03').trim() || '#000';
        const handColor = styles.getPropertyValue('--base04').trim() || '#000';

        const secStrokeColor = styles.getPropertyValue('--p1').trim() || '#000';
  ctx.strokeStyle = timeTicksColor
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
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.moveTo(radius, radius);
    ctx.lineTo(
      radius + Math.cos(angle) * length,
      radius + Math.sin(angle) * length
    );
    ctx.stroke();
  };

  drawHand(toAngle(hr + min / 60, 12), radius * 0.5, 4, handColor);
  drawHand(toAngle(min + sec / 60, 60), radius * 0.7, 3, handColor);
  drawHand(toAngle(sec, 60), radius * 0.8, 1, secStrokeColor);
}

function startClocks() {

const tzMap = JSON.parse(document.getElementById('timezone-config').textContent);

  const config = getTimezonesConfig();
  // const sidebar = document.querySelector('.sidebar-top');
  const sidebar = document.querySelector('.clock-container');
  if (!sidebar) return;

  const clocks = [];

  Object.entries(config).forEach(([key, enabled]) => {
    if (!enabled || !tzMap[key]) return;
    const { container, canvas } = createClockCanvas(key, tzMap[key].label);
    sidebar.appendChild(container);
    const ctx = canvas.getContext('2d');
    clocks.push({ ctx, offset: tzMap[key].offset });
  });

  function tick() {
    clocks.forEach(c => drawClock(c.ctx, c.offset));
    requestAnimationFrame(tick);
  }

  tick();
}

  document.addEventListener('DOMContentLoaded', () => {
    const data = JSON.parse(bookmarkData.textContent);
    renderBookmarks(data);
    initTabs();
    initTheme();
        startClocks();
  });
})();
