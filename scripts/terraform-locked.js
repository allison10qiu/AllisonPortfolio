/**
 * Terraform audit pan/zoom — direct pointer drag + one rAF transform owner.
 * No Motion/Anime. Absolute drag (not incremental deltas). Bounds cached.
 */
(function () {
  var MAX_ZOOM = 7.23;
  var ZOOM_STEP = 1.22;
  var TEXTURE_CAP = 8192;
  var WHEEL_SENS = 0.0048;
  var BUTTON_MS = 160;
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

    // Single transform state
    var x = 0;
    var y = 0;
    var scale = 1;
    var minScale = 1;
    var maxScale = 1;
    var cssW = 0;
    var cssH = 0;

    // Cached geometry / bounds (NOT read during pointermove)
    var pageScale = 1;
    var vpW = 0;
    var vpH = 0;
    var vpLeft = 0;
    var vpTop = 0;
    var minX = 0;
    var maxX = 0;
    var minY = 0;
    var maxY = 0;

    // Absolute drag anchors
    var dragging = false;
    var dragPointerId = null;
    var pointerOriginX = 0;
    var pointerOriginY = 0;
    var dragOriginX = 0;
    var dragOriginY = 0;

    // Pinch (touch)
    var pointers = new Map();
    var pinchStartDist = 0;
    var pinchStartScale = 1;

    var active = false;
    var interacting = false;
    var raf = 0;
    var chromeDirty = false;
    var lastPct = -1;
    var revealed = false;
    var fitted = false;
    var fullLoaded = false;
    var fullRequested = false;
    var tweenRaf = 0;
    var canvasEl = document.querySelector(".bc-canvas");

    function naturalSize() {
      return {
        w: Number(img.getAttribute("width")) || 29420,
        h: Number(img.getAttribute("height")) || 39846,
      };
    }

    function refreshMetrics() {
      vpW = viewport.clientWidth;
      vpH = viewport.clientHeight;
      var rect = viewport.getBoundingClientRect();
      vpLeft = rect.left;
      vpTop = rect.top;

      var sx = 1;
      if (canvasEl) {
        var t = window.getComputedStyle(canvasEl).transform;
        if (t && t !== "none") {
          var m = t.match(/matrix\(([^,]+)/);
          if (m) {
            var s = parseFloat(m[1]);
            if (s && isFinite(s)) sx = s;
          }
        }
      }
      if ((!sx || sx === 1) && vpW > 0) {
        sx = rect.width / vpW;
      }
      pageScale = sx || 1;
    }

    function refreshBounds() {
      var scaledW = cssW * scale;
      var scaledH = cssH * scale;
      var marginX = Math.min(120, vpW * 0.25);
      var marginY = Math.min(120, vpH * 0.25);

      minX = vpW - scaledW - marginX;
      maxX = marginX;
      if (minX > maxX) {
        var midX = (minX + maxX) / 2;
        minX = maxX = midX;
      }

      minY = vpH - scaledH - marginY;
      maxY = marginY;
      if (minY > maxY) {
        var midY = (minY + maxY) / 2;
        minY = maxY = midY;
      }
    }

    function applyImgSize(el) {
      if (!el) return;
      el.style.width = cssW + "px";
      el.style.height = cssH + "px";
    }

    function layoutImage() {
      var nat = naturalSize();
      if (!nat.w || !nat.h || !vpW || !vpH) return;

      var dpr = window.devicePixelRatio || 1;
      var ideal = vpW * MAX_ZOOM * Math.min(1.25, Math.max(1, dpr));
      var nextW = Math.min(ideal, TEXTURE_CAP, nat.w);
      var renderMul = nextW / vpW;

      cssW = nextW;
      cssH = nextW * (nat.h / nat.w);
      minScale = 1 / renderMul;
      maxScale = minScale * MAX_ZOOM;

      applyImgSize(preview);
      applyImgSize(img);
      refreshBounds();
    }

    function applyTransform() {
      stage.style.transform =
        "translate3d(" + x + "px," + y + "px,0) scale(" + scale + ")";
    }

    function updateChrome() {
      var pct = Math.round((scale / minScale) * 100);
      if (btnPct && pct !== lastPct) {
        lastPct = pct;
        btnPct.textContent = pct + "%";
      }
      if (btnOut) btnOut.disabled = scale <= minScale + 0.0001;
      if (btnIn) btnIn.disabled = scale >= maxScale - 0.0001;
    }

    function paint() {
      raf = 0;
      // Clamp using cached bounds only — no geometry work
      x = clamp(x, minX, maxX);
      y = clamp(y, minY, maxY);
      applyTransform();

      if (chromeDirty && !dragging) {
        chromeDirty = false;
        updateChrome();
      }
    }

    function requestRender(updateChromeFlag) {
      if (updateChromeFlag) chromeDirty = true;
      if (raf) return;
      raf = requestAnimationFrame(paint);
    }

    function stopTween() {
      if (tweenRaf) {
        cancelAnimationFrame(tweenRaf);
        tweenRaf = 0;
      }
    }

    function localPoint(clientX, clientY) {
      return {
        x: (clientX - vpLeft) / pageScale,
        y: (clientY - vpTop) / pageScale,
      };
    }

    function setScaleAt(clientX, clientY, nextScale) {
      nextScale = clamp(nextScale, minScale, maxScale);
      if (Math.abs(nextScale - scale) < 1e-9) return;

      var p = localPoint(clientX, clientY);
      var contentX = (p.x - x) / scale;
      var contentY = (p.y - y) / scale;
      scale = nextScale;
      refreshBounds();
      x = p.x - contentX * scale;
      y = p.y - contentY * scale;
      requestRender(true);
    }

    function softTo(nextScale, nextX, nextY) {
      stopTween();
      nextScale = clamp(nextScale, minScale, maxScale);
      if (reduceMotion || BUTTON_MS <= 0) {
        scale = nextScale;
        refreshBounds();
        x = clamp(nextX, minX, maxX);
        y = clamp(nextY, minY, maxY);
        requestRender(true);
        return;
      }

      var fromS = scale;
      var fromX = x;
      var fromY = y;
      var t0 = performance.now();

      function step(now) {
        var t = clamp((now - t0) / BUTTON_MS, 0, 1);
        var e = 1 - Math.pow(1 - t, 3);
        scale = fromS + (nextScale - fromS) * e;
        refreshBounds();
        x = fromX + (nextX - fromX) * e;
        y = fromY + (nextY - fromY) * e;
        requestRender(true);
        if (t < 1) {
          tweenRaf = requestAnimationFrame(step);
        } else {
          scale = nextScale;
          refreshBounds();
          x = clamp(nextX, minX, maxX);
          y = clamp(nextY, minY, maxY);
          tweenRaf = 0;
          requestRender(true);
        }
      }

      tweenRaf = requestAnimationFrame(step);
    }

    function centerFit(instant) {
      stopTween();
      refreshMetrics();
      if (!vpW || !vpH) return false;
      layoutImage();
      if (!cssW) return false;
      fitted = true;
      var nextS = minScale;
      if (instant) {
        scale = nextS;
        refreshBounds();
        x = 0;
        y = 0;
        requestRender(true);
        return true;
      }
      softTo(nextS, 0, 0);
      return true;
    }

    function reveal() {
      if (revealed) return;
      revealed = true;
      shell.classList.remove("is-loading");
      shell.classList.add("is-ready");
    }

    function markInteracted() {
      if (interacting) return;
      interacting = true;
      shell.classList.add("is-interacting");
    }

    function activate() {
      active = true;
      shell.classList.add("is-active");
    }

    function scheduleFullAsset() {
      if (fullRequested || fullLoaded) return;
      if (dragging || pointers.size > 0) return;
      var run = function () {
        if (!dragging) requestFullAsset();
      };
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(run, { timeout: 1200 });
      } else {
        setTimeout(run, 200);
      }
    }

    function onWheel(event) {
      var intentionalZoom =
        active ||
        dragging ||
        document.activeElement === viewport ||
        event.ctrlKey ||
        event.metaKey ||
        scale > minScale + 0.001;

      if (!intentionalZoom) return;

      event.preventDefault();
      markInteracted();
      activate();
      scheduleFullAsset();
      stopTween();

      // Scroll can move the viewport — refresh origin only (not on drag path)
      var rect = viewport.getBoundingClientRect();
      vpLeft = rect.left;
      vpTop = rect.top;

      var factor = Math.exp(-event.deltaY * WHEEL_SENS);
      factor = clamp(factor, 0.7, 1.45);
      setScaleAt(event.clientX, event.clientY, scale * factor);
    }

    function pointerDist() {
      var pts = Array.from(pointers.values());
      if (pts.length < 2) return 0;
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }

    function pointerMid() {
      var pts = Array.from(pointers.values());
      return {
        x: (pts[0].x + pts[1].x) / 2,
        y: (pts[0].y + pts[1].y) / 2,
      };
    }

    function endDrag() {
      dragging = false;
      dragPointerId = null;
      viewport.classList.remove("is-dragging");
      requestRender(true);
      scheduleFullAsset();
    }

    function onPointerDown(event) {
      // Only primary button / touch / pen
      if (event.pointerType === "mouse" && event.button !== 0) return;

      event.preventDefault();
      stopTween();
      activate();
      markInteracted();

      // Cache pageScale once at drag start — never in move
      refreshMetrics();
      refreshBounds();

      try {
        viewport.setPointerCapture(event.pointerId);
      } catch (err) {
        /* ignore */
      }

      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.size === 2) {
        scheduleFullAsset();
        dragging = false;
        dragPointerId = null;
        pinchStartDist = pointerDist();
        pinchStartScale = scale;
        viewport.classList.remove("is-dragging");
        return;
      }

      // Absolute drag anchors (Figma/map style)
      dragging = true;
      dragPointerId = event.pointerId;
      pointerOriginX = event.clientX;
      pointerOriginY = event.clientY;
      dragOriginX = x;
      dragOriginY = y;
      viewport.classList.add("is-dragging");
    }

    function onPointerMove(event) {
      if (!pointers.has(event.pointerId) && event.pointerId !== dragPointerId) {
        return;
      }

      if (pointers.has(event.pointerId)) {
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }

      // Pinch zoom
      if (pointers.size === 2 && pinchStartDist > 0) {
        var mid = pointerMid();
        var dist = pointerDist();
        if (dist > 0) {
          setScaleAt(mid.x, mid.y, pinchStartScale * (dist / pinchStartDist));
        }
        return;
      }

      if (!dragging || event.pointerId !== dragPointerId) return;

      // HOT PATH — arithmetic only. No DOM reads. Absolute displacement.
      var sx = pageScale || 1;
      x = dragOriginX + (event.clientX - pointerOriginX) / sx;
      y = dragOriginY + (event.clientY - pointerOriginY) / sx;
      requestRender(false);
    }

    function onPointerUp(event) {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinchStartDist = 0;

      if (event.pointerId === dragPointerId || pointers.size === 0) {
        if (pointers.size === 0) {
          endDrag();
        } else if (pointers.size === 1) {
          // Resume single-finger drag from remaining pointer
          var remainingId = pointers.keys().next().value;
          var remaining = pointers.get(remainingId);
          dragging = true;
          dragPointerId = remainingId;
          pointerOriginX = remaining.x;
          pointerOriginY = remaining.y;
          dragOriginX = x;
          dragOriginY = y;
          viewport.classList.add("is-dragging");
        }
      }
    }

    function onLostCapture() {
      if (pointers.size === 0) endDrag();
    }

    function zoomButton(direction) {
      markInteracted();
      activate();
      scheduleFullAsset();
      refreshMetrics();
      stopTween();

      var nextScale = clamp(
        scale * (direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP),
        minScale,
        maxScale
      );
      var cx = vpW / 2;
      var cy = vpH / 2;
      var contentX = (cx - x) / scale;
      var contentY = (cy - y) / scale;
      softTo(nextScale, cx - contentX * nextScale, cy - contentY * nextScale);
    }

    function promoteFullImage() {
      if (fullLoaded) return;
      fullLoaded = true;
      img.hidden = false;
      shell.classList.add("is-hires");
      if (preview) {
        preview.classList.add("is-fading");
        setTimeout(function () {
          if (preview && preview.parentNode) preview.remove();
        }, 420);
      }
      applyImgSize(img);
      requestRender(true);
    }

    function requestFullAsset() {
      if (fullRequested || fullLoaded) return;
      var src = img.getAttribute("data-src");
      if (!src) return;
      fullRequested = true;
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
      // The full audit is a 38MB SVG. On a phone, keep the preview until
      // the reader zooms so unlocking the case study stays usable.
      if (
        typeof window.matchMedia === "function" &&
        window.matchMedia("(max-width: 640px)").matches
      ) {
        return;
      }
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
    viewport.addEventListener("lostpointercapture", onLostCapture);

    [preview, img].forEach(function (el) {
      if (!el) return;
      el.draggable = false;
      el.addEventListener("dragstart", function (event) {
        event.preventDefault();
      });
      el.style.pointerEvents = "none";
      el.style.userSelect = "none";
      el.setAttribute("draggable", "false");
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
      if (!centerFit(true)) return;
      reveal();
      observeFullLoad();
    }

    if (preview) {
      if (preview.complete && preview.naturalWidth) {
        readyPreview();
      } else {
        preview.addEventListener("load", readyPreview, { once: true });
        preview.addEventListener("error", readyPreview, { once: true });
        setTimeout(function () {
          if (!revealed) readyPreview();
        }, 400);
      }
    } else {
      requestFullAsset();
      img.addEventListener("load", readyPreview, { once: true });
    }

    var resizeTimer = 0;
    function onResize() {
      if (!fitted) {
        if (centerFit(true)) {
          reveal();
          observeFullLoad();
        }
        return;
      }
      var ratio = minScale ? scale / minScale : 1;
      refreshMetrics();
      if (!vpW || !vpH) return;
      layoutImage();
      scale = clamp(minScale * ratio, minScale, maxScale);
      refreshBounds();
      requestRender(true);
    }

    window.addEventListener(
      "resize",
      function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(onResize, 80);
      },
      { passive: true }
    );

    var scrollRaf = 0;
    window.addEventListener(
      "scroll",
      function () {
        if (scrollRaf || dragging) return;
        scrollRaf = requestAnimationFrame(function () {
          scrollRaf = 0;
          var rect = viewport.getBoundingClientRect();
          vpLeft = rect.left;
          vpTop = rect.top;
        });
      },
      { passive: true, capture: true }
    );

    if (typeof ResizeObserver === "function") {
      var ro = new ResizeObserver(function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(onResize, 80);
      });
      ro.observe(viewport);
    }
  }

  var workflowCleanup = null;

  function initWorkflow(root) {
    var section = root.querySelector("[data-tf-workflow]");
    if (!section || section.dataset.ready === "1") return null;

    var frame = section.querySelector("[data-tf-proto-frame]");
    var iframe = section.querySelector("[data-tf-proto]");
    var steps = section.querySelectorAll("[data-ps-step]");
    var status = section.querySelector(".tf-workflow__status");
    if (!frame || !iframe || !steps.length) return null;

    section.dataset.ready = "1";
    var PW = 1000;
    var PH = 760;
    var READABLE = 640;
    var reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) section.classList.add("is-reduced");

    var copy = {
      view: "View. Inspect the current configuration, with no editable controls.",
      edit: "Edit. Choosing Edit deliberately exposes the controls needed to make a change.",
      verify: "Verify. After saving, return to the view to review the resulting state.",
    };

    function setStep(step) {
      if (!copy[step]) return;
      Array.prototype.forEach.call(steps, function (el) {
        var on = el.getAttribute("data-ps-step") === step;
        el.classList.toggle("is-active", on);
        if (on) el.setAttribute("aria-current", "step");
        else el.setAttribute("aria-current", "false");
      });
      if (status) status.textContent = copy[step];
    }

    function fit() {
      var width = frame.clientWidth;
      if (!width) return;
      if (width < READABLE) {
        frame.style.height = PH + "px";
        frame.style.overflowX = "auto";
        frame.style.overflowY = "hidden";
        iframe.style.width = PW + "px";
        iframe.style.height = PH + "px";
        iframe.style.transform = "none";
        return;
      }
      var scale = width < PW ? width / PW : 1;
      frame.style.height = Math.round(PH * scale) + "px";
      frame.style.overflow = "hidden";
      iframe.style.width = scale < 1 ? PW + "px" : "100%";
      iframe.style.height = PH + "px";
      iframe.style.transform = scale < 1 ? "scale(" + scale + ")" : "none";
    }

    function onMessage(event) {
      if (!iframe.isConnected) {
        cleanup();
        return;
      }
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframe.contentWindow) return;
      var step = event.data && event.data.psStep;
      if (step === "view" || step === "edit" || step === "verify") setStep(step);
    }

    var ro = null;
    if (typeof ResizeObserver === "function") {
      ro = new ResizeObserver(fit);
      ro.observe(frame);
    } else {
      window.addEventListener("resize", fit);
    }
    window.addEventListener("message", onMessage);
    fit();

    function cleanup() {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("resize", fit);
      if (ro) ro.disconnect();
      if (workflowCleanup === cleanup) workflowCleanup = null;
    }

    return cleanup;
  }

  function initMobileScale(root) {
    if (!window.matchMedia || !window.matchMedia("(max-width: 640px)").matches) return;
    var table = root.querySelector(".tf-scale");
    if (!table || table.classList.contains("is-scale-tabs")) return;
    var rows = table.querySelectorAll(".tf-scale__row");
    if (!rows.length) return;
    table.classList.add("is-scale-tabs");
    rows.forEach(function (row) {
      var cells = Array.prototype.filter.call(row.querySelectorAll(".tf-scale__cell"), function (cell) {
        return !cell.classList.contains("tf-scale__cell--empty");
      });
      if (!cells.length) return;
      var tabs = document.createElement("div");
      tabs.className = "tf-scale__tabs";
      cells.forEach(function (cell, index) {
        var state = cell.querySelector(".tf-scale__state");
        var button = document.createElement("button");
        button.type = "button";
        button.className = "tf-scale__tab" + (index === 0 ? " is-on" : "");
        button.textContent = state ? state.textContent.trim() : "State";
        button.addEventListener("click", function () {
          cells.forEach(function (item, itemIndex) {
            item.classList.toggle("is-mobile-on", itemIndex === index);
          });
          Array.prototype.forEach.call(tabs.children, function (tab, tabIndex) {
            tab.classList.toggle("is-on", tabIndex === index);
          });
        });
        tabs.appendChild(button);
        cell.classList.toggle("is-mobile-on", index === 0);
      });
      var name = row.querySelector(".tf-scale__name");
      if (name) name.insertAdjacentElement("afterend", tabs);
      else row.appendChild(tabs);
    });
  }

  window.initTerraformLocked = function (root) {
    if (!root) return;
    if (workflowCleanup) workflowCleanup();
    initAuditViewer(root);
    workflowCleanup = initWorkflow(root);
    initMobileScale(root);
  };
})();
