/**
 * Terraform locked interactions — persona cards + audit pan/zoom.
 * Uses Motion (scripts/vendor/motion.js) for spring zoom and drag inertia.
 */
import { animate } from "./vendor/motion.js";

(function () {
  var MAX_ZOOM = 8; // relative to width-fit (was 4)
  var ZOOM_STEP = 1.12;
  var TEXTURE_CAP = 8192; // stay under common GPU texture limits
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
      // Visual values (may lag targets during Motion tweens)
      vx: 0,
      vy: 0,
      vScale: 1,
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
      dirty: false,
      zoomAnim: null,
      panAnimX: null,
      panAnimY: null,
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

    function layoutImage() {
      var nat = naturalSize();
      var vp = viewportSize();
      if (!nat.w || !nat.h || !vp.w || !vp.h) return;

      var dpr = window.devicePixelRatio || 1;
      // Buffer sized for max zoom at device pixels, capped for GPU safety.
      var ideal = vp.w * MAX_ZOOM * Math.max(1, dpr);
      var cssW = Math.min(ideal, TEXTURE_CAP, nat.w);
      var renderMul = cssW / vp.w;

      state.cssW = cssW;
      state.cssH = cssW * (nat.h / nat.w);
      state.minScale = 1 / renderMul;
      state.maxScale = Math.min(1, (vp.w * MAX_ZOOM) / state.cssW);

      img.style.width = state.cssW + "px";
      img.style.height = state.cssH + "px";
    }

    function paint() {
      state.raf = 0;
      state.dirty = false;
      stage.style.transform =
        "translate3d(" +
        state.vx +
        "px," +
        state.vy +
        "px,0) scale3d(" +
        state.vScale +
        "," +
        state.vScale +
        ",1)";

      var pct = Math.round((state.vScale / state.minScale) * 100);
      if (btnPct) btnPct.textContent = pct + "%";
      if (btnOut) btnOut.disabled = state.vScale <= state.minScale + 0.0001;
      if (btnIn) btnIn.disabled = state.vScale >= state.maxScale - 0.0001;
    }

    function requestPaint() {
      state.dirty = true;
      if (!state.raf) {
        state.raf = requestAnimationFrame(paint);
      }
    }

    function syncVisualFromState() {
      state.vx = state.x;
      state.vy = state.y;
      state.vScale = state.scale;
      requestPaint();
    }

    function centerFit(instant) {
      stopAnims();
      layoutImage();
      state.scale = state.minScale;
      state.x = 0;
      state.y = 0;
      if (instant || reduceMotion) {
        syncVisualFromState();
        return;
      }
      // Soft settle into fit.
      var fromS = state.vScale;
      var fromX = state.vx;
      var fromY = state.vy;
      state.zoomAnim = animate(0, 1, {
        type: "spring",
        stiffness: 220,
        damping: 28,
        mass: 0.7,
        onUpdate: function (t) {
          state.vScale = fromS + (state.scale - fromS) * t;
          state.vx = fromX + (state.x - fromX) * t;
          state.vy = fromY + (state.y - fromY) * t;
          requestPaint();
        },
        onComplete: function () {
          syncVisualFromState();
          state.zoomAnim = null;
        },
      });
    }

    function setZoomAt(clientX, clientY, nextScale, opts) {
      opts = opts || {};
      var rect = viewport.getBoundingClientRect();
      var px = clientX - rect.left;
      var py = clientY - rect.top;
      nextScale = clamp(nextScale, state.minScale, state.maxScale);

      var contentX = (px - state.vx) / state.vScale;
      var contentY = (py - state.vy) / state.vScale;
      var targetX = px - contentX * nextScale;
      var targetY = py - contentY * nextScale;

      state.scale = nextScale;
      state.x = targetX;
      state.y = targetY;

      if (opts.instant || reduceMotion) {
        stopAnims();
        syncVisualFromState();
        return;
      }

      if (state.zoomAnim && typeof state.zoomAnim.stop === "function") {
        state.zoomAnim.stop();
      }

      var fromS = state.vScale;
      var fromX = state.vx;
      var fromY = state.vy;
      state.zoomAnim = animate(0, 1, {
        type: "spring",
        stiffness: opts.stiffness != null ? opts.stiffness : 380,
        damping: opts.damping != null ? opts.damping : 36,
        mass: 0.55,
        restDelta: 0.001,
        onUpdate: function (t) {
          state.vScale = fromS + (nextScale - fromS) * t;
          state.vx = fromX + (targetX - fromX) * t;
          state.vy = fromY + (targetY - fromY) * t;
          requestPaint();
        },
        onComplete: function () {
          state.vScale = nextScale;
          state.vx = targetX;
          state.vy = targetY;
          requestPaint();
          state.zoomAnim = null;
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

    function onWheel(event) {
      var intentionalZoom =
        state.active ||
        state.dragging ||
        document.activeElement === viewport ||
        event.ctrlKey ||
        event.metaKey ||
        state.vScale > state.minScale + 0.001;

      if (!intentionalZoom) return;

      event.preventDefault();
      markInteracted();
      activate();

      var factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      if (Math.abs(event.deltaY) < 8) {
        factor = event.deltaY < 0 ? 1.05 : 1 / 1.05;
      }
      // Wheel: snappy springs so continuous scroll feels fluid, not stepped.
      setZoomAt(event.clientX, event.clientY, state.scale * factor, {
        stiffness: 520,
        damping: 42,
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
      viewport.setPointerCapture(event.pointerId);
      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      activate();
      markInteracted();
      stopAnims();
      // Commit visual → logical so drag starts from where the eye is.
      state.scale = state.vScale;
      state.x = state.vx;
      state.y = state.vy;

      if (pointerCount() === 2) {
        state.dragging = false;
        state.pinchStartDist = pointerDist();
        state.pinchStartScale = state.scale;
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
      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointerCount() === 2 && state.pinchStartDist > 0) {
        var mid = pointerMid();
        var dist = pointerDist();
        var next = state.pinchStartScale * (dist / state.pinchStartDist);
        setZoomAt(mid.x, mid.y, next, { instant: true });
        return;
      }

      if (!state.dragging) return;
      var now = performance.now();
      var dt = Math.max(1, now - state.lastT);
      var dx = event.clientX - state.lastX;
      var dy = event.clientY - state.lastY;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      state.lastT = now;

      // px/ms → px/s for Motion inertia
      var instantVx = (dx / dt) * 1000;
      var instantVy = (dy / dt) * 1000;
      state.velX = state.velX * 0.7 + instantVx * 0.3;
      state.velY = state.velY * 0.7 + instantVy * 0.3;

      state.x += dx;
      state.y += dy;
      state.vx = state.x;
      state.vy = state.y;
      state.vScale = state.scale;
      requestPaint();
    }

    function flingInertia() {
      if (reduceMotion) {
        syncVisualFromState();
        return;
      }
      var speed = Math.hypot(state.velX, state.velY);
      if (speed < 120) {
        syncVisualFromState();
        return;
      }

      var startX = state.x;
      var startY = state.y;
      var targetX = startX + state.velX * 0.28;
      var targetY = startY + state.velY * 0.28;

      state.panAnimX = animate(startX, targetX, {
        type: "spring",
        stiffness: 90,
        damping: 24,
        mass: 1,
        velocity: state.velX,
        restDelta: 0.4,
        restSpeed: 8,
        onUpdate: function (v) {
          state.x = v;
          state.vx = v;
          requestPaint();
        },
        onComplete: function () {
          state.panAnimX = null;
        },
      });
      state.panAnimY = animate(startY, targetY, {
        type: "spring",
        stiffness: 90,
        damping: 24,
        mass: 1,
        velocity: state.velY,
        restDelta: 0.4,
        restSpeed: 8,
        onUpdate: function (v) {
          state.y = v;
          state.vy = v;
          requestPaint();
        },
        onComplete: function () {
          state.panAnimY = null;
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
      } else if (pointerCount() === 1) {
        var remaining = state.pointers.values().next().value;
        state.dragging = true;
        state.lastX = remaining.x;
        state.lastY = remaining.y;
        state.lastT = performance.now();
      }
    }

    function zoomButton(direction) {
      markInteracted();
      activate();
      var rect = viewport.getBoundingClientRect();
      setZoomAt(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        state.scale * (direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP),
        { stiffness: 300, damping: 30 }
      );
    }

    viewport.addEventListener("focus", activate);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);
    viewport.addEventListener("pointerleave", function () {
      if (pointerCount() === 0) viewport.classList.remove("is-dragging");
    });

    img.addEventListener("dragstart", function (event) {
      event.preventDefault();
    });
    img.style.pointerEvents = "none";
    img.style.userSelect = "none";
    img.setAttribute("aria-hidden", "true");

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

    function ready() {
      shell.classList.remove("is-loading");
      centerFit(true);
    }

    img.addEventListener("load", ready, { once: true });
    if (img.tagName === "IMG" && img.complete) {
      ready();
    } else {
      setTimeout(function () {
        if (shell.classList.contains("is-loading")) ready();
      }, 120);
      setTimeout(function () {
        if (shell.classList.contains("is-loading")) ready();
      }, 2500);
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
        syncVisualFromState();
      },
      { passive: true }
    );
  }

  window.initTerraformLocked = function (root) {
    if (!root) return;
    initAuditViewer(root);
  };
})();
