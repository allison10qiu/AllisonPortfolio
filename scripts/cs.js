/* Shared case-study behavior. Not loaded on the homepage. */
(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function pad(n) { return String(n).padStart(2, "0"); }

  function setupIndex() {
    var count = document.querySelector("[data-idx-count]");
    // Read the rows fresh each time: Terraform adds its protected sections after unlock.
    function links() { return Array.prototype.slice.call(document.querySelectorAll(".cs-idx__link")); }
    if (!links().length) return;
    var ticking = false;
    function spy() {
      ticking = false;
      var active = null;
      document.querySelectorAll("[data-sec]").forEach(function (sec) {
        if (!sec.getClientRects().length) return; // not rendered yet
        if (sec.getBoundingClientRect().top < window.innerHeight * 0.42) active = sec.id;
      });
      var current = 0;
      var all = links();
      all.forEach(function (link, i) {
        var on = link.getAttribute("href") === "#" + active;
        if (on) {
          link.setAttribute("aria-current", "location");
          current = i + 1;
        } else link.removeAttribute("aria-current");
      });
      if (count) count.textContent = pad(Math.max(1, current)) + " / " + pad(all.length);
    }
    // One delegated listener, so rows added later behave like the ones in the page source.
    document.addEventListener("click", function (e) {
      var link = e.target.closest ? e.target.closest(".cs-idx__link") : null;
      if (!link) return;
      var id = (link.getAttribute("href") || "").slice(1);
      var el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      var top = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
    });
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(spy);
    }, { passive: true });
    // A list marked data-idx-auto holds one row per section that is actually in the page, built from
    // each section's label. Rows for sections that are not there (still locked) do not exist at all.
    var auto = document.querySelector("[data-idx-auto]");
    function sync() {
      if (auto) {
        var have = {};
        var want = {};
        links().forEach(function (link) { have[link.getAttribute("href")] = link; });
        document.querySelectorAll("[data-sec][id][data-screen-label]").forEach(function (sec) {
          var href = "#" + sec.id;
          var parts = /^(\d+)\s+(.+)$/.exec(sec.getAttribute("data-screen-label") || "");
          if (!parts || want[href]) return;
          want[href] = true;
          var link = have[href];
          if (!link) {
            link = document.createElement("a");
            link.className = "cs-idx__link";
            link.setAttribute("href", href);
            var n = document.createElement("span");
            n.className = "cs-idx__n";
            n.textContent = parts[1];
            var dot = document.createElement("span");
            dot.className = "cs-idx__dot";
            dot.setAttribute("aria-hidden", "true");
            var name = document.createElement("span");
            name.textContent = parts[2];
            link.appendChild(n);
            link.appendChild(dot);
            link.appendChild(name);
          }
          auto.appendChild(link);
        });
        links().forEach(function (link) { if (!want[link.getAttribute("href")]) link.remove(); });
        // The "more sections are protected" note only shows while the protected rows are absent.
        var note = document.querySelector("[data-idx-locked]");
        if (note) note.hidden = links().length > 1;
      }
      spy();
    }
    window.csSyncIndex = sync;
    sync();
  }

  function setupSpin() {
    if (reduced || typeof IntersectionObserver !== "function") return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        if (en.target.dataset.spun === "1") { io.unobserve(en.target); return; }
        en.target.dataset.spun = "1";
        en.target.animate(
          [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
          { duration: 1100, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
        );
        io.unobserve(en.target);
      });
    }, { threshold: 0.8 });
    document.querySelectorAll("[data-spin]").forEach(function (el) { io.observe(el); });
  }

  function setupVideos() {
    var videos = document.querySelectorAll("video");
    if (!videos.length) return;
    videos.forEach(function (v) {
      v.muted = true;
      v.defaultMuted = true;
      v.setAttribute("muted", "");
      v.playsInline = true;
      if (reduced) {
        v.removeAttribute("autoplay");
        v.pause();
        v.controls = true;
      }
    });
    if (reduced || typeof IntersectionObserver !== "function") return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else v.pause();
      });
    }, { rootMargin: "120px" });
    videos.forEach(function (v) { io.observe(v); });
  }

  function setupFullscreen() {
    function bind(el) {
      if (!el || el.dataset.fsBound === "1") return;
      el.dataset.fsBound = "1";
      if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
      if (!el.querySelector(".cs-fs-local")) {
        var local = document.createElement("button");
        local.type = "button";
        local.className = "cs-fs-local";
        local.textContent = "Full screen";
        local.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          open(el);
        });
        el.appendChild(local);
      }
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "f" || e.key === "F") {
          if (e.target !== el) return;
          e.preventDefault();
          open(el);
        }
      });
    }
    document.querySelectorAll("[data-fs]").forEach(bind);
    if (typeof MutationObserver === "function") {
      new MutationObserver(function (records) {
        records.forEach(function (record) {
          Array.prototype.forEach.call(record.addedNodes, function (node) {
            if (!node || node.nodeType !== 1) return;
            if (node.matches && node.matches("[data-fs]")) bind(node);
            if (node.querySelectorAll) node.querySelectorAll("[data-fs]").forEach(bind);
          });
        });
      }).observe(document.documentElement, { childList: true, subtree: true });
    }

    var floatBtn = document.createElement("button");
    floatBtn.type = "button";
    floatBtn.textContent = "Full screen";
    floatBtn.setAttribute("aria-label", "View full screen");
    Object.assign(floatBtn.style, {
      position: "fixed", zIndex: 40, display: "none", alignItems: "center", gap: "8px",
      padding: "8px 11px", border: "1px solid #DCDCDC", background: "rgba(255,255,255,.96)",
      color: "#181818", font: "500 12px/1 Satoshi, sans-serif"
    });
    document.body.appendChild(floatBtn);
    var hoverEl = null;
    function place(el) {
      if (!fine || !el) { floatBtn.style.display = "none"; return; }
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) { floatBtn.style.display = "none"; return; }
      floatBtn.style.display = "flex";
      floatBtn.style.top = Math.max(8, r.top + 12) + "px";
      floatBtn.style.left = Math.max(8, r.right - floatBtn.offsetWidth - 12) + "px";
    }
    document.addEventListener("mouseover", function (e) {
      var el = e.target.closest && e.target.closest("[data-fs]");
      hoverEl = el || null;
      place(hoverEl);
    });
    document.addEventListener("focusin", function (e) {
      var el = e.target.closest && e.target.closest("[data-fs]");
      if (el) { hoverEl = el; place(el); }
    });
    window.addEventListener("scroll", function () { place(hoverEl); }, { passive: true });
    floatBtn.addEventListener("click", function () { if (hoverEl) open(hoverEl); });

    var locked = null;
    function pickMedia(el) {
      return el.querySelector("img.is-on")
        || el.querySelector("video, iframe")
        || el.querySelector("img:not([hidden])")
        || el.querySelector("img");
    }
    function open(el) {
      if (locked) return;
      var media = pickMedia(el);
      var dialog = document.createElement("div");
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-label", el.getAttribute("aria-label") || "Full screen media");
      Object.assign(dialog.style, {
        position: "fixed", inset: "0", zIndex: 100, display: "flex",
        alignItems: "flex-start", justifyContent: "center",
        padding: "72px 16px 32px", boxSizing: "border-box",
        background: "rgba(12,12,12,.90)", overflow: "auto"
      });
      var close = document.createElement("button");
      close.type = "button";
      close.textContent = "Close";
      close.setAttribute("aria-label", "Close full screen");
      Object.assign(close.style, {
        position: "fixed", top: "16px", right: "20px", zIndex: 2, padding: "10px 14px",
        border: "0", borderBottom: "1px solid rgba(255,255,255,.6)", background: "transparent",
        color: "#fff", font: "500 13px/1 Satoshi, sans-serif"
      });
      var node;
      if (media && media.tagName === "IMG") {
        node = document.createElement("img");
        node.src = media.currentSrc || media.src;
        node.alt = media.alt || "";
        var natural = media.naturalWidth || 1200;
        var tall = (media.naturalHeight || 0) > (media.naturalWidth || 1) * 1.05;
        Object.assign(node.style, {
          display: "block",
          width: "min(95vw, " + natural + "px)",
          maxWidth: "95vw",
          height: "auto",
          objectFit: "contain",
          background: "#fff"
        });
        if (!tall) node.style.maxHeight = "90vh";
      } else if (media && media.tagName === "VIDEO") {
        node = media.cloneNode(true);
        node.controls = true;
        node.muted = true;
        Object.assign(node.style, {
          display: "block", maxWidth: "95vw", maxHeight: "90vh",
          width: "auto", height: "auto", objectFit: "contain", background: "#fff"
        });
      } else if (media && media.tagName === "IFRAME") {
        node = document.createElement("iframe");
        node.src = media.src;
        node.title = media.title || "";
        Object.assign(node.style, { width: "min(100%, 1100px)", height: "min(80vh, 760px)", border: "0", background: "#fff" });
      } else {
        node = document.createElement("div");
        node.textContent = el.getAttribute("aria-label") || "";
        node.style.color = "#fff";
      }
      dialog.appendChild(node);
      dialog.appendChild(close);
      var y = window.scrollY;
      var prev = document.body.style.cssText;
      document.body.style.position = "fixed";
      document.body.style.top = -y + "px";
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.appendChild(dialog);
      locked = { dialog: dialog, y: y, prev: prev, trigger: el };
      close.focus();
      if (node.tagName === "VIDEO" && !reduced) {
        var p = node.play();
        if (p && p.catch) p.catch(function () {});
      }

      function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); shut(); return; }
        if (e.key !== "Tab") return;
        var items = dialog.querySelectorAll("button, iframe, video");
        if (!items.length) { e.preventDefault(); return; }
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      function shut() {
        document.removeEventListener("keydown", onKey);
        dialog.remove();
        document.body.style.cssText = prev;
        window.scrollTo(0, y);
        if (el && el.focus) el.focus();
        locked = null;
      }
      document.addEventListener("keydown", onKey);
      close.addEventListener("click", shut);
      dialog.addEventListener("click", function (e) { if (e.target === dialog) shut(); });
    }
  }

  function setupFans() {
    var ROLES = {
      front: ["19%", "3%", "62%", "0deg", 3, 1, "0 22px 40px -18px rgba(24,24,24,.42)"],
      left: ["0%", "15%", "46%", "-6deg", 1, 1, "0 10px 22px -12px rgba(24,24,24,.32)"],
      right: ["54%", "15%", "46%", "6deg", 1, 1, "0 10px 22px -12px rgba(24,24,24,.32)"],
      back: ["27%", "12%", "46%", "0deg", 0, 0, "none"]
    };
    document.querySelectorAll("[data-carousel]").forEach(function (region) {
      var name = region.getAttribute("data-carousel");
      var slides = Array.prototype.slice.call(region.querySelectorAll(".cs-fan__slide"));
      var n = slides.length;
      var i = 0;
      var count = document.querySelector('[data-fan-count="' + name + '"]');
      var tr = reduced ? "none" : "left .38s cubic-bezier(.2,.7,.2,1), top .38s cubic-bezier(.2,.7,.2,1), width .38s cubic-bezier(.2,.7,.2,1), transform .38s cubic-bezier(.2,.7,.2,1), box-shadow .38s ease, opacity .3s ease";
      function paint() {
        slides.forEach(function (slide, j) {
          var role = j === i ? "front" : j === (i + 1) % n ? "right" : (n > 2 && j === (i + n - 1) % n) ? "left" : "back";
          var spec = ROLES[role];
          slide.style.left = spec[0];
          slide.style.top = spec[1];
          slide.style.width = spec[2];
          slide.style.aspectRatio = "4 / 3";
          slide.style.transform = "rotate(" + spec[3] + ")";
          slide.style.zIndex = String(spec[4]);
          slide.style.opacity = String(spec[5]);
          slide.style.boxShadow = spec[6];
          slide.style.cursor = role === "front" ? "default" : "";
          slide.style.transition = tr;
          if (role === "front") slide.removeAttribute("aria-hidden");
          else slide.setAttribute("aria-hidden", "true");
        });
        if (count) count.textContent = pad(i + 1) + " / " + pad(n);
      }
      function go(v) { i = (v + n) % n; paint(); }
      slides.forEach(function (slide, j) {
        slide.addEventListener("click", function () { if (j !== i) go(j); });
      });
      region.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
        if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); }
      });
      var prev = document.querySelector('[data-fan-prev="' + name + '"]');
      var next = document.querySelector('[data-fan-next="' + name + '"]');
      if (prev) prev.addEventListener("click", function () { go(i - 1); });
      if (next) next.addEventListener("click", function () { go(i + 1); });
      if (fine) {
        var acc = 0;
        var lockUntil = 0;
        region.addEventListener("wheel", function (e) {
          var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          if (!delta) return;
          e.preventDefault();
          var now = Date.now();
          if (now < lockUntil) { acc = 0; return; }
          acc += delta;
          if (Math.abs(acc) < 48) return;
          go(i + (acc > 0 ? 1 : -1));
          acc = 0;
          lockUntil = now + 520;
        }, { passive: false });
      }
      paint();
    });
  }

  function setupBoard() {
    var board = document.querySelector("[data-board]");
    if (!board) return;
    var z = 20;
    var drag = null;
    board.querySelectorAll("[data-polaroid]").forEach(function (card) {
      card.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "touch" || e.button > 0) return;
        if (window.matchMedia("(max-width: 899px)").matches) return;
        var b = board.getBoundingClientRect();
        var r = card.getBoundingClientRect();
        drag = { card: card, dx: e.clientX - r.left, dy: e.clientY - r.top };
        card.style.zIndex = String(++z);
        card.style.cursor = "grabbing";
        card.setPointerCapture(e.pointerId);
      });
      card.addEventListener("pointermove", function (e) {
        if (!drag || drag.card !== card) return;
        var b = board.getBoundingClientRect();
        var x = Math.max(-20, Math.min(b.width - card.offsetWidth + 20, e.clientX - b.left - drag.dx));
        var y = Math.max(-20, Math.min(b.height - card.offsetHeight + 20, e.clientY - b.top - drag.dy));
        card.style.left = x + "px";
        card.style.top = y + "px";
      });
      function end() {
        if (!drag || drag.card !== card) return;
        drag = null;
        card.style.cursor = "";
      }
      card.addEventListener("pointerup", end);
      card.addEventListener("pointercancel", end);
      card.addEventListener("keydown", function (e) {
        var step = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[e.key];
        if (!step) return;
        e.preventDefault();
        card.style.left = (card.offsetLeft + step[0]) + "px";
        card.style.top = (card.offsetTop + step[1]) + "px";
        card.style.zIndex = String(++z);
      });
    });
  }

  function setupRo() {
    var demo = document.querySelector("[data-ro-demo]");
    if (!demo) return;
    var phase = 0;
    var timers = [];
    function setPhase(n) {
      phase = n;
      demo.classList.remove("is-p1", "is-p2");
      if (n === 1) demo.classList.add("is-p1");
      if (n === 2) demo.classList.add("is-p2");
    }
    function play() {
      timers.forEach(clearTimeout);
      if (reduced) { setPhase(2); return; }
      setPhase(0);
      timers = [
        setTimeout(function () { setPhase(1); }, 1100),
        setTimeout(function () { setPhase(2); }, 2000)
      ];
    }
    var btn = demo.querySelector("[data-ro-replay]");
    if (btn) btn.addEventListener("click", play);
    if (typeof IntersectionObserver !== "function") { play(); return; }
    var played = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !played) { played = true; play(); io.disconnect(); }
      });
    }, { threshold: 0.4 });
    io.observe(demo);
  }

  function setupNext() {
    var section = document.querySelector("[data-next]");
    var rail = document.querySelector("[data-nw-rail]");
    var track = document.querySelector("[data-nw-track]");
    if (!section || !rail || !track) return;
    // One card per project. The current project and any repeat are removed, never hidden or cloned.
    var current = section.getAttribute("data-next");
    var seen = {};
    Array.prototype.forEach.call(section.querySelectorAll("[data-nw-clone]"), function (node) { node.remove(); });
    Array.prototype.forEach.call(track.querySelectorAll("[data-nw]"), function (card) {
      var key = card.getAttribute("data-nw");
      if (key === current || seen[key]) { card.remove(); return; }
      seen[key] = true;
    });
    var cards = Array.prototype.slice.call(track.querySelectorAll("[data-nw]"));
    var count = cards.length;
    if (count < 3) return;

    // Continuous loop without clones. `offset` is how far the strip has travelled; every card sits at
    // its own slot minus the offset, wrapped around the length of the strip, so a card that leaves
    // on one side comes back in on the other. The DOM, tab order and links never change.
    rail.classList.add("is-loop");
    var offset = 0;
    var step = 1;
    var raf = 0;
    function measure() {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      step = cards[0].offsetWidth + gap || 1;
    }
    function render() {
      var loop = step * count;
      for (var i = 0; i < count; i++) {
        var slot = i * step;
        var pos = ((slot - offset + step) % loop + loop) % loop - step;
        cards[i].style.transform = "translate3d(" + (pos - slot).toFixed(2) + "px,0,0)";
      }
    }
    function stop() { if (raf) { window.cancelAnimationFrame(raf); raf = 0; } }
    function glide(target) {
      stop();
      if (reduced) { offset = target; render(); return; }
      var from = offset;
      var start = 0;
      var ms = Math.min(520, 260 + Math.abs(target - from) * 0.35);
      function frame(now) {
        if (!start) start = now;
        var p = Math.min(1, (now - start) / ms);
        offset = from + (target - from) * (1 - Math.pow(1 - p, 3));
        render();
        raf = p < 1 ? window.requestAnimationFrame(frame) : 0;
      }
      raf = window.requestAnimationFrame(frame);
    }
    function snap(bias) { glide(Math.round((offset + (bias || 0)) / step) * step); }

    // Drag: mouse, pen and touch (the rail keeps vertical page scrolling through touch-action: pan-y).
    var drag = null;
    rail.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      stop();
      drag = { id: e.pointerId, x: e.clientX, from: offset, moved: false, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
    });
    window.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved) {
        if (Math.abs(dx) < 6) return;
        drag.moved = true;
      }
      var dt = e.timeStamp - drag.lastT;
      if (dt > 0) drag.v = (drag.lastX - e.clientX) / dt;
      drag.lastX = e.clientX;
      drag.lastT = e.timeStamp;
      offset = drag.from - dx;
      render();
    });
    function release(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var moved = drag.moved;
      var v = drag.v;
      drag = null;
      if (!moved) return;
      rail.dataset.suppress = "1";
      window.setTimeout(function () { rail.dataset.suppress = ""; }, 0);
      snap(Math.max(-step, Math.min(step, v * 220)));
    }
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    // On window, so it runs before the page-transition click handler on document.
    window.addEventListener("click", function (e) {
      if (rail.dataset.suppress !== "1") return;
      rail.dataset.suppress = "";
      if (!rail.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);
    rail.addEventListener("dragstart", function (e) { e.preventDefault(); });

    // Trackpad and wheel: horizontal movement travels the strip, then it settles on a card.
    var idle = 0;
    rail.addEventListener("wheel", function (e) {
      var dx = e.deltaX;
      if (!dx || Math.abs(dx) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (e.deltaMode === 1) dx *= 16;
      stop();
      offset += dx;
      render();
      window.clearTimeout(idle);
      idle = window.setTimeout(function () { snap(0); }, 140);
    }, { passive: false });

    // Keyboard: a focused card is brought to the front of the rail by the shorter way round.
    rail.addEventListener("focusin", function (e) {
      var i = cards.indexOf(e.target.closest ? e.target.closest("[data-nw]") : null);
      if (i < 0 || drag) return;
      var loop = step * count;
      var pos = ((i * step - offset + step) % loop + loop) % loop - step;
      if (pos >= 0 && pos + cards[i].offsetWidth <= rail.clientWidth + 1) return;
      var delta = ((i * step - offset) % loop + loop) % loop;
      if (delta > loop / 2) delta -= loop;
      glide(offset + delta);
    });
    rail.addEventListener("scroll", function () { rail.scrollLeft = 0; });

    window.addEventListener("resize", function () {
      var index = Math.round(offset / step);
      stop();
      measure();
      offset = index * step;
      render();
    });
    measure();
    render();
  }

  function setupGemPit() {
    var pit = document.querySelector(".cs-footer [data-gem-pit]");
    if (!pit || pit.dataset.ready === "1") return;
    pit.dataset.ready = "1";
    var host = pit.parentElement;
    if (!host) return;
    function gemSrc(i) { return "/assets/home/gems/gem-" + (i % 11) + ".png?v=claude1"; }
    var CELL = 24;
    var grid = new Map();
    function paint(gems) {
      gems.forEach(function (g) {
        var t = "translate3d(" + (g.x - g.r).toFixed(1) + "px," + (g.y - g.r).toFixed(1) + "px,0) rotate(" + g.a.toFixed(0) + "deg)";
        if (g.t !== t) { g.el.style.transform = t; g.t = t; }
      });
    }
    function collide(gems) {
      var it, a, b, ox, oy, c, dx, dy, min, d2, d, nx, ny, o, rv, imp, cx, cy, k;
      for (it = 0; it < 2; it++) {
        grid.clear();
        gems.forEach(function (g) {
          k = ((g.x / CELL) | 0) + "," + ((g.y / CELL) | 0);
          c = grid.get(k);
          if (!c) grid.set(k, (c = []));
          c.push(g);
        });
        for (a of gems) {
          cx = (a.x / CELL) | 0;
          cy = (a.y / CELL) | 0;
          for (ox = -1; ox <= 1; ox++) for (oy = -1; oy <= 1; oy++) {
            c = grid.get((cx + ox) + "," + (cy + oy));
            if (!c) continue;
            for (b of c) {
              if (b === a || b.x < a.x || (b.x === a.x && b.y <= a.y)) continue;
              dx = b.x - a.x;
              dy = b.y - a.y;
              min = (a.r + b.r) * 0.92;
              d2 = dx * dx + dy * dy;
              if (d2 < min * min && d2 > 0.0001) {
                d = Math.sqrt(d2);
                nx = dx / d;
                ny = dy / d;
                o = (min - d) / 2;
                a.x -= nx * o;
                a.y -= ny * o;
                b.x += nx * o;
                b.y += ny * o;
                rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                if (rv < 0) {
                  imp = -rv * 0.6;
                  a.vx -= nx * imp;
                  a.vy -= ny * imp;
                  b.vx += nx * imp;
                  b.vy += ny * imp;
                }
              }
            }
          }
        }
      }
    }
    function build(W, H) {
      var n = Math.max(80, Math.min(200, Math.round(W * 0.17)));
      var gems = [];
      var frag = document.createDocumentFragment();
      for (var i = 0; i < n; i++) {
        var r = 6 + Math.random() * 5;
        var el = document.createElement("img");
        el.draggable = false;
        el.alt = "";
        el.src = gemSrc(i);
        el.style.cssText = "position:absolute;left:0;top:0;width:" + (r * 2) + "px;height:" + (r * 2) + "px;pointer-events:none;will-change:transform;";
        frag.appendChild(el);
        gems.push({
          el: el, r: r,
          x: r + Math.random() * Math.max(1, W - 2 * r),
          y: -Math.random() * H * 1.6 - r,
          vx: (Math.random() - 0.5) * 2, vy: 0, a: Math.random() * 360
        });
      }
      pit.appendChild(frag);
      return gems;
    }
    var W = pit.clientWidth || host.clientWidth;
    var H = pit.clientHeight || host.clientHeight;
    var gems = build(W, H);
    pit.style.filter = "drop-shadow(0 3px 4px rgba(24,24,24,.18))";
    var ptr = null, raf = 0, visible = false, awake = true, calm = 0;
    var MAX = gems.length + 220;
    function wake() { if (reduced) return; awake = true; calm = 0; if (visible && !raf) raf = requestAnimationFrame(step); }
    function rel(e) {
      var b = pit.getBoundingClientRect();
      return { x: e.clientX - b.left, y: e.clientY - b.top };
    }
    function inside(p) { return p.x >= 0 && p.y >= 0 && p.x <= W && p.y <= H; }
    function addGem(x, y) {
      var r = 6 + Math.random() * 5;
      var el = document.createElement("img");
      el.draggable = false;
      el.alt = "";
      el.src = gemSrc(Math.floor(Math.random() * 11));
      el.style.cssText = "position:absolute;left:0;top:0;width:" + (r * 2) + "px;height:" + (r * 2) + "px;pointer-events:none;";
      pit.appendChild(el);
      var ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      var sp = 3 + Math.random() * 5;
      gems.push({ el: el, r: r, x: Math.min(W - r, Math.max(r, x)), y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, a: Math.random() * 360 });
      if (gems.length > MAX) gems.shift().el.remove();
    }
    host.addEventListener("pointermove", function (e) {
      var p = rel(e);
      ptr = inside(p) ? p : null;
      if (ptr) wake();
    }, { passive: true });
    host.addEventListener("pointerdown", function (e) {
      if (reduced) return;
      if (e.target.closest && e.target.closest("a, button")) return;
      var p = rel(e);
      if (!inside(p)) return;
      var k = 8 + Math.floor(Math.random() * 5);
      for (var i = 0; i < k; i++) addGem(p.x + (Math.random() - 0.5) * 16, p.y + (Math.random() - 0.5) * 16);
      wake();
    });
    host.addEventListener("pointerleave", function () { ptr = null; });
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(function () {
        W = pit.clientWidth;
        H = pit.clientHeight;
        wake();
      }).observe(pit);
    }
    function tick() {
      var energy = 0;
      gems.forEach(function (g) {
        g.px = g.x;
        g.py = g.y;
        g.vy += 0.45;
        g.vx *= 0.99;
        g.vy *= 0.995;
        if (ptr) {
          var dx = g.x - ptr.x, dy = g.y - ptr.y, R = g.r + 34;
          if (dx * dx + dy * dy < R * R) {
            var d = Math.hypot(dx, dy) || 0.1;
            var k = (R - d) / R;
            g.x += dx / d * (R - d) * 0.35;
            g.y += dy / d * (R - d) * 0.35;
            g.vx += dx / d * k * 2.5;
            g.vy += dy / d * k * 2.5 - 0.3;
          }
        }
        g.x += g.vx;
        g.y += g.vy;
        if (Math.abs(g.vx) > 0.05) g.a += g.vx * 1.6;
        if (g.y > H - g.r) { g.y = H - g.r; g.vy *= -0.3; g.vx *= 0.85; }
        if (g.x < g.r) { g.x = g.r; g.vx *= -0.5; }
        else if (g.x > W - g.r) { g.x = W - g.r; g.vx *= -0.5; }
      });
      collide(gems);
      gems.forEach(function (g) {
        var m = Math.abs(g.x - g.px) + Math.abs(g.y - g.py);
        if (m < 0.08) {
          g.x = g.px;
          g.y = g.py;
          if (Math.abs(g.vx) < 0.1) g.vx = 0;
          if (Math.abs(g.vy) < 1) g.vy = 0;
        }
        energy += m;
      });
      paint(gems);
      return energy;
    }
    function step() {
      raf = 0;
      var energy = tick();
      calm = (!ptr && energy / gems.length < 0.05) ? calm + 1 : 0;
      if (calm > 30) { awake = false; return; }
      if (visible && awake) raf = requestAnimationFrame(step);
    }
    if (reduced) {
      var guard = 0;
      while (guard < 900 && (guard < 80 || calm <= 30)) {
        calm = tick() / gems.length < 0.05 ? calm + 1 : 0;
        guard++;
      }
      awake = false;
      return;
    }
    if (typeof IntersectionObserver === "function") {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && awake && !raf) raf = requestAnimationFrame(step);
        else if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
      }).observe(pit);
    } else {
      visible = true;
      raf = requestAnimationFrame(step);
    }
  }

  setupIndex();
  setupSpin();
  setupVideos();
  setupFullscreen();
  setupFans();
  setupBoard();
  setupRo();
  setupNext();
  setupGemPit();
})();
