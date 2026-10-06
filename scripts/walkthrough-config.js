// Project configs. Coordinates: desktop = % of screen area (0–100); phone = px in a 390×844 screen.
// `url` values are DESIGN PLACEHOLDERS — replace with the real project URL or an approved production label (empty string shows an empty pill).
// `timeline(h, L)` sets per-layer opacity/transform for loop time h.t (seconds). Helpers: see project-walkthrough.js.

export const WALKTHROUGHS = {
  terraform: {
    project: 'Terraform',
    frame: 'browser',
    url: 'Terraform',
    screenAspect: '2043 / 1184',
    animated: false,
    poster: 'terraform/organizations.png',
    alt: 'Terraform Organizations screen',
    layers: [{ key: 's0', src: 'terraform/organizations.png', fit: 'fill' }],
    duration: 1, idleSpeed: 0, hoverSpeed: 0,
  },

  anda: {
    project: 'Anda',
    frame: 'browser',
    url: 'Anda',
    screenAspect: '1728 / 1117',
    animated: true,
    poster: 'anda/admin-4.png',
    duration: 8.0, startOffset: 1.5, idleSpeed: 0.7, hoverSpeed: 1,
    layers: [
      { key: 's0', src: 'anda/admin-4.png', fit: 'top' },
      { key: 's1', src: 'anda/driver.png', fit: 'top' },
      { key: 's2', src: 'anda/driver-vehicle.png', fit: 'top' },
      { key: 's3', src: 'anda/driver-trips.png', fit: 'top' },
      { key: 's4', src: 'anda/driver-revenue.png', fit: 'top' },
    ],
    timeline({ t, cut, set }, L) {
      const inD = t >= 1.05 && t < 7.0;
      set(L.s1, inD ? cut(1.05) : 0);
      set(L.s2, inD ? cut(2.5) : 0);
      set(L.s3, inD ? cut(3.5) : 0);
      set(L.s4, inD ? cut(4.5) : 0);
    },
    cursor: {
      path: [[0, [55, 60]], [0.3, [55, 60]], [0.85, [23.2, 35.6]], [1.2, [23.2, 35.6]], [1.6, [40, 45]], [1.9, [40, 45]], [2.3, [15.2, 50]], [2.6, [15.2, 50]], [3.3, [24.6, 50]], [3.6, [24.6, 50]], [4.3, [34.3, 50]], [4.6, [34.3, 50]], [5.3, [65, 72]], [6.2, [65, 72]], [6.8, [4.3, 16.6]], [7.1, [4.3, 16.6]], [8.0, [55, 60]]],
      clicks: [0.95, 2.4, 3.4, 4.4, 6.9],
    },
    tapSpace: [100, 100],
    taps: [
      { t: 0.95, x: 23.2, y: 35.6, box: [18.2, 34.3, 96.4, 37.6], hover: true },
      { t: 2.4, x: 15.2, y: 50 },
      { t: 3.4, x: 24.6, y: 50 },
      { t: 4.4, x: 34.3, y: 50 },
      { t: 6.9, x: 4.3, y: 16.6 },
    ],
  },

  ose: {
    project: 'Operation Safe Escape',
    frame: 'browser',
    url: 'FLOW',
    screenAspect: '1868 / 982',
    animated: true,
    poster: 'ose/cases.png',
    duration: 8.0, startOffset: 5.4, idleSpeed: 0.7, hoverSpeed: 1,
    layers: [
      { key: 's0', src: 'ose/cases.png', fit: 'fill' },
      { key: 's1', src: 'ose/case-view.png', fit: 'fill' },
      { key: 's2', src: 'ose/case-edit.png', fit: 'fill' },
      { key: 's3', src: 'ose/messages.png', fit: 'fill' },
      { key: 's4', src: 'ose/chat.png', fit: 'fill' },
    ],
    timeline({ t, cl, cut, set }, L) {
      const modal = cl((t - 0.95) / 0.18) * (1 - cl((t - 3.35) / 0.15));
      set(L.s1, t < 1.95 ? modal : 0);
      set(L.s2, t >= 1.95 ? cut(1.95) * modal : 0);
      const inMsg = t >= 4.35 && t < 7.25;
      set(L.s3, inMsg ? cut(4.35) : 0);
      set(L.s4, inMsg ? cut(5.15) : 0);
    },
    cursor: {
      path: [[0, [55, 55]], [0.3, [55, 55]], [0.8, [20.7, 25.2]], [1.25, [20.7, 25.2]], [1.8, [60.2, 26.5]], [2.1, [60.2, 26.5]], [2.6, [50, 50]], [2.75, [50, 50]], [3.2, [85.6, 27.7]], [3.6, [85.6, 27.7]], [4.15, [5.7, 26.7]], [4.5, [5.7, 26.7]], [5.0, [22.5, 20.4]], [5.3, [22.5, 20.4]], [5.9, [55, 60]], [6.6, [55, 60]], [7.1, [4.9, 16.1]], [7.35, [4.9, 16.1]], [8.0, [55, 55]]],
      clicks: [0.9, 1.9, 3.3, 4.3, 5.1, 7.2],
    },
    tapSpace: [100, 100],
    taps: [
      { t: 0.9, x: 20.7, y: 25.2, box: [4.5, 23.2, 97.8, 27.3], hover: true },
      { t: 1.9, x: 60.2, y: 26.5 },
      { t: 3.3, x: 85.6, y: 27.7 },
      { t: 4.3, x: 5.7, y: 26.7, box: [1.7, 24.4, 12.3, 28.9], hover: true },
      { t: 5.1, x: 22.5, y: 20.4, box: [16.2, 18.3, 37.7, 24.8], hover: true },
      { t: 7.2, x: 4.9, y: 16.1, box: [1.7, 13.8, 12.3, 18.3], hover: true },
    ],
  },

  nabu: {
    project: 'NABU',
    frame: 'browser',
    url: 'NABU',
    screenAspect: '1512 / 982',
    animated: true,
    poster: 'nabu/s86.png',
    duration: 7.2, startOffset: 3.0, idleSpeed: 0.7, hoverSpeed: 1,
    pressColor: 'rgba(20,24,36,.16)',
    layers: [
      { key: 's0', src: 'nabu/s86.png', fit: 'fill' },
      { key: 's1', src: 'nabu/s92.png', fit: 'fill' },
      { key: 's2', src: 'nabu/s95.png', fit: 'fill' },
      { key: 's3', src: 'nabu/s88.png', fit: 'height' },
    ],
    timeline({ t, cut, set }, L) {
      const back = t >= 6.6;
      set(L.s1, back ? 0 : cut(1.15));
      set(L.s2, back ? 0 : cut(3.05));
      set(L.s3, back ? 1 - cut(6.6) : cut(4.95));
    },
    cursor: {
      path: [[0, [36, 48]], [0.4, [36, 48]], [0.95, [75, 91.5]], [1.4, [75, 91.5]], [2.0, [46, 58]], [2.3, [46, 58]], [2.85, [75, 91.5]], [3.3, [75, 91.5]], [3.9, [56, 66]], [4.2, [56, 66]], [4.75, [75, 91.5]], [5.2, [75, 91.5]], [5.6, [44, 40]], [5.9, [44, 40]], [6.45, [10.6, 17.1]], [6.75, [10.6, 17.1]], [7.2, [36, 48]]],
      clicks: [1.1, 3.0, 4.9, 6.55],
    },
    tapSpace: [100, 100],
    taps: [
      { t: 1.1, x: 75, y: 91.5, box: [59.2, 88.7, 90.2, 94.7], hover: true },
      { t: 3.0, x: 75, y: 91.5, box: [59.2, 88.7, 90.2, 94.7], hover: true },
      { t: 4.9, x: 75, y: 91.5, box: [58.5, 88.7, 90.6, 94.7], hover: true },
      { t: 6.55, x: 10.6, y: 17.1 },
    ],
  },

  'brilliant-cities': {
    project: 'Brilliant Cities',
    frame: 'phone',
    animated: true,
    poster: 'brilliant-cities/goal-60.png',
    duration: 8.0, startOffset: 0, idleSpeed: 0.7, hoverSpeed: 1,
    layers: [
      { key: 's0', src: 'brilliant-cities/goal-60.png', fit: 'top' },
      { key: 'dim', kind: 'dim' },
      { key: 's1', src: 'brilliant-cities/goal-52.png?v=photo1', fit: 'top' },
      { key: 's2', src: 'brilliant-cities/goal-53.png?v=photo1', fit: 'top' },
      { key: 's3', src: 'brilliant-cities/goal-65.png', fit: 'top' },
    ],
    timeline({ t, cl, out3, dec, cut, set }, L) {
      const push = out3((t - 0.85) / 0.45), pop = out3((t - 6.65) / 0.45);
      const scroll = t < 3.1 ? 300 * dec(1.6, 2.3) : t < 4.6 ? 300 + 650 * dec(3.1, 3.9) : 0;  // px in 390-wide space
      const ty = (px) => `translateY(${(-px / 1794 * 100).toFixed(3)}%)`;                       // goal-52/53 are 390×1794
      const s0x = t < 3 ? -30 * push : -30 * (1 - pop);
      const dim = t < 3 ? push : 1 - pop;
      set(L.s0, 1, `translateX(${s0x.toFixed(3)}%)`);
      set(L.dim, 0.12 * dim);
      set(L.s1, t >= 0.85 && t < 2.9 ? 1 : 0, `translateX(${(100 * (1 - push)).toFixed(3)}%) ${ty(scroll)}`);
      set(L.s2, t >= 2.75 ? cut(2.75) : 0, `translateX(${(100 * pop).toFixed(3)}%) ${ty(scroll)}`);
      set(L.s3, cl((t - 4.35) / 0.22) * (1 - cl((t - 5.75) / 0.2)));
    },
    cursor: null,
    tapSpace: [390, 844],
    taps: [
      { t: 0.7, x: 105, y: 420, box: [30, 346, 188, 495] },
      { t: 2.6, x: 195, y: 340, box: [28, 298, 362, 383] },
      { t: 4.2, x: 195, y: 764, box: [28, 740, 362, 788] },
      { t: 5.6, x: 335, y: 246 },
      { t: 6.5, x: 40, y: 67 },
    ],
  },
};
