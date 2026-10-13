// Cartoon art for Lion City Planner: ink-outlined isometric shapes and the
// building designs. Everything draws in "iso units" relative to grid (0, 0);
// render.js caches each design as a sprite.

export const HW = 32;
export const HH = 16;
export const PX = (gx, gy) => (gx - gy) * HW;
export const PY = (gx, gy) => (gx + gy) * HH;
export const INK = "#2f2b4a";

// ---------- colour ----------
const shadeCache = new Map();
export function shade(hex, f) {
  const key = hex + f;
  let c = shadeCache.get(key);
  if (c) return c;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (f < 0) {
    r *= 1 + f;
    g *= 1 + f;
    b *= 1 + f;
  } else {
    r += (255 - r) * f;
    g += (255 - g) * f;
    b += (255 - b) * f;
  }
  c = `rgb(${r | 0},${g | 0},${b | 0})`;
  shadeCache.set(key, c);
  return c;
}

export const HDB_PAINT = ["#ff8a80", "#6fb8ff", "#5fd69d", "#ffc94d", "#b79cff", "#ff8fc6", "#3fcfc6"];
const SHOP_PAINT = ["#ffd6e0", "#c7f0db", "#cfe3ff", "#fff1b8", "#e6d7ff", "#ffdcc2"];

// ---------- primitives ----------
const P = (gx, gy, z = 0) => [PX(gx, gy), PY(gx, gy) - z];

export function poly(ctx, pts, fill, stroke = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) ctx.stroke();
}

export function inkStyle(ctx, w = 1.3) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
}

// Soft shadow cast toward +x (the sun is up and to the left of the screen).
export function castShadow(ctx, x0, y0, x1, y1, h) {
  const L = Math.min(1.3, h / 55);
  ctx.fillStyle = "rgba(30,40,100,0.16)";
  poly(ctx, [P(x0, y0), P(x1 + L, y0), P(x1 + L, y1), P(x0, y1)], null, false);
  ctx.fill();
}

export function box(ctx, x0, y0, x1, y1, h, color, z = 0, o = {}) {
  const D0 = P(x0, y1, z), C0 = P(x1, y1, z), B0 = P(x1, y0, z);
  const A = P(x0, y0, z + h), B = P(x1, y0, z + h), C = P(x1, y1, z + h), D = P(x0, y1, z + h);
  poly(ctx, [D0, C0, C, D], o.left || shade(color, -0.1));
  poly(ctx, [C0, B0, B, C], o.right || shade(color, -0.26));
  poly(ctx, [A, B, C, D], o.top || shade(color, 0.14));
  return { x0, y0, x1, y1, z, h };
}

// Window grid on both visible faces of a box. Batched into one fill per face.
export function windows(ctx, b, { rows, cols, rcols = cols, color = "#4b5a86", zFrom = 0, zTo = b.h, wf = 0.55, hf = 0.5, right = color }) {
  const z0 = b.z + zFrom;
  const span = zTo - zFrom;
  const face = (n, fill, at) => {
    ctx.beginPath();
    for (let c = 0; c < n; c++) {
      const u0 = (c + (1 - wf) / 2) / n;
      const u1 = u0 + wf / n;
      for (let r = 0; r < rows; r++) {
        const za = z0 + (span * (r + (1 - hf) / 2)) / rows;
        const zb = za + (span * hf) / rows;
        const a = at(u0, za), bb = at(u1, za), cc = at(u1, zb), d = at(u0, zb);
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(bb[0], bb[1]);
        ctx.lineTo(cc[0], cc[1]);
        ctx.lineTo(d[0], d[1]);
        ctx.closePath();
      }
    }
    ctx.fillStyle = fill;
    ctx.fill();
  };
  face(cols, color, (u, z) => P(b.x0 + (b.x1 - b.x0) * u, b.y1, z));
  face(rcols, right, (u, z) => P(b.x1, b.y1 - (b.y1 - b.y0) * u, z));
}

