/**
 * Scale a fixed 1440-wide Figma case-study canvas to the viewport width.
 * Same approach as home-scale.js — uniform scale, footer edge-to-edge.
 */
(function () {
  var FRAME_W = 1440;

  function updateScale() {
    var canvas = document.querySelector(".bc-canvas");
    var wrapper = document.querySelector(".bc-canvas-wrapper");
    if (!canvas || !wrapper) return;

    // offsetHeight is pre-transform (layout size = Figma 1440 layout)
    var frameH = canvas.scrollHeight || canvas.offsetHeight;
    var scale = window.innerWidth / FRAME_W;
    var scaledH = frameH * scale;
    var left = Math.max(0, (window.innerWidth - FRAME_W * scale) / 2);

    canvas.style.transform = "scale(" + scale + ")";
    canvas.style.transformOrigin = "top left";
    canvas.style.left = left + "px";
    wrapper.style.height = scaledH + "px";
  }

  window.addEventListener("resize", updateScale);
  window.addEventListener("load", updateScale);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateScale);
  }

  document.querySelectorAll(".bc-canvas img").forEach(function (img) {
    if (!img.complete) img.addEventListener("load", updateScale);
  });

  updateScale();
})();
