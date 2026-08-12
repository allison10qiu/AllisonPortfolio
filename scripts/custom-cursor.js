/**
 * Custom cursor — Figma colors:
 *   navy #14243B · white #FFFFFF · light #EDF2F5
 * Circle: white on navy/dark, navy on white/light.
 * Project pills: navy fill, white text.
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

      // Solid-looking images (hero art, page bake) — treat by nearby page context
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

  function move(e) {
    lastX = e.clientX;
    lastY = e.clientY;
    el.style.transform =
      "translate(" + e.clientX + "px, " + e.clientY + "px) translate(-50%, -50%)";
    el.classList.add("is-on");

    // Hit-test each move so labels work on the scaled home canvas
    // (mouseenter/leave can miss on transformed ancestors).
    var hit = document.elementFromPoint(e.clientX, e.clientY);
    var text = labelForTarget(hit);
    if (text) {
      if (label.textContent !== text || !overCard) showLabel(text);
    } else if (overCard) {
      showDot();
    } else {
      applyContrast(e.clientX, e.clientY);
    }
  }

  document.addEventListener("mousemove", move, { passive: true });
  document.addEventListener("mouseleave", function () {
    el.classList.remove("is-on");
  });
  window.addEventListener("blur", function () {
    el.classList.remove("is-on");
    showDot();
  });

  // Expose Figma tokens for CSS via custom properties (single source)
  document.documentElement.style.setProperty("--cursor-navy", NAVY);
  document.documentElement.style.setProperty("--cursor-white", WHITE);
})();
