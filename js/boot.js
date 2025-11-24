(function () {
  var key = localStorage.getItem("theme") || "default";
  var href = "css/theme." + key + ".css";

  try {
    var raw = document.getElementById("themes-config");
    if (raw) {
      var list = JSON.parse(raw.textContent);
      var rec =
        Array.isArray(list) &&
        list.find(function (t) {
          return t.key === key;
        });
      if (rec && rec.href) href = rec.href;
    }
  } catch (_) {
    // ignore and use convention
  }

  document.documentElement.classList.add("theme-" + key);
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
})();
