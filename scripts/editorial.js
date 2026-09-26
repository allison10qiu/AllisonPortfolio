(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  try {
    if (sessionStorage.getItem("aq-scroll-to") === "my-work") {
      sessionStorage.removeItem("aq-scroll-to");
      if (!document.documentElement.classList.contains("tx-back")) {
        var target = document.getElementById("my-work");
        if (target) {
          var top = target.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo(0, Math.max(0, top));
        }
      }
    }
  } catch (err) {}

  var carouselRoles = {
    front: { left: "19%", top: "3%", width: "62%", rot: "0deg", z: 3, op: "1", shadow: "0 22px 40px -18px rgba(20,36,59,.45)", cursor: "default" },
    left: { left: "0%", top: "15%", width: "46%", rot: "-6deg", z: 1, op: "1", shadow: "0 10px 22px -12px rgba(20,36,59,.35)", cursor: "pointer" },
    right: { left: "54%", top: "15%", width: "46%", rot: "6deg", z: 1, op: "1", shadow: "0 10px 22px -12px rgba(20,36,59,.35)", cursor: "pointer" },
    back: { left: "27%", top: "12%", width: "46%", rot: "0deg", z: 0, op: "0", shadow: "none", cursor: "pointer" }
  };

  function carouselRole(index, slideIndex, count) {
    if (slideIndex === index) return "front";
    if (slideIndex === (index + 1) % count) return "right";
    if (count > 2 && slideIndex === (index + count - 1) % count) return "left";
    return "back";
  }

  document.querySelectorAll("[data-carousel]").forEach(function (root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll("[data-slide]"));
    var label = root.parentElement.querySelector("[data-carousel-count]");
    var index = 0;
    var swipe = null;
    var suppressClick = false;
    var wheelLockUntil = 0;
    if (!slides.length) return;

    function show(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (slide, slideIndex) {
        var role = carouselRole(index, slideIndex, slides.length);
        var place = carouselRoles[role];
        slide.dataset.role = role;
        slide.setAttribute("aria-hidden", role === "front" ? "false" : "true");
        slide.style.left = place.left;
        slide.style.top = place.top;
        slide.style.width = place.width;
        slide.style.zIndex = String(place.z);
        slide.style.opacity = place.op;
        slide.style.transform = "rotate(" + place.rot + ")";
        slide.style.boxShadow = place.shadow;
        slide.style.cursor = place.cursor;
      });
      if (label) {
        label.textContent =
          String(index + 1).padStart(2, "0") + " / " + String(slides.length).padStart(2, "0");
      }
    }

    function step(delta) {
      show(index + delta);
    }

    slides.forEach(function (slide, slideIndex) {
      slide.addEventListener("click", function (event) {
        if (suppressClick) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (slide.dataset.role !== "front") show(slideIndex);
      });
    });

    root.parentElement.querySelectorAll("[data-carousel-prev]").forEach(function (btn) {
      btn.addEventListener("click", function () { step(-1); });
    });
    root.parentElement.querySelectorAll("[data-carousel-next]").forEach(function (btn) {
      btn.addEventListener("click", function () { step(1); });
    });

    root.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
    });

    root.addEventListener("pointerdown", function (event) {
      if (event.button > 0) return;
      swipe = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        dx: 0,
        dy: 0,
        mode: null,
        captured: false
      };
    });

    root.addEventListener("pointermove", function (event) {
      if (!swipe || swipe.id !== event.pointerId || swipe.mode === "v") return;
      var dx = event.clientX - swipe.x;
      var dy = event.clientY - swipe.y;
      swipe.dx = dx;
      swipe.dy = dy;

      if (swipe.mode === null) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          swipe.mode = "v";
          return;
        }
        swipe.mode = "h";
        root.setPointerCapture(event.pointerId);
        swipe.captured = true;
      }

      if (swipe.mode === "h" && !reduced) {
        var front = slides[index];
        front.style.transition = "none";
        front.style.transform = "rotate(0deg) translateX(" + dx + "px)";
      }
    });

    function endSwipe(event) {
      if (!swipe || swipe.id !== event.pointerId) return;
      var dx = swipe.dx;
      var dy = swipe.dy;
      var wasHorizontal = swipe.mode === "h";
      var front = slides[index];
      front.style.transition = "";

      if (wasHorizontal && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
        step(dx < 0 ? 1 : -1);
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 0);
      } else if (wasHorizontal) {
        show(index);
      }

      swipe = null;
    }

    root.addEventListener("pointerup", endSwipe);
    root.addEventListener("pointercancel", endSwipe);

    root.addEventListener("wheel", function (event) {
      if (Math.abs(event.deltaX) < 12 || Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;
      event.preventDefault();
      var now = Date.now();
      if (now < wheelLockUntil) return;
      wheelLockUntil = now + 420;
      step(event.deltaX > 0 ? 1 : -1);
    }, { passive: false });

    show(0);
  });

  var frame = document.querySelector("[data-board-frame]");
  var board = document.querySelector("[data-board]");
  if (!frame || !board) return;

  var mobileQuery = window.matchMedia("(max-width: 720px)");
  var lifeQuery = window.matchMedia("(max-width: 640px)");
  var cards = Array.prototype.slice.call(board.querySelectorAll("[data-polaroid]"));
  var z = 2;
  var drag = null;
  var lifeIndex = 0;
  var lifeSwipe = null;
  var lifeSuppress = false;

  var lifeNav = document.createElement("div");
  lifeNav.className = "life-nav carousel__nav";
  var lifePrev = document.createElement("button");
  lifePrev.type = "button";
  lifePrev.setAttribute("aria-label", "Previous photo");
  lifePrev.textContent = "←";
  var lifeCount = document.createElement("span");
  lifeCount.className = "carousel__count";
  lifeCount.setAttribute("aria-live", "polite");
  var lifeNext = document.createElement("button");
  lifeNext.type = "button";
  lifeNext.setAttribute("aria-label", "Next photo");
  lifeNext.textContent = "→";
  lifeNav.appendChild(lifePrev);
  lifeNav.appendChild(lifeCount);
  lifeNav.appendChild(lifeNext);
  frame.insertAdjacentElement("afterend", lifeNav);

  var layout = [
    { x: 36, y: 48, w: 210, r: -4 },
    { x: 250, y: 36, w: 300, r: -2 },
    { x: 560, y: 28, w: 250, r: 3 },
    { x: 820, y: 250, w: 190, r: 4 },
    { x: 180, y: 340, w: 200, r: 2 },
    { x: 400, y: 300, w: 190, r: -1 },
    { x: 620, y: 280, w: 190, r: -3 }
  ];

  function closeLifeCaptions() {
    cards.forEach(function (card) {
      card.classList.remove("is-open");
      card.setAttribute("aria-expanded", "false");
    });
  }

  function layoutLife() {
    cards.forEach(function (card, slideIndex) {
      var role = carouselRole(lifeIndex, slideIndex, cards.length);
      var spot = carouselRoles[role];
      card.dataset.role = role;
      card.setAttribute("aria-hidden", role === "front" ? "false" : "true");
      card.tabIndex = role === "front" ? 0 : -1;
      card.style.setProperty("--life-l", spot.left);
      card.style.setProperty("--life-t", spot.top);
      card.style.setProperty("--life-w", spot.width);
      card.style.setProperty("--life-r", "rotate(" + spot.rot + ")");
      card.style.setProperty("--life-o", spot.op);
    });
    lifeCount.textContent =
      String(lifeIndex + 1).padStart(2, "0") + " / " + String(cards.length).padStart(2, "0");
  }

  function lifeStep(delta) {
    closeLifeCaptions();
    lifeIndex = (lifeIndex + delta + cards.length) % cards.length;
    layoutLife();
  }

  function place() {
    var mobile = mobileQuery.matches;
    if (mobile) {
      board.style.transform = "none";
      if (lifeQuery.matches) {
        layoutLife();
        return;
      }
      cards.forEach(function (card) {
        card.style.left = "";
        card.style.top = "";
        card.style.width = "";
        card.style.transform = "";
        card.style.removeProperty("--life-l");
        card.style.removeProperty("--life-t");
        card.style.removeProperty("--life-w");
        card.style.removeProperty("--life-r");
        card.style.removeProperty("--life-o");
        card.tabIndex = 0;
      });
      return;
    }
    var scale = frame.clientWidth / 1040;
    board.style.transform = "scale(" + scale + ")";
    cards.forEach(function (card, i) {
      var spot = layout[i] || layout[0];
      card.style.width = spot.w + "px";
      if (!card.style.left) {
        card.style.left = spot.x + "px";
        card.style.top = spot.y + "px";
        card.dataset.rot = String(spot.r);
      }
      if (!card.classList.contains("is-dragging")) {
        card.style.transform = "rotate(" + (card.dataset.rot || spot.r) + "deg)";
      }
    });
  }

  function point(event) {
    var scale = frame.clientWidth / 1040 || 1;
    var rect = board.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale
    };
  }

  cards.forEach(function (card) {
    card.addEventListener("pointerdown", function (event) {
      if (mobileQuery.matches || event.button > 0) return;
      if (event.target.closest("a")) return;
      drag = {
        card: card,
        dx: point(event).x - card.offsetLeft,
        dy: point(event).y - card.offsetTop
      };
      card.classList.add("is-dragging");
      card.style.zIndex = String(++z);
      card.setPointerCapture(event.pointerId);
    });

    card.addEventListener("pointermove", function (event) {
      if (!drag || drag.card !== card) return;
      var p = point(event);
      var x = Math.min(1040 - card.offsetWidth, Math.max(0, p.x - drag.dx));
      var y = Math.min(660 - card.offsetHeight, Math.max(0, p.y - drag.dy));
      card.style.left = x + "px";
      card.style.top = y + "px";
    });

    function endDrag(event) {
      if (!drag || drag.card !== card) return;
      drag = null;
      card.classList.remove("is-dragging");
      if (event.pointerId != null) {
        try { card.releasePointerCapture(event.pointerId); } catch (err) {}
      }
    }

    card.addEventListener("pointerup", endDrag);
    card.addEventListener("pointercancel", endDrag);

    card.addEventListener("click", function () {
      if (lifeQuery.matches) {
        if (lifeSuppress) return;
        if (card.dataset.role !== "front") {
          closeLifeCaptions();
          lifeIndex = cards.indexOf(card);
          layoutLife();
          return;
        }
        var lifeOpen = card.classList.toggle("is-open");
        cards.forEach(function (other) {
          if (other !== card) other.classList.remove("is-open");
        });
        card.setAttribute("aria-expanded", lifeOpen ? "true" : "false");
        return;
      }
      if (!mobileQuery.matches) return;
      var open = card.classList.toggle("is-open");
      cards.forEach(function (other) {
        if (other !== card) other.classList.remove("is-open");
      });
      card.setAttribute("aria-expanded", open ? "true" : "false");
    });

    card.addEventListener("keydown", function (event) {
      if (!mobileQuery.matches) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.click();
      }
    });
  });

  lifePrev.addEventListener("click", function () { lifeStep(-1); });
  lifeNext.addEventListener("click", function () { lifeStep(1); });

  board.addEventListener("keydown", function (event) {
    if (!lifeQuery.matches) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); lifeStep(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); lifeStep(1); }
  });

  board.addEventListener("pointerdown", function (event) {
    if (!lifeQuery.matches || event.button > 0) return;
    lifeSwipe = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0, mode: null };
  });

  board.addEventListener("pointermove", function (event) {
    if (!lifeSwipe || lifeSwipe.id !== event.pointerId || lifeSwipe.mode === "v") return;
    var dx = event.clientX - lifeSwipe.x;
    var dy = event.clientY - lifeSwipe.y;
    lifeSwipe.dx = dx;
    lifeSwipe.dy = dy;
    if (lifeSwipe.mode === null) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        lifeSwipe.mode = "v";
        return;
      }
      lifeSwipe.mode = "h";
    }
  });

  function endLifeSwipe(event) {
    if (!lifeSwipe || lifeSwipe.id !== event.pointerId) return;
    var dx = lifeSwipe.dx;
    var dy = lifeSwipe.dy;
    var horizontal = lifeSwipe.mode === "h";
    lifeSwipe = null;
    if (horizontal && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      lifeStep(dx < 0 ? 1 : -1);
      lifeSuppress = true;
      setTimeout(function () { lifeSuppress = false; }, 0);
    }
  }

  board.addEventListener("pointerup", endLifeSwipe);
  board.addEventListener("pointercancel", endLifeSwipe);

  place();
  window.addEventListener("resize", place);
  if (lifeQuery.addEventListener) lifeQuery.addEventListener("change", place);
  if (!reduced) board.dataset.ready = "1";
})();
