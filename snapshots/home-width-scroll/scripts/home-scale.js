/**
 * Scale the fixed 1512×982 Figma canvas to the Chrome width.
 * Uniform scale (no warp). Full height stays visible — page scrolls if needed.
 */
(function () {
  var FRAME_W = 1512;
  var FRAME_H = 982;

  function updateScale() {
    var canvas = document.querySelector(".design-canvas");
    var wrapper = document.querySelector(".canvas-wrapper");
    if (!canvas || !wrapper) return;

    var scale = window.innerWidth / FRAME_W;
    var scaledH = FRAME_H * scale;

    canvas.style.transform = "scale(" + scale + ")";
    canvas.style.transformOrigin = "top center";
    wrapper.style.height = scaledH + "px";
  }

  window.addEventListener("resize", updateScale);
  updateScale();
})();
