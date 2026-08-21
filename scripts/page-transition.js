/**
 * Seamless curtain wipe (no flash of the next page):
 * 1) On click — panel rises from bottom and covers this page
 * 2) Navigate while fully covered
 * 3) On the new page — head script keeps a solid cover until JS
 *    continues the panel upward off-screen
 */
(function () {
  var SCROLL_KEY = "aq-scroll-to";
  var WIPE_ACTIVE = "aq-wipe-active";
  var WIPE_COLOR = "aq-wipe-color";
  var NAVY = "#14243b";
  var WHITE = "#ffffff";
  var HALF_MS = 600;
  var LINK_SEL =
    "a.home-card, a.work-card, a.design-hotspot, a.work-hotspot--tab, a.bc-stamp, a.bc-header__name, a.about-cta, a.bc-btn[href]";

  function reduced() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function wipeEl() {
    return document.querySelector(".vt-wipe");
  }

  function wipeColorForPath(pathname) {
    var p = (pathname || "/").replace(/\.html$/, "");
    if (p === "" || p === "/") return NAVY;
    return WHITE;
  }

  function isModifiedClick(e) {
    return (
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    );
  }

  function resetWipeBelow(wipe) {
    wipe.classList.remove("is-animating");
    wipe.style.transition = "none";
    wipe.style.transform = "translate3d(0, 100%, 0)";
    void wipe.offsetWidth;
  }

  function revealIfNeeded() {
    var pending = false;
    var color = WHITE;
    try {
      pending = sessionStorage.getItem(WIPE_ACTIVE) === "1";
      color = sessionStorage.getItem(WIPE_COLOR) || WHITE;
      sessionStorage.removeItem(WIPE_ACTIVE);
    } catch (_) {}

    if (!pending) {
      document.documentElement.classList.remove("aq-wipe-cover");
      return;
    }

    if (reduced()) {
      document.documentElement.classList.remove("aq-wipe-cover");
      try {
        sessionStorage.removeItem(WIPE_COLOR);
      } catch (_) {}
      return;
    }

    var wipe = wipeEl();
    if (!wipe) {
      document.documentElement.classList.remove("aq-wipe-cover");
      return;
    }

    wipe.style.background = color;
    wipe.style.transition = "none";
    wipe.style.transform = "translate3d(0, 0, 0)";
    void wipe.offsetWidth;

    // Drop the html::before cover; .vt-wipe is already fully covering
    document.documentElement.classList.remove("aq-wipe-cover");

    requestAnimationFrame(function () {
      wipe.classList.add("is-animating");
      wipe.style.transition =
        "transform " + HALF_MS + "ms cubic-bezier(0.76, 0, 0.24, 1)";
      wipe.style.transform = "translate3d(0, -100%, 0)";

      var done = false;
      function finish() {
        if (done) return;
        done = true;
        resetWipeBelow(wipe);
        try {
          sessionStorage.removeItem(WIPE_COLOR);
        } catch (_) {}
      }

      wipe.addEventListener("transitionend", finish, { once: true });
      window.setTimeout(finish, HALF_MS + 80);
    });
  }

  function coverThenGo(href, color) {
    var wipe = wipeEl();
    if (!wipe || reduced()) {
      try {
        sessionStorage.setItem(SCROLL_KEY, sessionStorage.getItem(SCROLL_KEY) || "");
      } catch (_) {}
      window.location.assign(href);
      return;
    }

    wipe.style.background = color;
    document.documentElement.style.setProperty("--aq-wipe-color", color);
    wipe.classList.add("is-animating");
    wipe.style.transition =
      "transform " + HALF_MS + "ms cubic-bezier(0.76, 0, 0.24, 1)";

    // Start from below if needed, then cover
    if (!wipe.style.transform || wipe.style.transform.indexOf("100%") !== -1) {
      wipe.style.transform = "translate3d(0, 100%, 0)";
      void wipe.offsetWidth;
    }

    requestAnimationFrame(function () {
      wipe.style.transform = "translate3d(0, 0, 0)";
    });

    var navigated = false;
    function go() {
      if (navigated) return;
      navigated = true;
      try {
        sessionStorage.setItem(WIPE_ACTIVE, "1");
        sessionStorage.setItem(WIPE_COLOR, color);
      } catch (_) {}
      window.location.assign(href);
    }

    wipe.addEventListener("transitionend", go, { once: true });
    window.setTimeout(go, HALF_MS + 80);
  }

  document.addEventListener(
    "click",
    function (e) {
      var link = e.target && e.target.closest ? e.target.closest(LINK_SEL) : null;
      if (!link) return;
      if (link.classList.contains("home-card--soon")) return;
      if (link.classList.contains("work-card--soon")) return;
      if (link.classList.contains("about-cta--resume")) return;
      if (e.defaultPrevented) return;
      if (isModifiedClick(e)) return;
      if (link.target && link.target !== "_self") return;

      var href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;

      var url;
      try {
        url = new URL(href, location.href);
      } catch (_) {
        return;
      }
      if (url.origin !== location.origin) return;

      var scrollTo = link.getAttribute("data-scroll-to");
      if (scrollTo && document.getElementById(scrollTo)) return;
      if (url.pathname === location.pathname && url.hash) return;

      if (scrollTo && !document.getElementById(scrollTo)) {
        try {
          sessionStorage.setItem(SCROLL_KEY, scrollTo);
        } catch (_) {}
      }

      document.querySelectorAll("video").forEach(function (v) {
        try {
          v.pause();
        } catch (_) {}
      });

      var destColor = wipeColorForPath(url.pathname);
      if (scrollTo === "my-work") destColor = NAVY;

      e.preventDefault();
      e.stopPropagation();

      if (reduced()) {
        window.location.assign(url.pathname + url.search);
        return;
      }

      coverThenGo(url.pathname + url.search, destColor);
    },
    true
  );

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", revealIfNeeded);
  } else {
    revealIfNeeded();
  }
})();
