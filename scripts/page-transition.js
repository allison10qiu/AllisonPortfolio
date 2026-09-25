/**
 * One page-transition system.
 * A home project card's image travels to the case-study hero. It does not grow to the viewport.
 * "Check out my other work" shrinks back toward that card when it can be targeted.
 * Home ↔ About uses one incoming fade. Everything else falls back to that fade.
 * The old curtain wipe is gone.
 * sessionStorage only holds a slug or a one-shot flag, never protected content.
 */
(function () {
  var EASE = "cubic-bezier(.2,.8,.2,1)";
  var FLIGHT = "cubic-bezier(0.2, 0.45, 0.2, 1)";
  var html = document.documentElement;
  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function durationVar(name, fallback) {
    var value = parseFloat(getComputedStyle(html).getPropertyValue(name));
    return value > 0 ? value : fallback;
  }

  var expandMs = durationVar("--tx-project-duration", 550);
  var revealMs = durationVar("--tx-reveal", 160);
  var fadeInMs = durationVar("--tx-fade-in", 200);

  function coverEl() {
    return document.getElementById("tx-cover");
  }

  function viewport() {
    var vv = window.visualViewport;
    var width = document.documentElement.clientWidth || window.innerWidth;
    var height = window.innerHeight;
    var left = 0;
    var top = 0;
    if (vv) {
      width = Math.min(width, vv.width);
      height = Math.min(height, vv.height);
      left = vv.offsetLeft || 0;
      top = vv.offsetTop || 0;
    }
    return {
      left: left + "px",
      top: top + "px",
      width: Math.max(0, width) + "px",
      height: Math.max(0, height) + "px",
      borderRadius: "0px"
    };
  }

  function box(rect) {
    return {
      left: rect.left + "px",
      top: rect.top + "px",
      width: rect.width + "px",
      height: rect.height + "px",
      borderRadius: "14px"
    };
  }

  function remember(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (err) {}
  }

  function go(href) {
    window.location.assign(href);
  }

  function whenDone(anim, backup) {
    return new Promise(function (resolve) {
      var settled = false;
      function finish() {
        if (settled) return;
        settled = true;
        resolve();
      }
      if (anim && anim.finished && anim.finished.then) anim.finished.then(finish, finish);
      else finish();
      window.setTimeout(finish, backup);
    });
  }

  function clearCover() {
    var cover = coverEl();
    html.classList.remove("tx-in", "tx-back", "tx-fade", "tx-leaving");
    if (!cover) return;
    cover.getAnimations().forEach(function (anim) {
      anim.cancel();
    });
    cover.replaceChildren();
    cover.style.display = "";
    cover.style.opacity = "";
    cover.style.left = "";
    cover.style.top = "";
    cover.style.width = "";
    cover.style.height = "";
    cover.style.borderRadius = "";
    cover.style.background = "";
    cover.style.boxShadow = "";
    cover.style.overflow = "";
    cover.style.transform = "";
    cover.style.transformOrigin = "";
  }

  function publicSrc(src) {
    try {
      var url = new URL(src, location.href);
      if (url.origin !== location.origin) return "";
      if (url.pathname.indexOf("/assets/") !== 0) return "";
      return url.pathname + url.search;
    } catch (err) {
      return "";
    }
  }

  function visualRect(img) {
    var rect = img.getBoundingClientRect();
    var naturalW = img.naturalWidth;
    var naturalH = img.naturalHeight;
    if (!naturalW || !naturalH) return rect;
    var fit = getComputedStyle(img).objectFit;
    if (fit !== "contain" && fit !== "scale-down") return rect;
    var scale = Math.min(rect.width / naturalW, rect.height / naturalH);
    var width = naturalW * scale;
    var height = naturalH * scale;
    return {
      left: rect.left + (rect.width - width) / 2,
      top: rect.top + (rect.height - height) / 2,
      width: width,
      height: height
    };
  }

  function rememberFlight(stage) {
    var images = [];
    Array.prototype.forEach.call(stage.querySelectorAll("img"), function (img) {
      var src = publicSrc(img.currentSrc || img.src);
      var rect = visualRect(img);
      if (!src || rect.width < 8 || rect.height < 8) return;
      images.push({
        src: src,
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height
      });
    });
    var stageRect = stage.getBoundingClientRect();
    if (images.length) {
      remember("tx-flight", JSON.stringify({
        stage: {
          x: stageRect.left,
          y: stageRect.top,
          w: stageRect.width,
          h: stageRect.height
        },
        images: images
      }));
    }
  }

  function rememberShotFromStage(stage) {
    var origin = stage.getBoundingClientRect();
    if (origin.width < 8 || origin.height < 8) return;
    var images = [];
    Array.prototype.forEach.call(stage.querySelectorAll("img"), function (img) {
      var src = publicSrc(img.currentSrc || img.src);
      var rect = img.getBoundingClientRect();
      if (!src || rect.width < 8) return;
      images.push({
        src: src,
        l: ((rect.left - origin.left) / origin.width) * 100,
        t: ((rect.top - origin.top) / origin.height) * 100,
        w: (rect.width / origin.width) * 100,
        h: (rect.height / origin.height) * 100
      });
    });
    if (images.length) remember("tx-shot", JSON.stringify({ images: images }));
  }

  function heroFlightTarget() {
    var phones = document.querySelector(".bf-hero__phones");
    if (phones && phones.getBoundingClientRect().height > 40) {
      return { rect: phones.getBoundingClientRect(), hide: phones.querySelectorAll("img") };
    }
    var body = document.querySelector(".cs-body");
    if (!body) return null;
    var meta = body.querySelector(".bf-meta");
    var imgs = [];
    Array.prototype.forEach.call(body.querySelectorAll("img"), function (img) {
      if (meta && !(img.compareDocumentPosition(meta) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
      imgs.push(img);
    });
    if (!imgs.length) return null;
    var parent = imgs[0].parentElement;
    var sameParent = imgs.every(function (img) { return img.parentElement === parent; });
    var useParent = sameParent && parent && !parent.querySelector("h1");
    var rect;
    if (useParent) {
      rect = parent.getBoundingClientRect();
    } else {
      var minX = Infinity;
      var minY = Infinity;
      var maxX = -Infinity;
      var maxY = -Infinity;
      imgs.forEach(function (img) {
        var item = img.getBoundingClientRect();
        minX = Math.min(minX, item.left);
        minY = Math.min(minY, item.top);
        maxX = Math.max(maxX, item.right);
        maxY = Math.max(maxY, item.bottom);
      });
      rect = { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
    }
    if (rect.width < 40 || rect.height < 40) return null;
    if (rect.bottom < 0 || rect.top > window.innerHeight * 0.92) return null;
    return { rect: rect, hide: imgs };
  }

  function paintFromStage(cover, stage) {
    cover.replaceChildren();
    if (!stage) return;
    var origin = stage.getBoundingClientRect();
    if (origin.width < 8 || origin.height < 8) return;
    Array.prototype.forEach.call(stage.querySelectorAll("img"), function (img) {
      var rect = img.getBoundingClientRect();
      var src = publicSrc(img.currentSrc || img.src);
      if (!src) return;
      var clone = document.createElement("img");
      clone.src = src;
      clone.alt = "";
      clone.style.position = "absolute";
      clone.style.left = ((rect.left - origin.left) / origin.width) * 100 + "%";
      clone.style.top = ((rect.top - origin.top) / origin.height) * 100 + "%";
      clone.style.width = (rect.width / origin.width) * 100 + "%";
      clone.style.height = (rect.height / origin.height) * 100 + "%";
      clone.style.objectFit = "contain";
      clone.style.maxWidth = "none";
      cover.appendChild(clone);
    });
  }

  function fillCover(cover) {
    var frame = viewport();
    cover.style.display = "block";
    cover.style.opacity = "1";
    cover.style.left = frame.left;
    cover.style.top = frame.top;
    cover.style.width = frame.width;
    cover.style.height = frame.height;
    cover.style.borderRadius = "0px";
  }

  function pauseVideos() {
    document.querySelectorAll("video").forEach(function (video) {
      try {
        video.pause();
      } catch (err) {}
    });
  }

  function samePageAnchor(link, url) {
    return url.pathname === location.pathname && !!url.hash;
  }

  function modified(e) {
    return e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
  }

  function pageShells() {
    return document.querySelectorAll(".site-header, .bf-layout, .site-footer");
  }

  // The image does most of its travel first. Surrounding content fades in
  // only across the last part of that same move.
  function lateReveal(total) {
    var delay = Math.round(total * 0.64);
    return { delay: delay, duration: Math.max(140, total - delay) };
  }

  function revealShells(total) {
    var late = lateReveal(total);
    Array.prototype.forEach.call(pageShells(), function (el) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: late.duration,
        delay: late.delay,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        fill: "both"
      });
    });
  }

  function releaseShells() {
    Array.prototype.forEach.call(pageShells(), function (el) {
      el.getAnimations().forEach(function (anim) {
        anim.cancel();
      });
    });
  }

  function finishArrival(hide) {
    if (hide) {
      Array.prototype.forEach.call(hide, function (el) {
        el.style.visibility = "";
      });
    }
    clearCover();
    releaseShells();
  }

  function onScreen(rect) {
    var height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    return rect && rect.width > 8 && rect.height > 8 && rect.bottom > 0 && rect.top < height;
  }

  document.addEventListener(
    "click",
    function (e) {
      var link = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (!link || e.defaultPrevented || modified(e)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;

      var url;
      try {
        url = new URL(link.href, location.href);
      } catch (err) {
        return;
      }
      if (url.origin !== location.origin) return;
      if (samePageAnchor(link, url)) return;

      var scrollId = link.getAttribute("data-scroll-to");
      if (scrollId && document.getElementById(scrollId)) return;

      if (reduce) return;

      var card = link.closest("a.project[data-tx-project]");
      var otherWork = link.classList.contains("bf-btn") && scrollId === "my-work";
      var project = document.body.getAttribute("data-tx-project");

      if (card) {
        e.preventDefault();
        e.stopPropagation();
        pauseVideos();
        window.__txSkipVT = true;
        remember("tx-fade", "1");
        go(url.pathname + url.search);
        return;
      }

      if (otherWork && project) {
        e.preventDefault();
        e.stopPropagation();
        pauseVideos();
        window.__txSkipVT = true;
        remember("aq-scroll-to", "my-work");
        remember("tx-back", project);
        go(url.pathname + url.search);
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      if (scrollId) remember("aq-scroll-to", scrollId);
      remember("tx-fade", "1");
      go(url.pathname + url.search + url.hash);
    },
    true
  );

  function skipViewTransition(e) {
    if (!e || !e.viewTransition) return;
    try {
      var finished = e.viewTransition.finished;
      e.viewTransition.skipTransition();
      if (finished && finished.catch) finished.catch(function () {});
    } catch (err) {}
  }

  window.addEventListener("pageswap", function (e) {
    if (window.__txSkipVT) skipViewTransition(e);
  });

  window.addEventListener("pagereveal", function (e) {
    if (html.classList.contains("tx-in") || html.classList.contains("tx-back")) skipViewTransition(e);
  });

  function arrive() {
    if (reduce) {
      clearCover();
      return;
    }

    if (html.classList.contains("tx-fade")) {
      window.setTimeout(function () {
        html.classList.remove("tx-fade");
      }, fadeInMs + 60);
    }

    var cover = coverEl();
    if (html.classList.contains("tx-in")) {
      if (!cover || !cover.querySelector("img")) {
        clearCover();
        return;
      }
      var tries = 0;
      function beginFlight() {
        var pending = document.querySelector(".cs-body img, .bf-hero__phones img");
        if (pending && pending.getBoundingClientRect().height < 40 && tries < 24) {
          tries += 1;
          window.requestAnimationFrame(beginFlight);
          return;
        }
        var target = heroFlightTarget();
        if (!target) {
          var lateFade = lateReveal(expandMs);
          revealShells(expandMs);
          var fade = cover.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: lateFade.duration,
            delay: lateFade.delay,
            easing: FLIGHT,
            fill: "forwards"
          });
          whenDone(fade, expandMs + 40).then(function () {
            finishArrival(null);
          });
          return;
        }
        Array.prototype.forEach.call(target.hide, function (el) {
          el.style.visibility = "hidden";
        });
        var from = cover.getBoundingClientRect();
        var scale = Math.min(target.rect.width / from.width, target.rect.height / from.height);
        var endW = from.width * scale;
        var endH = from.height * scale;
        var dx = target.rect.left + (target.rect.width - endW) / 2 - from.left;
        var dy = target.rect.top + (target.rect.height - endH) / 2 - from.top;
        cover.style.transformOrigin = "0 0";
        revealShells(expandMs);
        var panel = cover.querySelector(".tx-panel");
        if (panel) {
          var latePanel = lateReveal(expandMs);
          panel.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: latePanel.duration,
            delay: latePanel.delay,
            easing: FLIGHT,
            fill: "forwards"
          });
        }
        var fly = cover.animate(
          [
            { transform: "translate(0px, 0px) scale(1)" },
            { transform: "translate(" + dx + "px, " + dy + "px) scale(" + scale + ")" }
          ],
          { duration: expandMs, easing: FLIGHT, fill: "forwards" }
        );
        whenDone(fly, expandMs + 40).then(function () {
          finishArrival(target.hide);
        });
      }
      beginFlight();
      return;
    }

    if (html.classList.contains("tx-back")) {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          var slug = html.dataset.txBack || "";
          var safe = slug.replace(/[^a-z0-9-]/gi, "");
          var card = safe
            ? document.querySelector('a.project[data-tx-project="' + safe + '"]')
            : null;
          var stage = card && (card.querySelector(".project__stage") || card);
          var current = coverEl();
          if (!current || !stage) {
            clearCover();
            return;
          }
          if (!current.querySelector("img")) paintFromStage(current, stage);
          if (!current.querySelector("img")) {
            clearCover();
            return;
          }
          fillCover(current);
          if (stage) stage.scrollIntoView({ block: "center", inline: "nearest" });
          window.requestAnimationFrame(function () {
            var rect = stage.getBoundingClientRect();
            current = coverEl();
            if (!current || !onScreen(rect)) {
              clearCover();
              return;
            }
            var shrink = current.animate([viewport(), box(rect)], {
              duration: expandMs,
              easing: EASE,
              fill: "forwards"
            });
            whenDone(shrink, expandMs + 40).then(function () {
              try {
                sessionStorage.removeItem("tx-shot");
              } catch (err) {}
              clearCover();
            }, clearCover);
          });
        });
      });
    }
  }

  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    try {
      sessionStorage.removeItem("tx-card");
      sessionStorage.removeItem("tx-back");
      sessionStorage.removeItem("tx-fade");
    } catch (err) {}
    clearCover();
  });

  if (!reduce && html.classList.contains("tx-in")) {
    var earlyTarget = heroFlightTarget();
    if (earlyTarget) {
      Array.prototype.forEach.call(earlyTarget.hide, function (el) {
        el.style.visibility = "hidden";
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrive);
  } else {
    arrive();
  }
})();
