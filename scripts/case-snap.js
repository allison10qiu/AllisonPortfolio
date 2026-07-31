/**
 * Snap-scroll to in-page anchors (same easing as home-snap.js).
 * Used by "Jump to Final Product" → #solution on case study pages.
 *
 * Case pages scroll on body.bc-page (html overflow is hidden), not window.
 * Content lives on a transform-scaled 1440 canvas, so targets must be
 * computed in design px then multiplied by scale (same as home-snap).
 */
(function () {
  var FRAME_W = 1440;
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var animating = false;

  function scrollRoot() {
    // Always prefer the case-study scrollport when present.
    var page = document.querySelector("body.bc-page");
    if (page) return page;
    return document.scrollingElement || document.documentElement;
  }

  function canvasScale() {
    var canvas = document.querySelector(".bc-canvas");
    if (canvas) {
      var t = window.getComputedStyle(canvas).transform;
      if (t && t !== "none") {
        var m = t.match(/matrix\(([^,]+)/);
        if (m) {
          var s = parseFloat(m[1]);
          if (s && isFinite(s)) return s;
        }
      }
    }
    return window.innerWidth / FRAME_W;
  }

  /** Design-px Y of el relative to .bc-canvas (unscaled). */
  function designOffsetTop(el) {
    var canvas = document.querySelector(".bc-canvas");
    if (!canvas) return el.offsetTop || 0;

    var y = 0;
    var node = el;
    while (node && node !== canvas) {
      y += node.offsetTop;
      node = node.offsetParent;
    }
    if (node === canvas) return y;

    // Fallback when offsetParent chain leaves the canvas (rare).
    var er = el.getBoundingClientRect();
    var cr = canvas.getBoundingClientRect();
    var scale = canvasScale();
    return scale ? (er.top - cr.top) / scale : er.top - cr.top;
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function snapTo(targetY, duration) {
    if (animating) return;
    animating = true;
    var root = scrollRoot();
    var html = document.documentElement;
    var prevRoot = root.style.scrollBehavior;
    var prevHtml = html.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    html.style.scrollBehavior = "auto";

    var startY = root.scrollTop;
    var maxY = Math.max(0, root.scrollHeight - root.clientHeight);
    targetY = Math.max(0, Math.min(targetY, maxY));
    var dist = targetY - startY;
    var start = null;
    duration = duration || 900;

    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / duration);
      root.scrollTop = startY + dist * easeInOutCubic(t);
      if (t < 1) {
        window.requestAnimationFrame(step);
      } else {
        root.scrollTop = targetY;
        root.style.scrollBehavior = prevRoot;
        html.style.scrollBehavior = prevHtml;
        animating = false;
      }
    }
    window.requestAnimationFrame(step);
  }

  function targetTop(id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    var scale = canvasScale();
    var margin = 0;
    try {
      margin = parseFloat(window.getComputedStyle(el).scrollMarginTop) || 0;
    } catch (e) {}
    return Math.max(0, designOffsetTop(el) * scale - margin);
  }

  function jumpToSolution(e) {
    if (e) e.preventDefault();
    if (REDUCE) {
      var el = document.getElementById("solution");
      var root = scrollRoot();
      if (el && root) {
        root.style.scrollBehavior = "auto";
        root.scrollTop = targetTop("solution");
      } else if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
      }
      return;
    }
    snapTo(targetTop("solution"), 1000);
    if (history.replaceState) {
      history.replaceState(null, "", "#solution");
    }
  }

  document.querySelectorAll('a[href="#solution"]').forEach(function (link) {
    link.addEventListener("click", jumpToSolution);
  });

  // Direct load / refresh with #solution
  if (location.hash === "#solution") {
    window.addEventListener("load", function () {
      jumpToSolution();
    });
  }
})();
