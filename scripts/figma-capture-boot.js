/* Local capture switch. No effect unless the URL includes ?figma=1. */
(function () {
  try {
    if (new URLSearchParams(location.search).get("figma") !== "1") return;
    var root = document.documentElement;
    root.classList.add("figma-capture");
    root.classList.remove("tx-in", "tx-back", "tx-fade");
    delete root.dataset.txFrom;
    delete root.dataset.txBack;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/styles/figma-capture.css";
    document.head.appendChild(link);
  } catch (e) {}
})();
