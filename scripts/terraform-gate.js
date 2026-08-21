/**
 * Terraform case study gate — server-backed unlock.
 * Password never lives in this file; auth is via /api/terraform-unlock
 * and protected HTML is served only from /api/terraform-content with a
 * valid httpOnly session cookie.
 */
(function () {
  var EXPAND_MS = 720;
  var UNLOCK_URL = "/api/terraform-unlock";
  var CONTENT_URL = "/api/terraform-content";
  var LOGOUT_URL = "/api/terraform-logout";

  var gate = document.getElementById("terraform-gate");
  var locked = document.getElementById("terraform-locked");
  var input = document.getElementById("terraform-password");
  var form = document.getElementById("terraform-password-form");
  var submit = document.getElementById("terraform-gate-submit");
  var toggle = document.getElementById("terraform-password-toggle");
  var widget = document.getElementById("terraform-password-widget");
  var dotsEl = widget ? widget.querySelector(".password-dots") : null;
  var textEl = widget ? widget.querySelector(".password-text") : null;
  var error = document.getElementById("terraform-gate-error");
  if (!gate || !locked || !input) return;

  var inner = locked.querySelector(".terraform-locked__inner");
  var settling = false;
  var loading = false;
  var contentLoaded = false;

  // Minimal charming.js: wrap each character in a <span> for bounce delays.
  function charming(el) {
    if (!el) return;
    var text = el.textContent || "";
    el.textContent = "";
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement("span");
      span.textContent = text.charAt(i);
      el.appendChild(span);
    }
  }

  function syncPasswordDisplay() {
    var value = input.value || "";
    if (textEl) {
      textEl.textContent = value;
      charming(textEl);
    }
    if (dotsEl) {
      // Bullet chars so dots work without -webkit-text-security / disc font.
      dotsEl.textContent = value.replace(/[\s\S]/g, "•");
      charming(dotsEl);
    }
  }

  function setPasswordVisible(visible) {
    if (!widget) return;
    widget.classList.toggle("show", !!visible);
    if (toggle) {
      toggle.setAttribute("aria-pressed", visible ? "true" : "false");
      toggle.setAttribute(
        "aria-label",
        visible ? "Hide password" : "Show password"
      );
    }
    // Re-run charming so bounce animations restart on the active layer.
    syncPasswordDisplay();
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      setPasswordVisible(!widget.classList.contains("show"));
      input.focus();
    });
    toggle.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      setPasswordVisible(!widget.classList.contains("show"));
      input.focus();
    });
  }

  input.addEventListener("input", syncPasswordDisplay);
  input.addEventListener("focusin", function () {
    if (textEl) textEl.classList.add("cursor");
    if (dotsEl) dotsEl.classList.add("cursor");
  });
  input.addEventListener("focusout", function () {
    if (textEl) textEl.classList.remove("cursor");
    if (dotsEl) dotsEl.classList.remove("cursor");
  });
  window.addEventListener("load", syncPasswordDisplay);
  syncPasswordDisplay();

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

  function showUnlocked(opts) {
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

  function injectContent(html) {
    if (!inner) return;
    inner.innerHTML = html;
    contentLoaded = true;
  }

  function fetchContent() {
    return fetch(CONTENT_URL, {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "text/html" },
    }).then(function (res) {
      if (res.status === 401) {
        var err = new Error("Unauthorized");
        err.code = 401;
        throw err;
      }
      if (!res.ok) {
        return res.json().catch(function () {
          return {};
        }).then(function (data) {
          throw new Error((data && data.error) || "Could not load protected content.");
        });
      }
      return res.text();
    });
  }

  function setLoading(isLoading) {
    loading = isLoading;
    input.disabled = isLoading || contentLoaded;
    if (submit) {
      submit.disabled = isLoading || contentLoaded;
      submit.textContent = isLoading ? "Unlocking…" : "Unlock";
    }
  }

  function unlockWithPassword() {
    if (loading || contentLoaded) return;
    var value = input.value || "";
    if (!value) {
      setError("Enter a password.");
      input.focus();
      return;
    }

    setLoading(true);
    setError("");

    fetch(UNLOCK_URL, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ password: value }),
    })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (!res.ok) {
              throw new Error(
                (data && data.error) || "Incorrect password. Try again."
              );
            }
            return fetchContent();
          });
      })
      .then(function (html) {
        injectContent(html);
        showUnlocked({ animate: true });
        setLoading(false);
      })
      .catch(function (err) {
        var message = err && err.message ? err.message : "";
        if (
          err instanceof TypeError ||
          /Failed to fetch|NetworkError|Load failed/i.test(message)
        ) {
          message =
            "Unlock isn’t available on this server. Restart with scripts/dev-server.py (uses .env.local) or deploy to Vercel.";
        }
        setError(message || "Incorrect password. Try again.");
        setLoading(false);
        input.select();
      });
  }

  // Always start locked on a fresh page load / refresh.
  // Clear any prior session cookie, then keep the form visible.
  fetch(LOGOUT_URL, {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  }).catch(function () {
    /* stay locked even if logout endpoint is unavailable */
  });

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      unlockWithPassword();
    });
  } else {
    input.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      unlockWithPassword();
    });
  }

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
