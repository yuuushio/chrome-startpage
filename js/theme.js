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

  document.addEventListener('DOMContentLoaded', () => {
    const data = JSON.parse(bookmarkData.textContent);
    renderBookmarks(data);
    initTabs();
    initTheme();
  });
})();
