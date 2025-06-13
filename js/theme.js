(() => {
  'use strict';

  // === Theme Switching ===
  const THEME_STORAGE_KEY = 'theme';
  const THEMES = ['default', 'solarized-dark'];
  const themeDir = 'css/';
  const loadedThemes = new Set();
  const root = document.documentElement;
  const themeSelector = document.getElementById('theme-selector');

  function loadThemeCSS(theme) {
    return new Promise((resolve, reject) => {
      if (loadedThemes.has(theme)) return resolve();

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${themeDir}/theme.${theme}.css`;
      link.onload = () => {
        loadedThemes.add(theme);
        resolve();
      };
      link.onerror = () => reject(new Error(`Failed to load theme: ${theme}`));
      document.head.appendChild(link);
    });
  }

  function setTheme(theme) {
    if (!THEMES.includes(theme)) return;

    THEMES.forEach(t => root.classList.remove(`theme-${t}`));
    root.classList.add(`theme-${theme}`);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  async function applyTheme(theme) {
    try {
      await loadThemeCSS(theme);
      setTheme(theme);
    } catch (err) {
      console.error(`[theme] ${err.message}`);
    }
  }

  function initThemeSwitcher() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const initial = THEMES.includes(saved) ? saved : THEMES[0];

    applyTheme(initial);
    if (themeSelector) themeSelector.value = initial;

    themeSelector?.addEventListener('change', e => {
      applyTheme(e.target.value);
    });
  }

  // === Tab Switching ===
  const TAB_STORAGE_KEY = 'activeTab';
  const tabButtons = document.querySelectorAll('[data-tab-btn]');

  function activateTab(tabId) {
    root.setAttribute('data-active-tab', tabId);
    localStorage.setItem(TAB_STORAGE_KEY, tabId);

    tabButtons.forEach(btn => {
      const match = btn.getAttribute('data-tab-btn') === tabId;
      btn.setAttribute('aria-selected', match);
    });
  }

  function initTabs() {
    const saved = localStorage.getItem(TAB_STORAGE_KEY) || '1';
    activateTab(saved);

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab-btn');
        activateTab(tabId);
      });
    });
  }

  // === Init ===
  document.addEventListener('DOMContentLoaded', () => {
    initThemeSwitcher();
    initTabs();
  });
})();
