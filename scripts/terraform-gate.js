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
  var prevPasswordLen = 0;

  function charming(el, text, animateFromIndex) {
    if (!el) return;
    el.textContent = "";
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement("span");
      span.textContent = text.charAt(i);
      if (typeof animateFromIndex === "number" && i >= animateFromIndex) {
        span.classList.add("is-new");
      }
      el.appendChild(span);
    }
  }

  function activeOverlay() {
    if (!widget) return null;
    return widget.classList.contains("show") ? textEl : dotsEl;
  }

  function charSpans(el) {
    if (!el) return [];
    return Array.prototype.slice.call(el.querySelectorAll(":scope > span"));
  }

  function syncCaret() {
    var caret = widget && widget.querySelector(".password-caret");
    if (!caret || !widget) return;
    var start = input.selectionStart || 0;
    var end = input.selectionEnd || 0;
    if (document.activeElement !== input || start !== end) {
      caret.hidden = true;
      return;
    }
    caret.hidden = false;
    var el = activeOverlay();
    var spans = charSpans(el);
    var pos = start;
    var left = 0;
    if (spans.length && pos > 0) {
      var idx = Math.min(pos, spans.length) - 1;
      var span = spans[idx];
      left = span.offsetLeft + span.offsetWidth;
    } else if (spans.length && pos === 0) {
      left = spans[0].offsetLeft;
    }
    caret.style.left = left + "px";
  }

  function syncSelectionHighlight() {
    var start = input.selectionStart || 0;
    var end = input.selectionEnd || 0;
    var hasRange = start !== end;
    var selection = widget && widget.querySelector(".password-selection");
    var el = activeOverlay();
    var spans = charSpans(el);

    if (selection) {
      if (!hasRange || !spans.length || document.activeElement !== input) {
        selection.hidden = true;
      } else {
        var from = Math.max(0, Math.min(start, spans.length - 1));
        var to = Math.max(0, Math.min(end - 1, spans.length - 1));
        if (end <= start) {
          selection.hidden = true;
        } else {
          var first = spans[from];
          var last = spans[to];
          var left = first.offsetLeft;
          var width = last.offsetLeft + last.offsetWidth - left;
          selection.hidden = false;
          selection.style.left = left + "px";
          selection.style.width = Math.max(0, width) + "px";
        }
      }
    }

    syncCaret();
  }

  function caretIndexFromClientX(clientX) {
    var el = activeOverlay();
    var spans = charSpans(el);
    if (!spans.length) return 0;
    for (var i = 0; i < spans.length; i++) {
      var rect = spans[i].getBoundingClientRect();
      if (clientX < rect.left + rect.width / 2) return i;
    }
    return spans.length;
  }

  function syncPasswordDisplay(opts) {
    opts = opts || {};
    var value = input.value || "";
    var selStart = input.selectionStart;
    var selEnd = input.selectionEnd;
    var animateAll = !!opts.animateAll;
    var animateFrom = animateAll
      ? 0
      : value.length > prevPasswordLen
        ? prevPasswordLen
        : value.length;

    if (textEl) charming(textEl, value, animateFrom);
    if (dotsEl) {
      charming(dotsEl, value.replace(/[\s\S]/g, "•"), animateFrom);
    }
    prevPasswordLen = value.length;

    if (selStart != null && selEnd != null) {
      try {
        input.setSelectionRange(selStart, selEnd);
      } catch (e) {
        /* ignore */
      }
    }
    requestAnimationFrame(syncSelectionHighlight);
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
    syncPasswordDisplay({ animateAll: true });
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

  input.addEventListener("input", function () {
    syncPasswordDisplay();
  });
  input.addEventListener("click", function (event) {
    // detail > 1 is part of a double/triple click — don’t collapse selection
    if (event.detail > 1) return;
    var idx = caretIndexFromClientX(event.clientX);
    input.setSelectionRange(idx, idx);
    syncSelectionHighlight();
  });
  input.addEventListener("dblclick", function () {
    input.select();
    syncSelectionHighlight();
  });
  input.addEventListener("select", syncSelectionHighlight);
  input.addEventListener("keyup", syncSelectionHighlight);
  input.addEventListener("mouseup", syncSelectionHighlight);
  document.addEventListener("selectionchange", function () {
    if (document.activeElement !== input) return;
    syncSelectionHighlight();
  });
  input.addEventListener("focusin", syncSelectionHighlight);
  input.addEventListener("focusout", function () {
    var caret = widget && widget.querySelector(".password-caret");
    var selection = widget && widget.querySelector(".password-selection");
    if (caret) caret.hidden = true;
    if (selection) selection.hidden = true;
  });
  window.addEventListener("load", function () {
    syncPasswordDisplay();
  });
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
