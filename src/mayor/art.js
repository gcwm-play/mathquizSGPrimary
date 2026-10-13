// Cartoon art for Lion City Mayor. Buildings sit on rotated lots, so everything
// is drawn as prisms on arbitrary convex footprints, in absolute iso pixels.
import { PX, PY, INK, shade, inkStyle } from "../city/art.js";
import { quadPoint } from "./geom.js";

export { PX, PY, INK, shade, inkStyle };

const P = (x, y, z = 0) => [PX(x, y), PY(x, y) - z];

function polyFill(ctx, pts, fill, stroke = true) {
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

// orient 4 world points counter-clockwise (in world x/y) so normals point outward
function ccw(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    a += x0 * y1 - x1 * y0;
  }
  return a < 0 ? [...pts].reverse() : pts;
}

// Extruded convex footprint. Returns the visible walls for windows.
export function prism(ctx, pts, h, color, z = 0, o = {}) {
  const p = ccw(pts);
  const walls = [];
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[(i + 1) % p.length];
    // outward normal of a CCW polygon edge is (dy, -dx)
    const nx = y1 - y0;
    const ny = -(x1 - x0);
    const l = Math.hypot(nx, ny) || 1;
    if ((nx + ny) / l <= 0.02) continue;
    const f = -0.18 - 0.09 * ((nx - ny) / (Math.abs(nx) + Math.abs(ny) || 1));
    walls.push({ a: [x0, y0], b: [x1, y1], f, depth: x0 + y0 + x1 + y1 });
  }
  walls.sort((a, b) => a.depth - b.depth);
  for (const wl of walls) {
    polyFill(ctx, [P(wl.a[0], wl.a[1], z), P(wl.b[0], wl.b[1], z), P(wl.b[0], wl.b[1], z + h), P(wl.a[0], wl.a[1], z + h)], o.wall ? o.wall(wl.f) : shade(color, wl.f));
  }
  polyFill(ctx, p.map(([x, y]) => P(x, y, z + h)), o.top || shade(color, 0.14));
  return { walls, z, h };
}

// Window grid on a prism's visible walls
export function windows(ctx, pr, { rows, perUnit = 3, color = "#4f5d8c", wf = 0.55, hf = 0.5, zFrom = 0, zTo = pr.h, min = 1 }) {
  ctx.beginPath();
  for (const wl of pr.walls) {
    const len = Math.hypot(wl.b[0] - wl.a[0], wl.b[1] - wl.a[1]);
    const cols = Math.max(min, Math.round(len * perUnit));
    const span = zTo - zFrom;
    for (let c = 0; c < cols; c++) {
      const u0 = (c + (1 - wf) / 2) / cols;
      const u1 = u0 + wf / cols;
      const ax = wl.a[0] + (wl.b[0] - wl.a[0]) * u0;
      const ay = wl.a[1] + (wl.b[1] - wl.a[1]) * u0;
      const bx = wl.a[0] + (wl.b[0] - wl.a[0]) * u1;
      const by = wl.a[1] + (wl.b[1] - wl.a[1]) * u1;
      for (let r = 0; r < rows; r++) {
        const za = pr.z + zFrom + (span * (r + (1 - hf) / 2)) / rows;
        const zb = za + (span * hf) / rows;
        const p0 = P(ax, ay, za);
        const p1 = P(bx, by, za);
        const p2 = P(bx, by, zb);
        const p3 = P(ax, ay, zb);
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.lineTo(p3[0], p3[1]);
        ctx.closePath();
      }
    }
  }
  ctx.fillStyle = color;
  ctx.fill();
}

