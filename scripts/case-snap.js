/**
 * Snap-scroll to in-page anchors (same easing as home-snap.js).
 * Used by "Jump to Final Product" → #solution on case study pages.
 */
(function () {
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var animating = false;
  var root = document.documentElement;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function snapTo(targetY, duration) {
    if (animating) return;
    animating = true;
    var prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    var startY = window.scrollY;
    var dist = targetY - startY;
    var start = null;
    duration = duration || 900;

    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / duration);
      window.scrollTo(0, startY + dist * easeInOutCubic(t));
      if (t < 1) {
        window.requestAnimationFrame(step);
      } else {
        root.style.scrollBehavior = prevBehavior;
        animating = false;
      }
    }
    window.requestAnimationFrame(step);
  }

  function targetTop(id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    var rect = el.getBoundingClientRect();
    return Math.max(0, window.scrollY + rect.top);
  }

  document.querySelectorAll('a[href="#solution"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      if (REDUCE) {
        var el = document.getElementById("solution");
        if (el) el.scrollIntoView();
        return;
      }
      snapTo(targetTop("solution"), 1000);
      if (history.replaceState) {
        history.replaceState(null, "", "#solution");
      }
    });
  });
})();
