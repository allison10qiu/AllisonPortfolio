/**
 * Scale the fixed 1440×2694.4 Figma home canvas to the viewport width.
 * Uniform scale (no warp). Full height stays visible — page scrolls if needed.
 *
 * Uses transform-origin top-left + explicit left offset so click hit-testing
 * matches the painted hotspots.
 */
(function () {
  var FRAME_W = 1440;
  var FRAME_H = 2694.4;

  function updateScale() {
    var canvas = document.querySelector(".design-canvas");
    var wrapper = document.querySelector(".canvas-wrapper");
    if (!canvas || !wrapper) return;

    var scale = window.innerWidth / FRAME_W;
    var scaledW = FRAME_W * scale;
    var scaledH = FRAME_H * scale;
    var left = Math.max(0, (window.innerWidth - scaledW) / 2);

    canvas.style.height = FRAME_H + "px";
    canvas.style.transform = "scale(" + scale + ")";
    canvas.style.transformOrigin = "top left";
    canvas.style.left = left + "px";
    canvas.style.marginLeft = "0";
    wrapper.style.height = scaledH + "px";
  }

  window.addEventListener("resize", updateScale);
  updateScale();
})();