// Corridor stripes across walls (old HDB look)
function stripes(ctx, pr, step, color, from = 4) {
  ctx.beginPath();
  for (const wl of pr.walls) {
    for (let z = pr.z + from; z < pr.z + pr.h - 2; z += step) {
      const a = P(wl.a[0], wl.a[1], z);
      const b = P(wl.b[0], wl.b[1], z);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  inkStyle(ctx);
}

// footprint helpers in a lot's own frame: u along the road, v away from it
const uv = (q, u0, v0, u1, v1) => [quadPoint(q, u0, v0), quadPoint(q, u1, v0), quadPoint(q, u1, v1), quadPoint(q, u0, v1)];
export const boxUV = (ctx, q, u0, v0, u1, v1, h, color, z = 0, o) => prism(ctx, uv(q, u0, v0, u1, v1), h, color, z, o);

// Pitched roof over a uv rectangle; ridge runs along u (or v)
export function gableUV(ctx, q, u0, v0, u1, v1, z, h, color, along = "u") {
  const pt = (u, v, zz) => {
    const [x, y] = quadPoint(q, u, v);
    return [x, y, zz];
  };
  let faces;
  if (along === "u") {
    const vm = (v0 + v1) / 2;
    faces = [
      [pt(u0, v0, z), pt(u1, v0, z), pt(u1, vm, z + h), pt(u0, vm, z + h)],
      [pt(u0, v1, z), pt(u1, v1, z), pt(u1, vm, z + h), pt(u0, vm, z + h)],
      [pt(u0, v0, z), pt(u0, v1, z), pt(u0, vm, z + h)],
      [pt(u1, v0, z), pt(u1, v1, z), pt(u1, vm, z + h)],
    ];
  } else {
    const um = (u0 + u1) / 2;
    faces = [
      [pt(u0, v0, z), pt(u0, v1, z), pt(um, v1, z + h), pt(um, v0, z + h)],
      [pt(u1, v0, z), pt(u1, v1, z), pt(um, v1, z + h), pt(um, v0, z + h)],
      [pt(u0, v0, z), pt(u1, v0, z), pt(um, v0, z + h)],
      [pt(u0, v1, z), pt(u1, v1, z), pt(um, v1, z + h)],
    ];
  }
  // painter's order: furthest (smallest x+y) first
  faces.sort((a, b) => a.reduce((s, p) => s + p[0] + p[1], 0) / a.length - b.reduce((s, p) => s + p[0] + p[1], 0) / b.length);
  for (const f of faces) {
    if (f.length === 3) {
      polyFill(ctx, f.map(([x, y, zz]) => P(x, y, zz)), shade(color, -0.32));
      continue;
    }
    // slopes facing the viewer (downhill towards +x+y) are darker than ones facing away
    const eave = [(f[0][0] + f[1][0]) / 2, (f[0][1] + f[1][1]) / 2];
    const ridge = [(f[2][0] + f[3][0]) / 2, (f[2][1] + f[3][1]) / 2];
    const front = eave[0] - ridge[0] + eave[1] - ridge[1] > 0;
    polyFill(ctx, f.map(([x, y, zz]) => P(x, y, zz)), front ? color : shade(color, 0.14));
  }
}

export function hipUV(ctx, q, u0, v0, u1, v1, z, h, color) {
  const c = quadPoint(q, (u0 + u1) / 2, (v0 + v1) / 2);
  const corners = uv(q, u0, v0, u1, v1);
  const faces = corners.map((p, i) => [p, corners[(i + 1) % 4]]);
  faces.sort((a, b) => a[0][0] + a[0][1] + a[1][0] + a[1][1] - (b[0][0] + b[0][1] + b[1][0] + b[1][1]));
  faces.forEach(([a, b], i) => {
    polyFill(ctx, [P(a[0], a[1], z), P(b[0], b[1], z), P(c[0], c[1], z + h)], shade(color, i < 2 ? 0.12 : -0.15));
  });
}

export function flatUV(ctx, q, u0, v0, u1, v1, color, z = 0, stroke = true) {
  polyFill(ctx, uv(q, u0, v0, u1, v1).map(([x, y]) => P(x, y, z)), color, stroke);
}

export function cyl(ctx, x, y, r, h, color, z = 0) {
  const [sx, sy0] = P(x, y, z);
  const sy1 = sy0 - h;
  ctx.beginPath();
  ctx.ellipse(sx, sy0, r, r / 2, 0, 0, Math.PI);
  ctx.lineTo(sx - r, sy1);
  ctx.ellipse(sx, sy1, r, r / 2, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fillStyle = shade(color, -0.15);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(sx, sy1, r, r / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(color, 0.18);
  ctx.fill();
  ctx.stroke();
}

export function blobTree(ctx, x, y, s = 1, pal = ["#3fb85f", "#7be08a"]) {
  const [sx, sy] = P(x, y);
  ctx.fillStyle = "rgba(30,60,40,0.2)";
  ctx.beginPath();
  ctx.ellipse(sx + 2 * s, sy, 6 * s, 2.8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a5a33";
  ctx.beginPath();
  ctx.rect(sx - 1.2 * s, sy - 6 * s, 2.4 * s, 6 * s);
  ctx.fill();
  ctx.stroke();
  for (const [dx, dy, r] of [[-3.6, -7, 4], [3.6, -7.4, 4], [0, -11, 5.5]]) {
    ctx.beginPath();
    ctx.arc(sx + dx * s, sy + dy * s, r * s, 0, Math.PI * 2);
    ctx.fillStyle = pal[0];
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(sx - 1.8 * s, sy - 12.6 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.fillStyle = pal[1];
  ctx.fill();
}

const shadow = (ctx, pts, h) => {
  const L = Math.min(1.3, h / 55);
  ctx.fillStyle = "rgba(30,40,100,0.15)";
  ctx.beginPath();
  const sh = pts.map(([x, y]) => [x + L, y]);
  for (const quad of [pts, sh]) {
    const s0 = P(quad[0][0], quad[0][1]);
    ctx.moveTo(s0[0], s0[1]);
    for (let i = 1; i < 4; i++) {
      const s = P(quad[i][0], quad[i][1]);
      ctx.lineTo(s[0], s[1]);
    }
    ctx.closePath();
  }
  ctx.fill();
};
const shadowUV = (ctx, q, u0, v0, u1, v1, h) => shadow(ctx, uv(q, u0, v0, u1, v1), h);

export const HDB_PAINT = ["#ff8a80", "#6fb8ff", "#5fd69d", "#ffc94d", "#b79cff", "#ff8fc6", "#3fcfc6"];
const SHOP_PAINT = ["#ffd6e0", "#c7f0db", "#cfe3ff", "#fff1b8", "#e6d7ff", "#ffdcc2"];

// ---------- lot buildings ----------
export const LOT_HEIGHT = { emergency: 30, slab: 70, point: 100, ng: 80, modern: 95, bto: 150, terrace: 30, condo: 80, luxury: 160, shophouse: 35, ncentre: 30, mall: 50, office: 150, mixed: 170, farm: 20, factory: 50, jtc: 50, hitech: 45 };

export function drawLotBuilding(ctx, q, b, progress = 1) {
  const v = b.v || 0;
  const paint = HDB_PAINT[v % HDB_PAINT.length];
  switch (b.type) {
    case "emergency": {
      shadowUV(ctx, q, 0.08, 0.3, 0.92, 0.75, 18);
      const pr = boxUV(ctx, q, 0.08, 0.3, 0.92, 0.75, 18, "#dfe7ee");
      stripes(ctx, pr, 4.5, "rgba(70,80,110,0.55)");
      boxUV(ctx, q, 0.08, 0.3, 0.92, 0.75, 2, "#c9d4de", 18);
      break;
    }
    case "slab": {
      shadowUV(ctx, q, 0.05, 0.25, 0.95, 0.7, 46);
      boxUV(ctx, q, 0.05, 0.25, 0.95, 0.7, 6, "#cbbfa9");
      const pr = boxUV(ctx, q, 0.05, 0.25, 0.95, 0.7, 40, "#fbf3e2", 6);
      windows(ctx, pr, { rows: 10, perUnit: 4, color: "#55638f" });
      boxUV(ctx, q, 0.05, 0.25, 0.95, 0.7, 3, paint, 46);
      break;
    }
    case "point": {
      shadowUV(ctx, q, 0.25, 0.2, 0.75, 0.75, 70);
      boxUV(ctx, q, 0.25, 0.2, 0.75, 0.75, 6, "#cbbfa9");
      const pr = boxUV(ctx, q, 0.25, 0.2, 0.75, 0.75, 64, "#fff8ea", 6);
      windows(ctx, pr, { rows: 16, perUnit: 4, color: "#55638f" });
      boxUV(ctx, q, 0.25, 0.2, 0.75, 0.75, 6, paint, 70);
      break;
    }
    case "ng": {
      shadowUV(ctx, q, 0.05, 0.22, 0.95, 0.72, 52);
      boxUV(ctx, q, 0.05, 0.22, 0.95, 0.72, 6, "#cbbfa9");
      const pr = boxUV(ctx, q, 0.05, 0.22, 0.95, 0.72, 44, "#fdf0e4", 6);
      windows(ctx, pr, { rows: 11, perUnit: 4, color: "#4f5d8c" });
      boxUV(ctx, q, 0.4, 0.15, 0.6, 0.25, 50, paint);
      gableUV(ctx, q, 0.03, 0.2, 0.97, 0.74, 50, 9, "#d9533f", "u");
      break;
    }
    case "modern": {
      shadowUV(ctx, q, 0.05, 0.2, 0.95, 0.8, 70);
      const a = boxUV(ctx, q, 0.05, 0.25, 0.45, 0.8, 64, "#fffaf0");
      windows(ctx, a, { rows: 16, perUnit: 4, color: "#4b74c9" });
      boxUV(ctx, q, 0.05, 0.25, 0.45, 0.8, 4, paint, 64);
      const bb = boxUV(ctx, q, 0.55, 0.2, 0.95, 0.75, 70, "#fffaf0");
      windows(ctx, bb, { rows: 17, perUnit: 4, color: "#4b74c9" });
      boxUV(ctx, q, 0.55, 0.2, 0.95, 0.75, 5, "#7ed957", 70);
      break;
    }
    case "bto": {
      shadowUV(ctx, q, 0.1, 0.2, 0.9, 0.8, 120);
      const a = boxUV(ctx, q, 0.1, 0.25, 0.42, 0.78, 118, "#ffffff");
      windows(ctx, a, { rows: 28, perUnit: 3, color: "#55638f" });
      boxUV(ctx, q, 0.42, 0.4, 0.58, 0.62, 5, "#7ed957", 56);
      boxUV(ctx, q, 0.42, 0.4, 0.58, 0.62, 5, "#7ed957", 112);
      const bb = boxUV(ctx, q, 0.58, 0.25, 0.9, 0.78, 118, "#ffffff");
      windows(ctx, bb, { rows: 28, perUnit: 3, color: "#55638f" });
      boxUV(ctx, q, 0.1, 0.25, 0.42, 0.78, 6, paint, 118);
      boxUV(ctx, q, 0.58, 0.25, 0.9, 0.78, 6, paint, 118);
      break;
    }
    case "terrace": {
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.98, "#a7e07f", 0, false);
      const roof = ["#e2553f", "#d9643b", "#c94d5b"][v % 3];
      for (let k = 0; k < 3; k++) {
        const u0 = 0.06 + k * 0.3;
        shadowUV(ctx, q, u0, 0.2, u0 + 0.28, 0.65, 14);
        const pr = boxUV(ctx, q, u0, 0.2, u0 + 0.28, 0.65, 9, "#fff3d6");
        windows(ctx, pr, { rows: 1, perUnit: 3, color: "#6b7bb0" });
        gableUV(ctx, q, u0 - 0.01, 0.18, u0 + 0.29, 0.67, 9, 8, roof, "v");
      }
      break;
    }
    case "condo": {
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.98, "#a7e07f", 0, false);
      flatUV(ctx, q, 0.6, 0.12, 0.92, 0.45, "#6fdcf7");
      shadowUV(ctx, q, 0.1, 0.4, 0.55, 0.88, 56);
      const pr = boxUV(ctx, q, 0.1, 0.4, 0.55, 0.88, 54, "#bff3ea");
      windows(ctx, pr, { rows: 13, perUnit: 1, color: "rgba(255,255,255,0.8)", wf: 0.95, hf: 0.25 });
      boxUV(ctx, q, 0.08, 0.38, 0.57, 0.9, 4, "#f6fffd", 54);
      break;
    }
    case "luxury": {
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.98, "#a7e07f", 0, false);
      shadowUV(ctx, q, 0.25, 0.25, 0.75, 0.8, 130);
      const pr = boxUV(ctx, q, 0.25, 0.25, 0.75, 0.8, 128, "#9fe9f0", 0, { wall: (f) => shade("#5ec6d6", f + 0.15) });
      windows(ctx, pr, { rows: 30, perUnit: 1, color: "rgba(255,255,255,0.6)", wf: 0.95, hf: 0.22 });
      const [cx, cy] = quadPoint(q, 0.5, 0.52);
      const [sx, sy] = P(cx, cy, 128);
      ctx.beginPath();
      ctx.ellipse(sx, sy, 14, 9, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = "#d8fbff";
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "shophouse": {
      for (let k = 0; k < 4; k++) {
        const u0 = 0.04 + k * 0.23;
        const c = SHOP_PAINT[(v + k) % SHOP_PAINT.length];
        const pr = boxUV(ctx, q, u0, 0.1, u0 + 0.23, 0.85, 15, c);
        windows(ctx, pr, { rows: 2, perUnit: 2, color: "#7a4b2a" });
        gableUV(ctx, q, u0 - 0.005, 0.08, u0 + 0.235, 0.87, 15, 6, "#e0703a", "v");
      }
      if (b.conserved) {
        for (let k = 0; k < 4; k++) {
          const [x, y] = quadPoint(q, 0.15 + k * 0.23, 0.08);
          const [sx, sy] = P(x, y, 11);
          ctx.beginPath();
          ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = "#ff3b3b";
          ctx.fill();
        }
      }
      break;
    }
    case "ncentre": {
      shadowUV(ctx, q, 0.05, 0.15, 0.95, 0.85, 16);
      const pr = boxUV(ctx, q, 0.05, 0.15, 0.95, 0.85, 14, "#fff1d6");
      windows(ctx, pr, { rows: 2, perUnit: 4, color: "#e8754a", hf: 0.6 });
      boxUV(ctx, q, 0.05, 0.08, 0.95, 0.16, 1.5, ["#ff6b6b", "#4dabf7", "#51cf66", "#fcc419"][v % 4], 8);
      break;
    }
    case "mall": {
      shadowUV(ctx, q, 0.05, 0.12, 0.95, 0.9, 32);
      const pr = boxUV(ctx, q, 0.05, 0.12, 0.95, 0.9, 30, "#e7ecf7");
      windows(ctx, pr, { rows: 3, perUnit: 1, color: "#6fc3ff", wf: 0.96, hf: 0.55 });
      boxUV(ctx, q, 0.35, 0.3, 0.65, 0.6, 6, "#ff8fc6", 30);
      break;
    }
    case "office": {
      shadowUV(ctx, q, 0.15, 0.15, 0.85, 0.85, 140);
      const pr = boxUV(ctx, q, 0.15, 0.15, 0.85, 0.85, 138, "#8ec8ff", 0, { wall: (f) => shade("#5aa0f5", f + 0.12), top: "#c4e3ff" });
      windows(ctx, pr, { rows: 1, perUnit: 4, color: "rgba(255,255,255,0.3)", wf: 0.25, hf: 0.97 });
      boxUV(ctx, q, 0.3, 0.3, 0.7, 0.7, 14, "#b5dcff", 138);
      break;
    }
    case "mixed": {
      shadowUV(ctx, q, 0.05, 0.1, 0.95, 0.9, 150);
      const pod = boxUV(ctx, q, 0.05, 0.1, 0.95, 0.9, 22, "#ffe8cc");
      windows(ctx, pod, { rows: 2, perUnit: 3, color: "#ff922b" });
      const pr = boxUV(ctx, q, 0.25, 0.25, 0.75, 0.75, 130, "#d0f0ff", 22, { wall: (f) => shade("#7cc4ef", f + 0.12) });
      windows(ctx, pr, { rows: 26, perUnit: 2, color: "rgba(255,255,255,0.55)", wf: 0.8, hf: 0.4 });
      boxUV(ctx, q, 0.3, 0.3, 0.7, 0.7, 4, "#7ed957", 152);
      break;
    }
    case "farm": {
      flatUV(ctx, q, 0.03, 0.03, 0.97, 0.97, "#c9b07a", 0, false);
      ctx.strokeStyle = "#5fa83a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = P(...quadPoint(q, 0.08, 0.45 + k * 0.1));
        const bb = P(...quadPoint(q, 0.92, 0.45 + k * 0.1));
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(bb[0], bb[1]);
      }
      ctx.stroke();
      inkStyle(ctx);
      boxUV(ctx, q, 0.1, 0.08, 0.5, 0.35, 5, "#c7b299");
      gableUV(ctx, q, 0.08, 0.06, 0.52, 0.37, 5, 4, "#9aa7b8", "u");
      break;
    }
    case "factory": {
      shadowUV(ctx, q, 0.06, 0.15, 0.94, 0.85, 14);
      const pr = boxUV(ctx, q, 0.06, 0.15, 0.94, 0.85, 11, "#efe5d1");
      windows(ctx, pr, { rows: 1, perUnit: 2, color: "#8b8f9e", hf: 0.6 });
      for (let k = 0; k < 3; k++) gableUV(ctx, q, 0.06 + k * 0.293, 0.15, 0.353 + k * 0.293, 0.85, 11, 7, "#9fb1c7", "v");
      const [cx, cy] = quadPoint(q, 0.85, 0.75);
      cyl(ctx, cx, cy, 3, 32, "#e3d9cc");
      break;
    }
    case "jtc": {
      shadowUV(ctx, q, 0.08, 0.1, 0.92, 0.9, 36);
      const pr = boxUV(ctx, q, 0.08, 0.1, 0.92, 0.9, 34, "#fff1cf");
      windows(ctx, pr, { rows: 4, perUnit: 1, color: "#3f7fe0", wf: 0.95, hf: 0.4 });
      boxUV(ctx, q, 0.6, 0.6, 0.85, 0.85, 6, "#ffb347", 34);
      break;
    }
    case "hitech": {
      flatUV(ctx, q, 0.03, 0.03, 0.97, 0.97, "#a7e07f", 0, false);
      shadowUV(ctx, q, 0.06, 0.3, 0.94, 0.9, 22);
      const pr = boxUV(ctx, q, 0.06, 0.3, 0.94, 0.9, 20, "#f7fbff");
      windows(ctx, pr, { rows: 1, perUnit: 1, color: "#37b4e6", wf: 0.95, hf: 0.35 });
      const [ax, ay] = quadPoint(q, 0.25, 0.15);
      const [bx, by] = quadPoint(q, 0.55, 0.15);
      cyl(ctx, ax, ay, 5, 14, "#d6e4f0");
      cyl(ctx, bx, by, 5, 14, "#d6e4f0");
      break;
    }
    default:
      boxUV(ctx, q, 0.1, 0.1, 0.9, 0.9, 12, "#e2e8f0");
  }
}

// Scaffolding and a crane while something is being built
export function drawConstruction(ctx, q, type, progress, time) {
  const H = Math.max(8, (LOT_HEIGHT[type] || 40) * 0.75 * Math.max(0.15, progress));
  flatUV(ctx, q, 0.03, 0.03, 0.97, 0.97, "#d8c8a8", 0, false);
  const pr = boxUV(ctx, q, 0.12, 0.22, 0.88, 0.78, H, "#c7ccd6", 0, { top: "#b8bfcc" });
  ctx.strokeStyle = "rgba(255,170,40,0.85)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const wl of pr.walls) {
    for (let z = 5; z < H; z += 6) {
      const a = P(wl.a[0], wl.a[1], z);
      const b = P(wl.b[0], wl.b[1], z);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
  }
  ctx.stroke();
  inkStyle(ctx);
  // crane
  const [mx, my] = quadPoint(q, 0.85, 0.85);
  const [bx, by] = P(mx, my);
  const top = by - H - 26;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx, top);
  const swing = Math.sin(time / 1600 + mx) * 0.5;
  const jx = bx - 26 * Math.cos(swing);
  const jy = top + 6 * Math.sin(swing);
  ctx.moveTo(bx + 8, top);
  ctx.lineTo(jx, jy);
  ctx.stroke();
  ctx.strokeStyle = "#ffc23d";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(jx + 6, jy);
  ctx.lineTo(jx + 6, jy + 14);
  ctx.stroke();
  inkStyle(ctx);
}

// ---------- kampong houses ----------
export function drawAttap(ctx, x, y, ang, v) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const corner = (a, b) => [x + c * a - s * b, y + s * a + c * b];
  const q = [...corner(-0.32, -0.24), ...corner(0.32, -0.24), ...corner(0.32, 0.24), ...corner(-0.32, 0.24)];
  // stilts
  for (const [a, b] of [[-0.28, 0.2], [0.28, 0.2], [0.28, -0.2]]) {
    const [px, py] = P(...corner(a, b));
    ctx.fillStyle = "#6b4a2b";
    ctx.fillRect(px - 0.6, py - 3, 1.2, 3);
  }
  const wall = ["#b98b5a", "#a77c4f", "#c49a68", "#9c7046"][v % 4];
  prism(ctx, [[q[0], q[1]], [q[2], q[3]], [q[4], q[5]], [q[6], q[7]]], 5, wall, 3);
  gableUV(ctx, q, -0.08, -0.1, 1.08, 1.1, 8, 7, "#c8a35a", "u");
}

// ---------- services & landmarks ----------
const STRUCT_H = { hospital: 60, airbase: 30, navalBase: 40, changiAirport: 60, tampinesHub: 40, scienceCentre: 40, jurongIsland: 70, tuasPort: 70, merlion: 40, esplanade: 40, marinaBaySands: 140, gardensBay: 90, checkpoint: 30, causewayPoint: 40, rtsLink: 40, birdPark: 40, sports: 30, school: 30, mrt: 30 };
export const structHeight = (t) => STRUCT_H[t] || 30;

export function drawStruct(ctx, q, type, time) {
  switch (type) {
    case "market": {
      shadowUV(ctx, q, 0.08, 0.12, 0.92, 0.88, 14);
      const pr = boxUV(ctx, q, 0.08, 0.12, 0.92, 0.88, 8, "#e9f7ef");
      windows(ctx, pr, { rows: 1, perUnit: 3, color: "#2f9e44", hf: 0.6 });
      gableUV(ctx, q, 0.04, 0.08, 0.96, 0.92, 8, 9, "#9fb3c8", "u");
      break;
    }
    case "hawker": {
      shadowUV(ctx, q, 0.06, 0.06, 0.94, 0.94, 20);
      boxUV(ctx, q, 0.1, 0.1, 0.9, 0.9, 2, "#f1e3cf");
      for (const [u, v] of [[0.14, 0.86], [0.86, 0.86], [0.86, 0.14], [0.5, 0.86]]) boxUV(ctx, q, u - 0.03, v - 0.04, u + 0.03, v + 0.04, 10, "#ffffff");
      for (const [u, v] of [[0.3, 0.5], [0.55, 0.4], [0.7, 0.65]]) boxUV(ctx, q, u - 0.06, v - 0.08, u + 0.06, v + 0.08, 3, "#ffd166", 2);
      hipUV(ctx, q, 0.02, 0.02, 0.98, 0.98, 10, 14, "#ff7043");
      break;
    }
    case "school": {
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.98, "#7ed957");
      const [ex, ey] = quadPoint(q, 0.7, 0.55);
      const [sx, sy] = P(ex, ey);
      ctx.strokeStyle = "#ff7a59";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 13, 6.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      inkStyle(ctx);
      shadowUV(ctx, q, 0.05, 0.1, 0.45, 0.9, 24);
      const pr = boxUV(ctx, q, 0.05, 0.1, 0.45, 0.9, 22, "#fff3b0", 0, { wall: (f) => shade("#f7d354", f + 0.1) });
      windows(ctx, pr, { rows: 3, perUnit: 3, color: "#4b74c9" });
      boxUV(ctx, q, 0.04, 0.08, 0.46, 0.92, 3, "#ff6b6b", 22);
      break;
    }
    case "clinic":
    case "hospital": {
      const big = type === "hospital";
      shadowUV(ctx, q, 0.1, 0.1, 0.9, 0.9, big ? 56 : 20);
      const pr = boxUV(ctx, q, 0.1, 0.1, big ? 0.6 : 0.9, 0.9, big ? 54 : 18, "#ffffff");
      windows(ctx, pr, { rows: big ? 10 : 2, perUnit: 3, color: "#46b5a5" });
      if (big) {
        const p2 = boxUV(ctx, q, 0.6, 0.3, 0.92, 0.9, 28, "#f1f5fb");
        windows(ctx, p2, { rows: 5, perUnit: 3, color: "#46b5a5" });
      } else boxUV(ctx, q, 0.1, 0.1, 0.9, 0.9, 3, "#2dd4bf", 18);
      const [cx, cy] = quadPoint(q, big ? 0.35 : 0.5, 0.5);
      const [sx, sy] = P(cx, cy, big ? 54 : 21);
      ctx.beginPath();
      ctx.ellipse(sx, sy, 9, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#ff5a5a";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx - 1.5, sy - 3.5, 3, 7);
      ctx.fillRect(sx - 4.5, sy - 1.2, 9, 2.4);
      break;
    }
    case "police": {
      shadowUV(ctx, q, 0.1, 0.1, 0.9, 0.9, 20);
      const pr = boxUV(ctx, q, 0.1, 0.1, 0.9, 0.9, 16, "#3b5bdb");
      windows(ctx, pr, { rows: 2, perUnit: 3, color: "#dbe4ff" });
      boxUV(ctx, q, 0.1, 0.1, 0.9, 0.9, 3, "#ffffff", 16);
      break;
    }
    case "fire": {
      shadowUV(ctx, q, 0.08, 0.08, 0.92, 0.92, 26);
      const pr = boxUV(ctx, q, 0.08, 0.08, 0.92, 0.92, 18, "#ff5a4f");
      windows(ctx, pr, { rows: 1, perUnit: 2, color: "#fff4e6", wf: 0.7, hf: 0.7, zTo: 12 });
      boxUV(ctx, q, 0.75, 0.7, 0.92, 0.92, 34, "#ff5a4f");
      break;
    }
    case "cc": {
      flatUV(ctx, q, 0.5, 0.1, 0.95, 0.9, "#ff9a52");
      shadowUV(ctx, q, 0.05, 0.1, 0.48, 0.9, 18);
      const pr = boxUV(ctx, q, 0.05, 0.1, 0.48, 0.9, 16, "#c9b3ff");
      windows(ctx, pr, { rows: 2, perUnit: 3, color: "#ffffff" });
      gableUV(ctx, q, 0.03, 0.08, 0.5, 0.92, 16, 8, "#7c5cff", "v");
      break;
    }
    case "park": {
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.98, "#7ed957");
      flatUV(ctx, q, 0.5, 0.15, 0.85, 0.5, "#69d2f5");
      for (const [u, v, s] of [[0.25, 0.3, 1], [0.7, 0.75, 0.9], [0.3, 0.8, 0.85], [0.85, 0.85, 0.7]]) blobTree(ctx, ...quadPoint(q, u, v), s, ["#2fa05a", "#63cf7d"]);
      break;
    }
    case "bus": {
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.98, "#cfd5e0");
      boxUV(ctx, q, 0.15, 0.55, 0.85, 0.85, 9, "#ff5a5a", 0, { top: "#ffffff" });
      for (const u of [0.1, 0.9]) boxUV(ctx, q, u - 0.03, 0.1, u + 0.03, 0.2, 14, "#9aa3b5");
      boxUV(ctx, q, 0.05, 0.05, 0.95, 0.4, 3, "#8ad1ff", 14);
      break;
    }
    case "mrt": {
      shadowUV(ctx, q, 0.05, 0.1, 0.95, 0.9, 20);
      const pr = boxUV(ctx, q, 0.05, 0.15, 0.95, 0.85, 14, "#f6f8fb");
      windows(ctx, pr, { rows: 1, perUnit: 2, color: "#6aa9e8", hf: 0.6 });
      gableUV(ctx, q, 0.02, 0.1, 0.98, 0.9, 14, 9, "#ff5a5a", "u");
      break;
    }
    case "sports": {
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.98, "#7ed957");
      flatUV(ctx, q, 0.08, 0.1, 0.55, 0.6, "#ffffff");
      flatUV(ctx, q, 0.1, 0.13, 0.53, 0.57, "#4cc3ff", 0, false);
      const pr = boxUV(ctx, q, 0.6, 0.1, 0.95, 0.9, 20, "#ffd8a8");
      windows(ctx, pr, { rows: 2, perUnit: 2, color: "#e8590c" });
      break;
    }
    case "airbase":
    case "changiAirport": {
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.98, "#c9d6c0", 0, false);
      flatUV(ctx, q, 0.03, 0.62, 0.97, 0.9, "#4b5065");
      ctx.strokeStyle = "#ffffff";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(...P(...quadPoint(q, 0.06, 0.76)));
      ctx.lineTo(...P(...quadPoint(q, 0.94, 0.76)));
      ctx.stroke();
      ctx.setLineDash([]);
      inkStyle(ctx);
      if (type === "airbase") {
        for (let k = 0; k < 3; k++) {
          boxUV(ctx, q, 0.1 + k * 0.2, 0.12, 0.26 + k * 0.2, 0.42, 8, "#8d9a7e");
          gableUV(ctx, q, 0.1 + k * 0.2, 0.12, 0.26 + k * 0.2, 0.42, 8, 6, "#6f7d62", "v");
        }
      } else {
        const t = boxUV(ctx, q, 0.08, 0.08, 0.75, 0.5, 18, "#f4f8fc", 0, { wall: (f) => shade("#7fc8f5", f + 0.1) });
        windows(ctx, t, { rows: 1, perUnit: 2, color: "rgba(255,255,255,0.7)", hf: 0.7 });
        gableUV(ctx, q, 0.08, 0.08, 0.75, 0.5, 18, 7, "#e9eef5", "u");
        boxUV(ctx, q, 0.85, 0.25, 0.9, 0.35, 44, "#eef2f7");
        boxUV(ctx, q, 0.82, 0.21, 0.93, 0.39, 8, "#38bdf8", 44);
      }
      // a plane taxiing
      const tt = (time / 9000) % 1;
      const [px, py] = quadPoint(q, 0.06 + tt * 0.88, 0.76);
      const [sx, sy0] = P(px, py);
      const sy = sy0 - Math.max(0, tt - 0.5) * 70;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(sx, sy - 4, 12, 3, 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "navalBase":
    case "tuasPort": {
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.98, "#c8c3b8");
      const cols = ["#ff6b6b", "#4d8dff", "#3fc97a", "#ffc94d", "#a77bff"];
      for (let a = 0; a < 4; a++) for (let b = 0; b < 2; b++) boxUV(ctx, q, 0.08 + a * 0.22, 0.45 + b * 0.22, 0.26 + a * 0.22, 0.62 + b * 0.22, 6 + ((a + b) % 2) * 6, cols[(a * 2 + b) % 5]);
      for (const u of [0.2, 0.5, 0.8]) {
        const [x, y] = quadPoint(q, u, 0.15);
        const [sx, sy] = P(x, y);
        ctx.lineWidth = 4;
        ctx.strokeStyle = INK;
        ctx.beginPath();
        ctx.moveTo(sx - 6, sy);
        ctx.lineTo(sx - 6, sy - 40);
        ctx.moveTo(sx + 6, sy);
        ctx.lineTo(sx + 6, sy - 44);
        ctx.moveTo(sx - 16, sy - 36);
        ctx.lineTo(sx + 20, sy - 54);
        ctx.stroke();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = "#ff8c2b";
        ctx.stroke();
        inkStyle(ctx);
      }
      break;
    }
    case "jurongIsland": {
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.98, "#d6d1c4");
      for (let a = 0; a < 4; a++) for (let b = 0; b < 2; b++) cyl(ctx, ...quadPoint(q, 0.15 + a * 0.22, 0.3 + b * 0.4), 8, 14 + ((a + b) % 2) * 6, "#f1f3f5");
      const [fx, fy] = quadPoint(q, 0.9, 0.15);
      const [sx, sy] = P(fx, fy);
      ctx.fillStyle = "#adb5bd";
      ctx.fillRect(sx - 2, sy - 60, 4, 60);
      const fl = 6 + Math.sin(time / 120) * 2;
      ctx.beginPath();
      ctx.ellipse(sx, sy - 64, 3, fl, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#ff922b";
      ctx.fill();
      break;
    }
    case "eastCoastPark": {
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.98, "#ffe9a8");
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.45, "#7ed957", 0, false);
      for (let k = 0; k < 8; k++) blobTree(ctx, ...quadPoint(q, 0.06 + k * 0.12, 0.22 + (k % 2) * 0.1), 0.8, ["#2fa05a", "#63cf7d"]);
      for (let k = 0; k < 5; k++) {
        const [x, y] = quadPoint(q, 0.1 + k * 0.2, 0.7);
        const [sx, sy] = P(x, y);
        ctx.beginPath();
        ctx.arc(sx, sy - 5, 5, Math.PI, 0);
        ctx.fillStyle = ["#ff6b6b", "#4dabf7", "#ffd43b"][k % 3];
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case "tampinesHub":
    case "causewayPoint": {
      shadowUV(ctx, q, 0.05, 0.08, 0.95, 0.92, 34);
      const pr = boxUV(ctx, q, 0.05, 0.08, 0.95, 0.92, 32, type === "tampinesHub" ? "#ffe3e3" : "#e7f5ff");
      windows(ctx, pr, { rows: 3, perUnit: 2, color: "#4dabf7" });
      flatUV(ctx, q, 0.08, 0.12, 0.92, 0.88, "#7ed957", 32);
      break;
    }
    case "birdPark": {
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.98, "#7ed957");
      for (const [u, v] of [[0.2, 0.3], [0.4, 0.75], [0.75, 0.3], [0.85, 0.8], [0.15, 0.85]]) blobTree(ctx, ...quadPoint(q, u, v), 1, ["#2b9a6e", "#5fd0a0"]);
      const [cx, cy] = quadPoint(q, 0.55, 0.5);
      const [sx, sy] = P(cx, cy);
      ctx.beginPath();
      ctx.ellipse(sx, sy, 30, 16, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = "rgba(220,240,255,0.55)";
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "scienceCentre": {
      shadowUV(ctx, q, 0.1, 0.1, 0.9, 0.9, 30);
      const pr = boxUV(ctx, q, 0.1, 0.2, 0.9, 0.9, 22, "#e8e2d6");
      windows(ctx, pr, { rows: 2, perUnit: 2, color: "#5c7cfa" });
      hipUV(ctx, q, 0.3, 0.3, 0.7, 0.7, 22, 18, "#adb5bd");
      break;
    }
    case "merlion": {
      flatUV(ctx, q, 0.05, 0.05, 0.95, 0.95, "#dee2e6");
      boxUV(ctx, q, 0.3, 0.3, 0.7, 0.7, 6, "#ced4da");
      const [cx, cy] = quadPoint(q, 0.5, 0.5);
      const [sx, sy] = P(cx, cy, 6);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(sx, sy - 10, 5, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx, sy - 23, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(120,200,255,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx + 4, sy - 22);
      ctx.quadraticCurveTo(sx + 18, sy - 26, sx + 24, sy - 4);
      ctx.stroke();
      inkStyle(ctx);
      break;
    }
    case "esplanade": {
      for (const u of [0.28, 0.72]) {
        const [cx, cy] = quadPoint(q, u, 0.5);
        const [sx, sy] = P(cx, cy);
        ctx.beginPath();
        ctx.ellipse(sx, sy, 26, 14, 0, Math.PI, 0);
        ctx.closePath();
        ctx.fillStyle = "#c9a227";
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(60,40,10,0.35)";
        for (let k = -3; k <= 3; k++) for (let j = 1; j <= 3; j++) ctx.fillRect(sx + k * 6 - 1, sy - j * 5 + Math.abs(k) * 1.5, 2, 2);
      }
      break;
    }
    case "marinaBaySands": {
      shadowUV(ctx, q, 0.1, 0.2, 0.9, 0.8, 110);
      boxUV(ctx, q, 0.05, 0.75, 0.95, 0.95, 12, "#eef2f8");
      for (const u of [0.1, 0.4, 0.7]) {
        const pr = boxUV(ctx, q, u, 0.25, u + 0.2, 0.75, 110, "#f5f7fb");
        windows(ctx, pr, { rows: 22, perUnit: 1, color: "rgba(80,110,170,0.35)", wf: 0.95, hf: 0.3 });
      }
      boxUV(ctx, q, 0.02, 0.35, 1.05, 0.62, 5, "#ffffff", 110);
      flatUV(ctx, q, 0.72, 0.38, 1.02, 0.6, "#5fd3f7", 115);
      break;
    }
    case "gardensBay": {
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.98, "#7ed957");
      for (const [u, v] of [[0.8, 0.25], [0.2, 0.8]]) {
        const [x, y] = quadPoint(q, u, v);
        const [sx, sy] = P(x, y);
        ctx.beginPath();
        ctx.ellipse(sx, sy, 22, 12, 0, Math.PI, 0);
        ctx.closePath();
        ctx.fillStyle = "rgba(200,240,255,0.95)";
        ctx.fill();
        ctx.stroke();
      }
      for (const [u, v, ht] of [[0.35, 0.35, 44], [0.55, 0.45, 58], [0.45, 0.65, 50], [0.7, 0.7, 36], [0.25, 0.55, 32]]) {
        const [x, y] = quadPoint(q, u, v);
        const [sx, sy] = P(x, y);
        ctx.beginPath();
        ctx.moveTo(sx - 3, sy);
        ctx.lineTo(sx - 1.5, sy - ht);
        ctx.lineTo(sx + 1.5, sy - ht);
        ctx.lineTo(sx + 3, sy);
        ctx.closePath();
        ctx.fillStyle = "#8b5cf6";
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx - 2, sy - ht);
        ctx.lineTo(sx - 12, sy - ht - 9);
        ctx.lineTo(sx + 12, sy - ht - 9);
        ctx.lineTo(sx + 2, sy - ht);
        ctx.closePath();
        ctx.fillStyle = "#c084fc";
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case "checkpoint":
    case "rtsLink": {
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.98, "#d0d5de");
      const pr = boxUV(ctx, q, 0.05, 0.4, 0.95, 0.9, 22, type === "rtsLink" ? "#e7f5ff" : "#f8f0e3");
      windows(ctx, pr, { rows: 2, perUnit: 3, color: "#4c6ef5" });
      for (let k = 0; k < 4; k++) boxUV(ctx, q, 0.1 + k * 0.22, 0.08, 0.2 + k * 0.22, 0.32, 3, "#ffd43b");
      break;
    }
    case "sungeiBuloh": {
      flatUV(ctx, q, 0.02, 0.02, 0.98, 0.98, "#6fbf73");
      ctx.strokeStyle = "#c08b5c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(...P(...quadPoint(q, 0.05, 0.5)));
      ctx.lineTo(...P(...quadPoint(q, 0.5, 0.3)));
      ctx.lineTo(...P(...quadPoint(q, 0.95, 0.6)));
      ctx.stroke();
      inkStyle(ctx);
      for (const [u, v] of [[0.2, 0.2], [0.3, 0.8], [0.6, 0.75], [0.8, 0.2], [0.9, 0.85]]) blobTree(ctx, ...quadPoint(q, u, v), 0.9, ["#2b8a3e", "#51cf66"]);
      break;
    }
    default: {
      shadowUV(ctx, q, 0.1, 0.1, 0.9, 0.9, 16);
      boxUV(ctx, q, 0.1, 0.1, 0.9, 0.9, 14, "#e2e8f0");
    }
  }
}
