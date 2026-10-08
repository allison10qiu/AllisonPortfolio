// Reusable project-card walkthrough engine. Framework-neutral ES module.
// Usage: import { initWalkthroughs } from './project-walkthrough.js';
//        import { WALKTHROUGHS } from './walkthrough-config.js';
//        initWalkthroughs(WALKTHROUGHS, { base: '/assets/home/walkthroughs/' });
// Each card: <a class="pw-card" data-walkthrough="anda">…<div class="pw-media">…</div>…</a>

const cl = (x) => Math.max(0, Math.min(1, x));
const ez = (x) => 0.5 - 0.5 * Math.cos(Math.PI * cl(x));      // sine ease-in-out
const out3 = (x) => 1 - Math.pow(1 - cl(x), 3);                // ease-out cubic

const CURSOR_SVG = '<svg width="12" height="16" viewBox="0 0 12 16"><path d="M1 1v12.5l3.2-3 2.1 4.6 2-.9-2.1-4.5H10.5z" fill="#1B2540" stroke="#fff" stroke-width="1.1" stroke-linejoin="round"/></svg>';

function setLayer(el, o, tf) {
  if (!el) return;
  const v = o.toFixed(3);
  if (el._o !== v) { el._o = v; el.style.opacity = v; }
  if (tf != null && el._t !== tf) { el._t = tf; el.style.transform = tf; }
}

function helpers(t) {
  return {
    t, cl, ez, out3,
    seg: (a, b) => ez((t - a) / (b - a)),
    dec: (a, b) => out3((t - a) / (b - a)),       // momentum-style deceleration
    cut: (a) => cl((t - a) / 0.09),               // 90ms linear "render swap"
    pulse: (a, d) => { const p = (t - a) / d; return p < 0 || p > 1 ? 0 : Math.sin(Math.PI * p); },
    set: setLayer,
  };
}

function el(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html) n.innerHTML = html; return n; }

function buildDevice(cfg, base) {
  const stage = el('div', 'pw-stage');
  let screen;
  if (cfg.frame === 'phone') {
    const phone = el('div', 'pw-phone');
    screen = el('div', 'pw-screen');
    phone.append(screen, el('div', 'pw-home-indicator'));
    stage.append(phone);
  } else {
    const desk = el('div', 'pw-desk');
    const chrome = el('div', 'pw-chrome');
    const urlWrap = el('div', 'pw-url-wrap');
    const url = el('div', 'pw-url'); url.textContent = cfg.url;
    urlWrap.append(url);
    chrome.append(el('div', 'pw-dot'), el('div', 'pw-dot'), el('div', 'pw-dot'), urlWrap, el('div', 'pw-chrome-spacer'));
    screen = el('div', 'pw-screen');
    screen.style.aspectRatio = cfg.screenAspect;
    desk.append(chrome, screen);
    stage.append(desk);
  }
  const L = {};
  cfg.layers.forEach((ly, i) => {
    let node;
    const poster = i === 0;
    if (ly.kind === 'dim') node = el('div', 'pw-dim');
    else if (ly.fit === 'height') {
      node = el('div', 'pw-layer pw-layer--height');
      const img = new Image(); img.alt = ''; img.decoding = 'async';
      if (poster) img.src = base + ly.src; else img.dataset.src = base + ly.src;
      node.append(img);
    } else {
      node = new Image(); node.decoding = 'async';
      node.alt = poster ? (cfg.alt || '') : '';
      node.className = 'pw-layer pw-layer--' + (ly.fit || 'fill');
      if (poster) node.src = base + ly.src; else node.dataset.src = base + ly.src;
    }
    if (i > 0 && ly.kind !== 'dim') node.style.opacity = '0';
    screen.append(node);
    L[ly.key] = node;
  });
  const fx = {};
  if (cfg.taps) {
    fx.press = el('div', 'pw-press');
    if (cfg.pressColor) fx.press.style.background = cfg.pressColor;
    fx.tap = el('div', 'pw-tap');
    screen.append(fx.press, fx.tap);
  }
  if (cfg.cursor) { fx.cur = el('div', 'pw-cursor', CURSOR_SVG); screen.append(fx.cur); }
  return { stage, L, fx };
}

