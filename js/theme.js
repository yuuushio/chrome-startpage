(function () {
  'use strict';

  const THEME_STORAGE_KEY = 'theme';
  const THEMES = [
    'default',
    'solarized-dark',
  ];

  const themeSelector = document.getElementById('theme-selector');
  const root = document.documentElement;
  const themeDir = 'css/';
  const loadedThemes = new Set();

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
    } catch (e) {
      console.error(e);
    }
  }

  function initThemeSwitcher() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const initial = THEMES.includes(saved) ? saved : THEMES[0];
    applyTheme(initial);
    themeSelector.value = initial;

    themeSelector.addEventListener('change', e => {
      applyTheme(e.target.value);
    });
  }

  document.addEventListener('DOMContentLoaded', initThemeSwitcher);
})();

(function () {
  'use strict';

  const root = document.documentElement;
  const buttons = document.querySelectorAll('[data-tab-btn]');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab-btn');
      root.setAttribute('data-active-tab', tab);
      localStorage.setItem('activeTab', tab);
    });
  });

  // restore saved tab
  const saved = localStorage.getItem('activeTab');
  if (saved) root.setAttribute('data-active-tab', saved);
  else root.setAttribute('data-active-tab', '1'); // default
})();
