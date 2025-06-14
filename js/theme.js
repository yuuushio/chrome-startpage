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

function drawClock(context, radius, offsetHours = 0) {
  context.clearRect(0, 0, radius * 2, radius * 2);

  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const local = new Date(utc + offsetHours * 3600000);

  const sec = local.getSeconds();
  const min = local.getMinutes();
  const hr = local.getHours() % 12;

  // clock face
  context.beginPath();
  context.arc(radius, radius, radius - 1, 0, 2 * Math.PI);
  context.fillStyle = '#f9f9f9';
  context.fill();
  context.strokeStyle = '#000';
  context.lineWidth = 2;
  context.stroke();

  // tick marks
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const x1 = radius + Math.cos(angle) * (radius - 10);
    const y1 = radius + Math.sin(angle) * (radius - 10);
    const x2 = radius + Math.cos(angle) * (radius - 4);
    const y2 = radius + Math.sin(angle) * (radius - 4);
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }

  // hands
  const toAngle = (unit, max) => (Math.PI * 2 * unit) / max - Math.PI / 2;

  const drawHand = (angle, length, width) => {
    context.beginPath();
    context.lineWidth = width;
    context.lineCap = 'round';
    context.moveTo(radius, radius);
    context.lineTo(
      radius + Math.cos(angle) * length,
      radius + Math.sin(angle) * length
    );
    context.stroke();
  };

  drawHand(toAngle(hr + min / 60, 12), radius * 0.5, 4);
  drawHand(toAngle(min + sec / 60, 60), radius * 0.7, 3);
  drawHand(toAngle(sec, 60), radius * 0.8, 1);
}

function initAnalogClock() {
  const canvas = document.getElementById('clock-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const radius = canvas.width / 2;

  // draw immediately, then every second
  drawClock(ctx, radius);
  setInterval(() => drawClock(ctx, radius), 1000);
}

  document.addEventListener('DOMContentLoaded', () => {
    const data = JSON.parse(bookmarkData.textContent);
    renderBookmarks(data);
    initTabs();
    initTheme();
        initAnalogClock();
  });
})();
