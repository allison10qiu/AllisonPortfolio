/**
 * Open mailto: links reliably (helps when parent CSS transforms
 * interfere with default anchor navigation).
 */
(function () {
  document.querySelectorAll('a[href^="mailto:"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      // Links marked target="_blank" open the mail client from a new tab; others use the current one.
      if (link.target === "_blank") window.open(link.getAttribute("href"), "_blank", "noopener");
      else window.location.href = link.getAttribute("href");
    });
  });
})();
