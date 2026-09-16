/**
 * Terraform locked interactions — audit pan/zoom.
 * Preview first, deferred full SVG. Cursor-anchored zoom + stable drag
 * under the case-study CSS page scale.
 */
import { animate } from "./vendor/motion.js";

(function () {
  var MAX_ZOOM = 7.23; // 723% relative to width-fit
  var ZOOM_STEP = 1.22;
  var TEXTURE_CAP = 8192;
  var WHEEL_SENS = 0.0048;
  var reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function initAuditViewer(root) {
    var shell = root.querySelector("[data-tf-audit]");
    if (!shell || shell.dataset.ready === "1") return;

    var viewport = shell.querySelector("[data-tf-audit-viewport]");
    var stage = shell.querySelector("[data-tf-audit-stage]");
    var preview = shell.querySelector("[data-tf-audit-preview]");
    var img = shell.querySelector("[data-tf-audit-img]");
    var btnIn = shell.querySelector("[data-tf-audit-zoom-in]");
    var btnOut = shell.querySelector("[data-tf-audit-zoom-out]");
    var btnPct = shell.querySelector("[data-tf-audit-pct]");
    var btnReset = shell.querySelector("[data-tf-audit-reset]");
    if (!viewport || !stage || !img) return;

    shell.dataset.ready = "1";
    shell.classList.add("is-loading");

    var state = {
      scale: 1,
      minScale: 1,
      maxScale: 1,
      cssW: 0,
      cssH: 0,
      x: 0,
      y: 0,
      dragging: false,
      active: false,
      pointers: new Map(),
      pinchStartDist: 0,
      pinchStartScale: 1,
      lastX: 0,
      lastY: 0,
      lastT: 0,
      velX: 0,
      velY: 0,
      interacting: false,
      raf: 0,
      zoomAnim: null,
      panAnimX: null,
      panAnimY: null,
      fullLoaded: false,
      fullRequested: false,
      lastPct: -1,
    };

    function naturalSize() {
      return {
        w: Number(img.getAttribute("width")) || 29420,
        h: Number(img.getAttribute("height")) || 39846,
      };
    }

    function viewportSize() {
      return { w: viewport.clientWidth, h: viewport.clientHeight };
    }

    /** Visual CSS scale from case-scale (.bc-canvas transform). */
    function pageScale() {
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
      var rect = viewport.getBoundingClientRect();
      return rect.width / Math.max(1, viewport.offsetWidth);
    }

    /** Cursor → stage-local CSS pixels (accounts for page scale + border). */
    function localPoint(clientX, clientY) {
      var rect = viewport.getBoundingClientRect();
      var sx = pageScale();
      return {
        x: (clientX - rect.left) / sx - viewport.clientLeft,
        y: (clientY - rect.top) / sx - viewport.clientTop,
      };
    }

    function stopAnims() {
      if (state.zoomAnim && typeof state.zoomAnim.stop === "function") {
        state.zoomAnim.stop();
      }
      if (state.panAnimX && typeof state.panAnimX.stop === "function") {
        state.panAnimX.stop();
      }
      if (state.panAnimY && typeof state.panAnimY.stop === "function") {
        state.panAnimY.stop();
      }
      state.zoomAnim = null;
      state.panAnimX = null;
      state.panAnimY = null;
    }

    function applyImgSize(el) {
      if (!el) return;
      el.style.width = state.cssW + "px";
      el.style.height = state.cssH + "px";
    }

    function layoutImage() {
      var nat = naturalSize();
      var vp = viewportSize();
      if (!nat.w || !nat.h || !vp.w || !vp.h) return;

      var dpr = window.devicePixelRatio || 1;
      var ideal = vp.w * MAX_ZOOM * Math.min(1.25, Math.max(1, dpr));
      var cssW = Math.min(ideal, TEXTURE_CAP, nat.w);
      var renderMul = cssW / vp.w;

      state.cssW = cssW;
      state.cssH = cssW * (nat.h / nat.w);
      state.minScale = 1 / renderMul;
      state.maxScale = state.minScale * MAX_ZOOM;

      applyImgSize(preview);
      applyImgSize(img);
    }

    function paint(updateChrome) {
      state.raf = 0;
      stage.style.transform =
        "translate3d(" +
        state.x +
        "px," +
        state.y +
        "px,0) scale3d(" +
        state.scale +
        "," +
        state.scale +
        ",1)";

      if (updateChrome === false || state.dragging) return;

      var pct = Math.round((state.scale / state.minScale) * 100);
      if (btnPct && pct !== state.lastPct) {
        state.lastPct = pct;
        btnPct.textContent = pct + "%";
      }
      if (btnOut) btnOut.disabled = state.scale <= state.minScale + 0.0001;
      if (btnIn) btnIn.disabled = state.scale >= state.maxScale - 0.0001;
    }

    function requestPaint(updateChrome) {
      if (state.dragging) {
        // Direct paint while dragging — lowest latency, no chrome thrash.
        paint(false);
        return;
      }
      if (!state.raf) {
        state.raf = requestAnimationFrame(function () {
          paint(updateChrome !== false);
        });
      }
    }

    /**
     * Zoom so the content under (clientX, clientY) stays under the cursor.
     * Applied immediately — no separate x/y lerp (that drifts on zoom-out).
     */
    function zoomAtCursor(clientX, clientY, nextScale, opts) {
      opts = opts || {};
      nextScale = clamp(nextScale, state.minScale, state.maxScale);
      if (Math.abs(nextScale - state.scale) < 1e-9) return;

      var p = localPoint(clientX, clientY);
      var contentX = (p.x - state.x) / state.scale;
      var contentY = (p.y - state.y) / state.scale;
      var targetX = p.x - contentX * nextScale;
      var targetY = p.y - contentY * nextScale;

      if (opts.instant || reduceMotion || opts.mode === "wheel") {
        stopAnims();
        state.scale = nextScale;
        state.x = targetX;
        state.y = targetY;
        requestPaint(opts.mode !== "wheel");
        return;
      }

      stopAnims();
      var fromS = state.scale;
      var focusX = contentX;
      var focusY = contentY;
      var focusPx = p.x;
      var focusPy = p.y;

      state.zoomAnim = animate(0, 1, {
        type: "spring",
        stiffness: opts.stiffness != null ? opts.stiffness : 420,
        damping: opts.damping != null ? opts.damping : 32,
        mass: 0.45,
        restDelta: 0.001,
        onUpdate: function (t) {
          state.scale = fromS + (nextScale - fromS) * t;
          state.x = focusPx - focusX * state.scale;
          state.y = focusPy - focusY * state.scale;
          requestPaint();
        },
        onComplete: function () {
          state.scale = nextScale;
          state.x = focusPx - focusX * nextScale;
          state.y = focusPy - focusY * nextScale;
          state.zoomAnim = null;
          requestPaint();
        },
      });
    }

    function centerFit(instant) {
      stopAnims();
      layoutImage();
      var nextS = state.minScale;
      var nextX = 0;
      var nextY = 0;

      if (instant || reduceMotion) {
        state.scale = nextS;
        state.x = nextX;
        state.y = nextY;
        requestPaint();
        return;
      }

      var fromS = state.scale;
      var fromX = state.x;
      var fromY = state.y;
      state.zoomAnim = animate(0, 1, {
        type: "spring",
        stiffness: 240,
        damping: 30,
        mass: 0.65,
        onUpdate: function (t) {
          state.scale = fromS + (nextS - fromS) * t;
          state.x = fromX + (nextX - fromX) * t;
          state.y = fromY + (nextY - fromY) * t;
          requestPaint();
        },
        onComplete: function () {
          state.scale = nextS;
          state.x = nextX;
          state.y = nextY;
          state.zoomAnim = null;
          requestPaint();
        },
      });
    }

    function markInteracted() {
      if (state.interacting) return;
      state.interacting = true;
      shell.classList.add("is-interacting");
    }

    function activate() {
      state.active = true;
      shell.classList.add("is-active");
    }

    function scheduleFullAsset() {
      if (state.fullRequested || state.fullLoaded) return;
      if (state.dragging || state.pointers.size > 0) return;
      var run = function () {
        if (!state.dragging) requestFullAsset();
      };
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(run, { timeout: 1200 });
      } else {
        setTimeout(run, 200);
      }
    }

    function onWheel(event) {
      var intentionalZoom =
        state.active ||
        state.dragging ||
        document.activeElement === viewport ||
        event.ctrlKey ||
        event.metaKey ||
        state.scale > state.minScale + 0.001;

      if (!intentionalZoom) return;

      event.preventDefault();
      markInteracted();
      activate();
      scheduleFullAsset();

      var factor = Math.exp(-event.deltaY * WHEEL_SENS);
      factor = clamp(factor, 0.7, 1.45);
      zoomAtCursor(event.clientX, event.clientY, state.scale * factor, {
        mode: "wheel",
      });
    }

    function pointerCount() {
      return state.pointers.size;
    }

    function pointerDist() {
      var pts = Array.from(state.pointers.values());
      if (pts.length < 2) return 0;
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }

    function pointerMid() {
      var pts = Array.from(state.pointers.values());
      return {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };
    }

    function onPointerDown(event) {
      event.preventDefault();
      viewport.setPointerCapture(event.pointerId);
      state.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      activate();
      markInteracted();
      stopAnims();

      if (pointerCount() === 2) {
        state.dragging = false;
        state.pinchStartDist = pointerDist();
        state.pinchStartScale = state.scale;
        viewport.classList.remove("is-dragging");
        return;
      }

      state.dragging = true;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      state.lastT = performance.now();
      state.velX = 0;
      state.velY = 0;
      viewport.classList.add("is-dragging");
    }

    function onPointerMove(event) {
      if (!state.pointers.has(event.pointerId)) return;
      state.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (pointerCount() === 2 && state.pinchStartDist > 0) {
        var mid = pointerMid();
        var dist = pointerDist();
        var next = state.pinchStartScale * (dist / state.pinchStartDist);
        zoomAtCursor(mid.x, mid.y, next, { instant: true });
        return;
      }

      if (!state.dragging) return;

      var now = performance.now();
      var dt = Math.max(1, now - state.lastT);
      var sx = pageScale();
      var dx = (event.clientX - state.lastX) / sx;
      var dy = (event.clientY - state.lastY) / sx;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      state.lastT = now;

      state.velX = state.velX * 0.75 + (dx / dt) * 1000 * 0.25;
      state.velY = state.velY * 0.75 + (dy / dt) * 1000 * 0.25;

      state.x += dx;
      state.y += dy;
      requestPaint(false);
    }

    function flingInertia() {
      requestPaint(true);
      if (reduceMotion) return;

      var speed = Math.hypot(state.velX, state.velY);
      if (speed < 100) return;

      var startX = state.x;
      var startY = state.y;
      var targetX = startX + state.velX * 0.28;
      var targetY = startY + state.velY * 0.28;

      state.panAnimX = animate(startX, targetX, {
        type: "spring",
        stiffness: 80,
        damping: 22,
        mass: 1,
        velocity: state.velX,
        restDelta: 0.4,
        restSpeed: 6,
        onUpdate: function (v) {
          state.x = v;
          requestPaint(false);
        },
        onComplete: function () {
          state.panAnimX = null;
          requestPaint(true);
        },
      });
      state.panAnimY = animate(startY, targetY, {
        type: "spring",
        stiffness: 80,
        damping: 22,
        mass: 1,
        velocity: state.velY,
        restDelta: 0.4,
        restSpeed: 6,
        onUpdate: function (v) {
          state.y = v;
          requestPaint(false);
        },
        onComplete: function () {
          state.panAnimY = null;
          requestPaint(true);
        },
      });
    }

    function onPointerUp(event) {
      state.pointers.delete(event.pointerId);
      if (pointerCount() < 2) state.pinchStartDist = 0;

      if (pointerCount() === 0) {
        var wasDragging = state.dragging;
        state.dragging = false;
        viewport.classList.remove("is-dragging");
        if (wasDragging) flingInertia();
        else requestPaint(true);
        scheduleFullAsset();
      } else if (pointerCount() === 1) {
        var remaining = state.pointers.values().next().value;
        state.dragging = true;
        state.lastX = remaining.x;
        state.lastY = remaining.y;
        state.lastT = performance.now();
        viewport.classList.add("is-dragging");
      }
    }

    function zoomButton(direction) {
      markInteracted();
      activate();
      scheduleFullAsset();
      var rect = viewport.getBoundingClientRect();
      zoomAtCursor(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        state.scale * (direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP),
        { stiffness: 420, damping: 32 }
      );
    }

    function promoteFullImage() {
      if (state.fullLoaded) return;
      state.fullLoaded = true;
      img.hidden = false;
      shell.classList.add("is-hires");
      if (preview) {
        preview.classList.add("is-fading");
        setTimeout(function () {
          if (preview && preview.parentNode) preview.remove();
        }, 420);
      }
      layoutImage();
      requestPaint(true);
    }

    function requestFullAsset() {
      if (state.fullRequested || state.fullLoaded) return;
      var src = img.getAttribute("data-src");
      if (!src) return;
      state.fullRequested = true;
      shell.classList.add("is-loading-hires");
      img.addEventListener(
        "load",
        function () {
          shell.classList.remove("is-loading-hires");
          promoteFullImage();
        },
        { once: true }
      );
      img.addEventListener(
        "error",
        function () {
          shell.classList.remove("is-loading-hires");
        },
        { once: true }
      );
      img.src = src;
    }

    function observeFullLoad() {
      if (!("IntersectionObserver" in window)) {
        setTimeout(scheduleFullAsset, 600);
        return;
      }
      var io = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
              scheduleFullAsset();
              io.disconnect();
              break;
            }
          }
        },
        { root: null, rootMargin: "240px 0px", threshold: 0.01 }
      );
      io.observe(shell);
    }

    viewport.addEventListener("focus", activate);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);
    viewport.addEventListener("lostpointercapture", function () {
      if (pointerCount() === 0) {
        state.dragging = false;
        viewport.classList.remove("is-dragging");
      }
    });

    [preview, img].forEach(function (el) {
      if (!el) return;
      el.addEventListener("dragstart", function (event) {
        event.preventDefault();
      });
      el.style.pointerEvents = "none";
      el.style.userSelect = "none";
      el.setAttribute("aria-hidden", "true");
    });

    if (btnIn) btnIn.addEventListener("click", function () { zoomButton(1); });
    if (btnOut) btnOut.addEventListener("click", function () { zoomButton(-1); });
    if (btnReset) {
      btnReset.addEventListener("click", function () {
        markInteracted();
        centerFit(false);
      });
    }
    if (btnPct) {
      btnPct.addEventListener("click", function () {
        markInteracted();
        centerFit(false);
      });
    }

    viewport.addEventListener("keydown", function (event) {
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomButton(1);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomButton(-1);
      } else if (event.key === "0") {
        event.preventDefault();
        centerFit(false);
      }
    });

    function readyPreview() {
      shell.classList.remove("is-loading");
      centerFit(true);
      observeFullLoad();
    }

    if (preview) {
      if (preview.complete && preview.naturalWidth) {
        readyPreview();
      } else {
        preview.addEventListener("load", readyPreview, { once: true });
        preview.addEventListener("error", readyPreview, { once: true });
        setTimeout(function () {
          if (shell.classList.contains("is-loading")) readyPreview();
        }, 400);
      }
    } else {
      requestFullAsset();
      img.addEventListener(
        "load",
        function () {
          shell.classList.remove("is-loading");
          centerFit(true);
        },
        { once: true }
      );
    }

    window.addEventListener(
      "resize",
      function () {
        var ratio = state.scale / state.minScale;
        layoutImage();
        state.scale = clamp(
          state.minScale * ratio,
          state.minScale,
          state.maxScale
        );
        state.x = 0;
        state.y = Math.min(0, state.y);
        requestPaint(true);
      },
      { passive: true }
    );
  }

  window.initTerraformLocked = function (root) {
    if (!root) return;
    initAuditViewer(root);
  };
})();
