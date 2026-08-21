/**
 * Custom cursor — Figma colors:
 *   navy #14243B · white #FFFFFF · light #EDF2F5
 * Circle: white on navy/dark, navy on white/light.
 * Project pills: navy fill, white text.
 *
 * Direct 1:1 follow (no spring). Hit-testing pauses while scrolling.
 */
(function () {
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!finePointer.matches) return;

  var NAVY = "#14243b";
  var WHITE = "#ffffff";

  document.documentElement.classList.add("has-custom-cursor");

  var el = document.createElement("div");
  el.className = "custom-cursor is-dot is-dark";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML =
    '<span class="custom-cursor__dot"></span>' +
    '<span class="custom-cursor__label"></span>';
  document.body.appendChild(el);

  var label = el.querySelector(".custom-cursor__label");
  var overCard = false;
  var lastX = 0;
  var lastY = 0;
  var isScrolling = false;
  var scrollIdleTimer = null;
  var hitRaf = 0;

  function parseRgb(color) {
    if (!color || color === "transparent") return null;
    var m = color.match(
      /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i
    );
    if (!m) return null;
    var a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (a < 0.08) return null;
    return {
      r: parseFloat(m[1]),
      g: parseFloat(m[2]),
      b: parseFloat(m[3]),
    };
  }

  function luminance(rgb) {
    return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  }

  function sampleBackground(x, y) {
    var node = document.elementFromPoint(x, y);
    while (node && node !== document.documentElement) {
      if (node === el) {
        node = node.parentElement;
        continue;
      }
      var style = window.getComputedStyle(node);
      var rgb = parseRgb(style.backgroundColor);
      if (rgb) return rgb;

      if (node.tagName === "IMG" || node.tagName === "VIDEO") {
        var parent = node.parentElement;
        while (parent && parent !== document.documentElement) {
          var parentRgb = parseRgb(window.getComputedStyle(parent).backgroundColor);
          if (parentRgb) return parentRgb;
          parent = parent.parentElement;
        }
      }
      node = node.parentElement;
    }
    return parseRgb(window.getComputedStyle(document.body).backgroundColor) || {
      r: 20,
      g: 36,
      b: 59,
    };
  }

  function applyContrast(x, y) {
    if (overCard) return;
    var rgb = sampleBackground(x, y);
    var light = luminance(rgb) >= 0.55;
    el.classList.toggle("is-light", light);
    el.classList.toggle("is-dark", !light);
  }

  function showDot() {
    overCard = false;
    el.classList.add("is-dot");
    el.classList.remove("is-label");
    label.textContent = "";
    applyContrast(lastX, lastY);
  }

  function showLabel(text) {
    overCard = true;
    el.classList.add("is-label");
    el.classList.remove("is-dot", "is-light", "is-dark");
    label.textContent = text;
  }

  function labelForTarget(node) {
    if (!node || !node.closest) return "";
    if (node.closest(".home-card--soon, .work-card--soon")) return "COMING SOON";
    if (node.closest("a.home-card, a.work-card")) return "VIEW PROJECT";
    return "";
  }

  function updateHitTest() {
    hitRaf = 0;
    if (isScrolling) return;
    var hit = document.elementFromPoint(lastX, lastY);
    var text = labelForTarget(hit);
    if (text) {
      if (label.textContent !== text || !overCard) showLabel(text);
    } else if (overCard) {
      showDot();
    } else {
      applyContrast(lastX, lastY);
    }
  }

  function scheduleHitTest() {
    if (isScrolling || hitRaf) return;
    hitRaf = requestAnimationFrame(updateHitTest);
  }

  function onScrollActivity() {
    isScrolling = true;
    if (hitRaf) {
      cancelAnimationFrame(hitRaf);
      hitRaf = 0;
    }
    if (scrollIdleTimer) clearTimeout(scrollIdleTimer);
    scrollIdleTimer = setTimeout(function () {
      isScrolling = false;
      scheduleHitTest();
    }, 120);
  }

  function move(e) {
    lastX = e.clientX;
    lastY = e.clientY;
    el.style.transform =
      "translate3d(" + lastX + "px, " + lastY + "px, 0) translate(-50%, -50%)";
    el.classList.add("is-on");
    scheduleHitTest();
  }

  document.addEventListener("mousemove", move, { passive: true });
  document.addEventListener("mouseleave", function () {
    el.classList.remove("is-on");
  });
  window.addEventListener("blur", function () {
    el.classList.remove("is-on");
    showDot();
  });
  window.addEventListener("scroll", onScrollActivity, { passive: true, capture: true });
  document.addEventListener("scroll", onScrollActivity, { passive: true, capture: true });

  document.documentElement.style.setProperty("--cursor-navy", NAVY);
  document.documentElement.style.setProperty("--cursor-white", WHITE);
})();
