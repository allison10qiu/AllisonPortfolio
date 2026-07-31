/**
 * Snap scroll between the landing frame and My Work (MakeReign-style).
 *
 * One gesture in the hero zone animates the scroll the whole way, which
 * plays the page-turn (home-turn.js is scroll-driven). Scrolling up from
 * the top of the work section snaps back to the hero. Below that
 * boundary the page scrolls normally.
 *
 * In-page "work" links scroll without adding # to the URL. Bookmarked
 * /#my-work still scrolls, then the hash is cleared via replaceState.
 */
(function () {
  var FRAME_W = 1440;
  var WORK_TOP = 812; // design px — page turn completes here
  var SCROLL_KEY = "aq-scroll-to";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var animating = false;
  var root = document.documentElement;

  function workTopPx() {
    return WORK_TOP * (window.innerWidth / FRAME_W);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function clearHashFromUrl() {
    if (!location.hash) return;
    if (history.replaceState) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function snapTo(targetY, duration) {
    if (reduceMotion) {
      window.scrollTo(0, targetY);
      return;
    }
    if (animating) return;
    animating = true;
    var prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto"; // rAF drives the motion, not CSS
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

  function scrollToWork(duration) {
    var el = document.getElementById("my-work");
    if (el && reduceMotion) {
      el.scrollIntoView({ behavior: "auto", block: "start" });
      return;
    }
    snapTo(workTopPx(), duration);
  }

  function consumeScrollIntent() {
    var fromHash = location.hash === "#my-work";
    var fromStore = false;
    try {
      fromStore = sessionStorage.getItem(SCROLL_KEY) === "my-work";
      if (fromStore) sessionStorage.removeItem(SCROLL_KEY);
    } catch (err) {}

    if (!fromHash && !fromStore) return;

    scrollToWork(reduceMotion ? 0 : 700);
    clearHashFromUrl();
  }

  window.addEventListener("load", consumeScrollIntent);
  window.addEventListener("hashchange", function () {
    if (location.hash === "#my-work") {
      scrollToWork(reduceMotion ? 0 : 700);
      clearHashFromUrl();
    }
  });

  // Same-page work ribbon / data-scroll-to — never leave a hash in the URL
  function bindWorkLinks() {
    document
      .querySelectorAll('a[href="#my-work"], a[data-scroll-to="my-work"]')
      .forEach(function (link) {
        link.addEventListener("click", function (e) {
          if (!document.getElementById("my-work")) return;
          e.preventDefault();
          scrollToWork();
          clearHashFromUrl();
        });
      });
  }
  bindWorkLinks();

  if (reduceMotion) return;

  window.addEventListener(
    "wheel",
    function (e) {
      if (e.ctrlKey) return; // pinch zoom
      if (animating) {
        e.preventDefault();
        return;
      }
      var wt = workTopPx();
      var y = window.scrollY;
      if (y < wt - 1) {
        // Hero zone — a single gesture commits to one side
        e.preventDefault();
        if (e.deltaY > 8) snapTo(wt);
        else if (e.deltaY < -8) snapTo(0, 700);
      } else if (y <= wt + 2 && e.deltaY < -8) {
        // At the top of the work section, scrolling up returns to the hero
        e.preventDefault();
        snapTo(0);
      }
    },
    { passive: false }
  );

  var touchY = null;
  window.addEventListener(
    "touchstart",
    function (e) {
      touchY = e.touches[0].clientY;
    },
    { passive: true }
  );
  window.addEventListener(
    "touchmove",
    function (e) {
      if (touchY === null) return;
      if (animating) {
        e.preventDefault();
        return;
      }
      var wt = workTopPx();
      var y = window.scrollY;
      var dy = touchY - e.touches[0].clientY; // >0 means scrolling down
      if (y < wt - 1) {
        e.preventDefault();
        if (dy > 12) {
          snapTo(wt);
          touchY = null;
        } else if (dy < -12) {
          snapTo(0, 700);
          touchY = null;
        }
      } else if (y <= wt + 2 && dy < -12) {
        e.preventDefault();
        snapTo(0);
        touchY = null;
      }
    },
    { passive: false }
  );

  window.addEventListener("keydown", function (e) {
    if (animating) return;
    var down = e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ";
    var up = e.key === "ArrowUp" || e.key === "PageUp";
    if (!down && !up) return;
    var wt = workTopPx();
    var y = window.scrollY;
    if (y < wt - 1) {
      e.preventDefault();
      snapTo(down ? wt : 0, down ? 900 : 700);
    } else if (y <= wt + 2 && up) {
      e.preventDefault();
      snapTo(0);
    }
  });
})();
