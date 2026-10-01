/**
 * Protected System Audit flythrough. Plays near the viewport and pauses away from it.
 */
(function () {
  function initAuditViewer(root) {
    var video = root.querySelector("[data-tf-audit]");
    if (!video || video.dataset.ready === "1") return;
    video.dataset.ready = "1";
    video.muted = true;
    video.defaultMuted = true;

    var reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      video.removeAttribute("autoplay");
      video.removeAttribute("loop");
      video.pause();
      try { video.currentTime = 0; } catch (err) {}
      return;
    }

    function play() {
      var pending = video.play();
      if (pending && typeof pending.catch === "function") pending.catch(function () {});
    }

    if (typeof IntersectionObserver !== "function") {
      play();
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) play();
          else video.pause();
        });
      },
      { rootMargin: "240px 0px", threshold: 0.2 }
    );
    observer.observe(video);
  }

  var workflowCleanup = null;

  function initWorkflow(root) {
    var section = root.querySelector("[data-tf-workflow]");
    if (!section || section.dataset.ready === "1") return null;

    var frame = section.querySelector("[data-tf-proto-frame]");
    var iframe = section.querySelector("[data-tf-proto]");
    var steps = section.querySelectorAll("[data-ps-step]");
    var status = section.querySelector(".tf-workflow__status");
    if (!frame || !iframe || !steps.length) return null;

    section.dataset.ready = "1";
    var PW = 1000;
    var PH = 760;
    var reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) section.classList.add("is-reduced");

    var copy = {
      view: "View. Understand what’s configured.",
      edit: "Edit. Explicitly enter an editable state.",
      verify: "Verify. Return to read-only after saving.",
    };

    function setStep(step) {
      if (!copy[step]) return;
      Array.prototype.forEach.call(steps, function (el) {
        var on = el.getAttribute("data-ps-step") === step;
        el.classList.toggle("is-active", on);
        if (on) el.setAttribute("aria-current", "step");
        else el.setAttribute("aria-current", "false");
      });
      if (status) status.textContent = copy[step];
    }

    function fit() {
      var width = frame.clientWidth;
      if (!width) return;
      var scale = width < PW ? width / PW : 1;
      frame.style.height = Math.round(PH * scale) + "px";
      frame.style.overflow = "hidden";
      iframe.style.width = scale < 1 ? PW + "px" : "100%";
      iframe.style.height = PH + "px";
      iframe.style.transform = scale < 1 ? "scale(" + scale + ")" : "none";
      iframe.style.transformOrigin = "0 0";
    }

    function onMessage(event) {
      if (!iframe.isConnected) {
        cleanup();
        return;
      }
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframe.contentWindow) return;
      var step = event.data && event.data.psStep;
      if (step === "view" || step === "edit" || step === "verify") setStep(step);
    }

    var ro = null;
    if (typeof ResizeObserver === "function") {
      ro = new ResizeObserver(fit);
      ro.observe(frame);
    } else {
      window.addEventListener("resize", fit);
    }
    window.addEventListener("message", onMessage);
    fit();

    var openBtn = section.querySelector("[data-tf-proto-open]");
    var modal = section.querySelector("[data-tf-proto-modal]");
    var full = section.querySelector("[data-tf-proto-full]");
    var closeBtn = section.querySelector("[data-tf-proto-close]");
    var protoSrc = iframe.getAttribute("src") || "/api/terraform-prototype";

    function closeModal() {
      if (!modal || !modal.open) return;
      modal.close();
    }

    function openModal() {
      if (!modal || !full) return;
      if (!full.getAttribute("src")) full.setAttribute("src", protoSrc);
      if (typeof modal.showModal === "function") modal.showModal();
      else modal.setAttribute("open", "");
      if (closeBtn) closeBtn.focus();
    }

    function onOpenClick(event) {
      event.preventDefault();
      openModal();
    }

    function onModalClick(event) {
      if (event.target === modal) closeModal();
    }

    function onModalMessage(event) {
      if (!full || !full.isConnected) return;
      if (event.origin !== window.location.origin) return;
      if (event.source !== full.contentWindow) return;
      var step = event.data && event.data.psStep;
      if (step === "view" || step === "edit" || step === "verify") setStep(step);
    }

    if (openBtn) openBtn.addEventListener("click", onOpenClick);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (modal) modal.addEventListener("click", onModalClick);
    window.addEventListener("message", onModalMessage);

    function cleanup() {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("message", onModalMessage);
      window.removeEventListener("resize", fit);
      if (openBtn) openBtn.removeEventListener("click", onOpenClick);
      if (closeBtn) closeBtn.removeEventListener("click", closeModal);
      if (modal) modal.removeEventListener("click", onModalClick);
      if (ro) ro.disconnect();
      if (workflowCleanup === cleanup) workflowCleanup = null;
    }

    return cleanup;
  }

  function fitScaleStage(stage, cell) {
    var active = cell || stage.querySelector(".tf-scale__cell.is-on");
    var img = active ? active.querySelector(".tf-scale__shot") : null;
    if (!img) return;
    var nw = img.naturalWidth || parseFloat(img.getAttribute("width")) || 0;
    var nh = img.naturalHeight || parseFloat(img.getAttribute("height")) || 0;
    if (!nw || !nh) return;
    var width = img.getBoundingClientRect().width;
    if (width < 2) width = Math.max(0, stage.clientWidth - 32);
    if (width < 2) return;
    var next = Math.round(width * nh / nw + 32) + "px";
    if (stage.style.height !== next) stage.style.height = next;
  }

  function initMobileScale(root) {
    var table = root.querySelector(".tf-scale");
    if (!table || table.classList.contains("is-scale-tabs")) return;
    var rows = table.querySelectorAll(".tf-scale__row");
    if (!rows.length) return;
    table.classList.add("is-scale-tabs");
    rows.forEach(function (row) {
      var cells = Array.prototype.filter.call(row.querySelectorAll(".tf-scale__cell"), function (cell) {
        return !cell.classList.contains("tf-scale__cell--empty");
      });
      if (!cells.length) return;
      row.querySelectorAll(".tf-scale__cell--empty").forEach(function (cell) {
        cell.hidden = true;
      });
      var stage = document.createElement("div");
      stage.className = "tf-scale__stage";
      row.insertBefore(stage, cells[0]);
      cells.forEach(function (cell) {
        stage.appendChild(cell);
      });
      var tabs = document.createElement("div");
      tabs.className = "tf-scale__tabs";
      tabs.setAttribute("role", "tablist");
      var title = row.querySelector(".tf-scale__title");
      tabs.setAttribute("aria-label", title ? title.textContent.trim() : "Component states");
      var thumb = document.createElement("span");
      thumb.className = "tf-scale__thumb";
      thumb.setAttribute("aria-hidden", "true");
      tabs.appendChild(thumb);

      function placeThumb() {
        var on = tabs.querySelector(".tf-scale__tab.is-on");
        if (!on) return;
        thumb.style.width = on.offsetWidth + "px";
        thumb.style.transform = "translateX(" + on.offsetLeft + "px)";
      }

      function select(index) {
        var current = -1;
        cells.forEach(function (item, itemIndex) {
          if (item.classList.contains("is-on")) current = itemIndex;
        });
        var forward = current < 0 || index > current;
        var changing = current >= 0 && current !== index;
        stage.classList.toggle("is-back", changing && !forward);
        cells.forEach(function (item, itemIndex) {
          var on = itemIndex === index;
          if (on) {
            item.classList.remove("is-leave");
            if (changing) {
              item.style.transition = "none";
              item.style.opacity = "0";
              item.style.transform = "translateX(" + (forward ? "36px" : "-36px") + ")";
            }
          } else if (itemIndex === current) {
            item.classList.add("is-leave");
          } else {
            item.classList.remove("is-leave");
          }
          item.classList.toggle("is-on", on);
          item.setAttribute("aria-hidden", on ? "false" : "true");
        });
        if (changing) {
          var incoming = cells[index];
          void incoming.offsetWidth;
          incoming.style.transition = "";
          incoming.style.opacity = "";
          incoming.style.transform = "";
        }
        Array.prototype.forEach.call(tabs.querySelectorAll(".tf-scale__tab"), function (tab, tabIndex) {
          var on = tabIndex === index;
          tab.classList.toggle("is-on", on);
          tab.setAttribute("aria-selected", on ? "true" : "false");
          tab.tabIndex = on ? 0 : -1;
        });
        fitScaleStage(stage, cells[index]);
        placeThumb();
      }

      cells.forEach(function (cell, index) {
        var state = cell.querySelector(".tf-scale__state");
        var button = document.createElement("button");
        button.type = "button";
        button.className = "tf-scale__tab";
        button.setAttribute("role", "tab");
        button.textContent = state ? state.textContent.trim() : "State";
        button.addEventListener("click", function () {
          select(index);
        });
        button.addEventListener("keydown", function (event) {
          var next = index;
          if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % cells.length;
          else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + cells.length) % cells.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = cells.length - 1;
          else return;
          event.preventDefault();
          select(next);
          var nextTab = tabs.querySelectorAll(".tf-scale__tab")[next];
          if (nextTab) nextTab.focus();
        });
        tabs.appendChild(button);
      });
      select(0);
      var name = row.querySelector(".tf-scale__name");
      if (name) name.insertAdjacentElement("afterend", tabs);
      else row.insertBefore(tabs, stage);
      fitScaleStage(stage);
      placeThumb();
      requestAnimationFrame(function () {
        placeThumb();
        stage.classList.add("is-measured");
        tabs.classList.add("is-ready");
      });
      stage.querySelectorAll(".tf-scale__shot").forEach(function (img) {
        if (!img.complete) img.addEventListener("load", function () { fitScaleStage(stage); }, { once: true });
      });
    });
    function refitScale() {
      table.querySelectorAll(".tf-scale__stage").forEach(fitScaleStage);
      table.querySelectorAll(".tf-scale__tabs").forEach(function (tabsEl) {
        var on = tabsEl.querySelector(".tf-scale__tab.is-on");
        var thumbEl = tabsEl.querySelector(".tf-scale__thumb");
        if (!on || !thumbEl) return;
        var nextWidth = on.offsetWidth + "px";
        var nextX = "translateX(" + on.offsetLeft + "px)";
        if (thumbEl.style.width === nextWidth && thumbEl.style.transform === nextX) return;
        thumbEl.style.width = nextWidth;
        thumbEl.style.transform = nextX;
      });
    }
    if (typeof ResizeObserver === "function") {
      var observer = new ResizeObserver(refitScale);
      observer.observe(table);
    } else {
      window.addEventListener("resize", refitScale);
    }
  }

  function initDirections(root) {
    var box = root.querySelector("[data-tf-mh]");
    if (!box || box.dataset.ready === "1") return;
    box.dataset.ready = "1";
    var scroller = box.querySelector("[data-tf-mh-scroll]");
    var shots = box.querySelectorAll("[data-tf-mh-img]");
    var buttons = box.querySelectorAll("[data-tf-mh-go]");

    function show(which) {
      var top = scroller ? scroller.scrollTop : 0;
      Array.prototype.forEach.call(shots, function (shot) {
        shot.classList.toggle("is-on", shot.getAttribute("data-tf-mh-img") === which);
      });
      Array.prototype.forEach.call(buttons, function (button) {
        var on = button.getAttribute("data-tf-mh-go") === which;
        button.classList.toggle("is-on", on);
        button.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (scroller) scroller.scrollTop = top;
    }

    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener("click", function () {
        show(button.getAttribute("data-tf-mh-go"));
      });
    });
    show("m");
  }

  function initComponents(root) {
    var box = root.querySelector("[data-tf-comps]");
    if (!box || box.dataset.ready === "1") return;
    box.dataset.ready = "1";
    var compButtons = box.querySelectorAll("[data-comp]");
    var panels = box.querySelectorAll("[data-comp-panel]");

    function showComp(key) {
      Array.prototype.forEach.call(compButtons, function (button) {
        var on = button.getAttribute("data-comp") === key;
        button.classList.toggle("is-on", on);
        button.setAttribute("aria-selected", on ? "true" : "false");
        button.tabIndex = on ? 0 : -1;
      });
      Array.prototype.forEach.call(panels, function (panel) {
        var on = panel.getAttribute("data-comp-panel") === key;
        panel.hidden = !on;
      });
    }

    Array.prototype.forEach.call(compButtons, function (button, index) {
      button.addEventListener("click", function () { showComp(button.getAttribute("data-comp")); });
      button.addEventListener("keydown", function (event) {
        var next = index;
        if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % compButtons.length;
        else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + compButtons.length) % compButtons.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = compButtons.length - 1;
        else return;
        event.preventDefault();
        compButtons[next].focus();
        showComp(compButtons[next].getAttribute("data-comp"));
      });
    });

    Array.prototype.forEach.call(panels, function (panel) {
      var stateButtons = panel.querySelectorAll("[data-state]");
      var shots = panel.querySelectorAll("[data-state-img]");
      function showState(state) {
        Array.prototype.forEach.call(stateButtons, function (button) {
          var on = button.getAttribute("data-state") === state;
          button.classList.toggle("is-on", on);
          button.setAttribute("aria-pressed", on ? "true" : "false");
        });
        Array.prototype.forEach.call(shots, function (shot) {
          shot.hidden = shot.getAttribute("data-state-img") !== state;
        });
      }
      Array.prototype.forEach.call(stateButtons, function (button) {
        button.addEventListener("click", function () { showState(button.getAttribute("data-state")); });
      });
      showState("ro");
    });

    if (compButtons.length) showComp(compButtons[0].getAttribute("data-comp"));
  }

  window.initTerraformLocked = function (root) {
    if (!root) return;
    if (workflowCleanup) workflowCleanup();
    initAuditViewer(root);
    workflowCleanup = initWorkflow(root);
    initDirections(root);
    initComponents(root);
    initMobileScale(root);
  };
})();
