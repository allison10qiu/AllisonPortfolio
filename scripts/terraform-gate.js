(function () {
  var STORAGE_KEY = "terraform-case-unlocked";
  var PASSWORD = "password";
  var EXPAND_MS = 720;

  var gate = document.getElementById("terraform-gate");
  var locked = document.getElementById("terraform-locked");
  var input = document.getElementById("terraform-password");
  var error = document.getElementById("terraform-gate-error");
  if (!gate || !locked || !input) return;

  var inner = locked.querySelector(".terraform-locked__inner");
  var settling = false;

  function setError(message) {
    if (!error) return;
    error.textContent = message || "";
    error.hidden = !message;
  }

  function refreshScale() {
    if (typeof window.refreshCaseScale === "function") {
      window.refreshCaseScale();
    }
  }

  /** Measure full content height even when the parent is collapsed. */
  function measureOpenHeight() {
    var prevHeight = locked.style.height;
    var prevOverflow = locked.style.overflow;
    var prevTransition = locked.style.transition;
    var prevVisibility = locked.style.visibility;

    locked.style.transition = "none";
    locked.style.visibility = "hidden";
    locked.style.overflow = "visible";
    locked.style.height = "auto";
    void locked.offsetHeight;

    var target = Math.max(
      inner ? inner.scrollHeight : 0,
      locked.scrollHeight,
      locked.offsetHeight
    );

    locked.style.height = prevHeight || "0px";
    locked.style.overflow = prevOverflow || "hidden";
    locked.style.visibility = prevVisibility || "";
    void locked.offsetHeight;
    locked.style.transition = prevTransition || "";

    return target;
  }

  function watchLockedMedia() {
    locked.querySelectorAll("img").forEach(function (img) {
      if (img.complete) return;
      img.addEventListener(
        "load",
        function () {
          if (locked.classList.contains("is-settled")) {
            locked.style.height = "auto";
          } else if (locked.classList.contains("is-open") && !settling) {
            locked.style.height = measureOpenHeight() + "px";
          } else if (locked.classList.contains("is-open")) {
            locked.style.height = measureOpenHeight() + "px";
          }
          refreshScale();
        },
        { once: true }
      );
    });
  }

  function pulseScale(durationMs) {
    var start = performance.now();
    function frame(now) {
      refreshScale();
      if (now - start < durationMs) {
        requestAnimationFrame(frame);
      } else {
        refreshScale();
      }
    }
    requestAnimationFrame(frame);
  }

  function settleOpen() {
    locked.style.transition = "none";
    locked.style.height = "auto";
    locked.style.overflow = "visible";
    locked.style.opacity = "1";
    locked.classList.add("is-settled");
    settling = false;
    void locked.offsetHeight;
    refreshScale();
    requestAnimationFrame(function () {
      refreshScale();
      setTimeout(refreshScale, 50);
      setTimeout(refreshScale, 250);
    });
  }

  function unlock(opts) {
    var animate = !opts || opts.animate !== false;

    if (locked.classList.contains("is-open") && locked.classList.contains("is-settled")) {
      refreshScale();
      return;
    }

    locked.hidden = false;
    locked.removeAttribute("aria-hidden");
    gate.classList.add("terraform-gate--unlocked");
    input.value = "";
    input.blur();
    setError("");
    watchLockedMedia();

    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {}

    locked.classList.add("is-open");

    if (!animate) {
      locked.classList.add("is-open--instant");
      settleOpen();
      return;
    }

    locked.classList.remove("is-open--instant");
    locked.classList.remove("is-settled");
    settling = true;

    locked.style.transition = "none";
    locked.style.overflow = "hidden";
    locked.style.opacity = "0";
    locked.style.height = "0px";
    void locked.offsetHeight;

    var target = measureOpenHeight();
    if (!target || target < 40) {
      // Fallback: open immediately if measure failed
      settleOpen();
      return;
    }

    requestAnimationFrame(function () {
      locked.style.transition =
        "height " +
        EXPAND_MS +
        "ms cubic-bezier(0.22, 1, 0.36, 1), opacity 420ms ease";
      locked.style.height = target + "px";
      locked.style.opacity = "1";
      pulseScale(EXPAND_MS + 160);
    });

    function onEnd(event) {
      if (event.target !== locked) return;
      if (event.propertyName !== "height") return;
      locked.removeEventListener("transitionend", onEnd);
      if (!settling) return;
      settleOpen();
    }
    locked.addEventListener("transitionend", onEnd);
    setTimeout(function () {
      if (settling) settleOpen();
    }, EXPAND_MS + 250);
  }

  function tryUnlock() {
    var value = (input.value || "").trim();
    if (value === PASSWORD) {
      unlock({ animate: true });
      return;
    }
    setError("Incorrect password. Try again.");
    input.select();
  }

  try {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      unlock({ animate: false });
    }
  } catch (e) {}

  input.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    tryUnlock();
  });

  if (typeof ResizeObserver === "function") {
    var ro = new ResizeObserver(function () {
      refreshScale();
    });
    ro.observe(locked);
    if (inner) ro.observe(inner);
    var canvas = document.querySelector(".bc-canvas");
    if (canvas) ro.observe(canvas);
  }

  window.addEventListener("load", refreshScale);
})();
