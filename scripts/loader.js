// First-visit loader. When it plays: once per browser session, only when someone lands on the
// homepage directly (typed, bookmarked or linked), never on back/forward, reload, the Turn the
// Page / card transitions back from a case study, a #my-work deep link, or with reduced motion.
// It runs about 2.6s and any click, tap or key skips straight to the page.
(function () {
  "use strict";
  var root = document.documentElement;
  if (!root.classList.contains("aq-loading")) return;
  var el = document.getElementById("aq-loader");
  if (!el) { root.classList.remove("aq-loading"); return; }
  var GEMS = [];
  for (var i = 0; i < 17; i++) GEMS.push("assets/home/decor/star/star-" + String(i).padStart(2, "0") + ".png");
  for (i = 0; i < 18; i++) GEMS.push("assets/home/decor/circle/circle-" + String(i).padStart(2, "0") + ".png");

  var sheet = el.querySelector(".aql-sheet"), logo = el.querySelector(".aql-logo"), fx = el.querySelector(".aql-fx");
  var comet = el.querySelector(".aql-comet"), la = el.querySelector(".aql-a"), lq = el.querySelector(".aql-q");
  var timers = [], done = false;
  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function gem(css) { var g = document.createElement("img"); g.src = GEMS[Math.floor(Math.random() * GEMS.length)]; g.alt = ""; g.style.cssText = css; fx.appendChild(g); return g; }

  function finish() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    root.classList.remove("aq-loading");
    el.remove();
    try { sessionStorage.setItem("aq-loaded", "1"); } catch (e) {}
  }
  function skip() {
    if (done) return;
    timers.forEach(clearTimeout);
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: "forwards" }).onfinish = finish;
  }
  el.addEventListener("pointerdown", skip);
  document.addEventListener("keydown", skip, { once: true });

  function play() {
    var r = logo.getBoundingClientRect(), k = r.width / 600;
    // 1. the shooting star streaks in from the upper right, shedding sparkles
    comet.animate([
      { transform: "translate(" + 260 * k * 1.3 + "px," + -80 * k * 1.3 + "px) rotate(-6deg) scale(.7)", opacity: 0 },
      { transform: "translate(" + 40 * k + "px," + -10 * k + "px) rotate(-2deg) scale(1.02)", opacity: 1, offset: 0.7 },
      { transform: "none", opacity: 1 }
    ], { duration: 720, easing: "cubic-bezier(.2,.8,.25,1)", fill: "forwards" });
    for (var s = 0; s < 6; s++) (function (s) {
      at(s * 80, function () {
        var sz = 10 + Math.random() * 10, x = r.left + r.width * (0.95 - s * 0.14), y = r.top + r.height * (0.45 + s * 0.06);
        gem("left:" + x + "px;top:" + y + "px;width:" + sz + "px;height:" + sz + "px").animate(
          [{ transform: "scale(.2)", opacity: 0 }, { transform: "scale(1) rotate(90deg)", opacity: 0.9, offset: 0.3 }, { transform: "translateY(26px) scale(.5) rotate(200deg)", opacity: 0 }],
          { duration: 850, easing: "ease-out", fill: "forwards" });
      });
    })(s);
    // 2. the a, then the q, drop in with a bounce
    function drop(e, tilt) {
      e.animate([
        { transform: "translateY(" + -40 * k + "px) rotate(" + tilt + "deg) scale(.6)", opacity: 0 },
        { transform: "translateY(" + 5 * k + "px) rotate(" + -tilt / 5 + "deg) scale(1.06)", opacity: 1, offset: 0.65 },
        { transform: "none", opacity: 1 }
      ], { duration: 480, easing: "cubic-bezier(.3,1.3,.5,1)", fill: "forwards" });
    }
    at(640, function () { drop(la, -10); });
    at(850, function () { drop(lq, 10); });
    // 3. the star twinkles
    at(1300, function () {
      [[0.35, 0.47], [0.32, 0.6], [0.28, 0.53]].forEach(function (p, j) {
        var sz = 14 + j * 5;
        gem("left:" + (r.left + r.width * p[0] - sz / 2) + "px;top:" + (r.top + r.height * p[1] - sz / 2) + "px;width:" + sz + "px;height:" + sz + "px").animate(
          [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1.3) rotate(90deg)", opacity: 1, offset: 0.5 }, { transform: "scale(0) rotate(180deg)", opacity: 0 }],
          { duration: 700, delay: j * 110, easing: "ease-in-out", fill: "forwards" });
      });
    });
    // 4. gems shower down; the sheet drains away behind them, top to bottom
    at(1750, function () {
      var W = window.innerWidth, H = window.innerHeight, n = Math.round(Math.min(70, Math.max(30, W / 22)));
      for (var g = 0; g < n; g++) {
        var sz = 14 + Math.random() * 22;
        gem("left:" + (Math.random() * W - sz / 2) + "px;top:" + (-40 - Math.random() * 40) + "px;width:" + sz + "px;height:" + sz + "px").animate([
          { transform: "translateY(0) rotate(0deg)", opacity: 0 },
          { transform: "translateY(" + H * 0.12 + "px) rotate(60deg)", opacity: 1, offset: 0.12 },
          { transform: "translateY(" + H * (1.05 + Math.random() * 0.1) + "px) rotate(" + (200 + Math.random() * 300) + "deg)", opacity: 0.9, offset: 0.88 },
          { transform: "translateY(" + H * (1.15 + Math.random() * 0.1) + "px) rotate(" + (260 + Math.random() * 300) + "deg)", opacity: 0 }
        ], { duration: 1100 + Math.random() * 400, delay: Math.random() * 380, easing: "cubic-bezier(.45,0,.7,1)", fill: "forwards" });
      }
      logo.animate([{ transform: "translate(-50%,-50%)", opacity: 1, filter: "blur(0)" }, { transform: "translate(-50%,-50%) translateY(60px)", opacity: 0, filter: "blur(4px)" }],
        { duration: 650, delay: 200, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" });
      sheet.animate([{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(100% 0 0 0)" }], { duration: 1150, delay: 250, easing: "cubic-bezier(.55,0,.35,1)", fill: "forwards" });
      el.style.pointerEvents = "none";
    });
    at(3400, finish);
  }

  // wait for the three logo layers (but never longer than 1.2s) so nothing pops in half-loaded
  var imgs = [comet, la, lq], left = imgs.length, started = false;
  function go() { if (!started) { started = true; play(); } }
  imgs.forEach(function (im) { if (im.complete) left--; else im.addEventListener("load", function () { if (--left <= 0) go(); }); });
  if (left <= 0) go();
  at(1200, go);
  at(6000, finish); // hard stop, whatever happens
})();