function paint(w, T) {
  const { cfg, L, fx } = w;
  const D = cfg.duration;
  const t = ((T % D) + D) % D;
  const h = helpers(t);
  if (cfg.timeline) cfg.timeline(h, L);

  if (cfg.cursor && fx.cur) {
    const K = cfg.cursor.path;
    let pos = K[0][1];
    for (let i = 0; i < K.length - 1; i++) if (t >= K[i][0] && t <= K[i + 1][0]) {
      const f = ez((t - K[i][0]) / (K[i + 1][0] - K[i][0]));
      pos = [K[i][1][0] + (K[i + 1][1][0] - K[i][1][0]) * f, K[i][1][1] + (K[i + 1][1][1] - K[i][1][1]) * f];
      break;
    }
    fx.cur.style.left = pos[0].toFixed(3) + '%';
    fx.cur.style.top = pos[1].toFixed(3) + '%';
    const squash = cfg.cursor.clicks.reduce((m, c) => m + h.pulse(c - 0.05, 0.25), 0);
    fx.cur.style.transform = `scale(${(1 - 0.12 * squash).toFixed(3)})`;
  }

  if (cfg.taps) {
    const [W, H] = cfg.tapSpace;
    const tp = cfg.taps.find((k) => t >= k.t - 0.4 && t <= k.t + 0.6);
    let o = 0;
    if (tp && tp.box) {
      const [x0, y0, x1, y1] = tp.box;
      Object.assign(fx.press.style, { left: x0 / W * 100 + '%', top: y0 / H * 100 + '%', width: (x1 - x0) / W * 100 + '%', height: (y1 - y0) / H * 100 + '%' });
      o = t < tp.t
        ? (tp.hover ? 0.4 * cl((t - tp.t + 0.4) / 0.15) : cl((t - tp.t + 0.12) / 0.12))
        : t < tp.t + 0.14 ? 1 : 1 - cl((t - tp.t - 0.14) / 0.2);
    }
    fx.press.style.opacity = o.toFixed(3);
    if (!tp || t < tp.t) fx.tap.style.opacity = '0';
    else {
      const p = cl((t - tp.t) / 0.5);
      fx.tap.style.left = tp.x / W * 100 + '%';
      fx.tap.style.top = tp.y / H * 100 + '%';
      fx.tap.style.opacity = (Math.min(1, p * 5) * (1 - p) * 0.9).toFixed(3);
      fx.tap.style.transform = `scale(${(0.6 + 0.6 * out3(p)).toFixed(3)})`;
    }
  }
}

export function initWalkthroughs(configs, { base = '', root = document } = {}) {
  const canHoverMQ = matchMedia('(hover: hover) and (pointer: fine)');
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const capture = document.documentElement.classList.contains('figma-capture');
  let canHover = canHoverMQ.matches;
  let still = capture || reduceMQ.matches || !canHover;

  const cards = [];
  root.querySelectorAll('[data-walkthrough]').forEach((card) => {
    const cfg = configs[card.dataset.walkthrough];
    const media = card.querySelector('.project__stage');
    if (!cfg || !media) return;
    const { stage, L, fx } = buildDevice(cfg, base);
    media.append(stage);
    const w = { card, stage, cfg, L, fx, t: cfg.startOffset || 0, rate: cfg.idleSpeed, hover: false, visible: false, loaded: false };
    card.addEventListener('mouseenter', () => { if (!canHover) return; w.hover = true; });
    card.addEventListener('mouseleave', () => { w.hover = false; });
    cards.push(w);
    paint(w, still ? 0 : w.t);
  });

  function loadLayers(w) {
    if (w.loaded) return;
    w.loaded = true;
    w.stage.querySelectorAll('[data-src]').forEach((img) => {
      img.src = img.getAttribute('data-src');
      img.removeAttribute('data-src');
    });
  }

  const io = new IntersectionObserver((ents) => ents.forEach((en) => {
    const w = cards.find((c) => c.card === en.target);
    if (!w) return;
    w.visible = en.isIntersecting;
    if (w.visible && !still) loadLayers(w);
  }), { rootMargin: '240px 0px', threshold: 0 });
  cards.forEach((w) => io.observe(w.card));

  const onChange = () => {
    if (capture) return;
    canHover = canHoverMQ.matches;
    still = reduceMQ.matches || !canHover;
    if (still) cards.forEach((w) => paint(w, 0));
    else cards.forEach((w) => { if (w.visible) loadLayers(w); });
  };
  canHoverMQ.addEventListener?.('change', onChange);
  reduceMQ.addEventListener?.('change', onChange);

  let last = performance.now(), raf;
  const tick = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!still) for (const w of cards) {
      if (!w.cfg.animated) continue;
      const target = w.hover ? w.cfg.hoverSpeed : w.cfg.idleSpeed;
      w.rate += (target - w.rate) * Math.min(1, dt / 0.4);   // ~400ms ease between speeds
      w.t += dt * w.rate;
      if (w.visible) paint(w, w.t);
    }
    raf = requestAnimationFrame(tick);
  };
  if (!capture) raf = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(raf); io.disconnect(); };
}
