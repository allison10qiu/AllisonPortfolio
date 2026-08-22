/**
 * Home project cards — attach & play MP4s only when near the viewport.
 * Posters show immediately; video `data-src` is injected on approach.
 */
(function () {
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setupCard(card) {
    var video = card.querySelector(".home-card__video");
    if (!video) return;

    card.classList.add("is-video");
    var src = video.getAttribute("data-src");
    var attached = false;
    var playing = false;

    function attachSource() {
      if (attached || !src) return;
      attached = true;
      var source = document.createElement("source");
      source.src = src;
      source.type = "video/mp4";
      video.appendChild(source);
      video.preload = "auto";
      video.load();
    }

    function play() {
      if (playing || REDUCE) return;
      attachSource();
      playing = true;
      card.classList.add("is-playing");
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
        });
      }
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

    // Warm the file a bit before the card is fully on screen.
    var warm = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            attachSource();
            warm.disconnect();
          }
        });
      },
      { rootMargin: "240px 0px", threshold: 0 }
    );
    warm.observe(card);

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
