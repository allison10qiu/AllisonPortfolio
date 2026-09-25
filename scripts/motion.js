/**
 * Shared entrance motion. Content stays visible unless this script
 * marks an element .is-motion-wait and an animation is actually running.
 * Call window.aqMotion.scan(root) after Terraform injects protected HTML.
 */
(function () {
  var EASE = "cubic-bezier(.2,.8,.2,1)";
  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile =
    window.matchMedia && window.matchMedia("(max-width: 767px)").matches;
  var distance = mobile ? 16 : 24;
  var riseMs = mobile ? 560 : 700;
  var maskMs = mobile ? 680 : 800;
  var wipeMs = mobile ? 900 : 1100;
  var step = mobile ? 48 : 70;
  var cap = mobile ? 240 : 360;

  var io = null;
  var booted = false;

  function delayFor(index) {
    return Math.min(Math.max(index, 0) * step, cap);
  }

  // Play only once the element has actually entered. Starting in the margin
  // below the fold let the rise finish before it was visible.
  function inView(el) {
    var rect = el.getBoundingClientRect();
    var height = window.innerHeight || document.documentElement.clientHeight || 0;
    if (height <= 0 || rect.height <= 0) return false;
    return rect.bottom > height * 0.06 && rect.top < height * 0.92;
  }

  function skipped(el) {
    if (!el || !el.closest) return true;
    if (el.id === "terraform-locked" || el.classList.contains("terraform-locked")) return true;
    if (el.hidden || el.closest("[hidden]")) return true;
    return !!el.closest(
      ".bf-marquee, [data-preview-track], .cs-strip, #workflow, .bf-rail, .site-header, .site-footer__lace"
    );
  }

  function clearEffects(el, anims) {
    anims.forEach(function (anim) {
      anim.cancel();
    });
    el.classList.remove("is-motion-wait");
    el.style.opacity = "";
    el.style.transform = "";
    el.style.clipPath = "";
  }

  function play(el, kind, delay) {
    if (!el || el._motionPlayed) return;
    el._motionPlayed = "1";
    el.classList.remove("is-motion-wait");
    var host = kind === "wipe" ? el.parentElement : null;
    var mask = null;
    if (kind === "mask") {
      mask = el.parentElement && el.parentElement.classList.contains("motion-mask")
        ? el.parentElement
        : el.parentElement && el.parentElement.parentElement;
      if (!mask || !mask.classList.contains("motion-mask")) mask = null;
    }
    var previousOverflow = host ? host.style.overflow : "";
    if (host && host !== document.body && host !== document.documentElement) {
      host.style.overflow = "hidden";
    } else {
      host = null;
    }
    var anims = [];
    if (kind === "fade") {
      anims.push(el.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: riseMs, delay: delay, easing: EASE, fill: "both" }
      ));
    } else if (kind === "wipe") {
      anims.push(el.animate(
        [{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)" }],
        { duration: wipeMs, delay: delay, easing: EASE, fill: "both" }
      ));
      anims.push(el.animate(
        [{ transform: "scale(1.06)" }, { transform: "scale(1)" }],
        { duration: wipeMs + 280, delay: delay, easing: EASE, fill: "both" }
      ));
    } else if (kind === "mask") {
      anims.push(el.animate(
        [{ transform: "translateY(105%)" }, { transform: "none" }],
        { duration: maskMs, delay: delay, easing: EASE, fill: "both" }
      ));
    } else if (kind === "float") {
      anims.push(el.animate(
        [
          { opacity: 0, transform: "translateY(18px)" },
          { opacity: 1, transform: "none" }
        ],
        { duration: 720, delay: delay, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }
      ));
    } else if (kind === "lift") {
      anims.push(el.animate(
        [{ transform: "translateY(18px)" }, { transform: "none" }],
        { duration: 720, delay: delay, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }
      ));
    } else if (kind === "enter") {
      anims.push(el.animate(
        [
          { opacity: 0, transform: "translateY(16px)" },
          { opacity: 1, transform: "none" }
        ],
        { duration: 480, delay: delay, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)", fill: "both" }
      ));
    } else {
      anims.push(el.animate(
        [
          { opacity: 0, transform: "translateY(" + distance + "px)" },
          { opacity: 1, transform: "none" }
        ],
        { duration: riseMs, delay: delay, easing: EASE, fill: "both" }
      ));
    }
    var finished = 0;
    var cleaned = false;
    function finish() {
      if (cleaned) return;
      cleaned = true;
      clearEffects(el, anims);
      if (host) host.style.overflow = previousOverflow;
      if (mask) mask.style.overflow = "visible";
    }
    anims.forEach(function (anim) {
      anim.onfinish = function () {
        finished += 1;
        if (finished >= anims.length) finish();
      };
    });
    var duration = kind === "wipe" ? wipeMs + 280 : kind === "mask" ? maskMs : kind === "float" || kind === "lift" ? 720 : kind === "enter" ? 480 : riseMs;
    window.setTimeout(finish, (delay || 0) + duration + 400);
  }

  // Card flights already move the hero. A fade between Home and About should
  // still play this entrance, or the page arrives with nothing moving.
  function pageArrival() {
    var root = document.documentElement;
    return root.classList.contains("tx-in")
      || root.classList.contains("tx-back")
      || root.dataset.txFrom === "card"
      || root.dataset.txFrom === "back";
  }

  function arm(el, kind, delay) {
    if (!el || el.nodeType !== 1 || el.dataset.motionBound || skipped(el)) return;
    if (pageArrival() && inView(el)) {
      el.dataset.motionBound = kind;
      return;
    }
    el.dataset.motionBound = kind;
    var wait = delay || 0;
    if (inView(el)) {
      play(el, kind, wait);
      return;
    }
    el.classList.add("is-motion-wait");
    el._motionKind = kind;
    el._motionDelay = wait;
    io.observe(el);
  }

  function armAll(list, kind, start) {
    Array.prototype.forEach.call(list, function (el, index) {
      arm(el, kind, (start || 0) + delayFor(index));
    });
  }

  function revealVisibleWaits() {
    document.querySelectorAll(".is-motion-wait").forEach(function (el) {
      if (!inView(el)) return;
      if (io) io.unobserve(el);
      play(el, el._motionKind || "rise", 0);
    });
  }

  function ensureObserver() {
    if (io) return;
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        play(entry.target, entry.target._motionKind || "rise", entry.target._motionDelay || 0);
      });
    }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    document.addEventListener("scrollend", revealVisibleWaits, { capture: true, passive: true });
  }

  function maskWords(el, kind) {
    if (!el || el.dataset.motionSplit) return;
    kind = kind || "mask";
    if (pageArrival()) {
      arm(el, "rise", 0);
      return;
    }
    var pieces = [];
    function walk(node, italic) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) pieces.push({ space: part });
          else pieces.push({ word: part, italic: italic });
        });
        return;
      }
      if (node.nodeType === 1) {
        var childItalic = italic || node.tagName === "EM";
        Array.prototype.forEach.call(node.childNodes, function (child) {
          walk(child, childItalic);
        });
      }
    }
    Array.prototype.forEach.call(el.childNodes, function (child) {
      walk(child, false);
    });
    var words = pieces.filter(function (piece) { return piece.word; });
    if (words.length < 2) {
      arm(el, "rise", 0);
      return;
    }
    el.dataset.motionSplit = "1";
    el.textContent = "";
    var index = 0;
    pieces.forEach(function (piece) {
      if (piece.space) {
        el.appendChild(document.createTextNode(" "));
        return;
      }
      var word = document.createElement("span");
      word.className = "motion-word";
      word.textContent = piece.word;
      var holder = word;
      if (piece.italic) {
        var em = document.createElement("em");
        em.appendChild(word);
        holder = em;
      }
      if (kind === "float") {
        el.appendChild(holder);
      } else {
        var mask = document.createElement("span");
        mask.className = "motion-mask";
        mask.appendChild(holder);
        el.appendChild(mask);
      }
      arm(word, kind === "float" ? "float" : "mask", index * (kind === "float" ? 70 : 60));
      index += 1;
    });
  }

  function setupHome() {
    if (!document.body.classList.contains("home-page")) return;
    maskWords(document.querySelector(".home-hero__title"));
    arm(document.querySelector(".home-hero__lede"), "rise", 140);
    arm(document.querySelector(".home-hero__links"), "rise", 200);
    arm(document.querySelector(".home-index__head"), "rise", 240);
    armAll(document.querySelectorAll(".home-index__list li"), "rise", 280);
    arm(document.querySelector(".work-head"), "rise", 0);
    armAll(document.querySelectorAll(".work .project"), "rise", 40);
  }

  function setupAbout() {
    if (!document.body.classList.contains("about-page")) return;
    var hero = document.querySelector(".about-hero");
    if (hero) {
      maskWords(hero.querySelector("h1"), "float");
      arm(hero.querySelector(".about-hero__lede"), "float", 280);
      arm(hero.querySelector(".about-portrait"), "lift", 80);
    }
    document.querySelectorAll(".about-block").forEach(function (block) {
      var jobs = block.querySelectorAll(".job");
      var communities = block.querySelectorAll(".community");
      if (jobs.length) {
        arm(block.querySelector("h2"), "rise", 0);
        arm(block.querySelector(".about-textlink"), "rise", 40);
        armAll(jobs, "rise", 50);
        return;
      }
      if (communities.length) {
        arm(block.querySelector(":scope > h2"), "rise", 0);
        armAll(communities, "rise", 40);
        return;
      }
      arm(block, "rise", 0);
    });
    arm(document.querySelector(".belief"), "rise", 0);
    var life = document.querySelector(".life");
    if (life) {
      arm(life.querySelector(".life-copy"), "rise", 0);
      armAll(life.querySelectorAll(".polaroid"), "fade", 40);
    }
  }

  function setupCaseHero() {
    if (document.documentElement.classList.contains("tx-in") || document.documentElement.dataset.txFrom === "card") return;
    var body = document.querySelector(".cs-body");
    if (body) {
      var h1 = body.querySelector("h1");
      var column = h1 && h1.parentElement;
      arm(body.querySelector(".case-project-kicker"), "rise", 0);
      maskWords(h1);
      if (column) {
        arm(column.querySelector("p"), "rise", 120);
        var cta = column.querySelector("div");
        if (cta && cta !== column) arm(cta, "rise", 170);
      }
      var heroBlock = h1 && h1.closest(".cs-body > div");
      if (heroBlock) {
        var frame = heroBlock.querySelector("[style*='aspect-ratio']");
        var image = heroBlock.querySelector("img");
        if (frame && frame.querySelector("img")) arm(frame, "wipe", 120);
        else if (image) arm(image, "wipe", 120);
      }
      var meta = body.querySelector(".bf-meta");
      if (meta) armAll(meta.querySelectorAll(".bf-meta__item"), "rise", 220);
      return;
    }

    var hero = document.querySelector(".bf-hero");
    if (!hero) return;
    arm(hero.querySelector(".case-project-kicker"), "rise", 0);
    maskWords(hero.querySelector("h1"));
    arm(hero.querySelector(".bf-hero__lede"), "rise", 120);
    arm(hero.querySelector(".bf-jump"), "rise", 180);
    arm(hero.querySelector(".bf-hero__phones"), "rise", 200);
    var bcMeta = document.querySelector(".bf-meta");
    if (bcMeta) armAll(bcMeta.querySelectorAll(".bf-meta__item"), "rise", 240);
  }

  function setupCaseBlocks() {
    var body = document.querySelector(".cs-body");
    if (body) {
      Array.prototype.forEach.call(body.children, function (block) {
        if (block.querySelector("h1") || block.querySelector(".bf-meta")) return;
        if (block.querySelector("[data-preview-track], .cs-strip")) {
          arm(block, "rise", 0);
          return;
        }
        if (block.textContent.indexOf("Step 4") !== -1 && block.textContent.indexOf("Step 5") !== -1) {
          arm(block.querySelector("h3"), "rise", 0);
          arm(block.querySelector("p"), "rise", 40);
          var steps = [];
          Array.prototype.forEach.call(block.querySelectorAll("span"), function (span) {
            var label = span.textContent.trim();
            if (label !== "Step 4" && label !== "Step 5") return;
            var grid = span.parentElement;
            while (grid && grid !== block && (grid.getAttribute("style") || "").indexOf("grid-template-columns") === -1) {
              grid = grid.parentElement;
            }
            if (grid && grid !== block) steps.push(grid);
          });
          steps.forEach(function (grid, index) {
            arm(grid, "rise", delayFor(index));
            var shot = grid.querySelector("img");
            if (shot) arm(shot, "wipe", delayFor(index));
          });
          return;
        }
        if (block.textContent.indexOf("The build order I set") !== -1) {
          var grid = block.querySelector("[style*='repeat(3']");
          arm(block.querySelector("span"), "rise", 0);
          if (grid) armAll(grid.children, "rise", 40);
          return;
        }
        var decisions = block.querySelectorAll(".cs-decision");
        var specimens = block.querySelectorAll(".cs-specimen");
        if (decisions.length > 1) {
          arm(block.querySelector("h2, h3"), "rise", 0);
          armAll(decisions, "rise", 40);
          if (document.body.classList.contains("anda-page") || document.body.classList.contains("nabu-page")) {
            block.querySelectorAll(".cs-decision__shot").forEach(function (shot) {
              arm(shot, "wipe", 0);
            });
          }
          return;
        }
        if (specimens.length > 1) {
          arm(block.querySelector("h2"), "rise", 0);
          armAll(specimens, "rise", 30);
          return;
        }
        arm(block, "rise", 0);
      });
    }

    document.querySelectorAll(".bf-section").forEach(function (section) {
      var cards = section.querySelectorAll(".bf-challenge, .bf-constraint, .bf-decision, .bf-takeaway, .cs-specimen");
      var persona = section.querySelector(".bf-persona");
      if (cards.length) {
        arm(section.querySelector(".bf-head"), "rise", 0);
        arm(section.querySelector("h2"), "rise", 0);
        arm(section.querySelector(".bf-problem__statement"), "rise", 40);
        armAll(cards, "rise", 50);
        arm(section.querySelector(".bf-problem__card"), "rise", 80);
        return;
      }
      if (persona) {
        arm(section.querySelector(".bf-head") || section.querySelector("h2"), "rise", 0);
        arm(persona, "rise", 60);
        return;
      }
      arm(section, "rise", 0);
    });
  }

  function setupProtected(root) {
    if (!root || !root.querySelectorAll) return;
    Array.prototype.forEach.call(root.querySelectorAll("[data-part='protected']"), function (node) {
      if (node.id === "workflow" || node.id === "scaling") return;
      arm(node, "rise", 0);
    });
    var scaling = root.querySelector("#scaling");
    if (!scaling) return;
    [".tf-scale__kicker", ".tf-scale__intro", ".tf-scale__lede", ".tf-scale__head"].forEach(function (selector, index) {
      arm(scaling.querySelector(selector), "rise", delayFor(index));
    });
    armAll(scaling.querySelectorAll(".tf-scale__row"), "rise", 40);
  }

  function setupFooter() {
    arm(document.querySelector(".site-footer__body"), "rise", 0);
  }

  function boot() {
    if (reduce || booted) return;
    booted = true;
    document.documentElement.classList.add("js-motion");
    ensureObserver();
    setupHome();
    setupAbout();
    setupCaseHero();
    setupCaseBlocks();
    setupFooter();
  }

  window.aqMotion = {
    scan: function (root) {
      if (reduce) return;
      if (!booted) boot();
      setupProtected(root);
    }
  };

  function start() {
    boot();
  }

  boot();
})();
