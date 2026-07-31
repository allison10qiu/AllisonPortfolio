/**
 * Cross-page scroll handoff without putting a hash in the URL.
 * Same-page targets are left to home-snap.js / case-snap.js.
 *
 * Usage: <a href="/" data-scroll-to="my-work">…</a>
 * On the destination page, the snap script reads sessionStorage key aq-scroll-to.
 */
(function () {
  var KEY = "aq-scroll-to";

  document.querySelectorAll("a[data-scroll-to]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("data-scroll-to");
      if (!id) return;

      // Target exists here — page snap script owns the scroll.
      if (document.getElementById(id)) return;

      e.preventDefault();
      try {
        sessionStorage.setItem(KEY, id);
      } catch (err) {}

      var href = link.getAttribute("href") || "/";
      var clean = href.split("#")[0] || "/";
      window.location.assign(clean);
    });
  });
})();
