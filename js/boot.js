(function () {
  var t = localStorage.getItem("theme") || "default";
  document.documentElement.classList.add("theme-" + t);
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "css/theme." + t + ".css"; // variables file
  document.head.appendChild(link);
})();