// Pitched roof. axis "x": ridge runs along x.
export function gable(ctx, x0, y0, x1, y1, z, h, color, axis = "x", wall = null) {
  if (axis === "x") {
    const my = (y0 + y1) / 2;
    poly(ctx, [P(x0, y0, z), P(x1, y0, z), P(x1, my, z + h), P(x0, my, z + h)], shade(color, 0.12));
    poly(ctx, [P(x0, y1, z), P(x1, y1, z), P(x1, my, z + h), P(x0, my, z + h)], color);
    poly(ctx, [P(x1, y0, z), P(x1, y1, z), P(x1, my, z + h)], wall || shade(color, -0.3));
  } else {
    const mx = (x0 + x1) / 2;
    poly(ctx, [P(x0, y0, z), P(x0, y1, z), P(mx, y1, z + h), P(mx, y0, z + h)], shade(color, 0.12));
    poly(ctx, [P(x1, y0, z), P(x1, y1, z), P(mx, y1, z + h), P(mx, y0, z + h)], shade(color, -0.22));
    poly(ctx, [P(x0, y1, z), P(x1, y1, z), P(mx, y1, z + h)], wall || color);
  }
}

export function hip(ctx, x0, y0, x1, y1, z, h, color) {
  const ap = P((x0 + x1) / 2, (y0 + y1) / 2, z + h);
  poly(ctx, [P(x0, y0, z), P(x0, y1, z), ap], shade(color, 0.15));
  poly(ctx, [P(x0, y0, z), P(x1, y0, z), ap], shade(color, 0.1));
  poly(ctx, [P(x0, y1, z), P(x1, y1, z), ap], color);
  poly(ctx, [P(x1, y0, z), P(x1, y1, z), ap], shade(color, -0.22));
}

