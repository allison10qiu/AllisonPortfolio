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

    // Force layout, then measure unscaled content height.
    // Prefer scrollHeight; fall back to summing children if needed.
    void canvas.offsetHeight;
    var frameH = canvas.scrollHeight;
    if (!frameH) {
      frameH = canvas.offsetHeight;
    }

    // Absolute canvas can under-report while children are mid-transition;
    // use the tallest signal available.
    var rectH = 0;
    var children = canvas.children;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      var bottom = child.offsetTop + child.offsetHeight;
      if (bottom > rectH) rectH = bottom;
    }
    if (rectH > frameH) frameH = rectH;

    var scale = window.innerWidth / FRAME_W;
    var scaledH = frameH * scale;
    var left = Math.max(0, (window.innerWidth - FRAME_W * scale) / 2);

    canvas.style.transform = "scale(" + scale + ")";
    canvas.style.transformOrigin = "top left";
    canvas.style.left = left + "px";
    wrapper.style.height = Math.ceil(scaledH) + "px";
  }

  window.refreshCaseScale = updateScale;
  window.addEventListener("case-scale:refresh", updateScale);
  window.addEventListener("resize", updateScale);
  window.addEventListener("load", updateScale);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateScale);
  }

  document.querySelectorAll(".bc-canvas img").forEach(function (img) {
    if (!img.complete) img.addEventListener("load", updateScale);
  });

  if (typeof ResizeObserver === "function") {
    var canvasEl = document.querySelector(".bc-canvas");
    if (canvasEl) {
      var ro = new ResizeObserver(function () {
        updateScale();
      });
      ro.observe(canvasEl);
    }
  }

  updateScale();
})();
