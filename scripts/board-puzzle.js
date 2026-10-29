// Magnet board puzzle: my photos lie in a loose pile beside a walnut-framed magnet board, and
// any photo drags into any frame, where it crops itself to fit. Fill every frame to finish.
// Board units are 1000 × 1355 (the board photo's own proportions); the desk is CSS px.
(function () {
  "use strict";
  var root = document.querySelector("[data-board-puzzle]");
  if (!root) return;
  var q = function (s) { return root.querySelector(s); };
  var rig = q("[data-mb-rig]"), surface = q(".mb-surface"), hanger = null, ground = null, table = null;
  var stage = q(".mb-stage"), spot = q(".mb-spot"), spill = q(".mb-spill"), title = q(".mb-title"), desk = q("[data-mb-desk]");
  var status = q("[data-pz-status]"), meter = q("[data-pz-meter]"), clockEl = q("[data-pz-clock]"), dotsEl = q("[data-pz-dots]"), again = q(".pz-again");
  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var zoomBtn = root.querySelector("[data-mb-zoom]");
  var BW = 1000, BH = 1355;

  var PHOTOS = [
    ["photo-01.jpg", 1.333, "Four friends on a leafy autumn street"],
    ["photo-02.jpg", 0.667, "A piggyback under neon stars at a barn party"],
    ["photo-03.jpg", 1.333, "Three friends at an Illinois football game"],
    ["photo-04.jpg", 1.333, "A big group of friends in a living room"],
    ["photo-05.jpg", 0.75, "Interns holding up the IBM logo"],
    ["photo-06.jpg", 0.75, "Two friends on a Georgetown street"],
    ["photo-07.jpg", 1.775, "Friends on the Federal Center SW metro platform"],
    ["photo-08.jpg", 1.775, "A group around the Buc-ee’s beaver statue"],
    ["photo-09.jpg", 0.563, "Two friends at the American Gardens gate"],
    ["photo-10.jpg", 0.563, "Three friends dressed up at Alto Vineyards"],
    ["photo-11.jpg", 1.775, "Three friends in a vine-covered gazebo"]
  ];

  // The frames, laid out like the reference board. Each has a centre, size and turn in board
  // units, and its windows relative to its centre: [dx, dy, w, h].
  var FRAMES = [
    { kind: "polaroid", cx: 188, cy: 329, w: 194, h: 262, r: 16, wins: [[0, -17, 158, 206]] },
    { kind: "polaroid", cx: 372, cy: 284, w: 194, h: 262, r: -10, wins: [[0, -17, 158, 206]] },
    { kind: "strip", cx: 768, cy: 427, w: 245, h: 512, r: 0, wins: [[0, -170, 226, 140], [0, -9, 226, 140], [0, 150, 226, 140]] },
    { kind: "stamp", cx: 494, cy: 625, w: 222, h: 264, r: 0, wins: [[0, -2, 174, 214]] },
    { kind: "film", cx: 215, cy: 927, w: 217, h: 630, r: 0, wins: [[0, -242, 174, 114], [0, -102, 174, 114], [0, 39, 174, 114], [0, 179, 174, 114]] },
    { kind: "print", cx: 649, cy: 1032, w: 551, h: 419, r: 0, wins: [[0, -43, 496, 286]] }
  ];
  // Clips and magnets holding the frames up, drawn over everything on the board.
  var HOLDERS = [
    { kind: "star", x: 226, y: 206, s: 58, a: 0.96, r: 6 },
    { kind: "heart", x: 342, y: 144, s: 58, a: 0.92, r: -4 },
    { kind: "clip-red", x: 768, y: 150, s: 136, a: 0.7, r: -15 },
    { kind: "clip-red", x: 556, y: 492, s: 100, a: 0.7, r: 4 },
    { kind: "clip-silver", x: 214, y: 572, s: 138, a: 0.71, r: 0 },
    { kind: "ball", x: 650, y: 812, s: 40, a: 1, r: 0 }
  ];
  var GEMS = [];
  for (var gi = 0; gi < 17; gi++) GEMS.push("assets/home/decor/star/star-" + String(gi).padStart(2, "0") + ".png");
  for (gi = 0; gi < 18; gi++) GEMS.push("assets/home/decor/circle/circle-" + String(gi).padStart(2, "0") + ".png");

  var S = { photos: [], windows: [], t0: 0, doneAt: 0, finished: false, cheered: false, timers: [] };
  var board, aim, layers = [];

  // ---------- drawing: the board, frames, wells and holders ----------
  var SVGNS = "http://www.w3.org/2000/svg";
  function frameSvg(f, id) {
    var w = f.w, h = f.h, holes = "", edge = "", fill = "#f6f6f3";
    f.wins.forEach(function (p) { holes += '<rect x="' + (w / 2 + p[0] - p[2] / 2) + '" y="' + (h / 2 + p[1] - p[3] / 2) + '" width="' + p[2] + '" height="' + p[3] + '" fill="#000"/>'; });
    if (f.kind === "film") fill = "#141414";
    if (f.kind === "print") fill = "#fdfdfc";
    if (f.kind === "stamp") {
      // perforated edge: bites out of all four sides
      for (var x = 9; x < w; x += 18.5) edge += '<circle cx="' + x + '" cy="0" r="6.5" fill="#000"/><circle cx="' + x + '" cy="' + h + '" r="6.5" fill="#000"/>';
      for (var y = 9; y < h; y += 18.5) edge += '<circle cx="0" cy="' + y + '" r="6.5" fill="#000"/><circle cx="' + w + '" cy="' + y + '" r="6.5" fill="#000"/>';
    }
    var sprockets = "";
    if (f.kind === "film") {
      // the little edge marks on a photo-booth strip
      f.wins.forEach(function (p, i) { sprockets += '<text x="' + (i % 2 ? w - 9 : 9) + '" y="' + (h / 2 + p[1]) + '" font-size="9" fill="#d9d9d9" text-anchor="middle" font-family="Satoshi, sans-serif">⇅</text>'; });
    }
    var sheen = f.kind === "film" ? "" : '<rect width="' + w + '" height="' + h + '" fill="url(#g' + id + ')" mask="url(#m' + id + ')"/>';
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" height="100%" aria-hidden="true">' +
      '<defs><mask id="m' + id + '" maskUnits="userSpaceOnUse"><rect width="' + w + '" height="' + h + '" rx="2" fill="#fff"/>' + holes + edge + "</mask>" +
      '<linearGradient id="g' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".05"/></linearGradient></defs>' +
      '<rect width="' + w + '" height="' + h + '" rx="2" fill="' + fill + '" mask="url(#m' + id + ')"/>' + sheen + sprockets + "</svg>";
  }
  function holderHtml(hd) {
    return '<img src="assets/home/board/' + hd.kind + '.png" alt="" draggable="false">';
  }

  function build() {
    // the hanging wire + nail, tucked behind the top of the board; only shown once it's on the wall
    hanger = document.createElement("div");
    hanger.className = "mb-hanger";
    hanger.innerHTML = '<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path class="mb-wire" d="M18 40 L50 5 L82 40" fill="none" stroke="#6f6a63" stroke-width=".9" vector-effect="non-scaling-stroke"/></svg><span class="mb-nail"></span>';
    desk.appendChild(hanger);
    board = document.createElement("img");
    board.className = "mb-board"; board.src = "assets/home/board/board.jpg"; board.alt = ""; board.draggable = false;
    desk.appendChild(board);
    // Each frame gets its own pair of layers (well + photo, then the frame on top), so where two
    // frames overlap, the later one lies cleanly over the earlier one, photo and all.
    FRAMES.forEach(function (f, fi) {
      f.z = 2 + fi * 2;
      f.wins.forEach(function (p) {
        var well = document.createElement("button");
        well.type = "button"; well.className = "mb-well mb-well--" + f.kind; well.style.zIndex = f.z;
        well.setAttribute("aria-label", "Add a photo to this frame");
        // the empty-frame prompt: a plus, with words where there is room for them
        well.innerHTML = '<span class="mb-well__cta"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' + "<span>add a pic</span>" + "</span>";
        desk.appendChild(well);
        var win = { f: f, p: p, el: well, photo: null };
        S.windows.push(win);
        // clicking an empty frame pops in a photo from the pile
        well.addEventListener("click", (function (w) {
          return function () {
            if (w.photo || Z.z > 1) return;
            var loose = S.photos.filter(function (ph) { return !ph.win; });
            if (!loose.length) return;
            if (!S.t0) S.t0 = Date.now();
            var ph = loose[Math.floor(Math.random() * loose.length)];
            ph.el.style.zIndex = ++topZ; slot(ph, w); render();
          };
        })(win));
      });
      var el = document.createElement("div");
      el.className = "mb-frame mb-frame--" + f.kind; el.innerHTML = frameSvg(f, fi);
      el.style.zIndex = f.z + 1;
      desk.appendChild(el); f.el = el;
    });
    HOLDERS.forEach(function (hd) {
      var el = document.createElement("div");
      el.className = "mb-holder mb-holder--" + hd.kind; el.innerHTML = holderHtml(hd);
      desk.appendChild(el); hd.el = el;
    });
    aim = document.createElement("div"); aim.className = "mb-aim"; desk.appendChild(aim);
    PHOTOS.forEach(function (ph, i) {
      var el = document.createElement("div");
      el.className = "mb-photo"; el.setAttribute("role", "img"); el.setAttribute("aria-label", ph[2]); el.setAttribute("data-caption", ph[2]);
      el.innerHTML = '<img src="assets/home/board/' + ph[0] + '" alt="" draggable="false">';
      desk.appendChild(el);
      var p = { el: el, a: ph[1], i: i, win: null, x: 0, y: 0, w: 0, h: 0, rot: 0 };
      S.photos.push(p); bind(p);
    });
    // Deal once there is a stage to deal onto (the prototype may build this while it is hidden).
    S.needDeal = true;
    render();
    layout(true);
  }

  // ---------- geometry ----------
  var G = { sig: "" };
  function rel(el, pad) {
    var r = el.getBoundingClientRect(), b = G.base; pad = pad || 0;
    return { x0: r.left - b.left - pad, y0: r.top - b.top - pad, x1: r.right - b.left + pad, y1: r.bottom - b.top + pad };
  }
  function toPx(x, y) { return [G.bx + x * G.k, G.by + y * G.k]; }
  // A window's centre on the desk, turned with its frame.
  function winCentre(w) {
    var a = w.f.r * Math.PI / 180, dx = w.p[0], dy = w.p[1];
    return toPx(w.f.cx + dx * Math.cos(a) - dy * Math.sin(a), w.f.cy + dx * Math.sin(a) + dy * Math.cos(a));
  }
  function measure() {
    var sr = stage.getBoundingClientRect();
    G.base = { left: sr.left, top: sr.top };
    G.stacked = stage.clientWidth < 640;
    root.classList.toggle("is-stacked", G.stacked);
    G.W = stage.clientWidth; G.H = stage.clientHeight;
    var b = rel(spot);
    G.k = (b.x1 - b.x0) / BW; G.bx = b.x0; G.by = b.y0;
    var t = rel(title), top = Math.max(t.y1 + 16, b.y0);
    // Desktop: the pile splits either side of the centred board. Stacked: the floor below it.
    G.piles = G.stacked ? [rel(spill)] : [{ x0: 0, x1: b.x0 - 28, y0: top, y1: G.H - 4 }, { x0: b.x1 + 28, x1: G.W, y0: top, y1: G.H - 4 }];
    // loose photos are big enough to see who's in them; they may overlap in the pile
    G.long = Math.max(120, Math.min(220, 0.46 * (b.x1 - b.x0)));
    return [G.W, G.H, G.k.toFixed(4), Math.round(G.bx), Math.round(G.by)].join("|");
  }
  function place(el, x, y, w, h, r) {
    el.style.width = w + "px"; el.style.height = h + "px";
    el.style.transform = "translate(" + (x - w / 2) + "px," + (y - h / 2) + "px) rotate(" + (r || 0) + "deg)";
  }
  function layout(force) {
    if (root.closest("[hidden]")) return;   // switched away in the puzzles prototype
    if (G.stacked !== undefined && G.stacked) spill.style.height = "";
    var sig = measure();
    if (G.stacked) {
      var cols = Math.max(2, Math.floor(G.W / (G.long * 0.95)));
      spill.style.height = Math.ceil(PHOTOS.length / cols) * G.long * 0.82 + 24 + "px";
      sig = measure();
    }
    if (!force && sig === G.sig) return;
    G.sig = sig;
    var bw = BW * G.k, bh = BH * G.k;
    if (!ground) { ground = document.createElement("div"); ground.className = "mb-ground"; stage.insertBefore(ground, rig); }
    // the tabletop the board was lying on: a wooden slab centred under it, only shown in the finale
    if (!table) { table = document.createElement("div"); table.className = "mb-table"; stage.insertBefore(table, ground); }
    var tw = bw * 1.9, th = bh * 1.32;
    table.style.left = (G.bx + bw / 2 - tw / 2) + "px"; table.style.top = (G.by + bh / 2 - th / 2) + "px";
    table.style.width = tw + "px"; table.style.height = th + "px";
    ground.style.cssText = "left:" + G.bx + "px;top:" + G.by + "px;width:" + bw + "px;height:" + bh + "px";
    if (hanger) { var hh = Math.max(44, bh * 0.1); hanger.style.cssText = "left:" + (G.bx + bw * 0.22) + "px;top:" + (G.by - hh + 6) + "px;width:" + bw * 0.56 + "px;height:" + hh + "px"; }
    board.style.width = bw + "px"; board.style.height = bh + "px";
    board.style.transform = "translate(" + G.bx + "px," + G.by + "px)";
    FRAMES.forEach(function (f) { var c = toPx(f.cx, f.cy); place(f.el, c[0], c[1], f.w * G.k, f.h * G.k, f.r); });
    HOLDERS.forEach(function (hd) { var c = toPx(hd.x, hd.y); place(hd.el, c[0], c[1], hd.s * G.k, hd.s * G.k * hd.a, hd.r); });
    S.windows.forEach(function (w) {
      var c = winCentre(w); place(w.el, c[0], c[1], w.p[2] * G.k, w.p[3] * G.k, w.f.r);
      w.el.classList.toggle("is-roomy", w.p[2] * G.k >= 96); // words only where they fit
    });
    S.photos.forEach(function (p) {
      if (p.win) { slotGeom(p, p.win); paint(p); }
    });
    if (S.needDeal) { S.needDeal = false; deal(true); }
    else if (!force) deal(true, true);
    if (Z.z > 1) { clampPan(); applyZoom(false); }
  }

  // ---------- photos ----------
  function looseSize(p) {
    if (p.a >= 1) { p.w = G.long; p.h = G.long / p.a; } else { p.h = G.long; p.w = G.long * p.a; }
  }
  function slotGeom(p, w) {
    var c = winCentre(w), bleed = 3 * G.k;
    p.x = c[0]; p.y = c[1]; p.w = w.p[2] * G.k + bleed; p.h = w.p[3] * G.k + bleed; p.rot = w.f.r;
  }
  function paint(p) { place(p.el, p.x, p.y, p.w, p.h, p.rot); }
  function glide(p, instant) {
    if (instant || reduceMQ.matches) { p.el.classList.remove("is-gliding"); paint(p); return; }
    p.el.classList.add("is-gliding"); paint(p);
    clearTimeout(p.gt); p.gt = setTimeout(function () { p.el.classList.remove("is-gliding"); syncDepth(p); }, 520);
  }
  // Loose photos sit above the board; a framed photo tucks under its frame once it has landed.
  function syncDepth(p) {
    var framed = !!p.win && !p.held;
    p.el.classList.toggle("is-framed", framed);
    if (framed) p.el.style.zIndex = p.win.f.z;
  }

  // The pile: a jittered grid over each open area, so the photos overlap a little but stay together.
  function deal(instant, onlyLoose) {
    var list = S.photos.filter(function (p) { return !onlyLoose || !p.win; });
    if (!list.length) return;
    var order = list.slice();
    for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
    var half = Math.ceil(order.length / G.piles.length);
    G.piles.forEach(function (R, pi) { dealInto(R, order.slice(pi * half, (pi + 1) * half), instant, pi * half); });
  }
  function dealInto(R, order, instant, z0) {
    if (!order.length) return;
    var rw = Math.max(80, R.x1 - R.x0), rh = Math.max(80, R.y1 - R.y0);
    var n = order.length, cols = Math.max(1, Math.min(2, Math.round(Math.sqrt(n * rw / rh)))), rows = Math.ceil(n / cols);
    var cw = rw / cols, ch = rh / rows;
    order.forEach(function (p, k) {
      if (p.win) { p.win.photo = null; p.win = null; }
      looseSize(p);
      var col = k % cols, row = Math.floor(k / cols);
      var x = R.x0 + (col + 0.5) * cw + (Math.random() - 0.5) * cw * 0.3;
      var y = R.y0 + (row + 0.5) * ch + (Math.random() - 0.5) * ch * 0.3;
      p.x = Math.min(Math.max(x, R.x0 + p.w / 2 - 10), R.x1 - p.w / 2 + 10);
      p.y = Math.min(Math.max(y, R.y0 + p.h / 2 - 10), R.y1 - p.h / 2 + 10);
      p.rot = (Math.random() - 0.5) * 18; p.home = [p.x, p.y, p.rot];
      p.el.style.zIndex = 40 + z0 + k;
      syncDepth(p); glide(p, instant);
    });
  }

  function slot(p, w, instant) {
    if (p.win) p.win.photo = null;
    p.win = w; w.photo = p;
    slotGeom(p, w);
    p.el.classList.remove("is-pop"); void p.el.offsetWidth;
    glide(p, instant);
    if (!instant && !reduceMQ.matches) setTimeout(function () { p.el.classList.add("is-pop"); }, 380);
    if (instant || reduceMQ.matches) syncDepth(p);
  }
  function unslot(p) { if (p.win) { p.win.photo = null; p.win = null; } }

  function winAt(x, y) {
    for (var i = 0; i < S.windows.length; i++) {
      var w = S.windows[i], c = winCentre(w), a = -w.f.r * Math.PI / 180;
      var dx = x - c[0], dy = y - c[1];
      var lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(lx) <= w.p[2] * G.k / 2 + 6 && Math.abs(ly) <= w.p[3] * G.k / 2 + 6) return w;
    }
    return null;
  }
  function showAim(w) {
    if (!w) { aim.classList.remove("is-on"); return; }
    var c = winCentre(w);
    place(aim, c[0], c[1], w.p[2] * G.k, w.p[3] * G.k, w.f.r);
    aim.classList.add("is-on");
  }

  function local(e) { var r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  var topZ = 60;
  function bind(p) {
    var drag = null;
    p.el.addEventListener("pointerdown", function (e) {
      if (e.button > 0 || Z.z > 1) return;
      e.preventDefault();
      var pt = local(e);
      drag = { id: e.pointerId, sx: pt[0], sy: pt[1], from: p.win, moved: false, dx: pt[0] - p.x, dy: pt[1] - p.y };
      p.el.setPointerCapture(e.pointerId);
      p.held = true; p.el.classList.add("is-held"); p.el.classList.remove("is-pop");
      p.el.style.zIndex = 200; syncDepth(p);
      if (!S.t0) { S.t0 = Date.now(); render(); }
    });
    p.el.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var pt = local(e);
      if (!drag.moved && Math.hypot(pt[0] - drag.sx, pt[1] - drag.sy) > 4) {
        drag.moved = true;
        // lifted out of a frame: it goes back to its own shape, under the finger
        if (p.win) { unslot(p); looseSize(p); p.rot = 0; drag.dx = 0; drag.dy = 0; p.el.classList.add("is-gliding"); setTimeout(function () { p.el.classList.remove("is-gliding"); }, 220); render(); }
      }
      if (!drag.moved) return;
      p.x = Math.min(Math.max(pt[0] - drag.dx, 0), G.W); p.y = Math.min(Math.max(pt[1] - drag.dy, 0), G.H);
      if (p.rot) p.rot = p.rot * 0.85;
      paint(p);
      showAim(winAt(pt[0], pt[1]));
    });
    function up(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var pt = local(e), d = drag; drag = null;
      p.held = false; p.el.classList.remove("is-held"); showAim(null);
      if (!d.moved && S.finished) { syncDepth(p); zoomTo(Z.IN, pt[0], pt[1]); return; }
      if (!d.moved) {
        // a tap: a loose photo hops into a free frame; a framed one stays put
        if (!p.win) { var free = S.windows.filter(function (w) { return !w.photo; }); if (free.length) slot(p, free[Math.floor(Math.random() * free.length)]); }
        p.el.style.zIndex = ++topZ; syncDepth(p); render(); return;
      }
      var w = winAt(pt[0], pt[1]);
      if (w) {
        var other = w.photo;
        if (other && other !== p) {
          // swap: whoever was there takes this photo's old frame, or its spot in the pile
          unslot(other);
          if (d.from && !d.from.photo) slot(other, d.from);
          else { looseSize(other); other.x = p.home ? p.home[0] : pt[0]; other.y = p.home ? p.home[1] : pt[1]; other.rot = (Math.random() - 0.5) * 18; other.el.style.zIndex = ++topZ; syncDepth(other); glide(other); }
        }
        slot(p, w);
      } else {
        p.home = [p.x, p.y, p.rot];
        p.el.style.zIndex = ++topZ; syncDepth(p);
      }
      render();
    }
    p.el.addEventListener("pointerup", up); p.el.addEventListener("pointercancel", up);
  }

  // ---------- finale: it was lying on a table all along; it stands up and gets hung on the wall ----------
  var hangAnims = [];
  function hang() {
    if (!board || rig.classList.contains("is-hung")) return;
    if (Z.z > 1) zoomTo(1, undefined, undefined, false);
    var bw = BW * G.k, bh = BH * G.k, cx = G.bx + bw / 2, cy = G.by + bh / 2;
    var nailY = G.by - Math.max(44, bh * 0.1) + 8;
    stage.classList.add("is-hanging");
    if (reduceMQ.matches) {
      surface.classList.add("is-wall"); rig.classList.add("is-hung");
      ground.style.transform = "translate(12px,22px) scale(.985)"; ground.style.filter = "blur(11px)"; ground.style.opacity = ".34";
      return;
    }
    var P = "perspective(1700px) ";
    // the shadow lives on the surface behind the board, so it is shaped by the board's pose:
    // a tight dark rim while flat, a wide soft blur pushed down as it lifts, then a soft
    // offset cast on the wall once it hangs off the nail
    var S0 = "translate(0,0) scale(1)";
    var flatSh = "translate(0,10px) " + P + "rotateX(46deg) scale(.86)";
    var liftSh = "translate(0,80px) " + P + "rotateX(46deg) scale(.98)";
    ground.style.transformOrigin = "50% 50%";
    function sh(kf, dur, ease) { var a = ground.animate(kf, { duration: dur, easing: ease, fill: "forwards" }); hangAnims.push(a); return a; }
    rig.style.transformOrigin = cx + "px " + cy + "px";
    // 1. the camera eases back: the board is lying flat on a table
    surface.classList.add("is-table");
    var a1 = rig.animate([
      { transform: P + "rotateX(0deg) scale(1)" },
      { transform: P + "rotateX(46deg) scale(.84)" }
    ], { duration: 950, easing: "cubic-bezier(.55,.05,.3,1)", fill: "forwards" });
    rig.classList.add("is-flat");
    hangAnims = [a1];
    sh([{ transform: S0, opacity: 0, filter: "blur(18px)" }, { transform: flatSh, opacity: .55, filter: "blur(3px)" }], 950, "cubic-bezier(.55,.05,.3,1)");
    var tableFlat = P + "rotateX(46deg) scale(.84)";
    hangAnims.push(table.animate([
      { transform: P + "rotateX(0deg) scale(1)", opacity: 0 },
      { transform: P + "rotateX(10deg) scale(.97)", opacity: 0, offset: .3 },
      { transform: P + "rotateX(26deg) scale(.92)", opacity: 1, offset: .6 },
      { transform: tableFlat, opacity: 1 }
    ], { duration: 950, easing: "cubic-bezier(.55,.05,.3,1)", fill: "forwards" }));
    a1.onfinish = function () {
      // 2. picked up: it lifts off the table, its shadow spreading
      rig.classList.add("is-lifted");
      var a2 = rig.animate([
        { transform: P + "rotateX(46deg) scale(.84)" },
        { transform: P + "rotateX(44deg) translateZ(110px) scale(.84)" }
      ], { duration: 650, easing: "cubic-bezier(.3,0,.3,1)", fill: "forwards" });
      hangAnims.push(a2);
      sh([{ transform: flatSh, opacity: .55, filter: "blur(3px)" }, { transform: liftSh, opacity: .3, filter: "blur(26px)" }], 650, "cubic-bezier(.3,0,.3,1)");
      a2.onfinish = function () {
        // 3. it swings upright; the table gives way to a wall
        surface.classList.add("is-wall");
        var a3 = rig.animate([
          { transform: P + "rotateX(44deg) translateZ(110px) scale(.84)" },
          { transform: P + "rotateX(-6deg) translateZ(20px) translateY(-14px) scale(.98)", offset: 0.75 },
          { transform: P + "rotateX(0deg) translateY(-12px) scale(1)" }
        ], { duration: 1050, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
        hangAnims.push(a3);
        hangAnims.push(table.animate([
          { transform: tableFlat, opacity: 1 },
          { transform: "translateY(" + bh * 0.9 + "px) " + P + "rotateX(62deg) scale(.8)", opacity: 0 }
        ], { duration: 800, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" }));
        sh([{ transform: liftSh, opacity: .28, filter: "blur(22px)" }, { transform: "translate(14px,26px) scale(.99)", opacity: .2, filter: "blur(16px)", offset: .6 }, { transform: "translate(12px,22px) scale(.985)", opacity: .34, filter: "blur(11px)" }], 1050, "cubic-bezier(.4,0,.2,1)");
        a3.onfinish = function () {
          // 4. onto the nail: the wire catches, it drops a touch and swings to rest
          rig.classList.remove("is-flat", "is-lifted");
          rig.classList.add("is-hung");
          rig.style.transformOrigin = cx + "px " + nailY + "px";
          var a4 = rig.animate([
            { transform: "translateY(-12px) rotate(0deg)" },
            { transform: "translateY(2px) rotate(2.6deg)", offset: 0.22 },
            { transform: "translateY(0) rotate(-1.7deg)", offset: 0.45 },
            { transform: "translateY(0) rotate(1deg)", offset: 0.65 },
            { transform: "translateY(0) rotate(-.45deg)", offset: 0.82 },
            { transform: "translateY(0) rotate(0deg)" }
          ], { duration: 1700, easing: "ease-out", fill: "forwards" });
          hangAnims.push(a4);
          ground.style.transformOrigin = "50% " + (nailY - G.by) + "px";
          sh([
            { transform: "translate(12px,22px) scale(.985) rotate(0deg)" },
            { transform: "translate(12px,24px) scale(.985) rotate(2.2deg)", offset: .25 },
            { transform: "translate(12px,22px) scale(.985) rotate(-1.5deg)", offset: .48 },
            { transform: "translate(12px,22px) scale(.985) rotate(.8deg)", offset: .68 },
            { transform: "translate(12px,22px) scale(.985) rotate(0deg)" }
          ], 1700, "ease-out").onfinish = null;
          ground.style.opacity = ".34";
          a4.onfinish = function () {
            hangAnims.forEach(function (a) { a.cancel(); }); hangAnims = [];
            rig.style.transform = "";
            ground.style.transform = "translate(12px,22px) scale(.985)"; ground.style.filter = "blur(11px)"; ground.style.opacity = ".34";
          };
        };
      };
    };
  }
  function unhang() {
    hangAnims.forEach(function (a) { a.cancel(); }); hangAnims = [];
    rig.classList.remove("is-flat", "is-lifted", "is-hung");
    surface.classList.remove("is-table", "is-wall");
    stage.classList.remove("is-hanging");
    rig.style.transform = "";
    if (ground) { ground.style.transform = ""; ground.style.filter = ""; ground.style.opacity = ""; }
    if (table) table.style.opacity = "";
  }

  // ---------- round ----------
  function later(fn, ms) { S.timers.push(setTimeout(fn, ms)); }
  function scramble() {
    zoomTo(1); unhang();
    S.timers.forEach(clearTimeout); S.timers = [];
    S.t0 = 0; S.doneAt = 0; S.finished = false; S.cheered = false;
    deal(false);
    render();
  }
  function fill() {
    var free = S.windows.filter(function (w) { return !w.photo; });
    var loose = S.photos.filter(function (p) { return !p.win; });
    for (var i = loose.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = loose[i]; loose[i] = loose[j]; loose[j] = t; }
    if (!S.t0) S.t0 = Date.now();
    free.forEach(function (w, k) {
      if (!loose[k]) return;
      later(function () { loose[k].el.style.zIndex = ++topZ; slot(loose[k], w); render(); }, reduceMQ.matches ? 0 : k * 110);
    });
  }

  function sprinkle() {
    var b = rel(spot);
    for (var i = 0; i < 40; i++) {
      var g = document.createElement("img"), size = 16 + Math.random() * 24;
      var x = b.x0 + Math.random() * (b.x1 - b.x0), y = b.y0 + 40 + Math.random() * (b.y1 - b.y0) * 0.75;
      var up = 80 + Math.random() * 140, drift = (Math.random() - 0.5) * 140, fall = 160 + Math.random() * 180, spin = (Math.random() - 0.5) * 540;
      g.className = "mb-gem"; g.src = GEMS[Math.floor(Math.random() * GEMS.length)]; g.alt = "";
      g.style.cssText = "left:" + (x - size / 2) + "px;top:" + (y - size / 2) + "px;width:" + size + "px;height:" + size + "px";
      desk.appendChild(g);
      var a = g.animate([
        { transform: "translate(0,0) scale(.2) rotate(0deg)", opacity: 0 },
        { transform: "translate(" + drift * 0.4 + "px," + -up + "px) scale(1) rotate(" + spin * 0.4 + "deg)", opacity: 1, offset: 0.3 },
        { transform: "translate(" + drift + "px," + (fall - up) + "px) scale(.85) rotate(" + spin + "deg)", opacity: 0 }
      ], { duration: 1500 + Math.random() * 700, delay: Math.random() * 260, easing: "cubic-bezier(.25,.6,.4,1)", fill: "forwards" });
      a.onfinish = (function (el) { return function () { el.remove(); }; })(g);
    }
  }

  // ---------- zoom: once the board is full, look closer ----------
  // The whole desk scales about the point you tap; drag to pan, scroll or pinch to zoom,
  // Esc or the button to come back out. Each photo carries data-caption for captions later.
  var Z = { z: 1, x: 0, y: 0, IN: 2.4, MAX: 4 };
  function clampPan() {
    Z.x = Math.min(0, Math.max(G.W - G.W * Z.z, Z.x));
    Z.y = Math.min(0, Math.max(G.H - G.H * Z.z, Z.y));
  }
  function applyZoom(animate) {
    desk.classList.toggle("is-easing", !!animate && !reduceMQ.matches);
    desk.style.transform = Z.z === 1 ? "" : "translate(" + Z.x + "px," + Z.y + "px) scale(" + Z.z + ")";
    // Keep the stage clipping until a zoom-out has finished easing, so the shrinking board never
    // spills past the stage over the page.
    clearTimeout(Z.unclip);
    if (Z.z > 1) stage.classList.add("is-zoomed");
    else if (animate && !reduceMQ.matches) Z.unclip = setTimeout(function () { stage.classList.remove("is-zoomed"); }, 640);
    else stage.classList.remove("is-zoomed");
    stage.classList.toggle("is-zoomable", S.finished && Z.z === 1);
    if (zoomBtn) {
      zoomBtn.querySelector("[data-mb-zoom-label]").textContent = Z.z > 1 ? "zoom out" : "look closer";
      zoomBtn.querySelector("[data-mb-zoom-plus]").setAttribute("d", Z.z > 1 ? "M5.4 7.4h4" : "M7.4 5.4v4M5.4 7.4h4");
    }
    if (S.photos.length) render();
  }
  function zoomTo(z, cx, cy, animate) {
    if (!board) return;
    z = Math.max(1, Math.min(Z.MAX, z));
    if (cx === undefined) { var b = rel(spot); cx = (b.x0 + b.x1) / 2; cy = (b.y0 + b.y1) / 2; }
    var wx = (cx - Z.x) / Z.z, wy = (cy - Z.y) / Z.z;
    Z.z = z; Z.x = cx - wx * z; Z.y = cy - wy * z;
    if (z === 1) { Z.x = 0; Z.y = 0; } else clampPan();
    applyZoom(animate !== false);
  }
  (function zoomInput() {
    var pan = null;
    stage.addEventListener("pointerdown", function (e) {
      if (e.button > 0 || !S.finished || e.target.closest(".mb-photo") && Z.z === 1) return;
      var pt = local(e);
      pan = { id: e.pointerId, sx: pt[0], sy: pt[1], x: Z.x, y: Z.y, moved: false };
      if (Z.z > 1) { stage.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    stage.addEventListener("pointermove", function (e) {
      if (!pan || e.pointerId !== pan.id || Z.z === 1) return;
      var pt = local(e);
      if (Math.hypot(pt[0] - pan.sx, pt[1] - pan.sy) > 3) pan.moved = true;
      Z.x = pan.x + pt[0] - pan.sx; Z.y = pan.y + pt[1] - pan.sy; clampPan(); applyZoom(false);
    });
    stage.addEventListener("pointerup", function (e) {
      if (!pan || e.pointerId !== pan.id) return;
      var pt = local(e), was = pan; pan = null;
      if (!was.moved && Z.z === 1) zoomTo(Z.IN, pt[0], pt[1]);
    });
    stage.addEventListener("wheel", function (e) {
      if (!S.finished || (Z.z === 1 && !e.ctrlKey)) return;
      e.preventDefault();
      var pt = local(e);
      zoomTo(Z.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)), pt[0], pt[1], false);
    }, { passive: false });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && Z.z > 1) zoomTo(1); });
    if (zoomBtn) zoomBtn.addEventListener("click", function () { zoomTo(Z.z > 1 ? 1 : Z.IN); });
  })();

  // ---------- meter + status ----------
  var lastSecs = -1, lastN = -1;
  function render() {
    var n = S.windows.filter(function (w) { return w.photo; }).length, total = S.windows.length;
    var full = n === total;
    if (full && !S.finished) {
      S.finished = true; S.doneAt = S.doneAt || Date.now();
      if (!S.cheered) { S.cheered = true; if (!reduceMQ.matches) later(sprinkle, 450); later(hang, reduceMQ.matches ? 0 : 1300); }
    } else if (!full && S.finished) { S.finished = false; unhang(); }
    if (dotsEl.childElementCount !== total) {
      dotsEl.innerHTML = "";
      for (var i = 0; i < total; i++) dotsEl.appendChild(document.createElement("i"));
    }
    if (n !== lastN) {
      Array.prototype.forEach.call(dotsEl.children, function (d, k) { d.classList.toggle("is-on", k < n); });
      if (n > lastN && lastN >= 0 && n > 0) { var d = dotsEl.children[n - 1]; d.classList.remove("is-pop"); void d.offsetWidth; d.classList.add("is-pop"); }
      lastN = n;
    }
    var secs = S.t0 ? Math.floor(((S.doneAt || Date.now()) - S.t0) / 1000) : 0;
    if (secs !== lastSecs) { clockEl.textContent = Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0"); meter.style.setProperty("--tick", secs); lastSecs = secs; }
    meter.classList.toggle("is-running", !!S.t0 && !S.doneAt);
    meter.classList.toggle("is-done", !!S.doneAt);
    again.querySelector("[data-again-label]").textContent = "scramble again";
    again.hidden = !S.doneAt;
    zoomBtn.hidden = !S.finished;
    if (!S.finished && Z.z > 1) zoomTo(1);
    var left = total - n, s;
    if (S.doneAt && full && Z.z > 1) s = "drag to look around. esc to zoom out.";
    else if (S.doneAt && full) s = "cutest board ever!! tap the board to look closer \u2726";
    else if (S.doneAt) s = "redecorating? " + left + " empty " + (left === 1 ? "frame" : "frames");
    else if (!S.t0) s = "help me decorate! any pic, any frame.";
    else if (n === 0) s = "drag a photo into a frame, or tap one to pop it in.";
    else if (left === 1) s = "one more frame!!";
    else if (left <= 3) s = "so close, " + left + " frames to go";
    else if (n >= total / 2) s = "ooh it’s coming together";
    else s = "cute pick! " + left + " frames left";
    if (status.textContent !== s) status.textContent = s;
    stage.classList.toggle("is-zoomable", S.finished && Z.z === 1);
  }

  root.querySelectorAll('[data-act="scramble"]').forEach(function (b) { b.addEventListener("click", scramble); });
  q('[data-act="solve"]').addEventListener("click", fill);
  setInterval(function () { if (S.t0 && !S.doneAt) render(); }, 1000);

  if (document.readyState === "complete") build(); else window.addEventListener("load", build);
  var pending = 0;
  function relayout() { cancelAnimationFrame(pending); pending = requestAnimationFrame(function () { if (board) layout(); }); }
  window.addEventListener("resize", relayout);
  if ("ResizeObserver" in window) new ResizeObserver(relayout).observe(stage);
})();