export function cylinder(ctx, gx, gy, r, h, color, z = 0) {
  const [x, y0] = P(gx, gy, z);
  const y1 = y0 - h;
  ctx.beginPath();
  ctx.ellipse(x, y0, r, r / 2, 0, 0, Math.PI);
  ctx.lineTo(x - r, y1);
  ctx.ellipse(x, y1, r, r / 2, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fillStyle = shade(color, -0.15);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y1, r, r / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(color, 0.18);
  ctx.fill();
  ctx.stroke();
}

export function flat(ctx, x0, y0, x1, y1, color, z = 0, stroke = true) {
  poly(ctx, [P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], color, stroke);
}

const TREE_PAL = [
  ["#3fb85f", "#7be08a"],
  ["#2fa05a", "#63cf7d"],
  ["#58c24a", "#97e37a"],
  ["#2b9a6e", "#5fd0a0"],
];

export function tree(ctx, gx, gy, s = 1, pal = TREE_PAL[0]) {
  const [x, y] = P(gx, gy);
  ctx.fillStyle = "rgba(30,60,40,0.22)";
  ctx.beginPath();
  ctx.ellipse(x + 2 * s, y, 7 * s, 3.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a5a33";
  ctx.beginPath();
  ctx.rect(x - 1.4 * s, y - 7 * s, 2.8 * s, 7 * s);
  ctx.fill();
  ctx.stroke();
  for (const [dx, dy, r] of [[-4.2, -8, 4.6], [4.2, -8.5, 4.6], [0, -12.5, 6.4]]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fillStyle = pal[0];
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x - 2 * s, y - 14.5 * s, 2.6 * s, 0, Math.PI * 2);
  ctx.fillStyle = pal[1];
  ctx.fill();
}

export function palm(ctx, gx, gy, s = 1) {
  const [x, y] = P(gx, gy);
  ctx.fillStyle = "rgba(30,60,40,0.2)";
  ctx.beginPath();
  ctx.ellipse(x + 3 * s, y, 6 * s, 2.6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 4 * s, y - 10 * s, x + 2 * s, y - 20 * s);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.6 * s;
  ctx.stroke();
  ctx.strokeStyle = "#a8743f";
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  inkStyle(ctx, 1.1);
  const tx = x + 2 * s;
  const ty = y - 20 * s;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    ctx.beginPath();
    ctx.ellipse(tx + Math.cos(a) * 5 * s, ty + Math.sin(a) * 2.5 * s, 6 * s, 2 * s, a, 0, Math.PI * 2);
    ctx.fillStyle = k % 2 ? "#3bb56b" : "#52c97a";
    ctx.fill();
    ctx.stroke();
  }
}

// ---------- zone buildings ----------
// v: 0..13 variant (paint index + orientation)
export const ZONE_MAX_H = { hdb: [0, 45, 80, 140], pte: [0, 35, 70, 150], com: [0, 45, 80, 220], ind: [0, 50, 60, 55] };

export function drawZone(ctx, z, lv, v) {
  const flip = v % 2 === 1;
  const paint = HDB_PAINT[Math.floor(v / 2) % HDB_PAINT.length];
  // helper to swap axes for slab blocks
  const slab = (a0, b0, a1, b1, h, color, zz = 0, o) => (flip ? box(ctx, b0, a0, b1, a1, h, color, zz, o) : box(ctx, a0, b0, a1, b1, h, color, zz, o));
  if (z === "hdb") {
    if (lv === 1) {
      castShadow(ctx, 0.1, 0.1, 0.9, 0.9, 22);
      const b = slab(0.1, 0.28, 0.9, 0.72, 22, "#fbf3e2");
      windows(ctx, b, { rows: 4, cols: 6, rcols: 2, color: "#55638f" });
      slab(0.1, 0.28, 0.9, 0.72, 3, paint, 22);
      slab(0.6, 0.38, 0.75, 0.6, 5, "#e8e0cf", 25);
    } else if (lv === 2) {
      castShadow(ctx, 0.06, 0.06, 0.94, 0.94, 50);
      slab(0.06, 0.24, 0.94, 0.76, 7, "#c9bfae");
      const b = slab(0.06, 0.24, 0.94, 0.76, 42, "#fdf6e8", 7);
      windows(ctx, b, { rows: 11, cols: 8, rcols: 2, color: "#55638f" });
      slab(0.8, 0.24, 0.94, 0.76, 42, paint, 7);
      slab(0.06, 0.24, 0.94, 0.76, 4, paint, 49);
      slab(0.2, 0.36, 0.4, 0.62, 6, "#e8e0cf", 53);
    } else {
      castShadow(ctx, 0.1, 0.1, 0.9, 0.9, 110);
      const a = box(ctx, 0.1, 0.2, 0.45, 0.8, 104, "#fffaf0");
      windows(ctx, a, { rows: 24, cols: 3, rcols: 4, color: "#55638f" });
      box(ctx, 0.1, 0.2, 0.45, 0.8, 6, paint, 104);
      box(ctx, 0.45, 0.38, 0.55, 0.62, 5, "#e2d8c4", 50);
      box(ctx, 0.45, 0.38, 0.55, 0.62, 5, "#e2d8c4", 98);
      const b = box(ctx, 0.55, 0.2, 0.9, 0.8, 104, "#fffaf0");
      windows(ctx, b, { rows: 24, cols: 3, rcols: 4, color: "#55638f" });
      box(ctx, 0.55, 0.2, 0.9, 0.8, 6, paint, 104);
    }
  } else if (z === "pte") {
    if (lv === 1) {
      flat(ctx, 0.04, 0.04, 0.96, 0.96, "#a7e07f", 0, false);
      const roof = v % 3 === 0 ? "#e2553f" : v % 3 === 1 ? "#d9643b" : "#c94d5b";
      for (const [x0, y0] of [[0.08, 0.1], [0.08, 0.55], [0.54, 0.1], [0.54, 0.55]]) {
        castShadow(ctx, x0, y0, x0 + 0.36, y0 + 0.34, 14);
        const b = box(ctx, x0, y0, x0 + 0.36, y0 + 0.34, 9, "#fff3d6");
        windows(ctx, b, { rows: 1, cols: 2, rcols: 1, color: "#6b7bb0", wf: 0.4, hf: 0.5 });
        gable(ctx, x0 - 0.02, y0 - 0.02, x0 + 0.38, y0 + 0.36, 9, 8, roof, flip ? "y" : "x", "#fff3d6");
      }
    } else if (lv === 2) {
      flat(ctx, 0.04, 0.04, 0.96, 0.96, "#a7e07f", 0, false);
      flat(ctx, 0.55, 0.55, 0.94, 0.94, "#ffffff");
      flat(ctx, 0.6, 0.6, 0.9, 0.9, "#6fdcf7", 0, false);
      castShadow(ctx, 0.12, 0.1, 0.55, 0.62, 50);
      const b = box(ctx, 0.12, 0.1, 0.55, 0.62, 48, "#bff3ea", 0, { left: "#9be8dc", right: "#5fc7ba" });
      windows(ctx, b, { rows: 12, cols: 1, color: "rgba(255,255,255,0.75)", wf: 0.96, hf: 0.25 });
      box(ctx, 0.1, 0.08, 0.57, 0.64, 4, "#f6fffd", 48);
    } else {
      flat(ctx, 0.04, 0.04, 0.96, 0.96, "#a7e07f", 0, false);
      castShadow(ctx, 0.2, 0.2, 0.8, 0.8, 120);
      const b = box(ctx, 0.2, 0.2, 0.8, 0.8, 118, "#9fe9f0", 0, { left: "#7fd8e4", right: "#3aa6bd" });
      windows(ctx, b, { rows: 28, cols: 1, color: "rgba(255,255,255,0.6)", wf: 0.96, hf: 0.22 });
      const [cx, cy] = P(0.5, 0.5, 118);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 15, 10, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = "#d8fbff";
      ctx.fill();
      ctx.stroke();
      tree(ctx, 0.88, 0.3, 0.55);
    }
  } else if (z === "com") {
    if (lv === 1) {
      // Peranakan shophouse row
      for (let k = 0; k < 3; k++) {
        const x0 = 0.08 + k * 0.28;
        const c = SHOP_PAINT[(v + k) % SHOP_PAINT.length];
        castShadow(ctx, x0, 0.18, x0 + 0.28, 0.86, 20);
        const b = box(ctx, x0, 0.18, x0 + 0.28, 0.86, 16, c);
        windows(ctx, b, { rows: 2, cols: 1, rcols: 3, color: "#7a4b2a", wf: 0.5, hf: 0.55 });
        gable(ctx, x0 - 0.01, 0.16, x0 + 0.29, 0.88, 16, 7, "#e0703a", "y", c);
      }
    } else if (lv === 2) {
      castShadow(ctx, 0.1, 0.1, 0.9, 0.9, 50);
      const b = box(ctx, 0.1, 0.1, 0.9, 0.9, 48, "#dbe4f3", 0, { left: "#c3d0e8", right: "#93a6cc" });
      windows(ctx, b, { rows: 9, cols: 1, color: "#4767b8", right: "#344f96", wf: 0.94, hf: 0.42 });
      box(ctx, 0.3, 0.3, 0.6, 0.6, 7, "#b8c4da", 48);
    } else {
      const tall = 170 + (v % 3) * 15;
      castShadow(ctx, 0.14, 0.14, 0.86, 0.86, tall);
      const b = box(ctx, 0.14, 0.14, 0.86, 0.86, tall, "#8ec8ff", 0, { left: "#76b6fb", right: "#3d7ee0", top: "#c4e3ff" });
      windows(ctx, b, { rows: 1, cols: 5, rcols: 5, color: "rgba(255,255,255,0.32)", right: "rgba(255,255,255,0.22)", wf: 0.25, hf: 0.97 });
      box(ctx, 0.28, 0.28, 0.72, 0.72, 18, "#b5dcff", tall);
      const [sx, sy] = P(0.5, 0.5, tall + 18);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy - 22);
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(sx, sy - 23, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = "#ff5a5a";
      ctx.fill();
      ctx.stroke();
    }
  } else if (z === "ind") {
    if (lv === 1) {
      castShadow(ctx, 0.08, 0.15, 0.92, 0.85, 14);
      const b = box(ctx, 0.08, 0.15, 0.92, 0.85, 11, "#efe5d1");
      windows(ctx, b, { rows: 1, cols: 3, rcols: 0, color: "#8b8f9e", wf: 0.5, hf: 0.7, zTo: 9 });
      for (let k = 0; k < 3; k++) gable(ctx, 0.08 + k * 0.28, 0.15, 0.36 + k * 0.28, 0.85, 11, 7, "#9fb1c7", "y", "#efe5d1");
      box(ctx, 0.74, 0.2, 0.86, 0.32, 34, "#d8d1c4");
      box(ctx, 0.74, 0.2, 0.86, 0.32, 5, "#ff6b6b", 24);
    } else if (lv === 2) {
      castShadow(ctx, 0.1, 0.1, 0.9, 0.9, 34);
      const b = box(ctx, 0.1, 0.1, 0.9, 0.9, 32, "#fff1cf");
      windows(ctx, b, { rows: 4, cols: 1, color: "#3f7fe0", right: "#2f63b8", wf: 0.95, hf: 0.38 });
      box(ctx, 0.62, 0.62, 0.86, 0.86, 6, "#ffb347", 32);
    } else {
      castShadow(ctx, 0.08, 0.12, 0.92, 0.88, 22);
      const b = box(ctx, 0.08, 0.3, 0.92, 0.88, 20, "#f7fbff");
      windows(ctx, b, { rows: 1, cols: 1, color: "#37b4e6", right: "#2b8fbb", wf: 0.95, hf: 0.3 });
      cylinder(ctx, 0.25, 0.18, 6, 16, "#d6e4f0");
      cylinder(ctx, 0.48, 0.18, 6, 16, "#d6e4f0");
      box(ctx, 0.6, 0.45, 0.8, 0.65, 6, "#a9bfd6", 20);
    }
  }
}

// ---------- special buildings ----------
export const BUILD_MAX_H = { ir: 140, hospital: 70, gardens: 90, power: 100, airport: 80, port: 80, mrt: 40, school: 50, desal: 50 };

export function drawBuilding(ctx, id, s) {
  const x1 = s;
  const y1 = s;
  switch (id) {
    case "park": {
      flat(ctx, 0.04, 0.04, 0.96, 0.96, "#7ed957");
      flat(ctx, 0.5, 0.15, 0.85, 0.5, "#69d2f5");
      ctx.strokeStyle = "#f5e6c4";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(...P(0.1, 0.75));
      ctx.quadraticCurveTo(...P(0.5, 0.55), ...P(0.9, 0.85));
      ctx.stroke();
      inkStyle(ctx);
      tree(ctx, 0.28, 0.3, 0.95, TREE_PAL[1]);
      tree(ctx, 0.72, 0.72, 0.8, TREE_PAL[2]);
      tree(ctx, 0.3, 0.82, 0.75);
      break;
    }
    case "solar":
      flat(ctx, 0.04, 0.04, 0.96, 0.96, "#d9e6c7", 0, false);
      for (let k = 0; k < 3; k++) {
        const gy = 0.12 + k * 0.28;
        box(ctx, 0.1, gy, 0.9, gy + 0.18, 3, "#2e4fb8", 0, { top: "#4f7bf0" });
      }
      break;
    case "power": {
      castShadow(ctx, 0.15, 0.55, 1.85, 1.85, 30);
      const b = box(ctx, 0.15, 0.6, 1.85, 1.85, 26, "#c9d3e3");
      windows(ctx, b, { rows: 2, cols: 6, rcols: 4, color: "#5f6f91" });
      gable(ctx, 0.15, 0.6, 1.85, 1.85, 26, 9, "#8fa3c4", "x", "#c9d3e3");
      for (const gx of [0.45, 1.2]) {
        cylinder(ctx, gx, 0.35, 6.5, 62, "#f4f6fa");
        const [x, y] = P(gx, 0.35);
        ctx.fillStyle = "#ff5a5a";
        ctx.fillRect(x - 6.5, y - 58, 13, 6);
        ctx.fillRect(x - 6.5, y - 40, 13, 5);
      }
      break;
    }
    case "waterworks":
    case "newater": {
      const c = id === "newater" ? "#4cc3ff" : "#a6e3ff";
      cylinder(ctx, 0.55, 0.5, 13, 14, c);
      cylinder(ctx, 1.45, 0.5, 13, 14, c);
      castShadow(ctx, 0.2, 1.1, 1.8, 1.85, 16);
      const b = box(ctx, 0.2, 1.1, 1.8, 1.85, 14, "#f2f7fb");
      windows(ctx, b, { rows: 1, cols: 5, rcols: 2, color: "#3d8fd1" });
      break;
    }
    case "desal":
      flat(ctx, 0.08, 0.08, 0.95, 1.9, "#ffffff");
      flat(ctx, 0.15, 0.15, 0.88, 0.95, "#38bdf8", 0, false);
      flat(ctx, 0.15, 1.05, 0.88, 1.85, "#0ea5e9", 0, false);
      castShadow(ctx, 1.05, 0.15, 1.85, 1.85, 20);
      windows(ctx, box(ctx, 1.05, 0.15, 1.85, 1.85, 18, "#f8fafc"), { rows: 2, cols: 2, rcols: 5, color: "#3d8fd1" });
      break;
    case "gardens": {
      flat(ctx, 0.05, 0.05, x1 - 0.05, y1 - 0.05, "#7ed957");
      flat(ctx, 1.2, 1.9, 2.8, 2.8, "#69d2f5", 0, true);
      for (const [gx, gy] of [[2.3, 0.7], [0.7, 2.3]]) {
        const [x, y] = P(gx, gy);
        ctx.beginPath();
        ctx.ellipse(x, y, 24, 13, 0, Math.PI, 0);
        ctx.closePath();
        ctx.fillStyle = "rgba(200,240,255,0.95)";
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 12, y - 11);
        ctx.lineTo(x - 12, y);
        ctx.moveTo(x + 12, y - 11);
        ctx.lineTo(x + 12, y);
        ctx.stroke();
      }
      for (const [gx, gy, ht] of [[1.0, 1.0, 44], [1.65, 1.25, 58], [1.3, 1.8, 50], [2.05, 2.0, 38], [1.95, 0.95, 34], [0.95, 1.6, 32]]) {
        const [x, y] = P(gx, gy);
        ctx.beginPath();
        ctx.moveTo(x - 3, y);
        ctx.lineTo(x - 1.5, y - ht);
        ctx.lineTo(x + 1.5, y - ht);
        ctx.lineTo(x + 3, y);
        ctx.closePath();
        ctx.fillStyle = "#8b5cf6";
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 2, y - ht);
        ctx.lineTo(x - 12, y - ht - 9);
        ctx.lineTo(x + 12, y - ht - 9);
        ctx.lineTo(x + 2, y - ht);
        ctx.closePath();
        ctx.fillStyle = "#c084fc";
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x, y - ht - 9, 12, 3.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#4ade80";
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case "ir": {
      flat(ctx, 0.05, 0.05, x1 - 0.05, y1 - 0.05, "#e7ecf5");
      castShadow(ctx, 0.25, 0.3, 2.75, 2.1, 90);
      box(ctx, 0.15, 2.15, 2.85, 2.85, 12, "#eef2f8");
      for (const gx of [0.3, 1.1, 1.9]) {
        const b = box(ctx, gx, 0.35, gx + 0.6, 2.05, 88, "#f5f7fb", 0, { left: "#e2e8f2", right: "#b6c2d6" });
        windows(ctx, b, { rows: 18, cols: 1, rcols: 1, color: "rgba(80,110,170,0.35)", wf: 0.96, hf: 0.3 });
      }
      box(ctx, 0.1, 0.6, 3.15, 1.5, 5, "#ffffff", 88);
      flat(ctx, 2.2, 0.75, 3.05, 1.35, "#5fd3f7", 93);
      for (let k = 0; k < 4; k++) tree(ctx, 0.45 + k * 0.45, 1.05, 0.4);
      break;
    }
    case "airport": {
      flat(ctx, 0.05, 0.05, x1 - 0.05, y1 - 0.05, "#c9d6c0", 0, false);
      flat(ctx, 0.1, 2.75, x1 - 0.1, 3.65, "#4b5065");
      ctx.strokeStyle = "#ffffff";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(...P(0.3, 3.2));
      ctx.lineTo(...P(x1 - 0.3, 3.2));
      ctx.stroke();
      ctx.setLineDash([]);
      inkStyle(ctx);
      castShadow(ctx, 0.3, 0.3, 3.7, 1.9, 20);
      const t = box(ctx, 0.3, 0.3, 3.7, 1.9, 16, "#f4f8fc", 0, { left: "#bfe4ff", right: "#86c6f2" });
      windows(ctx, t, { rows: 1, cols: 12, rcols: 4, color: "rgba(255,255,255,0.7)", wf: 0.7, hf: 0.7 });
      gable(ctx, 0.3, 0.3, 3.7, 1.9, 16, 6, "#e9eef5", "x", "#f4f8fc");
      box(ctx, 3.2, 2.05, 3.45, 2.3, 42, "#eef2f7");
      box(ctx, 3.05, 1.9, 3.6, 2.45, 8, "#38bdf8", 42);
      break;
    }
    case "port": {
      flat(ctx, 0.05, 0.05, x1 - 0.05, y1 - 0.05, "#c8c3b8");
      const cols = ["#ff6b6b", "#4d8dff", "#3fc97a", "#ffc94d", "#a77bff"];
      for (let a = 0; a < 3; a++)
        for (let b = 0; b < 2; b++) {
          const c = cols[(a * 2 + b) % cols.length];
          box(ctx, 0.3 + a * 0.8, 1.6 + b * 0.6, 0.9 + a * 0.8, 2.0 + b * 0.6, 7 + ((a + b) % 2) * 6, c);
        }
      for (const gx of [0.6, 1.6, 2.5]) {
        const [x, y] = P(gx, 0.6);
        ctx.lineWidth = 4;
        ctx.strokeStyle = INK;
        ctx.beginPath();
        ctx.moveTo(x - 7, y + 3);
        ctx.lineTo(x - 7, y - 36);
        ctx.moveTo(x + 7, y - 3);
        ctx.lineTo(x + 7, y - 40);
        ctx.moveTo(x - 16, y - 32);
        ctx.lineTo(x + 20, y - 50);
        ctx.stroke();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = "#ff8c2b";
        ctx.stroke();
        inkStyle(ctx);
      }
      break;
    }
    case "mrt": {
      castShadow(ctx, 0.08, 0.08, 0.92, 0.92, 20);
      const b = box(ctx, 0.08, 0.15, 0.92, 0.85, 14, "#f6f8fb");
      windows(ctx, b, { rows: 1, cols: 4, rcols: 3, color: "#6aa9e8", wf: 0.7, hf: 0.6 });
      gable(ctx, 0.04, 0.1, 0.96, 0.9, 14, 8, "#ff5a5a", "x", "#f6f8fb");
      break;
    }
    case "hawker": {
      castShadow(ctx, 0.08, 0.08, 0.92, 0.92, 20);
      box(ctx, 0.12, 0.12, 0.88, 0.88, 2, "#f1e3cf");
      for (const [gx, gy] of [[0.18, 0.82], [0.82, 0.82], [0.82, 0.18]]) box(ctx, gx - 0.03, gy - 0.03, gx + 0.03, gy + 0.03, 10, "#ffffff");
      for (const [gx, gy] of [[0.35, 0.6], [0.6, 0.4], [0.62, 0.68]]) box(ctx, gx - 0.07, gy - 0.07, gx + 0.07, gy + 0.07, 3, "#ffd166", 2);
      hip(ctx, 0.04, 0.04, 0.96, 0.96, 10, 14, "#ff7043");
      break;
    }
    case "school": {
      flat(ctx, 0.04, 0.04, 0.96, 0.96, "#7ed957");
      ctx.strokeStyle = "#ff7a59";
      ctx.lineWidth = 3;
      const [ex, ey] = P(0.7, 0.62);
      ctx.beginPath();
      ctx.ellipse(ex, ey, 10, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      inkStyle(ctx);
      castShadow(ctx, 0.08, 0.08, 0.5, 0.92, 24);
      const b = box(ctx, 0.08, 0.08, 0.48, 0.92, 22, "#fff3b0", 0, { right: "#f2c94c" });
      windows(ctx, b, { rows: 3, cols: 2, rcols: 4, color: "#4b74c9" });
      box(ctx, 0.06, 0.06, 0.5, 0.94, 3, "#ff6b6b", 22);
      break;
    }
    case "clinic": {
      castShadow(ctx, 0.12, 0.12, 0.88, 0.88, 20);
      const b = box(ctx, 0.12, 0.12, 0.88, 0.88, 18, "#ffffff");
      windows(ctx, b, { rows: 2, cols: 3, rcols: 3, color: "#46b5a5" });
      box(ctx, 0.12, 0.12, 0.88, 0.88, 3, "#2dd4bf", 18);
      break;
    }
    case "hospital": {
      castShadow(ctx, 0.15, 0.15, 1.85, 1.85, 50);
      const a = box(ctx, 0.15, 0.15, 1.1, 1.85, 48, "#ffffff");
      windows(ctx, a, { rows: 9, cols: 4, rcols: 7, color: "#5aa9e6" });
      const b = box(ctx, 1.1, 0.6, 1.85, 1.85, 26, "#f1f5fb");
      windows(ctx, b, { rows: 4, cols: 3, rcols: 4, color: "#5aa9e6" });
      const [hx, hy] = P(0.62, 1.0, 48);
      ctx.beginPath();
      ctx.ellipse(hx, hy, 13, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#ff5a5a";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillRect(hx - 2, hy - 5, 4, 10);
      ctx.fillRect(hx - 6, hy - 1.6, 12, 3.2);
      break;
    }
    case "police": {
      castShadow(ctx, 0.12, 0.12, 0.88, 0.88, 20);
      const b = box(ctx, 0.12, 0.12, 0.88, 0.88, 16, "#3b5bdb");
      windows(ctx, b, { rows: 2, cols: 3, rcols: 3, color: "#dbe4ff" });
      box(ctx, 0.12, 0.12, 0.88, 0.88, 3, "#ffffff", 16);
      const [lx, ly] = P(0.5, 0.5, 19);
      for (const [dx, c] of [[-3, "#ff4d4d"], [3, "#4dabff"]]) {
        ctx.beginPath();
        ctx.arc(lx + dx, ly - 3, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case "fire": {
      castShadow(ctx, 0.1, 0.1, 0.9, 0.9, 24);
      const b = box(ctx, 0.1, 0.1, 0.9, 0.9, 18, "#ff5a4f");
      windows(ctx, b, { rows: 1, cols: 2, rcols: 2, color: "#fff4e6", wf: 0.7, hf: 0.75, zTo: 12 });
      box(ctx, 0.12, 0.12, 0.34, 0.34, 34, "#ff5a4f");
      box(ctx, 0.1, 0.1, 0.9, 0.9, 2, "#ffffff", 18);
      break;
    }
    case "cc": {
      flat(ctx, 0.5, 0.45, 0.95, 0.95, "#ff9a52");
      castShadow(ctx, 0.08, 0.08, 0.5, 0.92, 18);
      const b = box(ctx, 0.08, 0.08, 0.48, 0.92, 16, "#c9b3ff");
      windows(ctx, b, { rows: 2, cols: 2, rcols: 4, color: "#ffffff" });
      gable(ctx, 0.06, 0.06, 0.5, 0.94, 16, 8, "#7c5cff", "y", "#c9b3ff");
      break;
    }
    case "bus": {
      flat(ctx, 0.05, 0.05, 0.95, 0.95, "#cfd5e0");
      box(ctx, 0.2, 0.55, 0.8, 0.8, 9, "#ff5a5a", 0, { top: "#ffffff" });
      for (const gx of [0.12, 0.88]) box(ctx, gx - 0.03, 0.12, gx + 0.03, 0.18, 14, "#9aa3b5");
      box(ctx, 0.08, 0.08, 0.92, 0.4, 3, "#8ad1ff", 14);
      break;
    }
    default: {
      castShadow(ctx, 0.12, 0.12, s - 0.12, s - 0.12, 16);
      box(ctx, 0.12, 0.12, s - 0.12, s - 0.12, 14, "#e2e8f0");
    }
  }
}

// Things that move on buildings, drawn every frame in world space.
export function drawBuildingLive(ctx, id, ox, oy, time) {
  if (id === "power") {
    for (const gx of [0.45, 1.2]) {
      const [x, y] = P(ox + gx, oy + 0.35);
      for (let k = 0; k < 3; k++) {
        const t = ((time / 1400 + k / 3 + gx) % 1 + 1) % 1;
        ctx.beginPath();
        ctx.arc(x + t * 14, y - 66 - t * 26, 4 + t * 7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240,244,250,${0.85 - t * 0.8})`;
        ctx.fill();
      }
    }
  } else if (id === "airport") {
    const t = (time / 7000) % 1;
    const gx = ox + 0.3 + t * 3.4;
    const [x, y0] = P(gx, oy + 3.2);
    const y = y0 - Math.max(0, t - 0.45) * 90;
    ctx.save();
    inkStyle(ctx, 1);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 11, 3, 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 4);
    ctx.lineTo(x - 9, y + 3);
    ctx.lineTo(x + 1, y - 2);
    ctx.closePath();
    ctx.fillStyle = "#ff5a5a";
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (id === "gardens") {
    // supertree canopies glow softly
    const a = 0.25 + 0.2 * Math.sin(time / 600);
    const [x, y] = P(ox + 1.65, oy + 1.25);
    ctx.fillStyle = `rgba(255,140,255,${a})`;
    ctx.beginPath();
    ctx.ellipse(x, y - 67, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
