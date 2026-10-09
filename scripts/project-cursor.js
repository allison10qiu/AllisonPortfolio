/*
 * Project-card hover label.
 *
 * The site cursor is the native White Wing set (CSS only, see styles/main.css).
 * This script adds ONE small contextual layer — a dark "View project" label —
 * that rides next to the native cursor while the pointer is over a project card.
 *
 *  - never hides or replaces the native cursor
 *  - pointer-events: none, so cards stay real links and clicks go straight through
 *  - fine pointers only (mouse / trackpad); nothing is created on touch devices
 *  - flips to the left / above the pointer near viewport edges
 */
(function () {
  "use strict";

  var FINE = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!FINE.matches) return;

  // Shared project-card selector (homepage rows, Work page cards). "Coming soon"
  // cards are not projects you can open, so they never get the label.
  var CARD = "a.project, a.home-card, a.work-card";
  var SOON = ".home-card--soon, .work-card--soon";
  // Anything interactive; the label only shows when the card itself is the
  // nearest interactive element under the pointer (so nested links/buttons,
  // nav, footer links, the bag, carousel controls etc. never trigger it).
  var INTERACTIVE = "a[href], button, input, select, textarea, summary, [role='button'], [role='link']";

  // Native cursor art is ~18×21px with its hotspot at 0,0.
  var OFFSET_X = 12; // label starts just right of the arrow…
  var OFFSET_Y = 24; // …and just below its tip
  var FLIP_X_GAP = 6; // when flipped, the label's right edge sits this far right of the tip
  var FLIP_Y_GAP = 10; // when flipped up, the label's bottom sits this far above the tip
  var EDGE = 8; // keep this much clear of the viewport edge

  var el = null;
  var label = null;
  var on = false;
  var x = 0;
  var y = 0;
  var w = 0;
  var h = 0;
  var flipX = false;
  var flipY = false;
  var scrollTimer = 0;

  function build() {
    el = document.createElement("div");
    el.className = "project-cursor";
    el.setAttribute("aria-hidden", "true");
    label = document.createElement("span");
    label.className = "project-cursor__label";
    label.textContent = "View project";
    el.appendChild(label);
    document.body.appendChild(el);
  }

  function cardFor(node) {
    if (!node || !node.closest) return null;
    var card = node.closest(CARD);
    if (!card || card.matches(SOON)) return null;
    return node.closest(INTERACTIVE) === card ? card : null;
  }

  function place() {
    var vw = document.documentElement.clientWidth;
    var vh = document.documentElement.clientHeight;
    var fx = x + OFFSET_X + w + EDGE > vw;
    var fy = y + OFFSET_Y + h + EDGE > vh;
    var left = fx ? x + FLIP_X_GAP - w : x + OFFSET_X;
    var top = fy ? y - FLIP_Y_GAP - h : y + OFFSET_Y;
    if (left < EDGE) left = EDGE;
    el.style.transform = "translate3d(" + Math.round(left) + "px," + Math.round(top) + "px,0)";
    if (fx !== flipX) {
      flipX = fx;
      el.classList.toggle("is-flip-x", fx);
    }
    if (fy !== flipY) {
      flipY = fy;
      el.classList.toggle("is-flip-y", fy);
    }
  }

  function show() {
    if (!el) build();
    if (!on) {
      // Measure once per show (offset sizes ignore the scale transform).
      w = label.offsetWidth;
      h = label.offsetHeight;
      place();
      on = true;
      el.classList.add("is-on");
    } else {
      place();
    }
  }

  function hide() {
    if (!on) return;
    on = false;
    if (el) el.classList.remove("is-on");
  }

  function update(e) {
    if (e.pointerType === "touch") return;
    x = e.clientX;
    y = e.clientY;
    if (cardFor(e.target)) show();
    else hide();
  }

  // Cards move under a stationary pointer while scrolling; re-check shortly after.
  function afterScroll() {
    if (scrollTimer) return;
    scrollTimer = window.setTimeout(function () {
      scrollTimer = 0;
      if (!on && !el) return;
      var node = document.elementFromPoint(x, y);
      if (cardFor(node)) show();
      else hide();
    }, 50);
  }

  document.addEventListener("pointermove", update, { passive: true });
  document.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "touch") update(e);
  }, { passive: true });
  // Leaving for another page: drop the label immediately so it can never be
  // left behind (also covers back/forward cache restores).
  document.addEventListener("click", hide, true);
  window.addEventListener("scroll", afterScroll, { passive: true });
  window.addEventListener("blur", hide);
  window.addEventListener("pagehide", hide);
  window.addEventListener("pageshow", hide);
  document.addEventListener("visibilitychange", hide);
  document.documentElement.addEventListener("mouseleave", hide);

  // If the device stops being a fine-pointer device (e.g. detached mouse), clean up.
  if (FINE.addEventListener) {
    FINE.addEventListener("change", function () {
      if (!FINE.matches) hide();
    });
  }
})();
