/* Homepage project map (see styles/home-map.css): one continuous thread runs through the six project
   objects in date order, oldest first, passing behind each one. It's a single smooth curve (a Catmull-Rom
   spline through the objects plus a few loose waypoints between them), so there are no joints or
   knots, and the waypoints sit at different distances so the thread wanders rather than repeats. */
(function () {
  var map = document.querySelector("[data-project-map]");
  if (!map) return;
  var svg = map.querySelector(".hp-map__lines");
  // shared photo treatment: every object gets the same grade, grain and shadow (styles/home-map.css)
  map.classList.add("hp-map--shared");
  map.querySelectorAll(".hp-item__obj img").forEach(function (img) { img.parentNode.style.setProperty("--src", 'url("' + img.getAttribute("src") + '")'); });
  // the thread runs in date order (data-order), oldest project first, independent of the numbering
  var items = Array.prototype.slice.call(map.querySelectorAll(".hp-item")).sort(function (a, b) {
    return (+a.getAttribute("data-order") || 0) - (+b.getAttribute("data-order") || 0);
  });

  // how far the thread drifts outward between each pair of objects (fraction of their distance)
  var DRIFT = [0, 0, 0, 0, 0]; // no extra waypoints: the curve flows straight through the objects

  function centre(el, box) {
    var r = el.querySelector(".hp-item__obj").getBoundingClientRect();
    return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
  }
  function f(n) { return n.toFixed(1); }

  // smooth path through points (Catmull-Rom → cubic Béziers), so the tangent never breaks
  // smooth path through points: centripetal Catmull-Rom → cubic Béziers. Centripetal spacing keeps
  // the curve from overshooting or kinking where points are unevenly spaced, so turns stay round.
  function spline(pts) {
    function mirror(a, b) { return { x: 2 * a.x - b.x, y: 2 * a.y - b.y }; }
    var P = [mirror(pts[0], pts[1])].concat(pts, [mirror(pts[pts.length - 1], pts[pts.length - 2])]);
    function dist(a, b) { return Math.pow(Math.hypot(b.x - a.x, b.y - a.y), 0.5) || 1e-3; }
    var d = "M" + f(pts[0].x) + " " + f(pts[0].y);
    for (var i = 1; i < P.length - 2; i++) {
      var p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
      var d1 = dist(p0, p1), d2 = dist(p1, p2), d3 = dist(p2, p3);
      var c1 = {
        x: (d1 * d1 * p2.x - d2 * d2 * p0.x + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1.x) / (3 * d1 * (d1 + d2)),
        y: (d1 * d1 * p2.y - d2 * d2 * p0.y + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1.y) / (3 * d1 * (d1 + d2))
      };
      var c2 = {
        x: (d3 * d3 * p1.x - d2 * d2 * p3.x + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2.x) / (3 * d3 * (d3 + d2)),
        y: (d3 * d3 * p1.y - d2 * d2 * p3.y + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2.y) / (3 * d3 * (d3 + d2))
      };
      c1.y = Math.max(c1.y, 12); c2.y = Math.max(c2.y, 12);
      d += " C" + f(c1.x) + " " + f(c1.y) + " " + f(c2.x) + " " + f(c2.y) + " " + f(p2.x) + " " + f(p2.y);
    }
    return d;
  }

  // desktop: drawn like the exhibition poster this hero is based on. Each project is joined to the next
  // by a straight, slightly wavering hand-drawn line that runs from the edge of one object to the edge
  // of the next, so the lines plug into the objects rather than meeting behind them.
  function handLines(box) {
    var o = items.map(function (el) {
      var r = el.querySelector(".hp-item__obj").getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, hw: r.width / 2, hh: r.height / 2 };
    });
    // where a line from the centre heading (ux, uy) meets the object (cut-outs have a little padding)
    function edge(p, ux, uy) { return Math.min(p.hw / (Math.abs(ux) || 1e-6), p.hh / (Math.abs(uy) || 1e-6)) * 0.78; }
    var seed = 7; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; }
    var out = "";
    for (var i = 0; i < o.length - 1; i++) {
      var a = o[i], b = o[i + 1], dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      var s = edge(a, ux, uy), e = L - edge(b, ux, uy);
      if (e - s < 10) continue;
      // a hand's wobble: small sideways drift that changes slowly along the line
      var n = Math.max(3, Math.round((e - s) / 26)), d = "", off = 0;
      for (var k = 0; k <= n; k++) {
        var t = s + (e - s) * k / n;
        off = (k === 0 || k === n) ? 0 : off * 0.5 + rnd() * 1.6;
        var x = a.x + ux * t - uy * off, y = a.y + uy * t + ux * off;
        d += (k ? " L" : "M") + f(x) + " " + f(y);
      }
      out += '<path d="' + d + '"/>';
    }
    return out;
  }

  var CAPTION_LIFT = 28; // px the caption sits above the number 4's baseline
  function baseline(el) { // y of the baseline of an element's last line of text
    var m = document.createElement("span");
    m.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
    el.appendChild(m); var y = m.getBoundingClientRect().top; m.remove(); return y;
  }

  function draw() {
    var box = map.getBoundingClientRect();
    svg.setAttribute("viewBox", "0 0 " + box.width + " " + box.height);
    var copy = map.querySelector(".home-hero__copy"), cr = copy && copy.getBoundingClientRect();
    var keep = cr && { l: cr.left - box.left - 10, r: cr.right - box.left + 10, t: cr.top - box.top - 10, b: cr.bottom - box.top + 10 };
    function inKeep(p) { return keep && p.x > keep.l && p.x < keep.r && p.y > keep.t && p.y < keep.b; }
    function crosses(a, b) { for (var t = 0.05; t < 1; t += 0.05) if (inKeep({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return true; return false; }

    var c = items.map(function (el) { return centre(el, box); });
    // the corner caption: its right edge lines up with the left edge of the number 6, and its last line
    // sits a little above the baseline of the number 4
    var cap = map.querySelector(".hp-map__caption"), four = map.querySelector('.hp-item[data-order="4"] .hp-item__num'),
        six = map.querySelector('.hp-item[data-order="6"] .hp-item__num');
    if (cap && four && six) {
      cap.style.bottom = "0px";
      var drop = cap.getBoundingClientRect().bottom - baseline(cap); // space under the caption's baseline
      cap.style.bottom = Math.max(0, box.bottom - baseline(four) - drop + CAPTION_LIFT).toFixed(1) + "px";
      cap.style.right = Math.max(0, box.right - six.getBoundingClientRect().left).toFixed(1) + "px";
    }
    // desktop: poster-style hand-drawn lines (see handLines() above)
    if (matchMedia("(min-width: 861px)").matches) {
      svg.innerHTML = handLines(box);
      intro(); return;
    }
    // "outward" means away from the middle of the cluster of objects
    var cx = c.reduce(function (s, p) { return s + p.x; }, 0) / c.length, cy = c.reduce(function (s, p) { return s + p.y; }, 0) / c.length;
    // the thread never rises above the top of the map, where it would slip under the sticky header
    var TOP = 14;
    // one unbroken thread; a hop that would cut through the intro swings around it instead
    var runs = [[c[0]]];
    for (var i = 0; i < c.length - 1; i++) {
      var a = c[i], b = c[i + 1];
      if (crosses(a, b)) {
        // route the thread around the intro instead of through it: swing out past the nearest corner
        var g = 28, corners = [{ x: keep.l - g, y: keep.t - g }, { x: keep.r + g, y: keep.t - g }, { x: keep.r + g, y: keep.b + g }, { x: keep.l - g, y: keep.b + g }];
        var best = null, bestLen = Infinity;
        corners.forEach(function (q) {
          if (crosses(a, q) || crosses(q, b)) return;
          var L = Math.hypot(q.x - a.x, q.y - a.y) + Math.hypot(b.x - q.x, b.y - q.y);
          if (L < bestLen) { bestLen = L; best = q; }
        });
        if (best) { runs[runs.length - 1].push(best, b); } else { runs.push([b]); }
        continue;
      }
      var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      var side = Math.hypot(mx + nx - cx, my + ny - cy) > Math.hypot(mx - nx - cx, my - ny - cy) ? 1 : -1;
      var k = DRIFT[i % DRIFT.length] * len * side, w = { x: mx + nx * k, y: my + ny * k };
      // a waypoint that would lift the thread toward the header is pulled back down
      if (w.y < TOP) w.y = Math.max(TOP, Math.min(a.y, b.y) - 6);
      if (Math.abs(DRIFT[i % DRIFT.length]) > 0.05 && !inKeep(w)) runs[runs.length - 1].push(w);
      runs[runs.length - 1].push(b);
    }
    svg.innerHTML = runs.filter(function (r) { return r.length > 1; }).map(function (r) { return '<path d="' + spline(r) + '"/>'; }).join("");
    intro();
  }

  // the thread draws itself from 1 to 6 when the page opens on the hero, and again every time the hero
  // scrolls back into view. It waits for the page to finish loading first (images shift the objects).
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches || !svg.animate;
  var armed = !still;       // true while the line is waiting (hidden) to be drawn
  function inView() { var r = map.getBoundingClientRect(); return r.bottom > innerHeight * 0.25 && r.top < innerHeight * 0.75; }
  function play() {
    armed = false; svg.style.visibility = "";
    var paths = Array.prototype.slice.call(svg.querySelectorAll("path"));
    var lens = paths.map(function (p) { return p.getTotalLength(); });
    var total = lens.reduce(function (a, b) { return a + b; }, 0) || 1, T = 2600, t = 250;
    paths.forEach(function (p, i) {
      var L = lens[i], d = T * L / total;
      p.getAnimations().forEach(function (a) { a.cancel(); });
      p.style.strokeDasharray = L + " " + L;
      var a = p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: d, delay: t, easing: paths.length > 1 ? "linear" : "cubic-bezier(.45, 0, .25, 1)", fill: "backwards" });
      a.onfinish = function () { p.style.strokeDasharray = ""; };
      t += d;
    });
  }
  // called after every redraw of the paths
  function intro() {
    if (still) return;
    if (armed) {
      svg.style.visibility = "hidden";
      if (document.readyState === "complete" && inView()) play();
    }
  }
  if (!still) {
    // hide the line once the hero is well out of view, and draw it again when it comes back
    function check() {
      if (document.readyState !== "complete") return;
      var r = map.getBoundingClientRect(), gone = r.bottom < 0 || r.top > innerHeight;
      if (gone && !armed) { armed = true; svg.style.visibility = "hidden"; }
      else if (armed && inView()) play();
    }
    addEventListener("scroll", check, { passive: true });
    addEventListener("load", check);
  }

  draw();
  addEventListener("resize", draw);
  addEventListener("load", draw);
  map.querySelectorAll("img").forEach(function (img) { if (!img.complete) img.addEventListener("load", draw); });
})();
