/**
 * Brilliant Cities case study (final rebuild).
 *
 * - Sticky rail: active section + progress fill driven by scroll position.
 * - Marquee: duplicates the phone group so the -50% keyframe wraps seamlessly.
 * - Smooth scroll for the rail links and the "Jump to Final Product" button.
 */
(function () {
  var root = document.querySelector(".brilliant-final");
  if (!root) return;

  function reduced() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /* ---------- Marquee ---------- */

  (function initMarquee() {
    var marquee = document.querySelector(".bf-marquee");
    if (!marquee) return;

    var track = marquee.querySelector(".bf-marquee__track");
    var group = marquee.querySelector(".bf-marquee__group");
    if (!track || !group) return;

    var clone = group.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("img").forEach(function (img) {
      img.setAttribute("alt", "");
    });
    track.appendChild(clone);

    marquee.classList.add("is-ready");
  })();

  /* ---------- Smooth scroll ---------- */

  function scrollToId(id) {
    var target = document.getElementById(id);
    if (!target) return false;

    // The rail collapses to a sticky top bar below 1024, so clear it.
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
    var trigger = e.target.closest
      ? e.target.closest("[data-bf-scroll]")
      : null;
    if (!trigger) return;

    var id = (trigger.getAttribute("data-bf-scroll") || "").replace(/^#/, "");
    if (!id) return;
    if (!scrollToId(id)) return;

    e.preventDefault();
  });

  /* ---------- Rail progress + active section ---------- */

  (function initRail() {
    var items = Array.prototype.slice.call(
      document.querySelectorAll(".bf-rail__item")
    );
    if (!items.length) return;

    var fill = document.querySelector(".bf-rail__fill");
    var sections = items
      .map(function (item) {
        var link = item.querySelector("[data-bf-scroll]");
        var id = link
          ? (link.getAttribute("data-bf-scroll") || "").replace(/^#/, "")
          : "";
        return { item: item, el: id ? document.getElementById(id) : null };
      })
      .filter(function (entry) {
        return entry.el;
      });

    if (!sections.length) return;

    var active = -1;

    function docTop(el) {
      return el.getBoundingClientRect().top + window.pageYOffset;
    }

    // Cheap enough (six rects) to run straight off the scroll event.
    function update() {
      // A section counts as current once its top passes ~1/3 of the viewport.
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
        for (var j = 0; j < sections.length; j++) {
          var item = sections[j].item;
          item.classList.toggle("is-active", j === active);
          item.classList.toggle("is-done", j < active);
        }
      }

      if (fill) {
        // Snap the line to the current section so it never runs through
        // unfilled upcoming dots. Filled dots sit on top and cover it.
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
  })();
})();
