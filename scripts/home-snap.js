/**
 * Snap scroll between the landing frame and My Work (MakeReign-style).
 *
 * One gesture in the hero zone animates the scroll the whole way.
 * Scrolling up from the top of the work section snaps back to the hero.
 * Below that boundary the page scrolls normally.
 *
 * Snap easing uses Motion springs instead of a hand-rolled rAF cubic.
 */
import { animate } from "./vendor/motion.js";

(function () {
  var FRAME_W = 1440;
  var WORK_TOP = 812; // design px — page turn completes here
  var SCROLL_KEY = "aq-scroll-to";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var animating = false;
  var activeAnim = null;
  var root = document.documentElement;

  function workTopPx() {
    return WORK_TOP * (window.innerWidth / FRAME_W);
  }

  function clearHashFromUrl() {
    if (!location.hash) return;
    if (history.replaceState) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function snapTo(targetY, opts) {
    opts = opts || {};
    if (reduceMotion) {
      window.scrollTo(0, targetY);
      return;
    }
    if (animating) return;
    animating = true;

    if (activeAnim && typeof activeAnim.stop === "function") {
      activeAnim.stop();
    }

    var prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    var startY = window.scrollY;
    var stiffness = opts.stiffness != null ? opts.stiffness : 140;
    var damping = opts.damping != null ? opts.damping : 26;

    activeAnim = animate(startY, targetY, {
      type: "spring",
      stiffness: stiffness,
      damping: damping,
      mass: 0.85,
      restDelta: 0.5,
      restSpeed: 0.5,
      onUpdate: function (v) {
        window.scrollTo(0, v);
      },
      onComplete: function () {
        window.scrollTo(0, targetY);
        root.style.scrollBehavior = prevBehavior;
        animating = false;
        activeAnim = null;
      },
    });
  }

  function scrollToWork() {
    var el = document.getElementById("my-work");
    if (el && reduceMotion) {
      el.scrollIntoView({ behavior: "auto", block: "start" });
      return;
    }
    snapTo(workTopPx(), { stiffness: 150, damping: 28 });
  }

  function consumeScrollIntent() {
    var fromHash = location.hash === "#my-work";
    var fromStore = false;
    try {
      fromStore = sessionStorage.getItem(SCROLL_KEY) === "my-work";
      if (fromStore) sessionStorage.removeItem(SCROLL_KEY);
    } catch (err) {}

    if (!fromHash && !fromStore) return;

    scrollToWork();
    clearHashFromUrl();
  }

  window.addEventListener("load", consumeScrollIntent);
  window.addEventListener("hashchange", function () {
    if (location.hash === "#my-work") {
      scrollToWork();
      clearHashFromUrl();
    }
  });

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
      if (e.ctrlKey) return;
      if (animating) {
        e.preventDefault();
        return;
      }
      var wt = workTopPx();
      var y = window.scrollY;
      if (y < wt - 1) {
        e.preventDefault();
        if (e.deltaY > 8) snapTo(wt);
        else if (e.deltaY < -8) snapTo(0, { stiffness: 160, damping: 28 });
      } else if (y <= wt + 2 && e.deltaY < -8) {
        e.preventDefault();
        snapTo(0, { stiffness: 160, damping: 28 });
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
      var dy = touchY - e.touches[0].clientY;
      if (y < wt - 1) {
        e.preventDefault();
        if (dy > 12) {
          snapTo(wt);
          touchY = null;
        } else if (dy < -12) {
          snapTo(0, { stiffness: 160, damping: 28 });
          touchY = null;
        }
      } else if (y <= wt + 2 && dy < -12) {
        e.preventDefault();
        snapTo(0, { stiffness: 160, damping: 28 });
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
      snapTo(down ? wt : 0, down ? {} : { stiffness: 160, damping: 28 });
    } else if (y <= wt + 2 && up) {
      e.preventDefault();
      snapTo(0, { stiffness: 160, damping: 28 });
    }
  });
})();
