(function () {
  var t = localStorage.getItem("theme") || "default";
  document.documentElement.classList.add("theme-" + t);
  // make the theme stylesheet render-blocking to avoid any white flash
  document.write('<link rel="stylesheet" href="css/theme.' + t + '.css">');
})();
