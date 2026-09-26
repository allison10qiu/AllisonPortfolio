/**
 * Shared case-study rail, marquee, and in-page scroll for .case-final pages.
 * Mirrors Brilliant Cities (brilliant-final.js) without loading on that page.
 */
(function () {
  var root = document.querySelector(".case-final");
  if (!root) return;

  function reduced() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  root.querySelectorAll("[data-preview-track], [data-showcase]").forEach(function (track) {
    if (track.dataset.ready === "1") return;
    var kids = Array.prototype.slice.call(track.children);
    kids.forEach(function (kid) {
      var clone = kid.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("img").forEach(function (img) {
        img.setAttribute("alt", "");
      });
      track.appendChild(clone);
    });
    track.dataset.ready = "1";
    track.classList.add("is-ready");
    startMobileStrip(track);
  });

  function startMobileStrip(track) {
    var strip = track.closest(".cs-strip");
    if (!strip || strip.dataset.stripPause === "1") return;
    strip.dataset.stripPause = "1";
    var pointers = 0;
    function hold(on) {
      if (!window.matchMedia("(max-width: 640px)").matches || reduced()) return;
      track.style.animationPlayState = on ? "paused" : "running";
    }
    strip.addEventListener("pointerdown", function () {
      pointers += 1;
      hold(true);
    });
    function release() {
      pointers = Math.max(0, pointers - 1);
      if (!pointers) hold(false);
    }
    strip.addEventListener("pointerup", release);
    strip.addEventListener("pointercancel", release);
  }

  function scrollToId(id) {
    var target = document.getElementById(id);
    if (!target) return false;

    var railCol = document.querySelector(".bf-rail-col");
    var offset = 24;
    if (railCol && window.getComputedStyle(railCol).position === "sticky") {
      offset = railCol.getBoundingClientRect().height + 16;
    }

    var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: reduced() ? "auto" : "smooth"
    });
    return true;
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest ? e.target.closest("[data-bf-scroll]") : null;
    if (!trigger || !root.contains(trigger)) return;

    var id = (trigger.getAttribute("data-bf-scroll") || "").replace(/^#/, "");
    if (!id) return;
    if (!scrollToId(id)) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
  });

  var items = Array.prototype.slice.call(root.querySelectorAll(".bf-rail__item"));
  var fill = root.querySelector(".bf-rail__fill");
  var active = -1;

  function sectionsNow() {
    return items
      .map(function (item) {
        var link = item.querySelector("[data-bf-scroll]");
        var id = link
          ? (link.getAttribute("data-bf-scroll") || "").replace(/^#/, "")
          : "";
        var el = id ? document.getElementById(id) : null;
        item.classList.toggle("is-locked", !el);
        return { item: item, el: el };
      })
      .filter(function (entry) {
        return entry.el;
      });
  }

  function docTop(el) {
    return el.getBoundingClientRect().top + window.pageYOffset;
  }

  function update() {
    var sections = sectionsNow();
    if (!sections.length) return;

    var line = window.pageYOffset + window.innerHeight * 0.33;
    var tops = sections.map(function (entry) {
      return docTop(entry.el);
    });

    var next = 0;
    for (var i = 0; i < sections.length; i++) {
      if (tops[i] <= line) next = i;
    }

    if (next !== active) {
      active = next;
      items.forEach(function (item) {
        item.classList.remove("is-active", "is-done");
      });
      for (var j = 0; j < sections.length; j++) {
        var item = sections[j].item;
        item.classList.toggle("is-active", j === active);
        item.classList.toggle("is-done", j < active);
      }
    }

    if (fill) {
      var steps = Math.max(1, sections.length - 1);
      fill.style.setProperty("--bf-progress", (active / steps).toFixed(4));
    }
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(update);
  }
  update();

  var locked = document.getElementById("terraform-locked");
  if (locked && typeof MutationObserver === "function") {
    var timer = 0;
    new MutationObserver(function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        active = -1;
        update();
      }, 60);
    }).observe(locked, { childList: true, subtree: true });
  }
})();
