/**
 * Theme Manager
 * Handles dynamic theme switching via CSS custom properties and class toggling.
 * Themes must be defined in CSS using `.theme-{name}` with `--bg`, `--fg`, etc.
 */

(function () {
  'use strict';

  const THEME_STORAGE_KEY = 'theme';
  const AVAILABLE_THEMES = [
    'solarized-dark',
    'solarized-light',
    'monokai',
    'dracula',
    // Add new themes here
  ];

  const rootElement = document.documentElement;
  const themeSelector = document.getElementById('theme-selector');

  /**
   * Sets the given theme by applying the corresponding class to <html>.
   * Also persists the choice in localStorage.
   * @param {string} themeName - Name of the theme to activate
   */
  function setTheme(themeName) {
    if (!AVAILABLE_THEMES.includes(themeName)) return;

    // Remove any existing theme class
    AVAILABLE_THEMES.forEach(name => {
      rootElement.classList.remove(`theme-${name}`);
    });

    rootElement.classList.add(`theme-${themeName}`);
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
  }

  /**
   * Initializes the theme system.
   * Applies saved theme if present, otherwise leaves default.
   * Hooks the dropdown selector to live-update the theme.
   */
  function initThemeSwitcher() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme && AVAILABLE_THEMES.includes(savedTheme)) {
      setTheme(savedTheme);
      themeSelector.value = savedTheme;
    }

    themeSelector.addEventListener('change', (event) => {
      const selectedTheme = event.target.value;
      setTheme(selectedTheme);
    });
  }

  // Entry point
  document.addEventListener('DOMContentLoaded', initThemeSwitcher);
})();
