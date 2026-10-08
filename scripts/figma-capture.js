/* Settles the page for a webpage-to-Figma capture. No effect without ?figma=1. */
(function () {
  if (!document.documentElement.classList.contains("figma-capture")) return;

  function settle() {
    window.scrollTo(0, 0);
    document.querySelectorAll("video").forEach(function (video) {
      video.removeAttribute("autoplay");
      video.autoplay = false;
      try {
        video.pause();
        video.currentTime = 0;
      } catch (e) {}
    });
    document.querySelectorAll(".mk-browser__view, .mk-phone__view, .mk-plain, .cs-strip, [data-carousel]").forEach(function (el) {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    });
    document.querySelectorAll("dialog[open]").forEach(function (dialog) {
      if (typeof dialog.close === "function") dialog.close();
    });
  }

  if (document.readyState === "complete") settle();
  else window.addEventListener("load", settle);
  setTimeout(settle, 500);
  setTimeout(settle, 1500);
})();
