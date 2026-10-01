/**
 * Terraform case study gate — server-backed unlock.
 * Password never lives in this file. A full page load always starts locked:
 * any previous httpOnly cookie is cleared before the form can submit, and
 * protected HTML is requested only after a successful unlock in this view.
 */
(function () {
  var EXPAND_MS = 1080;
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
  var unlockTimers = [];
  var loading = false;
  var contentLoaded = false;
  var armed = false;
  var reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    if (dotsEl) charming(dotsEl, value.replace(/[\s\S]/g, "•"), animateFrom);
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
      toggle.setAttribute("aria-label", visible ? "Hide password" : "Show password");
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
  syncPasswordDisplay();

  function setError(message) {
    if (!error) return;
    error.textContent = message || "";
    error.hidden = !message;
    input.classList.toggle("is-invalid", !!message);
    if (widget) widget.classList.toggle("is-invalid", !!message);
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function setArmed(next) {
    armed = next;
    input.disabled = !next || loading || contentLoaded;
    if (submit) submit.disabled = !next || loading || contentLoaded;
  }

  function refreshScale() {
    if (typeof window.refreshCaseScale === "function") window.refreshCaseScale();
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
          if (locked.classList.contains("is-settled")) locked.style.height = "auto";
          else if (locked.classList.contains("is-open")) {
            locked.style.height = measureOpenHeight() + "px";
          }
          refreshScale();
        },
        { once: true }
      );
    });
  }

  function later(fn, ms) {
    var id = window.setTimeout(fn, ms);
    unlockTimers.push(id);
    return id;
  }

  function clearUnlockTimers() {
    unlockTimers.forEach(function (id) { window.clearTimeout(id); });
    unlockTimers = [];
  }

  function clearGateMotion() {
    var panel = gate.querySelector(".tf-lockbox__locked");
    var done = gate.querySelector(".tf-lockbox__done");
    gate.style.boxSizing = "";
    gate.style.height = "";
    gate.style.overflow = "";
    gate.style.transition = "";
    if (panel) {
      panel.style.transition = "";
      panel.style.opacity = "";
      panel.style.transform = "";
    }
    if (done) {
      done.style.transition = "";
      done.style.opacity = "";
      done.style.transform = "";
    }
    if (inner) {
      inner.style.transition = "";
      inner.style.opacity = "";
      inner.style.transform = "";
    }
  }

  function settleOpen() {
    locked.style.transition = "none";
    locked.style.height = "auto";
    locked.style.overflow = "visible";
    locked.style.opacity = "1";
    locked.classList.add("is-settled");
    settling = false;
    if (inner) {
      inner.style.transition = "none";
      inner.style.opacity = "";
      inner.style.transform = "";
    }
    void locked.offsetHeight;
    refreshScale();
    requestAnimationFrame(function () {
      refreshScale();
      if (inner && window.aqMotion && typeof window.aqMotion.scan === "function") {
        window.aqMotion.scan(inner);
      }
    });
  }

  function focusPassword() {
    if (!input || input.disabled) return;
    try {
      input.focus({ preventScroll: true });
    } catch (err) {
      input.focus();
    }
  }

  function scrollToPassword(event) {
    var trigger = event.target && event.target.closest
      ? event.target.closest("#tf-unlock-jump, .m-casebar__unlock")
      : null;
    if (!trigger || trigger.classList.contains("is-done")) return;
    if (event.button && event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();

    var rect = gate.getBoundingClientRect();
    var offset = Math.max(32, (window.innerHeight - rect.height) / 2);
    var top = Math.max(0, window.scrollY + rect.top - offset);
    var start = window.scrollY;
    var distance = top - start;
    if (reduced || Math.abs(distance) < 4) {
      window.scrollTo(0, top);
      focusPassword();
      return;
    }

    var duration = Math.min(880, Math.max(520, Math.abs(distance) * 0.42));
    var t0 = performance.now();
    var active = true;
    function stop() { active = false; }
    window.addEventListener("wheel", stop, { passive: true, once: true });
    window.addEventListener("touchstart", stop, { passive: true, once: true });
    function step(now) {
      if (!active) return;
      var p = Math.min(1, (now - t0) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      window.scrollTo(0, start + distance * eased);
      if (p < 1) requestAnimationFrame(step);
      else focusPassword();
    }
    requestAnimationFrame(step);
  }

  document.addEventListener("click", scrollToPassword);

  function setUnlockLabel(done) {
    var jump = document.getElementById("tf-unlock-jump");
    var bar = document.querySelector(".m-casebar__unlock");
    [jump, bar].forEach(function (el) {
      if (!el) return;
      if (done) {
        el.textContent = "Case study unlocked";
        el.classList.add("is-done");
        el.setAttribute("aria-disabled", "true");
        el.removeAttribute("href");
      } else {
        el.textContent = el === bar ? "Unlock" : "Unlock the full case study";
        el.classList.remove("is-done");
        el.removeAttribute("aria-disabled");
        el.setAttribute("href", "#terraform-gate");
      }
    });
  }

  function revealStory() {
    var target = measureOpenHeight();
    if (!target || target < 40) {
      settleOpen();
      return;
    }

    requestAnimationFrame(function () {
      locked.style.transition =
        "height " + EXPAND_MS + "ms cubic-bezier(0.33, 0.02, 0.18, 1), opacity 680ms ease";
      locked.style.height = target + "px";
      locked.style.opacity = "1";
      if (inner) {
        inner.style.transition =
          "opacity 760ms ease 80ms, transform 980ms cubic-bezier(0.22, 1, 0.36, 1)";
        inner.style.opacity = "1";
        inner.style.transform = "none";
      }
    });

    function onEnd(event) {
      if (event.target !== locked || event.propertyName !== "height") return;
      locked.removeEventListener("transitionend", onEnd);
      if (settling) settleOpen();
    }
    locked.addEventListener("transitionend", onEnd);
    later(function () {
      if (settling) settleOpen();
    }, EXPAND_MS + 280);
  }

  function showUnlocked() {
    locked.hidden = false;
    locked.removeAttribute("aria-hidden");
    input.value = "";
    input.blur();
    setError("");
    watchLockedMedia();
    locked.classList.add("is-open");

    if (reduced) {
      gate.classList.add("is-unlocked");
      setUnlockLabel(true);
      locked.classList.add("is-open--instant");
      settleOpen();
      return;
    }

    var panel = gate.querySelector(".tf-lockbox__locked");
    var done = gate.querySelector(".tf-lockbox__done");
    locked.classList.remove("is-open--instant", "is-settled");
    settling = true;
    locked.style.transition = "none";
    locked.style.overflow = "hidden";
    locked.style.opacity = "0";
    locked.style.height = "0px";
    if (inner) {
      inner.style.transition = "none";
      inner.style.opacity = "0";
      inner.style.transform = "translateY(22px)";
    }
    void locked.offsetHeight;

    var from = gate.offsetHeight;
    gate.style.boxSizing = "border-box";
    gate.style.overflow = "hidden";
    gate.style.transition = "none";
    gate.style.height = from + "px";
    if (panel) {
      panel.style.transition = "opacity 280ms ease, transform 280ms ease";
      panel.style.opacity = "0";
      panel.style.transform = "translateY(-8px)";
    }

    later(function () {
      gate.classList.add("is-unlocked");
      setUnlockLabel(true);
      if (done) {
        done.style.opacity = "0";
        done.style.transform = "translateY(8px)";
      }
      var borders = gate.offsetHeight - gate.clientHeight;
      var to = (done ? done.offsetHeight : 0) + borders;
      void gate.offsetHeight;
      gate.style.transition = "height 560ms cubic-bezier(0.22, 1, 0.36, 1)";
      gate.style.height = Math.max(to, 0) + "px";
      requestAnimationFrame(function () {
        if (!done) return;
        done.style.transition = "opacity 420ms ease, transform 480ms cubic-bezier(0.22, 1, 0.36, 1)";
        done.style.opacity = "1";
        done.style.transform = "none";
      });
      later(function () {
        gate.style.transition = "none";
        gate.style.height = "";
        gate.style.overflow = "";
      }, 640);
      revealStory();
    }, 240);
  }

  function resetLocked() {
    contentLoaded = false;
    loading = false;
    settling = false;
    clearUnlockTimers();
    clearGateMotion();
    if (inner) inner.innerHTML = "";
    locked.hidden = true;
    locked.setAttribute("aria-hidden", "true");
    locked.classList.remove("is-open", "is-settled", "is-open--instant");
    locked.style.height = "";
    locked.style.opacity = "";
    locked.style.overflow = "";
    locked.style.transition = "";
    gate.classList.remove("is-unlocked");
    input.value = "";
    setError("");
    if (submit) submit.textContent = "Unlock";
    setUnlockLabel(false);
  }

  function clearPreviousUnlock() {
    setArmed(false);
    return fetch(LOGOUT_URL, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    }).catch(function () {}).then(function () {
      setArmed(true);
    });
  }

  function injectContent(html) {
    if (!inner) return;
    inner.innerHTML = html;
    contentLoaded = true;
    if (typeof window.initTerraformLocked === "function") {
      window.initTerraformLocked(inner);
    }
  }

  function fetchContent() {
    return fetch(CONTENT_URL, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "text/html" },
    }).then(function (res) {
      if (res.status === 401) {
        var err = new Error("Unauthorized");
        err.code = 401;
        throw err;
      }
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          throw new Error((data && data.error) || "Could not load protected content.");
        });
      }
      return res.text();
    });
  }

  function unlockWithPassword() {
    if (!armed || loading || contentLoaded) return;
    var value = input.value || "";
    if (!value.trim()) {
      setError("Enter the password to continue.");
      input.focus();
      return;
    }

    loading = true;
    setArmed(false);
    if (submit) submit.textContent = "Unlocking…";
    setError("");

    fetch(UNLOCK_URL, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ password: value }),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) {
            throw new Error((data && data.error) || "Incorrect password. Try again.");
          }
          return fetchContent();
        });
      })
      .then(function (html) {
        injectContent(html);
        showUnlocked();
        loading = false;
        setArmed(true);
        if (submit) submit.textContent = "Unlock";
      })
      .catch(function (err) {
        var message = err && err.message ? err.message : "";
        if (err instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(message)) {
          message = "Unlock isn’t available on this server. Restart with scripts/dev-server.py (uses .env.local) or deploy to Vercel.";
        }
        setError(message || "Incorrect password. Try again.");
        loading = false;
        setArmed(true);
        if (submit) submit.textContent = "Unlock";
        input.focus();
        input.select();
      });
  }

  function initDiagram() {
    var demo = document.querySelector("[data-ro-demo]");
    if (!demo) return;
    var timers = [];
    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }
    function setStep(step) {
      demo.classList.remove("is-step-0", "is-step-1", "is-step-2");
      demo.classList.add("is-step-" + step);
    }
    var running = false;
    function play() {
      clearTimers();
      running = true;
      if (reduced) {
        setStep(2);
        running = false;
        return;
      }
      setStep(0);
      timers.push(setTimeout(function () { setStep(1); }, 1100));
      timers.push(setTimeout(function () { setStep(2); }, 2000));
      timers.push(setTimeout(play, 4800));
    }
    function stop() {
      running = false;
      clearTimers();
    }
    if (typeof IntersectionObserver !== "function") {
      play();
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (!running) play();
        } else {
          stop();
        }
      });
    }, { threshold: 0.4 });
    observer.observe(demo);
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      unlockWithPassword();
    });
  }

  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    resetLocked();
    clearPreviousUnlock();
  });

  initDiagram();
  clearPreviousUnlock();

  if (typeof ResizeObserver === "function") {
    var ro = new ResizeObserver(refreshScale);
    ro.observe(locked);
    if (inner) ro.observe(inner);
  }
  window.addEventListener("load", refreshScale);
})();
