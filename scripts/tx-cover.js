/**
 * Places the project image on #tx-cover before the rest of the page paints.
 * A card arrival keeps the image at the rectangle it had on the homepage.
 * The shrink back home still uses the saved stage layout. Paths are public
 * /assets/ URLs only, never protected content.
 */
(function () {
  var root = document.documentElement;
  var cover = document.getElementById("tx-cover");
  if (!cover) return;

  function read(key) {
    try {
      return JSON.parse(sessionStorage.getItem(key) || "");
    } catch (err) {
      return null;
    }
  }

  function place(node, src, left, top, width, height) {
    node.alt = "";
    node.src = src;
    node.style.position = "absolute";
    node.style.objectFit = "contain";
    node.style.maxWidth = "none";
    node.style.left = left;
    node.style.top = top;
    node.style.width = width;
    node.style.height = height;
    node.style.zIndex = "1";
    node.style.filter = "drop-shadow(0 18px 28px rgba(20, 36, 59, 0.16))";
    cover.appendChild(node);
  }

  if (root.classList.contains("tx-in")) {
    var flight = read("tx-flight");
    if (!flight || !flight.images || !flight.images.length) return;
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    var images = [];
    flight.images.forEach(function (img) {
      if (!img || typeof img.src !== "string") return;
      if (img.src.indexOf("/assets/") !== 0 || img.src.indexOf("..") !== -1) return;
      var x = +img.x;
      var y = +img.y;
      var w = +img.w;
      var h = +img.h;
      if (![x, y, w, h].every(function (n) { return isFinite(n); })) return;
      if (w < 8 || h < 8 || x < -400 || y < -400 || x > 4000 || y > 4000) return;
      images.push({ src: img.src, x: x, y: y, w: w, h: h });
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });
    if (!images.length) return;
    var boxW = maxX - minX;
    var boxH = maxY - minY;
    var stage = flight.stage;
    if (stage && isFinite(+stage.x) && isFinite(+stage.w) && +stage.w > 8 && +stage.h > 8) {
      var panel = document.createElement("div");
      panel.className = "tx-panel";
      panel.style.position = "absolute";
      panel.style.left = ((+stage.x - minX) / boxW) * 100 + "%";
      panel.style.top = ((+stage.y - minY) / boxH) * 100 + "%";
      panel.style.width = (+stage.w / boxW) * 100 + "%";
      panel.style.height = (+stage.h / boxH) * 100 + "%";
      panel.style.borderRadius = "14px";
      panel.style.background = "linear-gradient(180deg, #f1f4f7 0%, #e9edf1 100%)";
      panel.style.boxShadow = "inset 0 0 0 1px rgba(20, 36, 59, 0.05)";
      cover.appendChild(panel);
    }
    images.forEach(function (img) {
      var node = document.createElement("img");
      place(
        node,
        img.src,
        ((img.x - minX) / boxW) * 100 + "%",
        ((img.y - minY) / boxH) * 100 + "%",
        (img.w / boxW) * 100 + "%",
        (img.h / boxH) * 100 + "%"
      );
    });
    cover.style.display = "block";
    cover.style.left = minX + "px";
    cover.style.top = minY + "px";
    cover.style.width = boxW + "px";
    cover.style.height = boxH + "px";
    cover.style.borderRadius = "0px";
    cover.style.background = "transparent";
    cover.style.boxShadow = "none";
    cover.style.overflow = "visible";
    return;
  }

  if (!root.classList.contains("tx-back")) return;
  var shot = read("tx-shot");
  if (!shot || !shot.images || !shot.images.length) return;
  var placed = 0;
  shot.images.forEach(function (img) {
    if (!img || typeof img.src !== "string") return;
    if (img.src.indexOf("/assets/") !== 0 || img.src.indexOf("..") !== -1) return;
    var left = +img.l;
    var top = +img.t;
    var width = +img.w;
    var height = +img.h;
    if (![left, top, width, height].every(function (n) { return isFinite(n) && n > -5 && n < 140; })) return;
    if (width < 1 || height < 1) return;
    var node = document.createElement("img");
    place(node, img.src, left + "%", top + "%", width + "%", height + "%");
    placed += 1;
  });
  if (!placed) return;
  cover.style.display = "block";
  cover.style.left = "0px";
  cover.style.top = "0px";
  cover.style.width = "100%";
  cover.style.height = "100%";
  cover.style.borderRadius = "0px";
})();
