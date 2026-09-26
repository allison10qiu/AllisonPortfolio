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
    var READABLE = 640;
    var reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) section.classList.add("is-reduced");

    var copy = {
      view: "View. Inspect the current configuration, with no editable controls.",
      edit: "Edit. Choosing Edit deliberately exposes the controls needed to make a change.",
      verify: "Verify. After saving, return to the view to review the resulting state.",
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
      if (width < READABLE) {
        frame.style.height = PH + "px";
        frame.style.overflowX = "auto";
        frame.style.overflowY = "hidden";
        iframe.style.width = PW + "px";
        iframe.style.height = PH + "px";
        iframe.style.transform = "none";
        return;
      }
      var scale = width < PW ? width / PW : 1;
      frame.style.height = Math.round(PH * scale) + "px";
      frame.style.overflow = "hidden";
      iframe.style.width = scale < 1 ? PW + "px" : "100%";
      iframe.style.height = PH + "px";
      iframe.style.transform = scale < 1 ? "scale(" + scale + ")" : "none";
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

    function cleanup() {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("resize", fit);
      if (ro) ro.disconnect();
      if (workflowCleanup === cleanup) workflowCleanup = null;
    }

    return cleanup;
  }

  function fitScaleStage(stage) {
    var pad = 32;
    var inner = Math.max(160, stage.clientWidth - pad);
    var max = 0;
    stage.querySelectorAll(".tf-scale__shot").forEach(function (img) {
      var nw = img.naturalWidth || parseFloat(img.getAttribute("width")) || 0;
      var nh = img.naturalHeight || parseFloat(img.getAttribute("height")) || 0;
      if (!nw || !nh) return;
      var displayW = Math.min(inner, nw);
      max = Math.max(max, Math.round(displayW * (nh / nw)));
    });
    if (max > 0) stage.style.minHeight = max + pad + "px";
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

      function select(index) {
        cells.forEach(function (item, itemIndex) {
          var on = itemIndex === index;
          item.classList.toggle("is-on", on);
          item.setAttribute("aria-hidden", on ? "false" : "true");
        });
        Array.prototype.forEach.call(tabs.children, function (tab, tabIndex) {
          var on = tabIndex === index;
          tab.classList.toggle("is-on", on);
          tab.setAttribute("aria-selected", on ? "true" : "false");
          tab.tabIndex = on ? 0 : -1;
        });
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
          tabs.children[next].focus();
        });
        tabs.appendChild(button);
      });
      select(0);
      var name = row.querySelector(".tf-scale__name");
      if (name) name.insertAdjacentElement("afterend", tabs);
      else row.insertBefore(tabs, stage);
      fitScaleStage(stage);
      stage.querySelectorAll(".tf-scale__shot").forEach(function (img) {
        if (!img.complete) img.addEventListener("load", function () { fitScaleStage(stage); }, { once: true });
      });
    });
    if (typeof ResizeObserver === "function") {
      var observer = new ResizeObserver(function () {
        table.querySelectorAll(".tf-scale__stage").forEach(fitScaleStage);
      });
      observer.observe(table);
    } else {
      window.addEventListener("resize", function () {
        table.querySelectorAll(".tf-scale__stage").forEach(fitScaleStage);
      });
    }
  }

  window.initTerraformLocked = function (root) {
    if (!root) return;
    if (workflowCleanup) workflowCleanup();
    initAuditViewer(root);
    workflowCleanup = initWorkflow(root);
    initMobileScale(root);
  };
})();
