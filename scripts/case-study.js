/* Case study behavior: chapter spy for sidebar and phone bar, annotation tooltips, step tabs, Add Partner flow, scroll reveal, video autoplay. */
(function () {
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Read fresh each time: protected chapters (Terraform) are added after unlock.
  function chaptersNow() { return [].slice.call(document.querySelectorAll("[data-np-ch]")); }
  function linksNow() { return [].slice.call(document.querySelectorAll(".np-link")); }
  var track = document.querySelector("[data-np-track]");
  var current = null;

  var head = document.querySelector(".site-header");
  function headH() { return head && /sticky|fixed/.test(getComputedStyle(head).position) ? head.offsetHeight : 0; }
  function setHead() { document.documentElement.style.setProperty("--np-head", headH() + "px"); }
  setHead(); addEventListener("resize", setHead);
  // Space taken at the top of the window: the sticky site header plus the chapter bar when it shows.
  function barH() { var b = document.querySelector(".np-bar"); return headH() + (b && b.offsetParent ? b.offsetHeight : 0); }

  function spy() {
    var line = Math.max(barH() + 80, innerHeight * 0.35), id = null;
    chaptersNow().forEach(function (c) { if (c.getClientRects().length && c.getBoundingClientRect().top < line) id = c.id; });
    if (id === current) return;
    current = id;
    linksNow().forEach(function (a) {
      if (a.getAttribute("href") === "#" + id) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
    // Keep the active chapter visible in the mobile bar.
    var on = track && track.querySelector('[aria-current="location"]');
    if (on && track.scrollWidth > track.clientWidth) {
      var target = on.offsetLeft - (track.clientWidth - on.offsetWidth) / 2;
      track.scrollTo({ left: Math.max(0, target), behavior: reduced ? "auto" : "smooth" });
    } else if (!on && track) track.scrollTo({ left: 0 });
  }
  function edges() {
    if (!track) return;
    var max = track.scrollWidth - track.clientWidth;
    track.classList.toggle("is-mid", track.scrollLeft > 4 && track.scrollLeft < max - 4);
    track.classList.toggle("is-end", max > 0 && track.scrollLeft >= max - 4);
  }
  if (track) { track.addEventListener("scroll", edges, { passive: true }); edges(); }
  var ticking = false;
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; spy(); }); } }, { passive: true });
  addEventListener("resize", spy);
  spy();

  // Locked chapter links point at the gate until their chapter exists, then at the chapter itself.
  function syncLocked() {
    document.querySelectorAll(".np-link[data-np-href]").forEach(function (a) {
      var id = a.getAttribute("data-np-href").slice(1), el = document.getElementById(id);
      var open = !!(el && el.getClientRects().length);
      a.setAttribute("href", open ? "#" + id : "#gate");
      a.classList.toggle("is-locked", !open);
      if (open) a.removeAttribute("aria-label"); else a.setAttribute("aria-label", a.textContent.trim() + " (password protected)");
    });
  }
  syncLocked();
  if (document.querySelector(".np-link[data-np-href]") && "MutationObserver" in window) {
    new MutationObserver(function () { syncLocked(); current = null; spy(); }).observe(document.querySelector(".np-main") || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest(".np-link") : null;
    if (!a) return;
    var el = document.getElementById(a.getAttribute("href").slice(1));
    if (!el) return;
    e.preventDefault();
    var top = el.getBoundingClientRect().top + scrollY - barH() - 24;
    scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
    history.replaceState(null, "", "#" + el.id);
    setTimeout(spy, reduced ? 0 : 600); // settle the active chapter even if no scroll frame fires
  });

  // Markers: hover, focus or tap a number to see its note in a tooltip.
  var tipN = 0;
  document.querySelectorAll("[data-annot]").forEach(function (fig) {
    var pins = [].slice.call(fig.querySelectorAll(".np-pin"));
    var notes = fig.querySelectorAll(".np-notes li");
    var frame = fig.querySelector(".np-pins");
    var tip = document.createElement("div");
    tip.className = "np-tip"; tip.setAttribute("role", "tooltip"); tip.id = "np-tip-" + (++tipN); tip.hidden = true;
    fig.appendChild(tip);
    var open = null, pinned = false;
    function show(pin, i) {
      if (!notes[i]) return;
      pins.forEach(function (p) { p.classList.toggle("is-hot", p === pin); p.setAttribute("aria-expanded", p === pin); });
      tip.innerHTML = notes[i].innerHTML; tip.hidden = false; open = pin;
      var f = fig.getBoundingClientRect(), r = pin.getBoundingClientRect();
      var x = r.left - f.left + r.width / 2, y = r.top - f.top;
      var w = tip.offsetWidth, h = tip.offsetHeight;
      var left = Math.min(Math.max(x - w / 2, 8), f.width - w - 8);
      var below = y - h - 12 < 0;
      tip.style.left = left + "px";
      tip.style.top = (below ? y + r.height + 12 : y - h - 12) + "px";
      tip.classList.toggle("is-below", below);
      tip.style.setProperty("--ax", (x - left) + "px");
    }
    function hide() { if (pinned) return; tip.hidden = true; open = null; pins.forEach(function (p) { p.classList.remove("is-hot"); p.setAttribute("aria-expanded", "false"); }); }
    pins.forEach(function (pin, i) {
      var label = notes[i] ? notes[i].textContent.trim() : "";
      pin.setAttribute("role", "button"); pin.tabIndex = 0; pin.setAttribute("aria-label", pin.textContent + ": " + label);
      pin.setAttribute("aria-describedby", tip.id); pin.setAttribute("aria-expanded", "false");
      pin.addEventListener("mouseenter", function () { if (!pinned) show(pin, i); });
      pin.addEventListener("mouseleave", hide);
      pin.addEventListener("focus", function () { show(pin, i); });
      pin.addEventListener("blur", function () { pinned = false; hide(); });
      pin.addEventListener("click", function (e) {
        e.stopPropagation();
        if (pinned && open === pin) { pinned = false; hide(); } else { pinned = true; show(pin, i); }
      });
      pin.addEventListener("keydown", function (e) { if (e.key === "Escape") { pinned = false; hide(); pin.blur(); } });
      if (notes[i]) {
        notes[i].addEventListener("mouseenter", function () { pin.classList.add("is-hot"); });
        notes[i].addEventListener("mouseleave", function () { if (open !== pin) pin.classList.remove("is-hot"); });
      }
    });
    document.addEventListener("click", function (e) { if (!fig.contains(e.target)) { pinned = false; hide(); } });
    addEventListener("resize", function () { if (open) show(open, pins.indexOf(open)); });
  });

  // Step tabs (arrow keys move between them).
  document.querySelectorAll("[data-demo]").forEach(function (demo) {
    var tabs = [].slice.call(demo.querySelectorAll('[role="tab"]'));
    function select(t) {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        var n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        select(n); n.focus(); e.preventDefault();
      });
    });
  });

  // Scroll reveal: each block in a chapter fades up as it comes into view.
  // Re-scanned when chapters are added later (Terraform's protected chapters arrive after unlock).
  if (!reduced && "IntersectionObserver" in window) {
    var SEL = ".np-hero > *, .np-ch > *, .np-chain > li, .np-dec > *";
    document.documentElement.classList.add("np-reveal-on");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, sibs = [].slice.call(el.parentElement.children).filter(function (x) { return x.classList.contains("np-rv") && !x.classList.contains("is-in"); });
        el.style.transitionDelay = Math.min(sibs.indexOf(el), 3) * 70 + "ms";
        el.classList.add("is-in"); io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    var revealScan = function () {
      [].slice.call(document.querySelectorAll(SEL)).forEach(function (el) {
        if (el.classList.contains("np-rv") || (el.closest(".np-chain") && !el.matches(".np-chain > li"))) return;
        el.classList.add("np-rv"); io.observe(el);
      });
    };
    revealScan();
    var lockedBox = document.getElementById("terraform-locked");
    if (lockedBox && "MutationObserver" in window) {
      new MutationObserver(function () { revealScan(); }).observe(lockedBox, { childList: true, subtree: true });
    }
  }

  // Add Partner, in context: open the modal over the table, pick a role, create the partner.
  document.querySelectorAll("[data-ap]").forEach(function (ap) {
    var open = ap.querySelector(".np-ap__open"), scrim = ap.querySelector(".np-ap__scrim"), modal = ap.querySelector(".np-ap__modal");
    var scroller = ap.querySelector(".np-ap__scroll"), imgs = ap.querySelectorAll("img[data-s]"), cap = ap.querySelector("[data-ap-cap]");
    var hit = function (n) { return ap.querySelector('[data-hit="' + n + '"]'); };
    var state = 1, before = 1;
    var caps = {
      table: "Scroll the table sideways, then select Add Partner to try the flow.",
      1: "The form opens over the table. Choose an Assigned NABU Role.",
      2: "Admins choose from the roles that already exist.",
      3: "Role chosen. Select Create Partner to finish.",
      need: "Choose a NABU role before creating the partner.",
      done: "Back in the table, without leaving the page."
    };
    function show(n) {
      state = n;
      imgs.forEach(function (im) { im.hidden = im.getAttribute("data-s") !== String(n); });
      hit("role").hidden = n !== 2; hit("create").hidden = n === 2;
      hit("field").setAttribute("aria-expanded", n === 2);
      ap.setAttribute("data-step", n);
      cap.textContent = caps[n];
    }
    function toBottom() { scroller.scrollTo({ top: scroller.scrollHeight, behavior: reduced ? "auto" : "smooth" }); }
    function openModal() {
      scrim.hidden = false; modal.hidden = false; show(1); scroller.scrollTop = 0;
      requestAnimationFrame(function () { ap.classList.add("is-open"); });
      setTimeout(function () { toBottom(); hit("field").focus({ preventScroll: true }); }, reduced ? 0 : 450);
    }
    function closeModal(msg) {
      ap.classList.remove("is-open"); ap.setAttribute("data-step", "table");
      setTimeout(function () { scrim.hidden = true; modal.hidden = true; }, reduced ? 0 : 250);
      cap.textContent = msg || caps.table; open.focus({ preventScroll: true });
    }
    var pan = ap.querySelector(".np-ap__pan");
    function edges() { var max = pan.scrollWidth - pan.clientWidth; ap.classList.toggle("is-start", pan.scrollLeft < 4); ap.classList.toggle("is-end", pan.scrollLeft > max - 4); }
    pan.addEventListener("scroll", edges, { passive: true }); addEventListener("resize", edges); edges();
    open.addEventListener("click", openModal);
    scrim.addEventListener("click", function () { closeModal(); });
    hit("close").addEventListener("click", function () { closeModal(); });
    hit("field").addEventListener("click", function () {
      if (state === 2) show(before); else { before = state; show(2); setTimeout(toBottom, 30); hit("role").focus({ preventScroll: true }); }
    });
    hit("role").addEventListener("click", function () { show(3); hit("create").focus({ preventScroll: true }); });
    hit("create").addEventListener("click", function () {
      if (state !== 3) { cap.textContent = caps.need; hit("field").focus({ preventScroll: true }); ap.classList.remove("is-nudge"); void ap.offsetWidth; ap.classList.add("is-nudge"); return; }
      closeModal(caps.done);
    });
    ap.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || modal.hidden) return;
      if (state === 2) { show(before); hit("field").focus(); } else closeModal();
    });
  });

  // Play the design-system video while it is on screen.
  var v = document.querySelector("[data-np-autoplay]");
  if (v && !reduced && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? v.play().catch(function () {}) : v.pause(); }); }, { threshold: 0.4 }).observe(v);
  } else if (v) v.controls = true;
})();
