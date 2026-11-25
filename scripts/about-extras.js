/* About page additions (see styles/about-extras.css):
   1. "At a glance": a card that pulls down out of a brushed-metal sleeve. Closed, the punched windows
      show the essentials; pulled out, the card has everything else.
   2. Puzzle cards: each opens the real puzzle (/play) in a popup you can close. */
(function () {
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function box(e, x, y, w, h) { e.style.cssText = "left:" + x + "px;top:" + y + "px;width:" + w + "px;height:" + h + "px"; return e; }

  // ---------- 1. At a glance ----------
  var host = document.querySelector("[data-sleeve]");
  if (host) {
    var ROWS_TEXT = [
      "✦ AT A GLANCE ······ 2024–2026",
      "ALLISON QIU                ☺ ?",
      "PRODUCT DESIGNER · UIUC ′28  ✎",
      "LIKES MESSY PROBLEMS & CODES ∞",
      "PREV @ IBM ···· PRODUCT INTERN",
      "CURRENTLY INFOSCI @ UIUC     ★",
      "COUNTRY FIN. ······· UI/UX ′25",
      "H-E-B ·········· UX DESIGN ′24",
      "HACK4IMPACT ······ PM · NOW  ♡",
      "TERRAFORM · ROAM · ANDA      →",
      "OPERATION SAFE ESCAPE · NABU  ",
      "BRILLIANT CITIES      ☺ ∞ ✎ ★ ",
      "LOVES CROCHET ★ SMISKIS ★ NYC ",
      "GOALS ADOBE → EUROPE → NYC   ☆",
      "LATELY BUILDING PUZZLES ☻   # ",
      "LINKEDIN / RESUME / SAY HI   ✉",
      "ALLISONQIU10@GMAIL.COM ©2026 !"
    ];
    // Windows: [row, first column, length]. Separator dots never get a window.
    var WINDOWS = [[1, 0, 11], [2, 0, 16], [4, 0, 10], [5, 0, 24], [9, 0, 23], [10, 0, 28], [11, 0, 16], [16, 0, 22]];
    var COLS = 30, ROWS = ROWS_TEXT.length;
    var grid = ROWS_TEXT.map(function (t) { var a = Array.from(t); while (a.length < COLS) a.push(" "); return a.slice(0, COLS); });
    var hole = grid.map(function (row) { return row.map(function () { return false; }); });
    WINDOWS.forEach(function (w) { for (var i = 0; i < w[2]; i++) { var ch = grid[w[0]][w[1] + i]; if (ch !== " " && ch !== "·") hole[w[0]][w[1] + i] = true; } });

    // PAD_T sits 2px past a whole pitch, so a card stopped on a row has its top edge in the metal between windows.
    var CELL = 20, PITCH = 24, PAD_L = 28, PAD_R = 28, PAD_T = 26, PAD_B = 34;
    var W = PAD_L + COLS * PITCH - (PITCH - CELL) + PAD_R;
    var H = PAD_T + ROWS * PITCH - (PITCH - CELL) + PAD_B;
    var NOTCH = { w: 64, h: 16, x: Math.round(W / 2 - 32) };
    var MAX = H + 28;
    function at(r, c) { return { x: PAD_L + c * PITCH, y: PAD_T + r * PITCH }; }
    function maskURL(withHoles) {
      var n = NOTCH, rr = 6, d = "M0 0H" + W + "V" + H + "H0Z";
      d += "M" + n.x + " " + H + "V" + (H - n.h + rr) + "A" + rr + " " + rr + " 0 0 1 " + (n.x + rr) + " " + (H - n.h) +
           "H" + (n.x + n.w - rr) + "A" + rr + " " + rr + " 0 0 1 " + (n.x + n.w) + " " + (H - n.h + rr) + "V" + H + "Z";
      if (withHoles) for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (hole[r][c]) {
        var p = at(r, c); d += "M" + p.x + " " + p.y + "h" + CELL + "v" + CELL + "h-" + CELL + "Z";
      }
      return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '"><path fill-rule="evenodd" d="' + d + '"/></svg>') + '")';
    }

    var stage = el("div", "ag-stage"), sl = el("div", "sl");
    sl.style.width = W + "px"; sl.style.height = (H + MAX) + "px";
    var shadow = box(el("div", "sl__shadow"), 0, 0, W, H);
    var back = box(el("div", "sl__back"), 0, 0, W, H);
    var insert = box(el("div", "sl__insert"), 0, 0, W, H);
    var front = box(el("div", "sl__front"), 0, 0, W, H);
    back.style.webkitMaskImage = back.style.maskImage = maskURL(false);
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var ch = grid[r][c]; if (ch === " ") continue;
      var p = at(r, c), cell = box(el("span", "sl__cell" + (ch === "·" ? " is-dot" : "")), p.x, p.y, CELL, CELL);
      cell.textContent = ch; insert.appendChild(cell);
    }
    var arrow = el("span", "sl__arrow", "▼"); arrow.style.cssText = "left:" + (W / 2 - 5) + "px;top:" + (H - 13) + "px"; insert.appendChild(arrow);
    var metal = el("div", "sl__metal"); metal.style.webkitMaskImage = metal.style.maskImage = maskURL(true); front.appendChild(metal);
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) if (hole[r][c]) { var q = at(r, c); front.appendChild(box(el("span", "sl__hole"), q.x, q.y, CELL, CELL)); }
    front.appendChild(box(el("span", "sl__notch-shade"), NOTCH.x, H - NOTCH.h, NOTCH.w, NOTCH.h));
    sl.appendChild(shadow); sl.appendChild(back); sl.appendChild(insert); sl.appendChild(front);
    stage.appendChild(sl); host.appendChild(stage);

    var y = 0, s = 1;
    function place() {
      var cw = host.clientWidth; s = Math.min(1, cw / W);
      stage.style.left = Math.max(0, (cw - W * s) / 2) + "px";
      stage.style.transform = "scale(" + s + ")";
      insert.style.transform = "translateY(" + y + "px)";
      host.style.height = (H + y) * s + "px"; // the section grows like a drawer as the card comes out
    }
    function set(v) { y = Math.max(0, Math.min(MAX, v)); place(); insert.setAttribute("aria-valuenow", String(Math.round(y))); }
    function snap(v) { return v > MAX - PITCH * 3 ? MAX : Math.round(v / PITCH) * PITCH; }
    place(); addEventListener("resize", place);
    addEventListener("pointermove", function (e) { sl.style.setProperty("--sheen", (12 + 76 * e.clientX / innerWidth).toFixed(1) + "%"); }, { passive: true });

    insert.tabIndex = 0; insert.setAttribute("role", "slider"); insert.setAttribute("aria-orientation", "vertical");
    insert.setAttribute("aria-label", "Pull the card out of the sleeve"); insert.setAttribute("aria-valuemin", "0"); insert.setAttribute("aria-valuemax", String(MAX));
    var start = 0, from = 0, moved = false;
    insert.addEventListener("pointerdown", function (e) { start = e.clientY; from = y; moved = false; host.classList.add("is-dragging"); insert.setPointerCapture(e.pointerId); });
    insert.addEventListener("pointermove", function (e) {
      if (!host.classList.contains("is-dragging")) return;
      var dy = (e.clientY - start) / s; if (Math.abs(dy) > 3) moved = true; set(from + dy);
    });
    function end() {
      if (!host.classList.contains("is-dragging")) return;
      host.classList.remove("is-dragging");
      if (!moved) set(y > MAX / 2 ? 0 : MAX); // a tap toggles all the way out or back in
      else set(snap(y));
    }
    insert.addEventListener("pointerup", end); insert.addEventListener("pointercancel", end);
    insert.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set(y > MAX / 2 ? 0 : MAX); return; }
      var k = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0; if (!k) return; e.preventDefault();
      var last = Math.floor((MAX - PITCH * 3) / PITCH) * PITCH, next = (y >= MAX ? last + PITCH : y) + k * PITCH;
      set(next > last ? (k > 0 ? MAX : last) : next);
    });
    set(0);
  }

  // ---------- 2. Puzzle cards + popup ----------
  var row = document.querySelector("[data-puzzle-cards]");
  if (!row) return;
  var WS = "<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i>f</i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i>n</i><i>l</i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i>l</i><i>y</i><i>w</i><i>b</i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i>t</i><i>e</i><i>a</i><i>d</i><i>i</i><i>g</i><i>i</i><i>c</i><i>a</i><i>m</i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i>e</i><i>n</i><i>u</i><i>i</i><i>u</i><i>c</i><i>a</i><i>d</i><i>g</i><i>b</i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i>o</i><i>r</i><i>c</i><i>t</i><i>w</i><i>d</i><i>n</i><i>y</i><i>c</i><i>w</i><i>a</i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i>b</i><i>r</i><i>b</i><i>n</i><i>s</i><i>m</i><i>i</i><i>s</i><i>k</i><i>i</i><i>s</i><i>t</i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i>a</i><i>o</i><i>a</i><i>i</i><i>p</i><i>u</i><i>z</i><i>z</i><i>l</i><i>e</i><i>s</i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i>k</i><i>c</i><i>h</i><i>f</i><i>s</i><i>k</i><i>y</i><i>w</i><i>n</i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i>i</i><i>h</i><i>v</i><i>v</i><i>o</i><i>m</i><i>l</i><i>j</i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i>h</i><i>n</i><i>e</i><i>b</i><i>y</i><i>v</i><i>r</i><i>r</i><i>l</i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i>f</i><i>g</i><i>t</i><i></i><i></i><i>v</i><i>m</i><i>m</i><i>b</i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i>y</i><i>f</i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i>p</i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>";
  var GAMES = [
    { id: "bag", num: "01", name: "What’s in my bag", line: "Drag my everyday things back into their outlines.", go: "Pack it up",
      art: '<img class="pzc__bag" src="/assets/bag/bag.png?v=tight" alt="" draggable="false">' },
    { id: "board", num: "02", name: "The board", line: "Pin a few favorite photos onto my corkboard.", go: "Pin it up",
      art: '<span class="pzc__pol"><img class="pzc__photo" src="/assets/home/board/photo-02.jpg" alt="" draggable="false"><img class="pzc__clip" src="/assets/home/board/clip-red.png" alt="" draggable="false"></span>' },
    { id: "words", num: "03", name: "Word search", line: "Find ten hidden words about the things I love.", go: "Find the words",
      art: '<span class="pzc__ws"><img class="pzc__lace" src="/assets/home/words/star-lace.png" alt="" draggable="false"><img class="pzc__felt" src="/assets/home/words/star-felt.png" alt="" draggable="false"><span class="pzc__grid">' + WS + '</span></span>' }
  ];
  GAMES.forEach(function (g) {
    var b = el("button", "pzc", '<span class="pzc__art">' + g.art + '</span><span class="pzc__txt"><span class="pzc__num">' + g.num + '</span><span class="pzc__name">' + g.name +
      '</span><span class="pzc__line">' + g.line + '</span><span class="pzc__go">' + g.go + ' <span aria-hidden="true">→</span></span></span>');
    b.type = "button"; b.setAttribute("data-play", g.id); b.setAttribute("aria-haspopup", "dialog");
    row.appendChild(b);
  });

  var modal = el("div", "pzm"); modal.hidden = true; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-label", "Puzzles");
  modal.innerHTML = '<div class="pzm__scrim" data-close></div><div class="pzm__panel"><div class="pzm__top"><div class="pzm__tabs" role="tablist">' +
    GAMES.map(function (g) { return '<button type="button" class="pzm__tab" role="tab" data-tab="' + g.id + '">' + g.name + "</button>"; }).join("") +
    '</div><button type="button" class="pzm__x" data-close aria-label="Close puzzle">close <span aria-hidden="true">×</span></button></div><iframe class="pzm__frame" title="Puzzle"></iframe></div>';
  document.body.appendChild(modal);
  var frame = modal.querySelector("iframe"), loaded = false, opener = null;
  function mark(id) { modal.querySelectorAll(".pzm__tab").forEach(function (t) { t.setAttribute("aria-selected", String(t.getAttribute("data-tab") === id)); }); }
  function show(id) {
    mark(id);
    if (!loaded) { frame.src = "/play" + (id === "bag" ? "" : "#" + id); loaded = true; }
    else frame.contentWindow && frame.contentWindow.postMessage({ aqShow: id }, location.origin);
  }
  function open(id, from) {
    opener = from || null; modal.hidden = false; document.documentElement.classList.add("pzm-locked");
    show(id); requestAnimationFrame(function () { modal.classList.add("is-in"); });
    modal.querySelector(".pzm__x").focus({ preventScroll: true });
  }
  function shut() {
    modal.classList.remove("is-in"); document.documentElement.classList.remove("pzm-locked");
    setTimeout(function () { modal.hidden = true; }, 200);
    if (opener) opener.focus({ preventScroll: true });
  }
  row.querySelectorAll("[data-play]").forEach(function (b) { b.addEventListener("click", function () { open(b.getAttribute("data-play"), b); }); });
  modal.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", shut); });
  modal.querySelectorAll(".pzm__tab").forEach(function (t) { t.addEventListener("click", function () { show(t.getAttribute("data-tab")); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) shut(); });
  // the puzzle page reports which puzzle is showing ("play a new puzzle" switches it too)
  addEventListener("message", function (e) { if (e.origin === location.origin && e.data && e.data.aqPuzzle) mark(e.data.aqPuzzle); });
})();
