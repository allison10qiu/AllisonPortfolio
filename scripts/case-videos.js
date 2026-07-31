/**
 * Case-study phone videos — play when scrolled into view.
 */
(function () {
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setupVideo(video) {
    var playing = false;

    function play() {
      if (playing || REDUCE) return;
      playing = true;
      video.muted = true;
      var p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(function () {
          video.addEventListener(
            "canplay",
            function () {
              if (playing) video.play().catch(function () {});
            },
            { once: true }
          );
          video.load();
        });
      }
    }

    function pause() {
      if (!playing) return;
      playing = false;
      video.pause();
      try {
        video.currentTime = 0;
      } catch (e) {}
    }

    if (!("IntersectionObserver" in window)) {
      play();
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
            play();
          } else {
            pause();
          }
        });
      },
      { threshold: [0, 0.4, 0.7] }
    );
    observer.observe(
      video.closest(
        ".bc-phone, .ose-feature__media-wrap, .ose-feature__phone-wrap, .nabu-feature__media-wrap, .anda-feature__media-col"
      ) || video
    );
  }

  document
    .querySelectorAll(
      ".bc-phone__video, .ose-feature__video, .ose-feature__phone-video, .nabu-feature__video, .anda-feature__video"
    )
    .forEach(setupVideo);
})();
