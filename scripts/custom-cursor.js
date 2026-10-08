/**
 * Custom cursor — Figma colors:
 *   navy #2B2E36 · white #FFFFFF · light #EDF2F5
 * Circle: white on navy/dark, navy on white/light.
 * Project pills: navy fill, white text.
 *
 * Direct 1:1 follow (no spring). Card labels switch on pointerover
 * (instant); background contrast still samples on move. Hit-testing
 * after scroll resumes quickly so a stationary cursor over a card updates.
 */
(function () {
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!finePointer.matches) return;

  var NAVY = "#2B2E36";
  var WHITE = "#ffffff";

  document.documentElement.classList.add("has-custom-cursor");

  var el = document.createElement("div");
  el.className = "custom-cursor is-dot is-light";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML =
    '<span class="custom-cursor__dot"></span>' +
    '<span class="custom-cursor__label"></span>';
  document.body.appendChild(el);

  var label = el.querySelector(".custom-cursor__label");
  var overCard = false;
  var overNavStamp = false;
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

  var imageSamples = typeof WeakMap === "function" ? new WeakMap() : null;

  function sampleImagePixel(img, x, y) {
    if (!img || img.tagName !== "IMG" || !img.complete || !img.naturalWidth) return null;
    var rect = img.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;
    var nx = (x - rect.left) / rect.width;
    var ny = (y - rect.top) / rect.height;
    if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return null;
    var canvas = imageSamples && imageSamples.get(img);
    if (!canvas) {
      var w = img.naturalWidth;
      var h = img.naturalHeight;
      var scale = Math.min(1, 720 / Math.max(w, h));
      canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      try {
        canvas.getContext("2d", { willReadFrequently: true }).drawImage(img, 0, 0, canvas.width, canvas.height);
      } catch (err) {
        return null;
      }
      if (imageSamples) imageSamples.set(img, canvas);
    }
    var px = Math.min(canvas.width - 1, Math.max(0, Math.floor(nx * canvas.width)));
    var py = Math.min(canvas.height - 1, Math.max(0, Math.floor(ny * canvas.height)));
    var data;
    try {
      data = canvas.getContext("2d", { willReadFrequently: true }).getImageData(px, py, 1, 1).data;
    } catch (err) {
      return null;
    }
    if (data[3] < 20) return null;
    return { r: data[0], g: data[1], b: data[2] };
  }

  function sampleBackground(x, y) {
    var node = document.elementFromPoint(x, y);
    while (node && node !== document.documentElement) {
      if (node === el) {
        node = node.parentElement;
        continue;
      }
      if (node.tagName === "IMG") {
        var pixel = sampleImagePixel(node, x, y);
        if (pixel) return pixel;
      }
      var style = window.getComputedStyle(node);
      var rgb = parseRgb(style.backgroundColor);
      if (rgb) return rgb;
      node = node.parentElement;
    }
    return parseRgb(window.getComputedStyle(document.body).backgroundColor) || {
      r: 255,
      g: 255,
      b: 255,
    };
  }

  function applyContrast(x, y) {
    if (overCard) return;
    if (overNavStamp) {
      setNavyDot();
      return;
    }
    var rgb = sampleBackground(x, y);
    var light = luminance(rgb) >= 0.55;
    el.classList.toggle("is-light", light);
    el.classList.toggle("is-dark", !light);
  }

  /** Force navy circle (home Work / About / Resume stamps). */
  function setNavyDot() {
    overNavStamp = true;
    overCard = false;
    el.classList.add("is-dot", "is-light");
    el.classList.remove("is-label", "is-dark");
    label.textContent = "";
  }

  function showDot() {
    overCard = false;
    overNavStamp = false;
    el.classList.add("is-dot");
    el.classList.remove("is-label");
    label.textContent = "";
    applyContrast(lastX, lastY);
  }

  function showLabel(text) {
    overCard = true;
    overNavStamp = false;
    el.classList.add("is-label");
    el.classList.remove("is-dot", "is-light", "is-dark");
    label.textContent = text;
  }

  function labelForTarget(node) {
    if (!node || !node.closest) return "";
    if (node.closest(".home-card--soon, .work-card--soon")) return "COMING SOON";
    if (node.closest("a.home-card, a.work-card, a.project")) return "VIEW PROJECT";
    return "";
  }

  /** Home hero nav only: Work, About me, Resume stamps. */
  function isHomeNavStamp(node) {
    return !!(node && node.closest && node.closest(".design-hotspots .design-hotspot--stamp"));
  }

  function updateHitTest() {
    hitRaf = 0;
    var hit = document.elementFromPoint(lastX, lastY);
    var text = labelForTarget(hit);
    if (text) {
      if (label.textContent !== text || !overCard) showLabel(text);
    } else if (isHomeNavStamp(hit)) {
      setNavyDot();
    } else if (overCard || overNavStamp) {
      showDot();
    } else {
      applyContrast(lastX, lastY);
    }
  }

  function scheduleHitTest() {
    if (hitRaf) return;
    hitRaf = requestAnimationFrame(updateHitTest);
  }

  function onScrollActivity() {
    isScrolling = true;
    if (hitRaf) {
      cancelAnimationFrame(hitRaf);
      hitRaf = 0;
    }
    if (scrollIdleTimer) clearTimeout(scrollIdleTimer);
    // Short idle — cards can sit under a still cursor after snap/scroll.
    scrollIdleTimer = setTimeout(function () {
      isScrolling = false;
      updateHitTest();
    }, 32);
  }

  function move(e) {
    lastX = e.clientX;
    lastY = e.clientY;
    el.style.transform =
      "translate3d(" + lastX + "px, " + lastY + "px, 0) translate(-50%, -50%)";
    el.classList.add("is-on");
    document.documentElement.classList.add("is-cursor-live");
    // While scrolling, still allow card labels so moving onto a card feels instant.
    if (isScrolling) {
      var text = labelForTarget(e.target);
      if (text) {
        if (label.textContent !== text || !overCard) showLabel(text);
      } else if (isHomeNavStamp(e.target)) {
        setNavyDot();
      } else if (overCard || overNavStamp) {
        showDot();
      }
      return;
    }
    scheduleHitTest();
  }

  document.addEventListener("mousemove", move, { passive: true });
  document.addEventListener("mouseleave", function () {
    el.classList.remove("is-on");
    document.documentElement.classList.remove("is-cursor-live");
  });
  window.addEventListener("blur", function () {
    el.classList.remove("is-on");
    document.documentElement.classList.remove("is-cursor-live");
    showDot();
  });
  window.addEventListener("scroll", onScrollActivity, { passive: true, capture: true });
  document.addEventListener("scroll", onScrollActivity, { passive: true, capture: true });

  // Instant label when the pointer enters a card (no wait for rAF / scroll idle).
  document.addEventListener(
    "pointerover",
    function (e) {
      var text = labelForTarget(e.target);
      if (text) {
        if (label.textContent !== text || !overCard) showLabel(text);
        return;
      }
      if (isHomeNavStamp(e.target)) {
        setNavyDot();
      }
    },
    { passive: true }
  );
  document.addEventListener(
    "pointerout",
    function (e) {
      var next = e.relatedTarget;
      if (overCard) {
        if (labelForTarget(next)) return;
        if (isHomeNavStamp(next)) {
          setNavyDot();
          return;
        }
        showDot();
        return;
      }
      if (overNavStamp) {
        if (isHomeNavStamp(next)) return;
        if (labelForTarget(next)) {
          showLabel(labelForTarget(next));
          return;
        }
        showDot();
      }
    },
    { passive: true }
  );

  document.documentElement.style.setProperty("--cursor-navy", NAVY);
  document.documentElement.style.setProperty("--cursor-white", WHITE);
})();
