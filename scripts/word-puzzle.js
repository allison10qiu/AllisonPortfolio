// Word search in the shape of a star: personal words hidden across, down and diagonally (and
// diagonally, always reading forwards). Drag from the first letter to the last to circle one. Each scramble deals a new grid.
(function () {
  "use strict";
  var root = document.querySelector("[data-word-puzzle]");
  if (!root) return;
  var q = function (s) { return root.querySelector(s); };
  var box = q(".ws-box"), gridEl = q(".ws-grid"), svg = q(".ws-marks"), listEl = q(".ws-list");
  var status = q("[data-pz-status]"), meter = q("[data-pz-meter]"), clockEl = q("[data-pz-clock]"), dotsEl = q("[data-pz-dots]"), again = q(".pz-again");
  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var SVGNS = "http://www.w3.org/2000/svg";
  // lowercase letters sit a little below the middle of their cell (x-height, no caps)
  var CY = 0.54;

  // [answer as hidden, label shown in the list]
  // [answer as hidden, label in the bank, the little note that appears once it's found]
  var WORDS = [
    ["TERRAFORM", "terraform", "my project at ibm where i worked on a cloud computing platform"],
    ["ANDA", "anda", "my first project as a project manager in hack4impact"],
    ["CROCHET", "crochet", "one of my favorite hobbies to relax and unwind"],
    ["PUZZLES", "puzzles", "my favorite way to challenge myself everyday"],
    ["DIGICAM", "digicam", "my most prized possession because i love capturing photos"],
    ["NYC", "nyc", "my dream city to live in"],
    ["UIUC", "uiuc", "i love my school even if it\u2019s in the cornfields"],
    ["SMISKIS", "smiskis", "blindboxes are really fun to collect"],
    ["BAKING", "baking", "baking desserts for my friends is my love language"],
    ["TEA", "tea", "coffee is too strong for me so i lovee drinking tea instead"]
  ];
  var N = 19;
  var GEMS = [];
  for (var gi = 0; gi < 17; gi++) GEMS.push("assets/home/decor/star/star-" + String(gi).padStart(2, "0") + ".png");
  for (gi = 0; gi < 18; gi++) GEMS.push("assets/home/decor/circle/circle-" + String(gi).padStart(2, "0") + ".png");

  // ---------- the star: Allison's felt star (and the lace star tucked behind it) ----------
  // Both images share one 2000 × 2000 frame that exactly covers the letter grid. FELT is the felt
  // star's outline in that frame; LACE maps the felt star onto where the lace star finally sits
  // (scale + turn + shift), so it can start tucked exactly behind the felt and open out.
  var FELT = [[1313, 175], [1380, 700], [1984, 1020], [1400, 1290], [1419, 1952], [910, 1540], [275, 1734], [490, 1140], [207, 518], [880, 590]];
  var LACE = { a: 0.8729, b: -0.2786, tx: -340.67, ty: 327.95 };
  var MASK = (function () {
    var cx = 0, cy = 0;
    FELT.forEach(function (p) { cx += p[0] / FELT.length; cy += p[1] / FELT.length; });
    // pulled in toward the middle so every letter sits comfortably on the felt
    var pts = FELT.map(function (p) { return [cx + (p[0] - cx) * 0.88, cy + (p[1] - cy) * 0.88]; });
    function inside(x, y) {
      var c = false;
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    }
    var m = [], u = 2000 / N;
    for (var y = 0; y < N; y++) { m[y] = []; for (var x = 0; x < N; x++) m[y][x] = inside((x + 0.5) * u, (y + 0.5) * u); }
    return m;
  })();

  var lace = null;
  (function stars() {
    lace = document.createElement("img");
    lace.className = "ws-lace"; lace.src = "assets/home/words/star-lace.png"; lace.alt = ""; lace.draggable = false;
    var felt = document.createElement("img");
    felt.className = "ws-felt"; felt.src = "assets/home/words/star-felt.png"; felt.alt = ""; felt.draggable = false;
    box.insertBefore(lace, gridEl);
    box.insertBefore(felt, gridEl);
    box.insertBefore(svg, gridEl);
  })();
  // lace tucked exactly behind the felt (the inverse of LACE), in this box's pixels
  function tucked() {
    var k = box.offsetWidth / 2000, a = LACE.a, b = LACE.b, D = a * a + b * b;
    var e = -(a * LACE.tx + b * LACE.ty) / D * k, f = -(-b * LACE.tx + a * LACE.ty) / D * k;
    return "matrix(" + a / D + "," + -b / D + "," + b / D + "," + a / D + "," + e + "," + f + ")";
  }
  // opens the lace out from behind the felt; called whenever the word search comes into view
  function openStars() {
    if (!lace || !box.offsetWidth) return;
    if (reduceMQ.matches) { lace.style.transform = ""; return; }
    lace.getAnimations().forEach(function (an) { an.cancel(); });
    lace.animate([
      { transform: tucked(), opacity: 0.0 },
      { transform: tucked(), opacity: 1, offset: 0.25 },
      { transform: "matrix(1,0,0,1,0,0)", opacity: 1 }
    ], { duration: 1300, delay: 150, easing: "cubic-bezier(.3,1.25,.45,1)", fill: "backwards" });
  }
  (function watchShown() {
    var shown = !root.closest("[hidden]");
    function check() {
      var now = !root.closest("[hidden]");
      if (now && !shown) requestAnimationFrame(openStars);
      shown = now;
    }
    if ("MutationObserver" in window) new MutationObserver(check).observe(root, { attributes: true, attributeFilter: ["hidden"] });
    if (shown) window.addEventListener("load", function () { requestAnimationFrame(openStars); });
  })();

  var DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1]];
  var S = { grid: [], placed: [], found: {}, t0: 0, doneAt: 0, timers: [] };

  function rand(n) { return Math.floor(Math.random() * n); }
  // Each word gets a direction from an even mix (3 across, 3 down, 2 of each diagonal), then the
  // spot in that direction that crosses the most letters already down, so words interlock.
  function layout() {
    for (var attempt = 0; attempt < 80; attempt++) {
      var g = [], placed = [], ok = true;
      for (var y = 0; y < N; y++) { g[y] = []; for (var x = 0; x < N; x++) g[y][x] = MASK[y][x] ? "" : null; }
      var order = WORDS.slice().sort(function (a, b) { return b[0].length - a[0].length; });
      var mix = [0, 0, 0, 1, 1, 1, 2, 2, 3, 3];
      for (var i = mix.length - 1; i > 0; i--) { var j = rand(i + 1), tmp = mix[i]; mix[i] = mix[j]; mix[j] = tmp; }
      var used = [0, 0, 0, 0];
      for (var w = 0; w < order.length && ok; w++) {
        var word = order[w][0];
        var tryDirs = [mix[w]].concat([0, 1, 2, 3].filter(function (q) { return q !== mix[w]; }).sort(function (p1, p2) { return used[p1] - used[p2]; }));
        var best = null;
        for (var di = 0; di < tryDirs.length && !best; di++) {
          var d = DIRS[tryDirs[di]], bestScore = -1;
          for (var y0 = 0; y0 < N; y0++) for (var x0 = 0; x0 < N; x0++) {
            var fits = true, cross = 0;
            for (var k = 0; k < word.length; k++) {
              var yy = y0 + d[0] * k, xx = x0 + d[1] * k;
              if (yy < 0 || yy >= N || xx < 0 || xx >= N || g[yy][xx] === null || (g[yy][xx] && g[yy][xx] !== word[k])) { fits = false; break; }
              if (g[yy][xx]) cross++;
            }
            if (!fits || cross >= word.length) continue;
            var score = cross * 3 + Math.random() * 2.5;
            if (score > bestScore) { bestScore = score; best = { word: word, y: y0, x: x0, d: d, q: tryDirs[di] }; }
          }
        }
        if (!best) { ok = false; break; }
        for (k = 0; k < word.length; k++) g[best.y + best.d[0] * k][best.x + best.d[1] * k] = word[k];
        used[best.q]++;
        placed.push(best);
      }
      if (!ok) continue;
      var A = "ABCDEFGHIJKLMNOPRSTUVWY";
      for (y = 0; y < N; y++) for (x = 0; x < N; x++) if (g[y][x] === "") g[y][x] = A[rand(A.length)];
      S.grid = g; S.placed = placed;
      return;
    }
  }


  // ---------- drawing ----------
  var cells = [];
  function draw() {
    gridEl.innerHTML = ""; cells = [];
    gridEl.style.gridTemplateColumns = "repeat(" + N + ", minmax(0, 1fr))";
    gridEl.style.gridTemplateRows = "repeat(" + N + ", minmax(0, 1fr))";
    for (var y = 0; y < N; y++) {
      cells[y] = [];
      for (var x = 0; x < N; x++) {
        var c = document.createElement("span");
        c.className = "ws-cell";
        if (S.grid[y][x]) c.textContent = S.grid[y][x];
        gridEl.appendChild(c); cells[y][x] = c;
      }
    }
    svg.setAttribute("viewBox", "0 0 " + N + " " + N);
    // embossed ink: the capsule reads as pressed into the paper, with a soft inner shadow along its
    // top edge and a lit lip of paper along its bottom
    // letterpress: ink pressed deep into the felt. Paper fibre shows through the ink, ink pools
    // darker at the edges, the upper wall is in shade and the lower wall catches a thin light.
    svg.innerHTML = '<defs><filter id="wsPress" x="-20%" y="-60%" width="140%" height="220%" color-interpolation-filters="sRGB">' +
        // fibre: fine noise that lightens and darkens the ink unevenly
        '<feTurbulence type="fractalNoise" baseFrequency="3.2" numOctaves="2" seed="4" result="n"/>' +
        '<feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .22 -.04" result="fib"/>' +
        '<feComposite in="fib" in2="SourceAlpha" operator="in" result="fibre"/>' +
        // ink squash: darker band just inside the edge
        '<feMorphology in="SourceAlpha" operator="erode" radius=".06" result="er"/>' +
        '<feComposite in="SourceAlpha" in2="er" operator="out" result="band"/><feGaussianBlur in="band" stdDeviation=".03" result="band"/>' +
        '<feFlood flood-color="#060d1a" flood-opacity=".55"/><feComposite in2="band" operator="in" result="squash"/>' +
        // upper wall in shade
        '<feComponentTransfer in="SourceAlpha" result="inv"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer>' +
        '<feGaussianBlur in="inv" stdDeviation=".05"/><feOffset dy=".13" result="s1"/>' +
        '<feFlood flood-color="#000" flood-opacity=".8"/><feComposite in2="s1" operator="in"/><feComposite in2="SourceAlpha" operator="in" result="shade"/>' +
        // lower wall lit
        '<feGaussianBlur in="inv" stdDeviation=".025"/><feOffset dy="-.07" result="s3"/>' +
        '<feFlood flood-color="#ffffff" flood-opacity=".4"/><feComposite in2="s3" operator="in"/><feComposite in2="SourceAlpha" operator="in" result="lit"/>' +
        '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="fibre"/><feMergeNode in="squash"/><feMergeNode in="shade"/><feMergeNode in="lit"/></feMerge></filter></defs>' +
      '<g class="ws-found" filter="url(#wsPress)"></g><line class="ws-live" filter="url(#wsPress)" x1="0" y1="0" x2="0" y2="0"></line>';
    listEl.innerHTML = "";
    // two fixed columns (first five, last five), each growing on its own as notes appear
    var cols = [document.createElement("div"), document.createElement("div")];
    cols.forEach(function (c) { c.className = "ws-col"; listEl.appendChild(c); });
    WORDS.forEach(function (w, wi) {
      var li = document.createElement("li");
      li.setAttribute("data-word", w[0]); li.innerHTML = '<img src="assets/home/decor/star/star-00.png" alt="" aria-hidden="true"><span>' + w[1] + "</span>";
      cols[wi < 5 ? 0 : 1].appendChild(li);
    });
  }
  function mark(a, b, cls) {
    var l = document.createElementNS(SVGNS, "line");
    l.setAttribute("x1", a[1] + 0.5); l.setAttribute("y1", a[0] + CY); l.setAttribute("x2", b[1] + 0.5); l.setAttribute("y2", b[0] + CY);
    l.setAttribute("class", cls || "");
    svg.querySelector(".ws-found").appendChild(l);
    return l;
  }

  // ---------- dragging a line ----------
  function cellAt(e) {
    var r = box.getBoundingClientRect(), s = r.width / N;
    var x = Math.floor((e.clientX - r.left) / s), y = Math.floor((e.clientY - r.top) / s);
    return [Math.max(0, Math.min(N - 1, y)), Math.max(0, Math.min(N - 1, x))];
  }
  // snap the end so the line runs straight in one of the eight directions
  function snap(a, b) {
    var dy = b[0] - a[0], dx = b[1] - a[1], ady = Math.abs(dy), adx = Math.abs(dx);
    if (ady === 0 || adx === 0) return b;
    if (ady > adx * 2) return [b[0], a[1]];
    if (adx > ady * 2) return [a[0], b[1]];
    var n = Math.max(ady, adx);
    return [a[0] + Math.sign(dy) * n, a[1] + Math.sign(dx) * n];
  }
  function lettersOn(a, b) {
    var dy = Math.sign(b[0] - a[0]), dx = Math.sign(b[1] - a[1]), n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])), out = "";
    for (var k = 0; k <= n; k++) { var v = S.grid[a[0] + dy * k] && S.grid[a[0] + dy * k][a[1] + dx * k]; if (!v) return null; out += v; }
    return out;
  }
  // cells under the live drag (and under found words) turn white on the dark capsule
  function cellsOn(a, b) {
    var dy = Math.sign(b[0] - a[0]), dx = Math.sign(b[1] - a[1]), n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])), out = [];
    for (var k = 0; k <= n; k++) { var c = cells[a[0] + dy * k] && cells[a[0] + dy * k][a[1] + dx * k]; if (c) out.push(c); }
    return out;
  }
  function litLive(a, b) {
    gridEl.querySelectorAll(".is-live").forEach(function (c) { c.classList.remove("is-live"); });
    if (a) cellsOn(a, b).forEach(function (c) { c.classList.add("is-live"); });
  }
  var drag = null, live = null;
  box.addEventListener("pointerdown", function (e) {
    if (e.button > 0 || S.doneAt) return;
    var a = cellAt(e);
    if (!S.grid[a[0]][a[1]]) return;
    e.preventDefault(); box.setPointerCapture(e.pointerId);
    drag = { a: a, b: a, id: e.pointerId };
    live = svg.querySelector(".ws-live");
    live.setAttribute("x1", a[1] + 0.5); live.setAttribute("y1", a[0] + CY); live.setAttribute("x2", a[1] + 0.5); live.setAttribute("y2", a[0] + CY);
    live.classList.add("is-on"); litLive(a, a);
    if (!S.t0) { S.t0 = Date.now(); render(); }
  });
  box.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var b = snap(drag.a, cellAt(e));
    b = [Math.max(0, Math.min(N - 1, b[0])), Math.max(0, Math.min(N - 1, b[1]))];
    drag.b = b;
    live.setAttribute("x2", b[1] + 0.5); live.setAttribute("y2", b[0] + CY);
    litLive(drag.a, b);
  });
  function up(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var a = drag.a, b = drag.b; drag = null; live.classList.remove("is-on"); litLive(null);
    var s = lettersOn(a, b);
    if (!s || s.length < 2) return;
    var hit = WORDS.filter(function (w) { return !S.found[w[0]] && w[0] === s; })[0];
    if (!hit) {
      var miss = mark(a, b, "is-miss");
      setTimeout(function () { miss.remove(); }, 380);
      return;
    }
    found(hit[0], a, b);
  }
  box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);

  var noteEl = null, lastNote = null;
  // each found word keeps its own note, right under it in the bank
  function showNote(word) {
    var w = WORDS.filter(function (x) { return x[0] === word; })[0];
    var li = listEl.querySelector('[data-word="' + word + '"]');
    if (!w || !li || li.querySelector(".ws-note")) return;
    var n = document.createElement("span");
    n.className = "ws-note"; n.textContent = w[2];
    li.appendChild(n);
    void n.offsetWidth; n.classList.add("is-on");
  }
  function found(word, a, b, quiet) {
    S.found[word] = true;
    var l = mark(a, b, "is-found");
    cellsOn(a, b).forEach(function (c) { c.classList.add("is-lit"); });
    if (!quiet && !reduceMQ.matches) l.animate([{ strokeWidth: 0.2, opacity: 0.3 }, { strokeWidth: 0.86, opacity: 1 }], { duration: 300, easing: "cubic-bezier(.3,1.4,.5,1)" });
    var li = listEl.querySelector('[data-word="' + word + '"]');
    if (li) {
      li.classList.add("is-found");
    }
    showNote(word);
    render();
  }

  // ---------- round ----------
  function sprinkle() {
    var r = box.getBoundingClientRect(), host = q(".ws-stage"), hr = host.getBoundingClientRect();
    for (var i = 0; i < 38; i++) {
      var g = document.createElement("img"), size = 16 + Math.random() * 24;
      var x = r.left - hr.left + Math.random() * r.width, y = r.top - hr.top + r.height * (0.15 + Math.random() * 0.6);
      var upv = 80 + Math.random() * 140, drift = (Math.random() - 0.5) * 140, fall = 160 + Math.random() * 180, spin = (Math.random() - 0.5) * 540;
      g.className = "ws-gem"; g.src = GEMS[rand(GEMS.length)]; g.alt = "";
      g.style.cssText = "left:" + (x - size / 2) + "px;top:" + (y - size / 2) + "px;width:" + size + "px;height:" + size + "px";
      host.appendChild(g);
      g.animate([
        { transform: "translate(0,0) scale(.2)", opacity: 0 },
        { transform: "translate(" + drift * 0.4 + "px," + -upv + "px) scale(1) rotate(" + spin * 0.4 + "deg)", opacity: 1, offset: 0.3 },
        { transform: "translate(" + drift + "px," + (fall - upv) + "px) scale(.85) rotate(" + spin + "deg)", opacity: 0 }
      ], { duration: 1500 + Math.random() * 700, delay: Math.random() * 260, easing: "cubic-bezier(.25,.6,.4,1)", fill: "forwards" }).onfinish = (function (el) { return function () { el.remove(); }; })(g);
    }
  }
  function scramble() {
    if (Z.z > 1) zoomTo(1, undefined, undefined, false);
    S.timers.forEach(clearTimeout); S.timers = [];
    S.found = {}; S.t0 = 0; S.doneAt = 0;
    layout(); draw(); render();
  }
  function fill() {
    if (!S.t0) S.t0 = Date.now();
    var left = S.placed.filter(function (p) { return !S.found[p.word]; });
    left.forEach(function (p, i) {
      S.timers.push(setTimeout(function () {
        found(p.word, [p.y, p.x], [p.y + p.d[0] * (p.word.length - 1), p.x + p.d[1] * (p.word.length - 1)]);
      }, reduceMQ.matches ? 0 : i * 140));
    });
  }

  // ---------- meter + status ----------
  var lastN = -1, lastSecs = -1;
  function render() {
    var n = Object.keys(S.found).length, total = WORDS.length;
    if (n === total && !S.doneAt) {
      S.doneAt = Date.now();
      if (!reduceMQ.matches) S.timers.push(setTimeout(sprinkle, 250));
    }
    if (dotsEl.childElementCount !== total) { dotsEl.innerHTML = ""; for (var i = 0; i < total; i++) dotsEl.appendChild(document.createElement("i")); }
    if (n !== lastN) {
      Array.prototype.forEach.call(dotsEl.children, function (d, k) { d.classList.toggle("is-on", k < n); });
      if (n > lastN && lastN >= 0 && n > 0) { var d = dotsEl.children[n - 1]; d.classList.remove("is-pop"); void d.offsetWidth; d.classList.add("is-pop"); }
      lastN = n;
    }
    var secs = S.t0 ? Math.floor(((S.doneAt || Date.now()) - S.t0) / 1000) : 0;
    if (secs !== lastSecs) { clockEl.textContent = Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0"); meter.style.setProperty("--tick", secs); lastSecs = secs; }
    meter.classList.toggle("is-running", !!S.t0 && !S.doneAt);
    meter.classList.toggle("is-done", !!S.doneAt);
    again.hidden = !S.doneAt;
    var left = total - n, s;
    if (S.doneAt) s = "you found them all!! ✦";
    else if (!S.t0) s = "drag from the first letter to the last: across, down or diagonally.";
    else if (left === 1) s = "one more word!!";
    else if (left <= 3) s = "so close, " + left + " to go";
    else if (n >= total / 2) s = "halfway there, keep going";
    else if (n > 0) s = "nice find! " + left + " left";
    else s = "across, down, diagonal… look everywhere";
    if (status.textContent !== s) status.textContent = s;
    box.classList.toggle("is-done", !!S.doneAt);
  }

  // ---------- zoom, like the magnet board: the star scales up in place around a point, clipped to
  // its area (no frame). Words can still be dragged while zoomed; scroll, or drag from an empty
  // spot, to look around. Esc or "zoom out" comes back. ----------
  var view = q(".ws-view"), zin = q("[data-ws-zin]"), zout = q("[data-ws-zout]"), Z = { z: 1, x: 0, y: 0, MAX: 3 };
  var STEPS = [1, 1.5, 2.1, 3];
  function clampZ() {
    var vw = view.clientWidth, vh = view.clientHeight, bw = box.offsetWidth * Z.z, bh = box.offsetHeight * Z.z;
    var bx = box.offsetLeft, by = box.offsetTop;
    // keep the scaled star covering the view as much as it can
    Z.x = Math.min(-bx + 0, Math.max(vw - bx - bw, Z.x));
    Z.y = Math.min(-by + 0, Math.max(vh - by - bh, Z.y));
    if (bw < vw) Z.x = (vw - bw) / 2 - bx;
    if (bh < vh) Z.y = (vh - bh) / 2 - by;
  }
  function applyZ(animate) {
    box.classList.toggle("is-easing", !!animate && !reduceMQ.matches);
    box.style.transform = Z.z === 1 ? "" : "translate(" + Z.x + "px," + Z.y + "px) scale(" + Z.z + ")";
    view.classList.toggle("is-zoomed", Z.z > 1);
    q(".ws-stage").classList.toggle("is-zoomed", Z.z > 1);
    zin.disabled = Z.z >= Z.MAX - 0.01; zout.disabled = Z.z <= 1;
  }
  // zoom so the point (px, py), in view coordinates, stays put
  function zoomTo(z, px, py, animate) {
    var vr = view.getBoundingClientRect(), br0x = box.offsetLeft, br0y = box.offsetTop;
    if (px === undefined) { px = br0x + box.offsetWidth / 2; py = br0y + box.offsetHeight / 2; }
    var wx = (px - br0x - Z.x) / Z.z, wy = (py - br0y - Z.y) / Z.z;
    Z.z = Math.max(1, Math.min(Z.MAX, z));
    if (Z.z === 1) { Z.x = 0; Z.y = 0; }
    else { Z.x = px - br0x - wx * Z.z; Z.y = py - br0y - wy * Z.z; clampZ(); }
    applyZ(animate !== false);
  }
  function viewPt(e) { var r = view.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  // map-style + / − : step through fixed zoom levels around the middle of what is showing
  function step(dir) {
    var i = 0;
    while (i < STEPS.length - 1 && STEPS[i] <= Z.z + 0.01) i++;
    var target = dir > 0 ? (Z.z >= Z.MAX - 0.01 ? Z.MAX : STEPS[i]) : (function () { var j = STEPS.length - 1; while (j > 0 && STEPS[j] >= Z.z - 0.01) j--; return STEPS[j]; })();
    if (Z.z === 1 && target > 1) {
      // widen the star's area first (the word bank moves to the right), then zoom into it
      q(".ws-stage").classList.add("is-zoomed");
      requestAnimationFrame(function () { zoomTo(target); });
      return;
    }
    zoomTo(target, view.clientWidth / 2, view.clientHeight / 2);
  }
  zin.addEventListener("click", function () { step(1); });
  zout.addEventListener("click", function () { step(-1); });
  view.addEventListener("wheel", function (e) {
    if (e.ctrlKey) { e.preventDefault(); var p = viewPt(e); zoomTo(Z.z * Math.exp(-e.deltaY * 0.01), p[0], p[1], false); return; }
    if (Z.z === 1) return;
    e.preventDefault();
    Z.x -= e.deltaX; Z.y -= e.deltaY; clampZ(); applyZ(false);
  }, { passive: false });
  // drag from an empty spot (outside the letters) to pan while zoomed
  var pan = null;
  view.addEventListener("pointerdown", function (e) {
    if (Z.z === 1 || drag) return;
    var c = cellAt(e);
    if (S.grid[c[0]] && S.grid[c[0]][c[1]] && box.contains(e.target)) return;
    var p = viewPt(e); pan = { id: e.pointerId, sx: p[0], sy: p[1], x: Z.x, y: Z.y };
    view.setPointerCapture(e.pointerId); e.preventDefault();
  });
  view.addEventListener("pointermove", function (e) {
    if (!pan || e.pointerId !== pan.id) return;
    var p = viewPt(e); Z.x = pan.x + p[0] - pan.sx; Z.y = pan.y + p[1] - pan.sy; clampZ(); applyZ(false);
  });
  view.addEventListener("pointerup", function (e) { if (pan && e.pointerId === pan.id) pan = null; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && Z.z > 1 && !root.closest("[hidden]")) zoomTo(1); });
  window.addEventListener("resize", function () { if (Z.z > 1) { clampZ(); applyZ(false); } });

  // Centre the star vertically in the puzzle section: equal space above the lace's top point and
  // below the felt's bottom point (they sit at 4.9% and 97.6% of the image).
  function centreStar() {
    if (root.closest("[hidden]") || !box.offsetWidth) return;
    var view = q(".ws-view");
    view.style.transform = "";
    var sec = root.getBoundingClientRect(), b = box.getBoundingClientRect();
    var top = b.top + b.height * 0.049, bottom = b.top + b.height * 0.976;
    var shift = ((sec.top + sec.bottom) / 2) - ((top + bottom) / 2);
    view.style.transform = "translateY(" + Math.round(shift) + "px)";
  }
  window.addEventListener("resize", function () { requestAnimationFrame(centreStar); });
  if ("ResizeObserver" in window) new ResizeObserver(function () { requestAnimationFrame(centreStar); }).observe(root);
  window.addEventListener("load", function () { requestAnimationFrame(centreStar); });

  root.querySelectorAll('[data-act="scramble"]').forEach(function (b) { b.addEventListener("click", scramble); });
  q('[data-act="solve"]').addEventListener("click", fill);
  setInterval(function () { if (S.t0 && !S.doneAt) render(); }, 1000);
  scramble();
})();
