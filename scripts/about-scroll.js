/**
 * About page — convert vertical wheel to horizontal scroll
 * when the pointer is over a card track.
 */
(function () {
  var tracks = document.querySelectorAll(".about-scroll");
  if (!tracks.length) return;

  tracks.forEach(function (el) {
    el.addEventListener(
      "wheel",
      function (event) {
        if (el.scrollWidth <= el.clientWidth) return;
        // Prefer horizontal delta when present; otherwise map vertical.
        var dx = event.deltaX;
        var dy = event.deltaY;
        if (Math.abs(dx) > Math.abs(dy)) return;
        if (dy === 0) return;

        var max = el.scrollWidth - el.clientWidth;
        var next = Math.min(max, Math.max(0, el.scrollLeft + dy));
        if (next !== el.scrollLeft) {
          el.scrollLeft = next;
          event.preventDefault();
        }
      },
      { passive: false }
    );
  });
})();
