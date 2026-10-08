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
    var note = "";

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

    stage.addEventListener("mousemove", function (event) {
      if (!tip || !tip.classList.contains("is-on")) return;
      var rect = stage.getBoundingClientRect();
      tip.style.left = event.clientX - rect.left + 10 + "px";
      tip.style.top = event.clientY - rect.top - 12 + "px";
    });

    bag.querySelectorAll(".bag-item").forEach(function (item) {
      function show() {
        note = item.getAttribute("data-note") || "";
        if (!tip) return;
        tip.textContent = note;
        tip.classList.add("is-on");
      }
      function hide() {
        if (!tip) return;
        tip.classList.remove("is-on");
      }
      item.addEventListener("mouseenter", show);
      item.addEventListener("mouseleave", hide);
      item.addEventListener("focus", show);
      item.addEventListener("blur", hide);
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

    function spawn(x, y) {
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
          { transform: "rotate(" + (rot + 20) + "deg) scale(1)", opacity: 0.9, offset: 0.15 },
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
        spawn(x + (Math.random() - 0.5) * 150, y + (Math.random() - 0.5) * 120);
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

  var pit = document.querySelector("[data-gem-pit]");
  if (!pit) return;
  var host = pit.parentElement;
  if (!host) return;

  var CELL = 28;
  var GRAVITY = 0.68;
  var REACH = 55;
  var FORCE = 2.5;
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
  var fallStarted = 0;
  var buckets = [];
  var usedBuckets = [];
  var cols = 1;
  var releaseTimer = 0;

  function particleCount(width) {
    if (width >= 1440) return 240;
    if (width >= 1280) return Math.round(210 + ((width - 1280) * 30) / 160);
    if (width >= 1024) return Math.round(175 + ((width - 1024) * 35) / 256);
    if (width >= 768) return Math.round(130 + ((width - 768) * 45) / 256);
    if (width >= 430) return Math.round(85 + ((width - 430) * 45) / 338);
    if (width >= 390) return Math.round(75 + ((width - 390) * 10) / 40);
    if (width >= 375) return Math.round(70 + ((width - 375) * 5) / 15);
    return Math.max(60, Math.round((70 * width) / 375));
  }

  function gemDiameter() {
    var roll = Math.random();
    if (roll < 0.22) return 8 + Math.random() * 3;
    if (roll < 0.72) return 11 + Math.random() * 4;
    return 15 + Math.random() * 3;
  }

  function fitCanvas() {
    W = pit.clientWidth;
    H = pit.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }

  function clampGem(gem) {
    if (gem.x < gem.r) {
      gem.x = gem.r;
      gem.vx *= -0.5;
    } else if (gem.x > W - gem.r) {
      gem.x = W - gem.r;
      gem.vx *= -0.5;
    }
    if (gem.y > H - gem.r) {
      gem.y = H - gem.r;
      gem.vy *= -0.22;
      gem.vx *= 0.86;
      if (Math.abs(gem.vy) < 0.18) gem.vy = 0;
      gem.supported = true;
    }
    if (gem.vy < 0 && gem.y < gem.r) {
      gem.y = gem.r;
      gem.vy *= -0.2;
    }
    if (gem.y < -H) {
      gem.y = -H;
      if (gem.vy < 0) gem.vy = 0;
    }
  }

  function clearBuckets() {
    var i;
    for (i = 0; i < usedBuckets.length; i += 1) buckets[usedBuckets[i]].length = 0;
    usedBuckets.length = 0;
  }

  function collide() {
    var cols = Math.max(1, Math.ceil(W / CELL) + 1);
    var i;
    var gem;
    var cx;
    var cy;
    clearBuckets();
    for (i = 0; i < gems.length; i += 1) {
      gem = gems[i];
      if (!gem.live) continue;
      cx = Math.max(0, (gem.x / CELL) | 0);
      cy = Math.max(0, (gem.y / CELL) | 0);
      var idx = cy * cols + cx;
      var bucket = buckets[idx];
      if (!bucket) bucket = buckets[idx] = [];
      if (!bucket.length) usedBuckets.push(idx);
      bucket.push(i);
    }
    for (i = 0; i < gems.length; i += 1) {
      gem = gems[i];
      if (!gem.live || gem.sleep) continue;
      cx = Math.max(0, (gem.x / CELL) | 0);
      cy = Math.max(0, (gem.y / CELL) | 0);
      var oy;
      var ox;
      for (oy = -2; oy <= 2; oy += 1) {
        if (cy + oy < 0) continue;
        for (ox = -2; ox <= 2; ox += 1) {
          var nx = cx + ox;
          if (nx < 0) continue;
          var cell = buckets[(cy + oy) * cols + nx];
          if (!cell) continue;
          var k;
          for (k = 0; k < cell.length; k += 1) {
            var j = cell[k];
            if (j === i) continue;
            var other = gems[j];
            if (!other.sleep && j < i) continue;
            var dx = other.x - gem.x;
            var dy = other.y - gem.y;
            var d2 = dx * dx + dy * dy;
            if (d2 < 0.0001) continue;
            var dist = Math.sqrt(d2);
            var unx = dx / dist;
            var uny = dy / dist;
            var supportGap = Math.min(gem.r, other.r) * 0.45;
            if (dist < gem.r + other.r + 6 && dy > supportGap) gem.supported = true;
            else if (dist < gem.r + other.r + 6 && -dy > supportGap) other.supported = true;
            var min = (gem.r + other.r) * 0.92;
            if (dist >= min) continue;
            var overlap = (min - dist) * 0.45;
            if (!gem.sleep) {
              gem.x -= unx * overlap * (other.sleep ? 1.7 : 1);
              gem.y -= uny * overlap * (other.sleep ? 1.7 : 1);
            }
            if (!other.sleep) {
              other.x += unx * overlap * (gem.sleep ? 1.7 : 1);
              other.y += uny * overlap * (gem.sleep ? 1.7 : 1);
            }
            var rel = (other.vx - gem.vx) * unx + (other.vy - gem.vy) * uny;
            if (rel < -0.2) {
              var imp = -rel * 0.16;
              if (!gem.sleep) {
                gem.vx -= unx * imp;
                gem.vy -= uny * imp;
              }
              if (!other.sleep) {
                other.vx += unx * imp;
                other.vy += uny * imp;
              }
            }
            if (!gem.sleep) gem._d = 1;
            if (!other.sleep) other._d = 1;
            var speed = gem.vx * gem.vx + gem.vy * gem.vy + other.vx * other.vx + other.vy * other.vy;
            if (speed > 1.1) {
              if (gem.sleep) {
                gem.sleep = false;
                gem.still = 0;
              }
              if (other.sleep) {
                other.sleep = false;
                other.still = 0;
              }
            }
          }
        }
      }
    }
    for (i = 0; i < gems.length; i += 1) {
      gem = gems[i];
      if (!gem._d) continue;
      gem.vx *= 0.9;
      if (!gem._push) gem.vy *= 0.9;
      gem._d = 0;
      gem._push = 0;
    }
    for (i = 0; i < gems.length; i += 1) {
      gem = gems[i];
      if (!gem.live || !gem.sleep || gem.y >= H - gem.r - 8) continue;
      var held = false;
      var gx = Math.max(0, (gem.x / CELL) | 0);
      var gy = Math.max(0, (gem.y / CELL) | 0);
      var sy;
      var sx;
      for (sy = -2; sy <= 2 && !held; sy += 1) {
        if (gy + sy < 0) continue;
        for (sx = -2; sx <= 2; sx += 1) {
          if (gx + sx < 0) continue;
          var near = buckets[(gy + sy) * cols + (gx + sx)];
          if (!near) continue;
          var nk;
          for (nk = 0; nk < near.length; nk += 1) {
            var under = gems[near[nk]];
            if (under === gem || !under.live || under.y <= gem.y) continue;
            if (under.y - gem.y < gem.r + under.r + 8 && Math.abs(under.x - gem.x) < gem.r + under.r) {
              held = true;
              break;
            }
          }
          if (held) break;
        }
      }
      if (!held) {
        gem.sleep = false;
        gem.still = 0;
      }
    }
  }

  function cellIndex(x, y) {
    var cx = Math.max(0, Math.min(cols - 1, (x / CELL) | 0));
    var cy = Math.max(0, (y / CELL) | 0);
    return cy * cols + cx;
  }

  function pushNearPointer() {
    if (!ptr) return false;
    var span = Math.ceil(REACH / CELL);
    var cx = (ptr.x / CELL) | 0;
    var cy = (ptr.y / CELL) | 0;
    var interacting = false;
    var oy;
    var ox;
    for (oy = -span; oy <= span; oy += 1) {
      if (cy + oy < 0) continue;
      for (ox = -span; ox <= span; ox += 1) {
        var nx = cx + ox;
        if (nx < 0 || nx >= cols) continue;
        var cell = buckets[(cy + oy) * cols + nx];
        if (!cell) continue;
        var k;
        for (k = 0; k < cell.length; k += 1) {
          var gem = gems[cell[k]];
          if (!gem.live) continue;
          var dx = gem.x - ptr.x;
          var dy = gem.y - ptr.y;
          var d2 = dx * dx + dy * dy;
          if (d2 >= REACH * REACH || d2 < 0.04) continue;
          var dist = Math.sqrt(d2);
          var force = (REACH - dist) / REACH;
          var unx = dx / dist;
          var uny = dy / dist;
          gem.vx += unx * force * FORCE;
          gem.vy += uny * force * FORCE - 1.2;
          if (gem.vy < -8) gem.vy = -8;
          gem._push = 1;
          gem.sleep = false;
          gem.still = 0;
          interacting = true;
        }
      }
    }
    return interacting;
  }

  function integrate() {
    var i;
    var awake = 0;
    cols = Math.max(1, Math.ceil(W / CELL) + 1);
    clearBuckets();
    for (i = 0; i < gems.length; i += 1) {
      if (!gems[i].live) continue;
      var idx = cellIndex(gems[i].x, gems[i].y);
      var bucket = buckets[idx];
      if (!bucket) bucket = buckets[idx] = [];
      if (!bucket.length) usedBuckets.push(idx);
      bucket.push(i);
    }
    var interacting = pushNearPointer();
    for (i = 0; i < gems.length; i += 1) {
      var gem = gems[i];
      if (!gem.live || gem.sleep) continue;
      awake += 1;
      gem.vy += GRAVITY;
      gem.vx *= 0.992;
      gem.vy *= 0.996;
      gem.x += gem.vx;
      gem.y += gem.vy;
      gem.va += gem.vx * 0.012;
      gem.va *= 0.97;
      gem.a += gem.va;
      gem.supported = false;
      clampGem(gem);
    }
    if (awake) collide();
    var stillAwake = 0;
    for (i = 0; i < gems.length; i += 1) {
      var item = gems[i];
      if (!item.live || item.sleep) continue;
      var nearFloor = item.y >= H - item.r - 8;
      var low = item.y >= Math.max(8, H - 72);
      var thrown = item.vy < -0.45;
      if (!thrown && (nearFloor || (item.supported && low))) {
        item.vx *= 0.82;
        if (item.vy > 0) item.vy *= 0.45;
      }
      if ((nearFloor || (item.supported && low)) && item.vy > 0 && item.vy < 0.8) item.vy *= 0.1;
      if ((nearFloor || (item.supported && low)) && Math.abs(item.vx) < 0.8) item.vx *= 0.15;
      var onPile = item.supported && low;
      if ((nearFloor || onPile) && Math.abs(item.vx) < 0.1 && Math.abs(item.vy) < 0.1) {
        item.still += 1;
        if (item.still >= 12) {
          item.sleep = true;
          item.vx = 0;
          item.vy = 0;
          item.va = 0;
          continue;
        }
      } else {
        item.still = 0;
      }
      stillAwake += 1;
    }
    return { awake: stillAwake, interacting: interacting };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var i;
    var asleep = 0;
    var minY = Infinity;
    var maxY = -Infinity;
    var airSleep = 0;
    var rising = 0;
    for (i = 0; i < gems.length; i += 1) {
      var gem = gems[i];
      if (!gem.live) continue;
      if (gem.sleep) asleep += 1;
      if (gem.vy < -0.6) rising += 1;
      if (gem.sleep && gem.y < H - 200) airSleep += 1;
      if (gem.y < minY) minY = gem.y;
      if (gem.y > maxY) maxY = gem.y;
      if (!gem.img) continue;
      ctx.save();
      ctx.globalAlpha = gem.alpha;
      ctx.translate(gem.x, gem.y);
      ctx.rotate(gem.a);
      ctx.drawImage(gem.img, -gem.r, -gem.r, gem.r * 2, gem.r * 2);
      ctx.restore();
    }
    pit._aq = {
      n: gems.length,
      loaded: images.length,
      asleep: asleep,
      airSleep: airSleep,
      rising: rising,
      minY: minY,
      maxY: maxY,
      settle: pit._aq && pit._aq.settle ? pit._aq.settle : 0,
      dpr: dpr,
      cell: CELL,
      imgs: pit.querySelectorAll("img").length
    };
  }

  function step() {
    var state = integrate();
    draw();
    if (!state.awake && !state.interacting) {
      running = false;
      if (!pit._aq.settle && fallStarted) pit._aq.settle = Math.round(performance.now() - fallStarted);
      return;
    }
    raf = window.requestAnimationFrame(step);
  }

  function startLoop() {
    if (running || reduced || !spawned || !onScreen) return;
    running = true;
    raf = window.requestAnimationFrame(step);
  }

  function stopLoop() {
    running = false;
    window.cancelAnimationFrame(raf);
  }

  function releaseFrom(index) {
    if (!spawned || reduced) return;
    var batch = Math.max(1, Math.ceil(gems.length / 6));
    var end = Math.min(gems.length, index + batch);
    var i;
    for (i = index; i < end; i += 1) gems[i].live = true;
    if (onScreen) {
      if (!fallStarted) fallStarted = performance.now();
      startLoop();
    }
    if (end < gems.length) {
      releaseTimer = window.setTimeout(function () {
        releaseFrom(end);
      }, 35);
    }
  }

  function spawnGems() {
    if (!images.length || !W || !H) return;
    window.clearTimeout(releaseTimer);
    var count = particleCount(W);
    var i;
    gems = [];
    for (i = 0; i < count; i += 1) {
      var diameter = gemDiameter();
      var radius = diameter / 2;
      gems.push({
        img: images[(Math.random() * images.length) | 0],
        r: radius,
        x: radius + Math.random() * Math.max(1, W - radius * 2),
        y: -10 - Math.random() * H * 1.1,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 4 + Math.random() * 5,
        a: Math.random() * Math.PI * 2,
        va: 0,
        alpha: 0.84 + Math.random() * 0.16,
        sleep: false,
        still: 0,
        supported: false,
        live: false
      });
    }
    spawned = true;
    fallStarted = 0;
    if (reduced) {
      for (i = 0; i < gems.length; i += 1) gems[i].live = true;
      placeReduced();
    } else if (onScreen) releaseFrom(0);
    else draw();
  }

  function placeReduced() {
    var i;
    var pass;
    for (i = 0; i < gems.length; i += 1) {
      var gem = gems[i];
      gem.x = gem.r + Math.random() * Math.max(1, W - gem.r * 2);
      gem.y = H - gem.r - Math.random() * Math.min(78, H * 0.32);
      gem.vx = 0;
      gem.vy = 0;
      gem.sleep = false;
      gem.supported = true;
    }
    for (pass = 0; pass < 16; pass += 1) {
      collide();
      for (i = 0; i < gems.length; i += 1) {
        var item = gems[i];
        if (item.y > H - item.r) item.y = H - item.r;
        if (item.x < item.r) item.x = item.r;
        if (item.x > W - item.r) item.x = W - item.r;
      }
    }
    for (i = 0; i < gems.length; i += 1) {
      gems[i].sleep = true;
      gems[i].vx = 0;
      gems[i].vy = 0;
    }
    draw();
  }

  function onPitMove(event) {
    if (reduced || !spawned) return;
    var bounds = pit.getBoundingClientRect();
    var x = event.clientX - bounds.left;
    var y = event.clientY - bounds.top;
    if (x < 0 || y < 0 || x > W || y > H) {
      ptr = null;
      return;
    }
    ptr = { x: x, y: y };
    if (onScreen) startLoop();
  }

  function onPitLeave() {
    ptr = null;
  }

  host.addEventListener("pointermove", onPitMove, { passive: true });
  host.addEventListener("pointerleave", onPitLeave);

  var pitRO = null;
  if ("ResizeObserver" in window) {
    pitRO = new ResizeObserver(function () {
      var prevW = W;
      fitCanvas();
      if (!W || !H) return;
      if (!spawned) {
        if (images.length) spawnGems();
        return;
      }
      if (prevW && Math.abs(W - prevW) > 1) {
        var scale = W / prevW;
        var i;
        for (i = 0; i < gems.length; i += 1) {
          var gem = gems[i];
          gem.x *= scale;
          gem.sleep = false;
          gem.still = 0;
          if (gem.x < gem.r) gem.x = gem.r;
          if (gem.x > W - gem.r) gem.x = W - gem.r;
          if (gem.y > H - gem.r) gem.y = H - gem.r;
        }
        if (!reduced && onScreen) startLoop();
      }
      if (reduced) draw();
      else if (!running) draw();
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
      var anyLive = gems.some(function (gem) {
        return gem.live;
      });
      if (!anyLive) {
        releaseFrom(0);
        return;
      }
      var asleep = gems.every(function (gem) {
        return !gem.live || gem.sleep;
      });
      if (!asleep) {
        if (!fallStarted) fallStarted = performance.now();
        startLoop();
      } else draw();
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
    host.removeEventListener("pointerleave", onPitLeave);
    stopLoop();
    if (pitIO) pitIO.disconnect();
    if (pitRO) pitRO.disconnect();
  }

  window.addEventListener("pagehide", teardownPit);
})();
