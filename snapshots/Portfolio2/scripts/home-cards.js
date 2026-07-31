/**
 * Home project cards — play MP4s when scrolled into view.
 * Sources: assets/videos/anda-card.mp4, assets/videos/ose-card.mp4
 * (copied from Documents/Allison portfolio*.mp4)
 */
(function () {
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setupCard(card) {
    var video = card.querySelector(".home-card__video");
    if (!video) return;

    card.classList.add("is-video");
    var playing = false;

    function play() {
      if (playing || REDUCE) return;
      playing = true;
      card.classList.add("is-playing");
      var p = video.play();
      if (p && typeof p.catch === "function") p.catch(function () {});
    }

    function pause() {
      if (!playing) return;
      playing = false;
      card.classList.remove("is-playing");
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
          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            play();
          } else {
            pause();
          }
        });
      },
      { threshold: [0, 0.45, 0.7] }
    );
    observer.observe(card);
  }

  document.querySelectorAll(".home-card").forEach(setupCard);
})();
