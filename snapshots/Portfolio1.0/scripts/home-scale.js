/**
 * Scale the fixed 1512×982 Figma canvas to the viewport width.
 * Uniform scale (no warp). Full height stays visible — page scrolls if needed.
 *
 * Uses transform-origin top-left + explicit left offset so click hit-testing
 * matches the painted stamps (center-origin scale can misalign pointer events).
 */
(function () {
  var FRAME_W = 1512;
  var FRAME_H = 982;

  function updateScale() {
    var canvas = document.querySelector(".design-canvas");
    var wrapper = document.querySelector(".canvas-wrapper");
    if (!canvas || !wrapper) return;

    var scale = window.innerWidth / FRAME_W;
    var scaledW = FRAME_W * scale;
    var scaledH = FRAME_H * scale;
    var left = Math.max(0, (window.innerWidth - scaledW) / 2);

    canvas.style.transform = "scale(" + scale + ")";
    canvas.style.transformOrigin = "top left";
    canvas.style.left = left + "px";
    canvas.style.marginLeft = "0";
    wrapper.style.height = scaledH + "px";
  }

  window.addEventListener("resize", updateScale);
  updateScale();
})();
