/**
 * Open mailto: links reliably (helps when parent CSS transforms
 * interfere with default anchor navigation).
 */
(function () {
  document.querySelectorAll('a[href^="mailto:"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      window.location.href = link.getAttribute("href");
    });
  });
})();
