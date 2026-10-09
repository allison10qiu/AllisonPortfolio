(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STAR_GEMS = [];
  var CIRCLE_GEMS = [];
  var si;
  for (si = 0; si < 17; si += 1) STAR_GEMS.push("assets/home/decor/star/star-" + String(si).padStart(2, "0") + ".png");
  for (si = 0; si < 18; si += 1) CIRCLE_GEMS.push("assets/home/decor/circle/circle-" + String(si).padStart(2, "0") + ".png");

  function gemSrc() {
    var pool = Math.random() < 0.5 ? STAR_GEMS : CIRCLE_GEMS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  var bag = document.querySelector("[data-bag]");
  if (bag) {
    var stage = bag.querySelector(".home-bag__stage");
    var tip = bag.querySelector(".bag-tip");
    var open = false;
    var hover = false;

    function syncBag() {
      var shown = open || hover;
      bag.classList.toggle("is-open", shown);
      bag.querySelectorAll("[data-bag-toggle]").forEach(function (button) {
        button.setAttribute("aria-expanded", shown ? "true" : "false");
      });
      bag.querySelectorAll(".bag-item").forEach(function (item) {
        item.tabIndex = shown ? 0 : -1;
        item.setAttribute("aria-hidden", shown ? "false" : "true");
      });
      var body = bag.querySelector(".home-bag__body");
      var hotspot = bag.querySelector(".home-bag__hotspot");
      if (body) body.tabIndex = shown ? -1 : 0;
      if (hotspot) hotspot.tabIndex = shown ? 0 : -1;
      if (window.__aqCluster) window.__aqCluster();
    }

    syncBag();

    function toggleBag() {
      if (open) {
        open = false;
        hover = false;
      } else {
        open = true;
      }
      syncBag();
    }

    bag.querySelectorAll("[data-bag-toggle]").forEach(function (button) {
      button.addEventListener("click", toggleBag);
    });

    stage.addEventListener("mouseenter", function () {
      hover = true;
      syncBag();
    });
    stage.addEventListener("mouseleave", function () {
      hover = false;
      syncBag();
      if (tip) tip.classList.remove("is-on");
    });

    var hitMaps = new WeakMap();

    function prepHit(item) {
      var img = item.querySelector("img");
      if (!img) return;
      function draw() {
        if (!img.naturalWidth) return;
        var w = 64;
        var h = Math.max(1, Math.round((img.naturalHeight * w) / img.naturalWidth));
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        hitMaps.set(item, ctx.getImageData(0, 0, w, h));
      }
      if (img.complete && img.naturalWidth) draw();
      else img.addEventListener("load", draw);
    }

    function itemAlpha(item, clientX, clientY) {
      var data = hitMaps.get(item);
      var box = item.getBoundingClientRect();
      var cx = box.left + box.width / 2;
      var cy = box.top + box.height / 2;
      var dx = clientX - cx;
      var dy = clientY - cy;
      var theta = (parseFloat(getComputedStyle(item).getPropertyValue("--r")) || 0) * Math.PI / 180;
      var lx = dx * Math.cos(theta) + dy * Math.sin(theta);
      var ly = -dx * Math.sin(theta) + dy * Math.cos(theta);
      var w = item.offsetWidth;
      var h = item.offsetHeight;
      var x = lx + w / 2;
      var y = ly + h / 2;
      if (x < 0 || y < 0 || x >= w || y >= h) return 0;
      if (!data) return 255;
      var sx = Math.min(data.width - 1, Math.floor((x / w) * data.width));
      var sy = Math.min(data.height - 1, Math.floor((y / h) * data.height));
      return data.data[(sy * data.width + sx) * 4 + 3];
    }

    function itemAt(clientX, clientY) {
      var list = bag.querySelectorAll(".bag-item");
      for (var i = list.length - 1; i >= 0; i -= 1) {
        if (itemAlpha(list[i], clientX, clientY) > 28) return list[i];
      }
      // Narrow objects (pens, perfume, lip gloss) get a ~6px forgiving halo.
      var PAD = 6;
      var offsets = [[PAD, 0], [-PAD, 0], [0, PAD], [0, -PAD], [PAD, PAD], [-PAD, -PAD], [PAD, -PAD], [-PAD, PAD]];
      for (var j = list.length - 1; j >= 0; j -= 1) {
        if (list[j].offsetWidth > 40) continue;
        for (var o = 0; o < offsets.length; o += 1) {
          if (itemAlpha(list[j], clientX + offsets[o][0], clientY + offsets[o][1]) > 28) return list[j];
        }
      }
      return null;
    }

    function placeTip(event) {
      var rect = stage.getBoundingClientRect();
      tip.style.left = event.clientX - rect.left + 10 + "px";
      tip.style.top = event.clientY - rect.top - 12 + "px";
    }

    stage.addEventListener("mousemove", function (event) {
      if (!tip) return;
      if (!(open || hover)) {
        tip.classList.remove("is-on");
        return;
      }
      var item = itemAt(event.clientX, event.clientY);
      if (!item) {
        tip.classList.remove("is-on");
        return;
      }
      tip.textContent = item.getAttribute("data-note") || "";
      tip.classList.add("is-on");
      placeTip(event);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      var goalsDlg = document.querySelector("[data-goals-dialog]");
      var memsDlg = document.querySelector("[data-mems-dialog]");
      if ((goalsDlg && !goalsDlg.hidden) || (memsDlg && !memsDlg.hidden)) return;
      if (!open && !hover) return;
      open = false;
      hover = false;
      syncBag();
    });

    bag.querySelectorAll(".bag-item").forEach(function (item) {
      prepHit(item);
      item.addEventListener("focus", function () {
        if (!tip) return;
        tip.textContent = item.getAttribute("data-note") || "";
        tip.classList.add("is-on");
      });
      item.addEventListener("blur", function () {
        if (!tip) return;
        tip.classList.remove("is-on");
      });
    });
  }

  var gem = document.querySelector("[data-work-gem]");
  var work = document.getElementById("my-work");
  if (gem && work) {
    var spins = 0;
    var skipIO = false;
    var spinTimer = 0;

    function spinGem() {
      if (reduced) return;
      spins += 1;
      gem.style.transform = "rotate(" + spins * 360 + "deg)";
    }

    if ("IntersectionObserver" in window && !reduced) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && !skipIO) spinGem();
          });
        },
        { threshold: 0.6 }
      );
      io.observe(gem);
    }

    document.querySelectorAll("[data-work-jump]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (!work) return;
        event.preventDefault();
        skipIO = true;
        var header = document.querySelector(".site-header");
        var offset = header ? header.getBoundingClientRect().height + 16 : 24;
        var top = work.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" });
        spinGem();
        window.clearTimeout(spinTimer);
        spinTimer = window.setTimeout(function () {
          skipIO = false;
        }, 1400);
      });
    });
  }

  var trail = document.querySelector("[data-gem-trail]");
  var hero = document.querySelector(".home-hero");
  if (trail && hero && !reduced) {
    var last = null;
    var heroOn = true;
    var nodes = 0;

    function trailPeak(clientX, clientY) {
      var peak = 0.9;
      var avoid = document.querySelectorAll("[data-trail-avoid]");
      if (window.innerWidth < 768) {
        avoid = document.querySelectorAll("[data-trail-avoid], .home-goals, .home-mems__cam, .home-mems__title");
      }
      for (var a = 0; a < avoid.length; a += 1) {
        var box = avoid[a].getBoundingClientRect();
        if (!box.width || !box.height) continue;
        var dx = Math.max(box.left - clientX, 0, clientX - box.right);
        var dy = Math.max(box.top - clientY, 0, clientY - box.bottom);
        var dist = Math.hypot(dx, dy);
        if (dist < 16) return 0;
        if (dist < 44) peak = Math.min(peak, (0.9 * (dist - 16)) / 28);
      }
      return peak < 0.08 ? 0 : peak;
    }

    function spawn(x, y, peak) {
      if (!peak) return;
      var el = document.createElement("img");
      el.src = gemSrc();
      el.alt = "";
      el.draggable = false;
      var size = 22 + Math.random() * 22;
      var rot = Math.random() * 360;
      var dx = (Math.random() - 0.5) * 30;
      var dy = 14 + Math.random() * 26;
      el.style.cssText =
        "position:absolute;left:" +
        (x - size / 2) +
        "px;top:" +
        (y - size / 2) +
        "px;width:" +
        size +
        "px;height:" +
        size +
        "px;object-fit:contain;pointer-events:none;will-change:transform,opacity";
      trail.appendChild(el);
      nodes += 1;
      var duration = 1100 + Math.random() * 500;
      var anim = el.animate(
        [
          { transform: "rotate(" + rot + "deg) scale(.3)", opacity: 0 },
          { transform: "rotate(" + (rot + 20) + "deg) scale(1)", opacity: peak, offset: 0.15 },
          {
            transform: "translate(" + dx + "px," + dy + "px) rotate(" + (rot + 90) + "deg) scale(.85)",
            opacity: 0
          }
        ],
        { duration: duration, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" }
      );
      function remove() {
        if (!el.isConnected) return;
        el.remove();
        nodes = Math.max(0, nodes - 1);
      }
      anim.onfinish = remove;
      window.setTimeout(remove, duration + 80);
    }

    function onMove(event) {
      if (!heroOn) return;
      if (nodes > 160) return;
      var rect = trail.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      if (y < 0 || y > rect.height || x < 0 || x > rect.width) {
        last = null;
        return;
      }
      if (last && Math.hypot(x - last.x, y - last.y) < 44) return;
      last = { x: x, y: y };
      var count = 3 + Math.floor(Math.random() * 2);
      for (var i = 0; i < count; i += 1) {
        var sx = x + (Math.random() - 0.5) * 150;
        var sy = y + (Math.random() - 0.5) * 120;
        spawn(sx, sy, trailPeak(rect.left + sx, rect.top + sy));
      }
    }

    window.addEventListener("pointermove", onMove, { passive: true });

    if ("IntersectionObserver" in window) {
      var trailIO = new IntersectionObserver(
        function (entries) {
          heroOn = entries.some(function (entry) {
            return entry.isIntersecting;
          });
          if (!heroOn) last = null;
        },
        { threshold: 0 }
      );
      trailIO.observe(hero);
    }
  }

  (function heroObjects() {
    var GOALS = [
      ["Learn Adobe suite", "Getting comfortable past the basics in Illustrator, After Effects and InDesign."],
      ["Create a passion project", "Something made just for me — no brief, no deadline, no stakeholders."],
      ["Be more creative!", "More sketching, more weird ideas, fewer safe first drafts."],
      ["Live in the moment!", "Phone down, camera out (the little Sony counts)."],
      ["Explore Europe", "Trains, pastries, and as many cities as I can fit in."],
      ["NYC Summer (hopefully)", "Fingers crossed for a summer in the city."]
    ];
    var MEMS = [
      ["assets/home/mems/1.jpg", "center 40%", "Friends at a house party"],
      ["assets/home/mems/2.jpg", "center 50%", "Illinois football game"],
      ["assets/home/mems/3.jpg", "center 50%", "In front of an I ♥ NY sign"],
      ["assets/home/mems/4.jpg", "center 50%", "Friends in a DC metro station"],
      ["assets/home/mems/5.jpg", "center 40%", "Birthday party with balloons"],
      ["assets/home/mems/6.jpg", "center 55%", "Holding up the IBM logo with friends"],
      ["assets/home/mems/7.jpg", "center 40%", "Two friends on a Georgetown street"]
    ];
    var cluster = document.querySelector("[data-cluster]");
    var objects = document.querySelector("[data-objects]");
    var goalsMove = document.querySelector("[data-goals-move]");
    var memsMove = document.querySelector("[data-mems-move]");
    var lede = document.querySelector(".home-hero__lede");
    var heroEl = document.querySelector(".home-hero");
    var restLeft = 0;

    function fitCluster() {
      if (!cluster || !heroEl) return;
      if (window.innerWidth < 768) {
        cluster.style.setProperty("--k", "1");
        cluster.style.setProperty("--edge", "0");
        var avail = heroEl.clientWidth || window.innerWidth;
        var m = (avail - 8) / 548;
        m = Math.min(0.67, Math.max(0.55, m));
        cluster.style.setProperty("--m", m.toFixed(3));
        return;
      }
      var fit = objects && objects.querySelector(".home-objects__fit");
      if (fit) {
        var natural = fit.offsetHeight;
        if (natural) objects.style.setProperty("--obj-h", natural + "px");
      }
      var side = Math.min(1, Math.max(0.6, (heroEl.clientWidth - 284) / 570));
      var copyEl = heroEl.querySelector(".home-hero__copy");
      var wrapped = copyEl && cluster.getBoundingClientRect().top > copyEl.getBoundingClientRect().bottom - 8;
      var k = wrapped ? Math.min(1, heroEl.clientWidth / 570) : side;
      var prev = parseFloat(cluster.style.getPropertyValue("--k") || "1");
      if (Math.abs(prev - k) > 0.005) cluster.style.setProperty("--k", k.toFixed(3));
      var heroRight = heroEl.getBoundingClientRect().right;
      var edge = heroRight + 40 * k > window.innerWidth - 8 ? "0" : "1";
      if (cluster.style.getPropertyValue("--edge") !== edge) cluster.style.setProperty("--edge", edge);
    }

    function measureRest() {
      if (!objects || !bag || bag.classList.contains("is-open")) return;
      restLeft = objects.getBoundingClientRect().left;
    }

    window.__aqCluster = function () {
      if (!goalsMove || !memsMove || !objects || !heroEl) return;
      var shown = bag && bag.classList.contains("is-open");
      if (!shown) {
        goalsMove.style.transform = "";
        memsMove.style.transform = "";
        goalsMove.style.transitionDelay = "0s";
        memsMove.style.transitionDelay = "0s";
        if (lede) lede.style.maxWidth = "";
        measureRest();
        return;
      }
      if (window.innerWidth < 768) {
        var mobileScale = parseFloat(getComputedStyle(cluster).getPropertyValue("--m")) || 0.6;
        if (mobileScale < 0.2) mobileScale = 0.6;
        goalsMove.style.transitionDelay = "0.05s";
        memsMove.style.transitionDelay = "0.08s";
        goalsMove.style.transform = "translate(" + (-8 / mobileScale) + "px, " + (-16 / mobileScale) + "px) rotate(-3deg)";
        memsMove.style.transform = "translate(" + (-4 / mobileScale) + "px, " + (14 / mobileScale) + "px) rotate(3deg)";
        if (lede) lede.style.maxWidth = "";
        return;
      }
      var heroBox = heroEl.getBoundingClientRect();
      var objBox = objects.getBoundingClientRect();
      var textRight = heroBox.left + 24;
      [document.querySelector(".home-hero__title"), document.querySelector(".home-hero__links")].forEach(function (el) {
        if (!el) return;
        var box = el.getBoundingClientRect();
        var sameRow = box.bottom > objBox.top + 8 && box.top < objBox.bottom - 8;
        if (sameRow) textRight = Math.max(textRight, box.right);
      });
      var room = (restLeft || objBox.left) - textRight - 12;
      goalsMove.style.transitionDelay = "0.05s";
      memsMove.style.transitionDelay = "0.12s";
      if (room < 40) {
        goalsMove.style.transform = "translate(0px, -60px) rotate(-7deg)";
        memsMove.style.transform = "translate(0px, 40px) rotate(5deg)";
      } else {
        var shift = Math.max(0, room);
        // Goals card slides left 120px (was 96) when the bag spills: the extra 24px is the
        // breathing room between the card and the spilled items. Vertical offset unchanged.
        goalsMove.style.transform = "translate(" + -Math.min(120, shift) + "px, -26px) rotate(-7deg)";
        memsMove.style.transform = "translate(" + -Math.min(120, shift) + "px, 18px) rotate(5deg)";
      }
      if (lede) {
        var tagLeft = lede.getBoundingClientRect().left;
        var objLeft = (restLeft || objBox.left) - Math.min(120, Math.max(0, room));
        var maxW = Math.min(500, Math.max(240, objLeft - 16 - tagLeft));
        lede.style.maxWidth = maxW + "px";
      }
    };

    function refit() {
      fitCluster();
      measureRest();
      if (window.__aqCluster) window.__aqCluster();
    }
    refit();
    window.addEventListener("resize", refit);
    if ("ResizeObserver" in window && heroEl) {
      var clusterRO = new ResizeObserver(refit);
      clusterRO.observe(heroEl);
      clusterRO.observe(document.documentElement);
    }

    var goalCard = document.querySelector("[data-goals-open]");
    if (goalCard) {
      goalCard.querySelectorAll("[data-goal-row]").forEach(function (row) {
        var turns = 0;
        row.addEventListener("mouseenter", function () {
          turns += 1;
          var img = row.querySelector("img");
          if (img) img.style.transform = "rotate(" + turns * 360 + "deg)";
        });
      });
    }

    var goalsDialog = document.querySelector("[data-goals-dialog]");
    var goalsScrim = document.querySelector("[data-goals-scrim]");
    var goalsRows = document.querySelector("[data-goals-rows]");
    var goalsReturn = null;
    var goalsTimer = 0;
    if (goalsRows) {
      GOALS.forEach(function (goal, index) {
        var row = document.createElement("div");
        row.className = "home-goal";
        row.innerHTML =
          '<button type="button" class="home-goal__btn">' +
          '<img src="assets/home/goals/star.png" alt="">' +
          "<span>" + goal[0] + "</span>" +
          '<span class="home-goal__plus" aria-hidden="true">+</span>' +
          "</button>" +
          '<p class="home-goal__note">' + goal[1] + "</p>";
        var turns = 0;
        var button = row.querySelector("button");
        button.addEventListener("mouseenter", function () {
          turns += 1;
          row.querySelector("img").style.transform = "rotate(" + turns * 360 + "deg)";
        });
        button.addEventListener("focus", function () {
          turns += 1;
          row.querySelector("img").style.transform = "rotate(" + turns * 360 + "deg)";
        });
        button.addEventListener("click", function () {
          row.classList.toggle("is-open");
          button.setAttribute("aria-expanded", row.classList.contains("is-open") ? "true" : "false");
        });
        button.setAttribute("aria-expanded", "false");
        row.setAttribute("data-goal-index", String(index));
        goalsRows.appendChild(row);
      });
    }

    function lockScroll(on) {
      document.documentElement.style.overflow = on ? "hidden" : "";
    }

    function trapTab(dialog, event) {
      if (event.key !== "Tab") return;
      var nodes = dialog.querySelectorAll("button, a[href], input, [tabindex]:not([tabindex='-1'])");
      var list = [];
      for (var i = 0; i < nodes.length; i += 1) {
        if (nodes[i].offsetParent !== null || nodes[i].classList.contains("home-modal__sr")) list.push(nodes[i]);
      }
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function zoomFrom(dialog, trigger, scale, opening) {
      var box = trigger.getBoundingClientRect();
      var ox = box.left + box.width / 2 - window.innerWidth / 2;
      var oy = box.top + box.height / 2 - window.innerHeight / 2;
      var from = "translate(calc(-50% + " + ox + "px), calc(-50% + " + oy + "px)) scale(" + scale + ")";
      var to = "translate(-50%, -50%) scale(1)";
      dialog.hidden = false;
      dialog.getAnimations().forEach(function (anim) { anim.cancel(); });
      dialog.animate(
        opening
          ? [{ transform: from, opacity: 0 }, { transform: to, opacity: 1 }]
          : [{ transform: to, opacity: 1 }, { transform: from, opacity: 0 }],
        { duration: opening ? 420 : 320, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" }
      );
    }

    function openGoals() {
      if (!goalsDialog || !goalCard) return;
      closeMems(true);
      goalsRows.querySelectorAll(".home-goal").forEach(function (row) {
        row.classList.remove("is-open");
        var button = row.querySelector("button");
        if (button) button.setAttribute("aria-expanded", "false");
      });
      goalsReturn = document.activeElement;
      if (goalsScrim) {
        goalsScrim.hidden = false;
        window.requestAnimationFrame(function () { goalsScrim.classList.add("is-in"); });
      }
      zoomFrom(goalsDialog, goalCard, 0.18, true);
      lockScroll(true);
      var closeBtn = goalsDialog.querySelector("[data-goals-close]");
      if (closeBtn) closeBtn.focus();
    }

    function closeGoals(immediate) {
      if (!goalsDialog || goalsDialog.hidden) return;
      if (goalsScrim) goalsScrim.classList.remove("is-in");
      if (immediate || reduced) {
        goalsDialog.hidden = true;
        if (goalsScrim) goalsScrim.hidden = true;
      } else {
        zoomFrom(goalsDialog, goalCard, 0.18, false);
        window.clearTimeout(goalsTimer);
        goalsTimer = window.setTimeout(function () {
          goalsDialog.hidden = true;
          if (goalsScrim) goalsScrim.hidden = true;
        }, 320);
      }
      if (!(memsDialog && !memsDialog.hidden)) lockScroll(false);
      if (goalsReturn && goalsReturn.focus) goalsReturn.focus();
    }

    var memIndex = 0;
    var memTimer = 0;
    var memsDialog = document.querySelector("[data-mems-dialog]");
    var memsScrim = document.querySelector("[data-mems-scrim]");
    var memsOpenBtn = document.querySelector("[data-mems-open]");
    var memsReturn = null;
    var memsTimer = 0;

    document.querySelectorAll("[data-mem-screen]").forEach(function (screen) {
      MEMS.forEach(function (mem) {
        var img = document.createElement("img");
        img.className = "home-mems__photo";
        img.src = mem[0];
        img.alt = mem[2];
        img.style.objectPosition = mem[1];
        img.draggable = false;
        screen.appendChild(img);
      });
      var flash = document.createElement("span");
      flash.className = "home-mems__flash";
      var count = document.createElement("span");
      count.className = "home-mems__count";
      screen.appendChild(flash);
      screen.appendChild(count);
    });

    function renderMems() {
      document.querySelectorAll("[data-mem-screen]").forEach(function (screen) {
        var photos = screen.querySelectorAll(".home-mems__photo");
        for (var i = 0; i < photos.length; i += 1) photos[i].classList.toggle("is-on", i === memIndex);
        var count = screen.querySelector(".home-mems__count");
        if (count) count.textContent = memIndex + 1 + "/7";
      });
    }

    function flashMems() {
      if (reduced) return;
      document.querySelectorAll(".home-mems__flash").forEach(function (el) {
        el.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 380, easing: "ease-out", fill: "forwards" });
      });
    }

    function armMems() {
      window.clearInterval(memTimer);
      if (reduced) return;
      memTimer = window.setInterval(function () {
        memIndex = (memIndex + 1) % 7;
        renderMems();
      }, 2800);
    }

    function stepMems(dir) {
      memIndex = (memIndex + dir + 7) % 7;
      renderMems();
      flashMems();
      armMems();
    }

    renderMems();
    armMems();

    function openMems() {
      if (!memsDialog || !memsOpenBtn) return;
      closeGoals(true);
      memsReturn = document.activeElement;
      if (memsScrim) {
        memsScrim.hidden = false;
        window.requestAnimationFrame(function () { memsScrim.classList.add("is-in"); });
      }
      zoomFrom(memsDialog, memsOpenBtn, 0.27, true);
      lockScroll(true);
      var next = memsDialog.querySelector("[data-mems-next]");
      if (next) next.focus();
    }

    function closeMems(immediate) {
      if (!memsDialog || memsDialog.hidden) return;
      if (memsScrim) memsScrim.classList.remove("is-in");
      if (immediate || reduced) {
        memsDialog.hidden = true;
        if (memsScrim) memsScrim.hidden = true;
      } else {
        zoomFrom(memsDialog, memsOpenBtn, 0.27, false);
        window.clearTimeout(memsTimer);
        memsTimer = window.setTimeout(function () {
          memsDialog.hidden = true;
          if (memsScrim) memsScrim.hidden = true;
        }, 320);
      }
      if (!(goalsDialog && !goalsDialog.hidden)) lockScroll(false);
      if (memsReturn && memsReturn.focus) memsReturn.focus();
    }

    if (goalCard) goalCard.addEventListener("click", openGoals);
    if (goalsScrim) goalsScrim.addEventListener("click", function () { closeGoals(false); });
    if (goalsDialog) {
      var goalsClose = goalsDialog.querySelector("[data-goals-close]");
      if (goalsClose) goalsClose.addEventListener("click", function () { closeGoals(false); });
    }
    if (memsOpenBtn) memsOpenBtn.addEventListener("click", openMems);
    if (memsScrim) memsScrim.addEventListener("click", function () { closeMems(false); });
    var memsNext = document.querySelector("[data-mems-next]");
    if (memsNext) memsNext.addEventListener("click", function () { stepMems(1); });
    var memsClose = document.querySelector("[data-mems-close]");
    if (memsClose) memsClose.addEventListener("click", function () { closeMems(false); });

    document.addEventListener("keydown", function (event) {
      if (goalsDialog && !goalsDialog.hidden) {
        if (event.key === "Escape") closeGoals(false);
        trapTab(goalsDialog, event);
        return;
      }
      if (memsDialog && !memsDialog.hidden) {
        if (event.key === "Escape") closeMems(false);
        if (event.key === "ArrowRight") {
          event.preventDefault();
          stepMems(1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          stepMems(-1);
        }
        trapTab(memsDialog, event);
      }
    });

    window.__aqSprinkle = function (event, card) {
      var rect = card.getBoundingClientRect();
      var x = event.clientX || rect.left + rect.width / 2;
      var y = event.clientY || rect.top + rect.height / 2;
      for (var n = 0; n < 16; n += 1) {
        var img = document.createElement("img");
        img.src = gemSrc();
        img.alt = "";
        img.draggable = false;
        var size = 12 + Math.random() * 16;
        var angle = Math.random() * Math.PI * 2;
        var dist = 50 + Math.random() * 90;
        var dx = Math.cos(angle) * dist;
        var dy = Math.sin(angle) * dist;
        var rot = Math.random() * 200;
        img.style.cssText =
          "position:fixed;z-index:200;pointer-events:none;object-fit:contain;left:" +
          (x - size / 2) + "px;top:" + (y - size / 2) + "px;width:" + size + "px;height:" + size + "px;";
        document.body.appendChild(img);
        var dur = 700 + Math.random() * 300;
        var anim = img.animate(
          [
            { transform: "translate(0px,0px) rotate(" + rot + "deg) scale(.4)", opacity: 1 },
            {
              transform: "translate(" + dx * 0.8 + "px," + (dy * 0.8 - 10) + "px) rotate(" + (rot + 90) + "deg) scale(1)",
              opacity: 1,
              offset: 0.45
            },
            {
              transform: "translate(" + dx + "px," + (dy + 40) + "px) rotate(" + (rot + 200) + "deg) scale(.8)",
              opacity: 0
            }
          ],
          { duration: dur, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" }
        );
        anim.onfinish = function () { img.remove(); };
      }
    };
  })();

  var pit = document.querySelector("[data-gem-pit]");
  if (!pit) return;
  var host = pit.parentElement;
  if (!host) return;

  // Footer gem pit. Mirrors the Claude reference (Home Page v2.dc.html, initPit):
  // the pit layer covers the WHOLE footer, the only floor is the footer bottom,
  // and there is no pile-height cap, content exclusion or bottom band.
  var CELL = 24;
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  pit.appendChild(canvas);
  var gems = [];
  var images = [];
  var W = 0;
  var H = 0;
  var dpr = 1;
  var ptr = null;
  var raf = 0;
  var running = false;
  var onScreen = false;
  var spawned = false;
  var awake = true;
  var calm = 0;
  var baseCount = 0;
  var maxCount = 0;
  var fallStarted = 0;
  var settledAt = 0;
  var grid = new Map();

  function fitCanvas() {
    W = pit.clientWidth;
    H = pit.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }

  function newGem(r, x, y, vx, vy) {
    return {
      img: images[(Math.random() * images.length) | 0],
      r: r,
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      a: Math.random() * 360,
      px: x,
      py: y
    };
  }

  function physicsStep() {
    var energy = 0;
    var i;
    var g;
    for (i = 0; i < gems.length; i += 1) {
      g = gems[i];
      g.vy += 0.45;
      g.vx *= 0.99;
      g.vy *= 0.995;
      if (ptr) {
        var dx = g.x - ptr.x;
        var dy = g.y - ptr.y;
        var R = g.r + 34;
        if (dx * dx + dy * dy < R * R) {
          var d = Math.hypot(dx, dy) || 0.1;
          var k = (R - d) / R;
          g.x += (dx / d) * (R - d) * 0.35;
          g.y += (dy / d) * (R - d) * 0.35;
          g.vx += (dx / d) * k * 2.5;
          g.vy += (dy / d) * k * 2.5 - 0.3;
        }
      }
      g.px = g.x;
      g.py = g.y;
      g.x += g.vx;
      g.y += g.vy;
      if (Math.abs(g.vx) > 0.05) g.a += g.vx * 1.6;
      if (g.y > H - g.r) {
        g.y = H - g.r;
        g.vy *= -0.3;
        g.vx *= 0.85;
      }
      if (g.x < g.r) {
        g.x = g.r;
        g.vx *= -0.5;
      } else if (g.x > W - g.r) {
        g.x = W - g.r;
        g.vx *= -0.5;
      }
    }
    var pass;
    for (pass = 0; pass < 2; pass += 1) {
      grid.clear();
      for (i = 0; i < gems.length; i += 1) {
        g = gems[i];
        var key = (((g.x / CELL) | 0) + 512) * 4096 + (((g.y / CELL) | 0) + 2048);
        var cell = grid.get(key);
        if (!cell) grid.set(key, (cell = []));
        cell.push(g);
      }
      for (i = 0; i < gems.length; i += 1) {
        var a = gems[i];
        var cx = (a.x / CELL) | 0;
        var cy = (a.y / CELL) | 0;
        var ox;
        var oy;
        for (ox = -1; ox <= 1; ox += 1) {
          for (oy = -1; oy <= 1; oy += 1) {
            var c = grid.get((cx + ox + 512) * 4096 + (cy + oy + 2048));
            if (!c) continue;
            var n;
            for (n = 0; n < c.length; n += 1) {
              var b = c[n];
              if (b === a || b.x < a.x || (b.x === a.x && b.y <= a.y)) continue;
              var bx = b.x - a.x;
              var by = b.y - a.y;
              var min = (a.r + b.r) * 0.92;
              var d2 = bx * bx + by * by;
              if (d2 < min * min && d2 > 0.0001) {
                var dist = Math.sqrt(d2);
                var nx = bx / dist;
                var ny = by / dist;
                var o = (min - dist) / 2;
                a.x -= nx * o;
                a.y -= ny * o;
                b.x += nx * o;
                b.y += ny * o;
                var rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                if (rv < 0) {
                  var imp = -rv * 0.6;
                  a.vx -= nx * imp;
                  a.vy -= ny * imp;
                  b.vx += nx * imp;
                  b.vy += ny * imp;
                }
              }
            }
          }
        }
      }
    }
    for (i = 0; i < gems.length; i += 1) {
      g = gems[i];
      var m = Math.abs(g.x - g.px) + Math.abs(g.y - g.py);
      if (m < 0.08) {
        g.x = g.px;
        g.y = g.py;
        if (Math.abs(g.vx) < 0.1) g.vx = 0;
        if (Math.abs(g.vy) < 1) g.vy = 0;
      }
      energy += m;
    }
    return energy;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var i;
    var minY = Infinity;
    var maxY = -Infinity;
    for (i = 0; i < gems.length; i += 1) {
      var gem = gems[i];
      if (gem.y < minY) minY = gem.y;
      if (gem.y > maxY) maxY = gem.y;
      if (!gem.img || gem.y < -gem.r || gem.y > H + gem.r) continue;
      ctx.save();
      ctx.translate(gem.x, gem.y);
      ctx.rotate((gem.a * Math.PI) / 180);
      ctx.drawImage(gem.img, -gem.r, -gem.r, gem.r * 2, gem.r * 2);
      ctx.restore();
    }
    pit._aq = {
      n: gems.length,
      base: baseCount,
      max: maxCount,
      loaded: images.length,
      W: W,
      H: H,
      dpr: dpr,
      minY: minY,
      maxY: maxY,
      awake: awake,
      calm: calm,
      settle: settledAt
    };
  }

  function step() {
    raf = 0;
    var energy = physicsStep();
    draw();
    // Sleep once the pile settles; pointer movement or a click wakes it.
    calm = !ptr && gems.length && energy / gems.length < 0.05 ? calm + 1 : 0;
    if (calm > 30) {
      awake = false;
      running = false;
      if (!settledAt && fallStarted) settledAt = Math.round(performance.now() - fallStarted);
      return;
    }
    if (onScreen && awake) raf = window.requestAnimationFrame(step);
    else running = false;
  }

  function startLoop() {
    if (reduced || !spawned || !onScreen || raf) return;
    running = true;
    if (!fallStarted) fallStarted = performance.now();
    raf = window.requestAnimationFrame(step);
  }

  function stopLoop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  function wake() {
    awake = true;
    calm = 0;
    startLoop();
  }

  function spawnGems() {
    if (!images.length || !W || !H) return;
    var count = Math.max(80, Math.min(200, Math.round(W * 0.17)));
    baseCount = count;
    maxCount = count + 220;
    var i;
    gems = [];
    for (i = 0; i < count; i += 1) {
      var r = 6 + Math.random() * 5;
      gems.push(newGem(r, r + Math.random() * (W - 2 * r), -Math.random() * H * 1.6 - r, (Math.random() - 0.5) * 2, 0));
    }
    spawned = true;
    fallStarted = 0;
    settledAt = 0;
    awake = true;
    calm = 0;
    if (reduced) {
      // No motion: run the same physics offscreen and show the settled pile.
      var guard = 0;
      while (guard < 900 && (guard < 60 || calm <= 30)) {
        var energy = physicsStep();
        calm = energy / gems.length < 0.05 ? calm + 1 : 0;
        guard += 1;
      }
      awake = false;
      draw();
    } else if (onScreen) {
      startLoop();
    } else {
      draw();
    }
  }

  function onPitMove(event) {
    if (reduced || !spawned) return;
    var bounds = pit.getBoundingClientRect();
    var x = event.clientX - bounds.left;
    var y = event.clientY - bounds.top;
    ptr = x >= 0 && y >= 0 && x <= W && y <= H ? { x: x, y: y } : null;
    if (ptr) wake();
  }

  function onPitLeave() {
    ptr = null;
  }

  // Click-to-add: every press in the footer (except links/buttons) launches a
  // burst of gems into the same simulation. Population cap: initial + 220.
  function addGem(x, y) {
    var r = 6 + Math.random() * 5;
    var angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    var speed = 3 + Math.random() * 5;
    gems.push(newGem(r, Math.min(W - r, Math.max(r, x)), y, Math.cos(angle) * speed, Math.sin(angle) * speed));
    if (gems.length > maxCount) gems.shift();
  }

  function onPitDown(event) {
    if (reduced || !spawned || !images.length) return;
    if (event.target && event.target.closest && event.target.closest("a,button")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    var bounds = pit.getBoundingClientRect();
    var x = event.clientX - bounds.left;
    var y = event.clientY - bounds.top;
    if (x < 0 || y < 0 || x > W || y > H) return;
    var count = 8 + Math.floor(Math.random() * 5);
    var i;
    for (i = 0; i < count; i += 1) addGem(x + (Math.random() - 0.5) * 16, y + (Math.random() - 0.5) * 16);
    wake();
  }

  host.addEventListener("pointermove", onPitMove, { passive: true });
  host.addEventListener("pointerdown", onPitDown);
  host.addEventListener("pointerleave", onPitLeave);

  var pitRO = null;
  if ("ResizeObserver" in window) {
    pitRO = new ResizeObserver(function () {
      fitCanvas();
      if (!W || !H) return;
      if (!spawned) {
        if (images.length) spawnGems();
        return;
      }
      // Particles are kept; the wall/floor clamps in physicsStep() pull them
      // inside the new footer bounds on the next frame.
      if (reduced) {
        var i;
        for (i = 0; i < gems.length; i += 1) {
          if (gems[i].x > W - gems[i].r) gems[i].x = W - gems[i].r;
          if (gems[i].y > H - gems[i].r) gems[i].y = H - gems[i].r;
        }
        draw();
      } else {
        wake();
        if (!raf) draw();
      }
    });
    pitRO.observe(pit);
  }

  var pitIO = null;
  if ("IntersectionObserver" in window) {
    pitIO = new IntersectionObserver(function (entries) {
      onScreen = entries.some(function (entry) {
        return entry.isIntersecting;
      });
      if (!onScreen) {
        ptr = null;
        stopLoop();
        return;
      }
      if (!spawned) return;
      if (reduced) {
        draw();
        return;
      }
      if (awake) startLoop();
      else draw();
    });
    pitIO.observe(pit);
  } else {
    onScreen = true;
  }

  fitCanvas();

  function loadImages(urls) {
    return Promise.all(
      urls.map(function (src) {
        return new Promise(function (resolve) {
          var img = new Image();
          img.decoding = "async";
          img.onload = function () {
            var finish = function () {
              resolve(img.naturalWidth > 0 ? img : null);
            };
            if (!img.decode) {
              finish();
              return;
            }
            Promise.race([
              img.decode().catch(function () {}),
              new Promise(function (resume) {
                window.setTimeout(resume, 1200);
              })
            ]).then(finish);
          };
          img.onerror = function () {
            resolve(null);
          };
          img.src = src;
        });
      })
    ).then(function (list) {
      return list.filter(Boolean);
    });
  }

  function rasterGem(img) {
    var size = 64;
    var tile = document.createElement("canvas");
    tile.width = size;
    tile.height = size;
    var g = tile.getContext("2d");
    g.drawImage(img, 0, 0, size, size);
    return tile;
  }

  loadImages(STAR_GEMS.concat(CIRCLE_GEMS)).then(function (loaded) {
    images = loaded.map(rasterGem);
    fitCanvas();
    if (W && H) spawnGems();
  });

  function teardownPit() {
    host.removeEventListener("pointermove", onPitMove);
    host.removeEventListener("pointerdown", onPitDown);
    host.removeEventListener("pointerleave", onPitLeave);
    stopLoop();
    if (pitIO) pitIO.disconnect();
    if (pitRO) pitRO.disconnect();
  }

  window.addEventListener("pagehide", teardownPit);
})();
