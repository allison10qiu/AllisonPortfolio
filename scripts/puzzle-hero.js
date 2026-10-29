// Puzzle hero: my things are scattered across the hero, and each one drags into its pressed-in
// outline on a flat-lay board. Packing everything sends it all into the bag, says thanks, and
// brings back the live bag. Desk units are CSS px.
(function () {
  "use strict";
  var root = document.querySelector("[data-puzzle]");
  var desk = document.querySelector("[data-pz-desk]");
  var hero = document.querySelector(".home-hero--puzzle");
  if (!root || !desk || !hero) return;
  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var BAG_SRC = "assets/bag/bag.png?v=tight";

  // ---------- the board: a flat lay in 600 × 680 units ----------
  // Title top left, the small things in a loose grid on the right, the bag bottom left and the
  // laptop bottom right. `a` is each image's height / width.
  var BW = 600, BH = 680;
  var ITEMS = [
    { key: "pens", src: "pens.png?v=tight", label: "Pens", cx: 64, cy: 352, w: 42, r: -6, a: 2.636 },
    { key: "lip-gloss", src: "lip-gloss.png?v=gloss2", label: "Lip gloss", cx: 432, cy: 126, w: 29, r: 0, a: 1.646 },
    { key: "perfume", src: "perfume.png?v=tight", label: "White tea perfume", cx: 322, cy: 360, w: 40, r: 0, a: 1.69 },
    { key: "mints", src: "mints.png?v=tight", label: "Mints", cx: 514, cy: 112, w: 62, r: 0, a: 0.994 },
    { key: "blotting", src: "blotting.png?v=tight", label: "Blotting papers", cx: 430, cy: 230, w: 80, r: 0, a: 0.691 },
    { key: "keys", src: "keys.png?v=tight", label: "Keys", cx: 318, cy: 222, w: 84, r: -62, a: 1.554 },
    { key: "charger", src: "charger.png?v=tight", label: "Charger", cx: 422, cy: 348, w: 90, r: 0, a: 1.047 },
    { key: "bottle", src: "bottle.png?v=tight", label: "Water bottle", cx: 528, cy: 300, w: 58, r: 0, a: 3.482 },
    { key: "computer", src: "computer.png?v=tight", label: "Laptop", cx: 438, cy: 520, w: 176, r: -90, a: 1.238 }
  ];
  var BAG = { cx: 172, cy: 456, w: 252, a: 1.256 };
  var MOUTH = { x: 178, y: 446 };   // where things drop into the bag
  // Compact board (sidebar layout): the title sits above, so the flat lay follows Allison's
  // reference (742 × 415): the bag on the left; pens and keys over its shoulder; lip gloss and
  // charger, mints and blotting papers, perfume in columns to the right; the laptop and the
  // bottle along the bottom. [x, y, width, turn]
  var compact = document.querySelector("[data-pz-compact]"), THX = { x: 420, y: 262 };
  if (compact) {
    // Allison's flat lay: the bag sits in the middle, so when everything is packed the live bag
    // takes its place exactly and nothing has to slide over to the centre.
    BW = 860; BH = 690;
    var LAY = {
      computer: [160, 152, 215, -90], perfume: [493, 130, 48, 0], blotting: [635, 150, 118, 0], mints: [782, 180, 95, 0],
      pens: [60, 360, 52, 8], "lip-gloss": [200, 345, 70, -3], charger: [600, 330, 135, 0],
      keys: [90, 510, 100, -55], bottle: [760, 465, 95, -3]
    };
    ITEMS.forEach(function (it) { var l = LAY[it.key]; it.cx = l[0]; it.cy = l[1]; it.w = l[2]; it.r = l[3]; });
    BAG.cx = 410; BAG.cy = 415; BAG.w = 390; MOUTH.x = 410; MOUTH.y = 330;
    THX = { x: 520, y: 205 };
  }
  var GEMS = [];
  for (var gi = 0; gi < 17; gi++) GEMS.push("assets/home/decor/star/star-" + String(gi).padStart(2, "0") + ".png");
  for (gi = 0; gi < 18; gi++) GEMS.push("assets/home/decor/circle/circle-" + String(gi).padStart(2, "0") + ".png");

  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

  // =====================================================================
  var q = function (s) { return root.querySelector(s); };
  var meter = q("[data-pz-meter]"), clockEl = q("[data-pz-clock]"), dotsEl = q("[data-pz-dots]"), again = q(".pz-again");
  var spot = root.querySelector(".pz-spot"), spill = q(".pz-spill"), status = q("[data-pz-status]"), done = q(".pz-done");
  var board = desk.querySelector(".pz-board"), bagArt = desk.querySelector(".pz-bagart"), thanks = desk.querySelector(".pz-thanks");
  var rand = rng(Date.now() % 100000);
  var P = { mode: "jigsaw", things: [], placed: 0, t0: 0, solvedAt: 0, finished: false, geo: "", timers: [] };

  // ---------- geometry: the desk spans the viewport width (less a 16px gutter) and the hero's height ----------
  function rectIn(el, base, pad) {
    var r = el.getBoundingClientRect(); pad = pad || 0;
    return { x0: r.left - base.left - pad, y0: r.top - base.top - pad, x1: r.right - base.left + pad, y1: r.bottom - base.top + pad };
  }
  // Two layouts: by default the desk spans the viewport width (less a 16px gutter) and the hero's
  // height, and things lie in the open space around the copy. With data-pz-contained the desk is
  // the puzzle section itself, and things stay inside it.
  var section = root.querySelector(".pz-section"), contained = !!section;
  function measure() {
    var obstacles, base, W, H, stacked;
    if (contained) {
      var sr0 = section.getBoundingClientRect();
      stacked = section.clientWidth < 640;
      hero.classList.toggle("is-stacked", stacked);
      W = section.clientWidth; H = section.clientHeight;
      desk.style.left = "0px"; desk.style.width = W + "px"; desk.style.height = H + "px";
      base = { left: sr0.left, top: sr0.top };
      obstacles = [];
    } else {
      var hr = hero.getBoundingClientRect(), vw = document.documentElement.clientWidth;
      var copy = hero.querySelector(".home-hero__copy");
      stacked = root.getBoundingClientRect().top > copy.getBoundingClientRect().bottom - 8;
      hero.classList.toggle("is-stacked", stacked);
      var left = 16 - hr.left;
      W = vw - 32; H = hero.offsetHeight;
      desk.style.left = left + "px"; desk.style.width = W + "px"; desk.style.height = H + "px";
      base = { left: hr.left + left, top: hr.top };
      obstacles = [rectIn(q(".pz-bar"), base, 10), rectIn(status, base, 4), rectIn(meter, base, 8)];
      Array.prototype.forEach.call(copy.children, function (el) { obstacles.push(rectIn(el, base, 20)); });
    }
    var sr = spot.getBoundingClientRect();
    P.k = sr.width / BW; P.bx = sr.left - base.left; P.by = sr.top - base.top;
    P.W = W; P.H = H; P.stacked = stacked;
    obstacles.push(rectIn(spot, base, 12));
    P.obstacles = obstacles;
    // The floor below the board when stacked; otherwise the open space near the board.
    if (stacked) {
      var fl = rectIn(spill, base, 0);
      P.region = { x0: 4, x1: W - 4, y0: fl.y0 + 10, y1: fl.y1 };
    } else if (contained) {
      P.region = { x0: 14, x1: W - 14, y0: 14, y1: H - 14 };
    } else {
      var hl = hr.left - base.left;
      P.region = { x0: Math.max(4, hl - 60), x1: Math.min(W - 4, hl + hr.width + 90), y0: 22, y1: H - 6 };
    }
    return [W, H, Math.round(P.bx), Math.round(P.by), P.k.toFixed(3), stacked].join("|");
  }

  // Stacked (phones, narrow tablets): the loose things need a floor below the board.
  function sizeSpill() {
    if (!P.stacked) { root.style.removeProperty("--pz-spill"); return; }
    var area = 0;
    ITEMS.forEach(function (it) { area += it.w * it.w * it.a * P.k * P.k; });
    var deskW = P.W - 8;
    root.style.setProperty("--pz-spill", Math.round(Math.max(area * 2.1 / deskW, 200 * P.k) + 24) + "px");
  }

  function layout(force) {
    if (P.mode !== "jigsaw" || !P.things.length || root.closest("[hidden]")) return;
    var sig = measure();
    if (P.stacked) { sizeSpill(); sig = measure(); }
    if (!force && sig === P.geo) return;
    P.geo = sig;
    board.style.left = P.bx + "px"; board.style.top = P.by + "px"; board.style.transform = "scale(" + P.k + ")";
    // The returning bag gets a little more room than the board in the contained layout, so it
    // fills the stage instead of floating small in it.
    // Sized to the stage's height: the bag's stage is 520 × 537 plus the label underneath.
    // Sized so the spill (stage units -205…727 wide, 100…515 tall) fills the stage; the empty top
    // of the bag's own 520 × 537 box may run above the stage.
    // The live bag lands exactly on the board's bag (its body sits at 49.6% / 63.9% of a 520 × 537
    // stage, 273 wide), so the hand-off after packing needs no movement.
    var bagW = BAG.w * P.k, dw = contained ? bagW * 520 / 273 : spot.offsetWidth;
    done.style.width = dw + "px";
    done.style.left = (contained ? spot.offsetLeft + BAG.cx * P.k - 0.496 * dw : spot.offsetLeft) + "px";
    done.style.top = (contained ? spot.offsetTop + BAG.cy * P.k - 0.639 * dw * 537 / 520 : spot.offsetTop) + "px";
    P.things.forEach(function (t) {
      t.w = t.it.w * P.k; t.h = t.it.w * t.it.a * P.k;
      t.el.style.width = t.w + "px"; t.el.style.height = t.h + "px";
      t.tx = P.bx + t.it.cx * P.k; t.ty = P.by + t.it.cy * P.k;
      if (t.placed) { t.x = t.tx; t.y = t.ty; paint(t); }
    });
    if (!P.finished) scatter(P.things.filter(function (t) { return !t.placed; }), true);
  }

  // Axis-aligned box of a w × h rectangle centred at x, y and turned by rot degrees.
  function box(x, y, w, h, rot, pad) {
    var a = Math.abs(rot * Math.PI / 180), bw = (w * Math.abs(Math.cos(a)) + h * Math.abs(Math.sin(a))) / 2, bh = (w * Math.abs(Math.sin(a)) + h * Math.abs(Math.cos(a))) / 2;
    pad = pad || 0;
    return { x0: x - bw - pad, y0: y - bh - pad, x1: x + bw + pad, y1: y + bh + pad };
  }
  function gap(a, b) {
    var dx = Math.max(a.x0 - b.x1, b.x0 - a.x1), dy = Math.max(a.y0 - b.y1, b.y0 - a.y1);
    return Math.max(dx, dy);
  }
  // Scatter: biggest things first, each to the best of many random spots that clears the copy,
  // toolbar and board, keeps a little room from what's already down, and stays close to the board,
  // so the mess reads as one spill rather than things flung to the corners.
  function scatter(list, instant) {
    var reg = P.region, laid = [], sp = P.obstacles[P.obstacles.length - 1];
    list.slice().sort(function (a, b) { return b.w * b.h - a.w * a.h; }).forEach(function (t) {
      var rot = t.it.r + (rand() - 0.5) * 50, best = null, bestScore = -Infinity;
      for (var n = 0; n < 260; n++) {
        var bb = box(0, 0, t.w * LOOSE, t.h * LOOSE, rot), hw = (bb.x1 - bb.x0) / 2, hh = (bb.y1 - bb.y0) / 2;
        var x = reg.x0 + hw + rand() * Math.max(1, reg.x1 - reg.x0 - hw * 2), y = reg.y0 + hh + rand() * Math.max(1, reg.y1 - reg.y0 - hh * 2);
        var b = box(x, y, t.w * LOOSE, t.h * LOOSE, rot, 4), room = 40, score = 0;
        laid.forEach(function (o) { room = Math.min(room, gap(b, o)); });
        score = (room < 0 ? room * 6 - 120 : room) * 3 - Math.max(0, gap(b, sp)) * 1.1;
        if (laid.length) score -= Math.min.apply(null, laid.map(function (o) { return Math.max(0, gap(b, o)); })) * 0.6;
        P.obstacles.forEach(function (o) { var g = gap(b, o); if (g < 0) score += g * 6 - 400; });
        if (score > bestScore) { bestScore = score; best = [x, y, b]; }
      }
      laid.push(best[2]);
      t.x = best[0]; t.y = best[1]; t.rot = rot; t.placed = false;
      t.el.classList.remove("is-placed"); t.el.style.zIndex = 10 + Math.floor(rand() * 20);
      glide(t, instant);
    });
  }
  // Loose things lie a little smaller than their outlines (compact layout), so the spill fits
  // beside the board; they grow to full size when picked up.
  var LOOSE = compact ? 0.78 : 1;
  function paint(t) {
    var k = t.held ? 1.06 : t.placed ? 1 : LOOSE;
    t.el.style.transform = "translate(" + (t.x - t.w / 2) + "px," + (t.y - t.h / 2) + "px)" + (k !== 1 ? " scale(" + k + ")" : "");
    t.el.firstChild.style.transform = "rotate(" + t.rot + "deg)";
  }
  function glide(t, instant) {
    if (instant || reduceMQ.matches) { t.el.classList.remove("is-gliding"); paint(t); return; }
    t.el.classList.add("is-gliding"); paint(t);
    clearTimeout(t.gt); t.gt = setTimeout(function () { t.el.classList.remove("is-gliding"); }, 600);
  }

  function build() {
    // number the outlines left to right across the board: "(1)" beside each one
    ITEMS.slice().sort(function (a, b) { return a.cx - b.cx; }).forEach(function (it, i) { it.n = i + 1; });
    ITEMS.forEach(function (it) {
      var hole = document.createElement("img");
      hole.className = "pz-hole"; hole.src = "assets/bag/" + it.src; hole.alt = ""; hole.draggable = false;
      hole.style.cssText = "left:" + (it.cx - it.w / 2) + "px;top:" + (it.cy - it.w * it.a / 2) + "px;width:" + it.w + "px;transform:rotate(" + it.r + "deg)";
      board.insertBefore(hole, bagArt);
      var a = Math.abs(it.r * Math.PI / 180), h = it.w * it.a;
      var bw = it.w * Math.abs(Math.cos(a)) + h * Math.abs(Math.sin(a)), bh = it.w * Math.abs(Math.sin(a)) + h * Math.abs(Math.cos(a));
      var num = document.createElement("span");
      num.className = "pz-num"; num.textContent = "(" + it.n + ")";
      num.style.left = (it.cx - bw / 2 - 2) + "px"; num.style.top = (it.cy - bh / 2 - 16) + "px";
      board.insertBefore(num, bagArt);
      var el = document.createElement("div");
      el.className = "pz-thing"; el.setAttribute("aria-hidden", "true");
      el.innerHTML = '<img src="assets/bag/' + it.src + '" alt="" draggable="false">';
      desk.appendChild(el);
      var t = { it: it, el: el, x: 0, y: 0, rot: 0, placed: false };
      P.things.push(t); bind(t);
    });
    bagArt.style.cssText = "left:" + (BAG.cx - BAG.w / 2) + "px;top:" + (BAG.cy - BAG.w * BAG.a / 2) + "px;width:" + BAG.w + "px";
    layout(true);
    renderStatus();
  }

  function clearTimers() { P.timers.forEach(clearTimeout); P.timers = []; }
  function later(fn, ms) { P.timers.push(setTimeout(fn, ms)); }

  function scramble() {
    clearTimers(); setSpill(false);
    bagArt.style.transform = ""; bagArt.style.transition = ""; bagArt.style.transformOrigin = "";
    P.bagShift = null;
    thanks.style.left = ""; thanks.style.top = ""; thanks.style.textAlign = "";
    P.finished = false; P.placed = 0; P.t0 = 0; P.solvedAt = 0; lastSecs = -1;
    desk.classList.remove("is-packing", "is-thanks", "is-out");
    desk.hidden = false; done.hidden = true; done.classList.remove("is-in");
    P.things.forEach(function (t) { t.el.getAnimations().forEach(function (a) { a.cancel(); }); t.el.style.opacity = ""; });
    P.geo = ""; layout(true);
    scatter(P.things);
    renderStatus();
  }
  function place(t, instant) {
    t.placed = true; t.held = false; t.x = t.tx; t.y = t.ty; t.rot = t.it.r;
    t.el.classList.add("is-placed"); t.el.style.zIndex = 2; countPlaced();
    glide(t, instant);
  }
  function countPlaced() { P.placed = P.things.filter(function (t) { return t.placed; }).length; return P.placed; }
  function checkSolved() {
    if (P.finished || countPlaced() < P.things.length) return;
    P.finished = true; P.solvedAt = Date.now();
    renderStatus();
    if (!reduceMQ.matches) sprinkle();
    finale();
  }
  function solve() {
    if (P.finished) return;
    var loose = P.things.filter(function (t) { return !t.placed; });
    if (!P.t0) { P.t0 = Date.now(); lastSecs = -1; }
    if (reduceMQ.matches) { loose.forEach(function (t) { place(t, true); }); checkSolved(); return; }
    loose.forEach(function (t, i) { later(function () { place(t); }, i * 90); });
    later(checkSolved, loose.length * 90 + 550);
  }

  // Packed: the bag stays exactly where it is the whole time. Everything drops into it one by one
  // (smallest first), a thank-you appears beside it, then the live bag fades in on the same spot.
  function finale() {
    var reduce = reduceMQ.matches;
    var ease = "cubic-bezier(.22, 1, .36, 1)";
    var bagAt = "translate(0px, 0px)";
    P.bagShift = { x: 0, y: 0 };
    var mx = P.bx + MOUTH.x * P.k, my = P.by + MOUTH.y * P.k;
    var step = 160, fly = 980;
    var order = P.things.slice().sort(function (a, b) { return a.w * a.h - b.w * b.h; });
    var packAt = reduce ? 0 : 250;
    bagArt.style.transformOrigin = "50% 90%";
    later(function () { desk.classList.add("is-packing"); }, 0);
    if (!reduce) {
      order.forEach(function (t, i) {
        later(function () {
          var from = t.el.style.transform, dx = mx - t.w / 2, dy = my - t.h / 2;
          var lift = Math.min(t.y, my) - t.h / 2 - 64 * P.k;
          var midX = (t.x - t.w / 2 + dx) / 2;
          var anim = t.el.animate([
            { transform: from, opacity: 1 },
            { transform: "translate(" + midX + "px," + lift + "px) rotate(6deg) scale(.94)", opacity: 1, offset: 0.4 },
            { transform: "translate(" + dx + "px," + dy + "px) rotate(12deg) scale(.2)", opacity: 0 }
          ], { duration: fly, easing: ease, fill: "forwards" });
          anim.onfinish = function () {
            bagArt.animate([
              { transform: bagAt },
              { transform: "scale(1.02, 0.985)", offset: 0.4 },
              { transform: bagAt }
            ], { duration: 560, easing: ease });
          };
        }, packAt + i * step);
      });
    } else order.forEach(function (t) { t.el.style.opacity = "0"; });
    var packed = reduce ? 0 : packAt + order.length * step + fly;
    later(function () { matchBag(reduce); desk.classList.add("is-thanks"); if (!reduce) burst(); }, packed);
    later(function () {
      desk.classList.add("is-out");
      done.hidden = false;
      void done.offsetWidth;
      done.classList.add("is-in");
      renderStatus();
    }, packed + (reduce ? 1200 : 1900));
    later(function () { desk.hidden = true; }, packed + (reduce ? 1200 : 1900) + 500);
  }
  // Congrats: a sprinkle of homepage gems tossed up over the board, falling and tumbling as they fade.
  function sprinkle() {
    for (var i = 0; i < 34; i++) {
      var g = document.createElement("img"), size = 16 + Math.random() * 24;
      var x = 40 + Math.random() * (BW - 80), y = 60 + Math.random() * (BH - 120);
      var up = 90 + Math.random() * 140, drift = (Math.random() - 0.5) * 140, fall = 160 + Math.random() * 160, spin = (Math.random() - 0.5) * 540;
      g.className = "pz-gem"; g.src = GEMS[Math.floor(Math.random() * GEMS.length)]; g.alt = "";
      g.style.cssText = "left:" + (x - size / 2) + "px;top:" + (y - size / 2) + "px;width:" + size + "px;height:" + size + "px;z-index:20";
      board.appendChild(g);
      var a = g.animate([
        { transform: "translate(0,0) scale(.2) rotate(0deg)", opacity: 0 },
        { transform: "translate(" + drift * 0.4 + "px," + -up + "px) scale(1) rotate(" + spin * 0.4 + "deg)", opacity: 1, offset: 0.3 },
        { transform: "translate(" + drift + "px," + (fall - up) + "px) scale(.85) rotate(" + spin + "deg)", opacity: 0 }
      ], { duration: 1500 + Math.random() * 700, delay: Math.random() * 260, easing: "cubic-bezier(.25,.6,.4,1)", fill: "forwards" });
      a.onfinish = (function (el) { return function () { el.remove(); }; })(g);
    }
  }
  // Thank-you beat: the thanks sits just to the right of the bag, which stays put for the hand-off.
  function matchBag(reduce) {
    if (!compact || !done.hasAttribute("data-pz-done")) return;
    var wasHidden = done.hidden;
    done.style.visibility = "hidden"; done.hidden = false; layout(true);
    var target = done.querySelector(".home-bag__body img").getBoundingClientRect();
    done.hidden = wasHidden; done.style.visibility = "";
    // the board's bag already sits exactly where the live bag appears, so it doesn't move
    var r = board.getBoundingClientRect();
    thanks.style.left = ((target.right - r.left) / P.k + 26) + "px";
    thanks.style.top = ((target.top + target.height * 0.42 - r.top) / P.k - 46) + "px";
    thanks.style.textAlign = "left";
    THX = { x: (target.right - r.left) / P.k + 170, y: (target.top + target.height * 0.42 - r.top) / P.k };
  }
  // A few homepage gems pop around the thank-you.
  function burst() {
    for (var i = 0; i < 14; i++) {
      var g = document.createElement("img"), size = 18 + Math.random() * 22, ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 90;
      g.className = "pz-gem"; g.src = GEMS[Math.floor(Math.random() * GEMS.length)]; g.alt = "";
      g.style.cssText = "left:" + (THX.x - size / 2) + "px;top:" + (THX.y - size / 2) + "px;width:" + size + "px;height:" + size + "px";
      board.appendChild(g);
      var a = g.animate([
        { transform: "translate(0,0) scale(.2)", opacity: 0 },
        { transform: "translate(" + Math.cos(ang) * dist * 0.8 + "px," + Math.sin(ang) * dist * 0.55 + "px) scale(1) rotate(60deg)", opacity: 1, offset: 0.4 },
        { transform: "translate(" + Math.cos(ang) * dist + "px," + (Math.sin(ang) * dist * 0.7 + 30) + "px) scale(.8) rotate(140deg)", opacity: 0 }
      ], { duration: 1500 + Math.random() * 500, delay: Math.random() * 200, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" });
      a.onfinish = (function (el) { return function () { el.remove(); }; })(g);
    }
  }

  // ---------- the packed bag: click it (or the note beside it) and it tips onto its side at the
  // left while everything spills out to the right in a loose row (Allison's reference). Positions are in the bag stage's 520 × 537 units and run
  // well past its edges. [x, y, width, turn]
  // Opening the bag: it tips onto its side at the left and everything spills out in a loose row
  // to its right. Stage units (520 × 537). [x, y, width, turn]
  var SPILL = {
    "Lip gloss": [64, 187, 28, 0], "Keys": [190, 162, 100, -62], "Blotting papers": [104, 376, 84, 2],
    "Laptop": [313, 378, 194, -90], "Charger": [386, 206, 101, 0], "Water bottle": [507, 352, 65, 0],
    "Mints": [560, 167, 66, 0], "Pens": [623, 305, 48, 6], "White tea perfume": [705, 202, 44, -3]
  };
  var spillOn = false, spillReady = false;
  function setSpill(on) {
    if (!done.hasAttribute("data-pz-done")) return;
    spillOn = on;
    done.classList.toggle("is-open", on);
    done.querySelectorAll("[data-spill]").forEach(function (b) { if (b.classList.contains("home-bag__body")) b.setAttribute("aria-expanded", on ? "true" : "false"); });
    done.querySelectorAll(".bag-item").forEach(function (it) { it.tabIndex = on ? 0 : -1; it.setAttribute("aria-hidden", on ? "false" : "true"); });
    var tipEl = done.querySelector(".bag-tip"); if (tipEl) tipEl.classList.remove("is-on");
    if (P.finished) renderStatus();
  }
  (function bindSpill() {
    if (!done.hasAttribute("data-pz-done") || spillReady) return;
    spillReady = true;
    done.classList.add("is-wide");
    var stageEl = done.querySelector(".home-bag__stage"), tipEl = done.querySelector(".bag-tip");
    var items = Array.prototype.slice.call(done.querySelectorAll(".bag-item"));
    items.sort(function (a, b) { return (SPILL[a.getAttribute("aria-label")] || [0])[0] - (SPILL[b.getAttribute("aria-label")] || [0])[0]; });
    items.forEach(function (it, i) {
      var sp = SPILL[it.getAttribute("aria-label")];
      if (!sp) return;
      it.style.setProperty("--sx", sp[0]); it.style.setProperty("--sy", sp[1]); it.style.setProperty("--sw", sp[2]); it.style.setProperty("--sr", sp[3]);
      it.style.setProperty("--d-open", (40 + i * 70) + "ms");
      it.style.setProperty("--d-close", ((items.length - 1 - i) * 35) + "ms");
      // The note follows the cursor (keyboard focus pins it above the item instead).
      function place(x, y) {
        var sr = stageEl.getBoundingClientRect(), z = sr.width / stageEl.offsetWidth || 1;
        tipEl.style.left = (x - sr.left) / z + 12 + "px"; tipEl.style.top = (y - sr.top) / z - 14 + "px";
      }
      function show(e) {
        if (!spillOn || !tipEl) return;
        tipEl.textContent = it.getAttribute("data-note") || "";
        if (e && e.clientX !== undefined) place(e.clientX, e.clientY);
        else { var r = it.getBoundingClientRect(); place(r.left + r.width * 0.55, r.top + 6); }
        tipEl.classList.add("is-on");
      }
      function hide() { if (tipEl) tipEl.classList.remove("is-on"); }
      it.addEventListener("pointerenter", show); it.addEventListener("focus", function () { show(); });
      it.addEventListener("pointermove", function (e) { if (spillOn && tipEl) place(e.clientX, e.clientY); });
      it.addEventListener("pointerleave", hide); it.addEventListener("blur", hide);
    });
    done.querySelectorAll("[data-spill]").forEach(function (b) { b.addEventListener("click", function () { setSpill(!spillOn); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && spillOn) setSpill(false); });
    setSpill(false);
  })();

  function toLocal(e) {
    var r = desk.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  // Alpha maps, so a grab lands on the thing you can see, not on a neighbour's transparent corner.
  function alphaMap(t) {
    var img = t.el.firstChild;
    function draw() {
      var w = 64, h = Math.max(1, Math.round(w * img.naturalHeight / img.naturalWidth));
      var c = document.createElement("canvas"); c.width = w; c.height = h;
      var ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0, w, h);
      t.alpha = ctx.getImageData(0, 0, w, h);
    }
    if (img.complete && img.naturalWidth) draw(); else img.addEventListener("load", draw);
  }
  function solidAt(t, x, y) {
    var a = -t.rot * Math.PI / 180, dx = x - t.x, dy = y - t.y;
    var lx = dx * Math.cos(a) - dy * Math.sin(a) + t.w / 2, ly = dx * Math.sin(a) + dy * Math.cos(a) + t.h / 2;
    if (lx < 0 || ly < 0 || lx >= t.w || ly >= t.h) return false;
    if (!t.alpha) return true;
    var d = t.alpha, sx = Math.floor(lx / t.w * d.width), sy = Math.floor(ly / t.h * d.height);
    return d.data[(sy * d.width + sx) * 4 + 3] > 40;
  }
  function thingAt(x, y) {
    var loose = P.things.filter(function (t) { return !t.placed; }).sort(function (a, b) { return (+b.el.style.zIndex || 0) - (+a.el.style.zIndex || 0); });
    for (var i = 0; i < loose.length; i++) if (solidAt(loose[i], x, y)) return loose[i];
    return null;
  }
  function bind(t) {
    var drag = null;
    alphaMap(t);
    t.el.addEventListener("pointerdown", function (e) {
      if (t.placed || P.finished || e.button > 0) return;
      e.preventDefault();
      var pt = toLocal(e), hit = thingAt(pt[0], pt[1]);
      if (hit && hit !== t) { hit.grab(e, pt); return; }
      t.grab(e, pt);
    });
    t.grab = function (e, pt) {
      drag = { dx: pt[0] - t.x, dy: pt[1] - t.y, id: e.pointerId };
      t.el.setPointerCapture(e.pointerId);
      // picking a thing up turns it to the way its outline faces
      t.held = true; t.rot = t.it.r; t.el.classList.add("is-held"); t.el.classList.remove("is-gliding");
      t.el.style.zIndex = 200; paint(t);
      if (!P.t0) { P.t0 = Date.now(); lastSecs = -1; renderStatus(); }
    };
    t.el.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var pt = toLocal(e);
      t.x = Math.min(Math.max(pt[0] - drag.dx, t.w * 0.2), P.W - t.w * 0.2);
      t.y = Math.min(Math.max(pt[1] - drag.dy, t.h * 0.2), P.H - t.h * 0.2);
      paint(t);
    });
    function up(e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null; t.held = false; t.el.classList.remove("is-held");
      if (Math.hypot(t.x - t.tx, t.y - t.ty) < 40 * Math.max(P.k, 0.75)) { place(t); renderStatus(); checkSolved(); }
      else { t.el.style.zIndex = 60; paint(t); }
    }
    t.el.addEventListener("pointerup", up); t.el.addEventListener("pointercancel", up);
  }

  // ---------- toolbar ----------
  function act(what) { if (what === "scramble") scramble(); else solve(); }
  // The packing meter: a star gem that ticks round once a second, the clock, and one gem per thing packed.
  var lastSecs = -1, lastPlaced = -1;
  function renderMeter() {
    var on = P.mode === "jigsaw";
    meter.hidden = !on;
    if (!on) return;
    var total = P.things.length || ITEMS.length, n = P.placed;
    if (dotsEl.childElementCount !== total) {
      dotsEl.innerHTML = "";
      for (var i = 0; i < total; i++) dotsEl.appendChild(document.createElement("i"));
    }
    if (n !== lastPlaced) {
      Array.prototype.forEach.call(dotsEl.children, function (d, k) { d.classList.toggle("is-on", k < n); });
      if (n > lastPlaced && lastPlaced >= 0 && n > 0) {
        var d = dotsEl.children[n - 1];
        d.classList.remove("is-pop"); void d.offsetWidth; d.classList.add("is-pop");
      }
      lastPlaced = n;
    }
    var secs = P.t0 ? Math.floor(((P.solvedAt || Date.now()) - P.t0) / 1000) : 0;
    if (secs !== lastSecs) {
      clockEl.textContent = Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0");
      meter.style.setProperty("--tick", secs);
      lastSecs = secs;
    }
    meter.classList.toggle("is-running", !!P.t0 && !P.finished);
    meter.classList.toggle("is-done", P.finished);
    var out = P.finished && desk.classList.contains("is-out");
    if (compact) {
      // only offered once the bag is packed
      again.hidden = !out;
      var lbl = again.querySelector("[data-again-label]");
      if (lbl) lbl.textContent = out ? "scramble again" : "scramble";
    } else again.hidden = !out;
  }
  function renderStatus() {
    var s = "";
    // while packing, keep the gem trail off the board so it never slips under the outlines
    spot.toggleAttribute("data-trail-quiet", !P.finished);
    renderMeter();
    if (P.mode === "jigsaw") {
      var n = P.placed, total = P.things.length || ITEMS.length, left = total - n;
      if (P.finished && desk.classList.contains("is-out")) s = spillOn ? "hover my things to hear about them. click the bag to pack them back." : "all packed! click the bag to peek inside.";
      else if (P.finished) s = "packing up\u2026";
      else if (!P.t0) s = "oh no, my stuff is everywhere! help me pack?";
      else if (n === 0) s = "drag each thing into its outline.";
      else if (left === 1) s = "just one more!!";
      else if (left <= 3) s = "almost there, " + left + " to go";
      else if (n >= total / 2) s = "halfway! you\u2019re so good at this";
      else s = "ooh thank you! " + left + " left";
    }
    if (status.innerHTML !== s) status.innerHTML = s;
  }



  root.querySelectorAll('[data-act="scramble"]').forEach(function (b) { b.addEventListener("click", function () { act("scramble"); }); });
  q('[data-act="solve"]').addEventListener("click", function () { act("solve"); });

  renderStatus();
  if (document.readyState === "complete") build(); else window.addEventListener("load", build);
  setInterval(function () { if (P.mode === "jigsaw" && P.t0 && !P.finished) renderStatus(); }, 1000);

  var pending = 0;
  function relayout() { cancelAnimationFrame(pending); pending = requestAnimationFrame(function () { layout(); }); }
  window.addEventListener("resize", relayout);
  if ("ResizeObserver" in window) new ResizeObserver(relayout).observe(hero);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
})();
