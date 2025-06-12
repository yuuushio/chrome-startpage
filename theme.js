const themes = [
  "solarized-dark",
  "solarized-light",
  "monokai",
  "dracula",
];

const root = document.documentElement;
const selector = document.getElementById("theme-selector");

function setTheme(name) {
  for (const t of themes) root.classList.remove(`theme-${t}`);
  root.classList.add(`theme-${name}`);
  localStorage.setItem("theme", name);
}

const saved = localStorage.getItem("theme");
if (saved && themes.includes(saved)) {
  selector.value = saved;
  setTheme(saved);
}

selector.addEventListener("change", e => setTheme(e.target.value));
