// Isometric canvas renderer for Lion City Planner.
import { N, ZONES, BUILDINGS } from "./defs.js";
import { idx, inMap } from "./sim.js";

export const TW = 64;
export const TH = 32;
const HW = TW / 2;
const HH = TH / 2;

// grid point -> iso pixel
const PX = (gx, gy) => (gx - gy) * HW;
const PY = (gx, gy) => (gx + gy) * HH;

export function screenToGrid(cam, sx, sy) {
  const ix = (sx - cam.x) / cam.zoom;
  const iy = (sy - cam.y) / cam.zoom;
  return { x: Math.floor((iy / HH + ix / HW) / 2), y: Math.floor((iy / HH - ix / HW) / 2) };
}

export function centerCamera(cam, width, height, gx = N / 2, gy = N / 2) {
  cam.x = width / 2 - PX(gx, gy) * cam.zoom;
  cam.y = height / 2 - PY(gx, gy) * cam.zoom;
}

// ---------- colour helpers ----------
const shadeCache = new Map();
function shade(hex, f) {
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

const hash = (x, y) => {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h ^= h >>> 13;
  return ((h >>> 0) % 1000) / 1000;
};

const HDB_PAINT = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];
const SHOP_PAINT = ["#fde68a", "#fbcfe8", "#bfdbfe", "#bbf7d0", "#fed7aa", "#ddd6fe"];

// ---------- primitives ----------
function diamondPath(ctx, gx0, gy0, gx1, gy1, z = 0) {
  ctx.beginPath();
  ctx.moveTo(PX(gx0, gy0), PY(gx0, gy0) - z);
  ctx.lineTo(PX(gx1, gy0), PY(gx1, gy0) - z);
  ctx.lineTo(PX(gx1, gy1), PY(gx1, gy1) - z);
  ctx.lineTo(PX(gx0, gy1), PY(gx0, gy1) - z);
  ctx.closePath();
}

function fillDiamond(ctx, gx, gy, color, inset = 0) {
  diamondPath(ctx, gx + inset, gy + inset, gx + 1 - inset, gy + 1 - inset);
  ctx.fillStyle = color;
  ctx.fill();
}

// Extruded box over a grid rectangle. Returns corner points for decorating.
function box(ctx, gx0, gy0, gx1, gy1, h, color, z = 0, opts = {}) {
  const ax = PX(gx0, gy0), ay = PY(gx0, gy0) - z;
  const bx = PX(gx1, gy0), by = PY(gx1, gy0) - z;
  const cx = PX(gx1, gy1), cy = PY(gx1, gy1) - z;
  const dx = PX(gx0, gy1), dy = PY(gx0, gy1) - z;
  // left face (D-C)
  ctx.beginPath();
  ctx.moveTo(dx, dy);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx, cy - h);
  ctx.lineTo(dx, dy - h);
  ctx.closePath();
  ctx.fillStyle = opts.left || shade(color, -0.18);
  ctx.fill();
  // right face (C-B)
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx, by - h);
  ctx.lineTo(cx, cy - h);
  ctx.closePath();
  ctx.fillStyle = opts.right || shade(color, -0.34);
  ctx.fill();
  // top
  ctx.beginPath();
  ctx.moveTo(ax, ay - h);
  ctx.lineTo(bx, by - h);
  ctx.lineTo(cx, cy - h);
  ctx.lineTo(dx, dy - h);
  ctx.closePath();
  ctx.fillStyle = opts.top || color;
  ctx.fill();
  return { ax, ay, bx, by, cx, cy, dx, dy, h };
}

// Horizontal floor lines on the two visible faces.
function floors(ctx, p, step, color, from = 4) {
  ctx.beginPath();
  for (let z = from; z < p.h - 2; z += step) {
    ctx.moveTo(p.dx, p.dy - z);
    ctx.lineTo(p.cx, p.cy - z);
    ctx.lineTo(p.bx, p.by - z);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

// Vertical window columns on visible faces.
function columns(ctx, p, n, color) {
  ctx.beginPath();
  for (let k = 1; k < n; k++) {
    const t = k / n;
    const lx = p.dx + (p.cx - p.dx) * t;
    const ly = p.dy + (p.cy - p.dy) * t;
    ctx.moveTo(lx, ly - 2);
    ctx.lineTo(lx, ly - p.h + 2);
    const rx = p.cx + (p.bx - p.cx) * t;
    const ry = p.cy + (p.by - p.cy) * t;
    ctx.moveTo(rx, ry - 2);
    ctx.lineTo(rx, ry - p.h + 2);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

function pyramidRoof(ctx, gx0, gy0, gx1, gy1, z, h, color) {
  const tx = PX((gx0 + gx1) / 2, (gy0 + gy1) / 2);
  const ty = PY((gx0 + gx1) / 2, (gy0 + gy1) / 2) - z - h;
  const D = [PX(gx0, gy1), PY(gx0, gy1) - z];
  const C = [PX(gx1, gy1), PY(gx1, gy1) - z];
  const B = [PX(gx1, gy0), PY(gx1, gy0) - z];
  ctx.beginPath();
  ctx.moveTo(D[0], D[1]);
  ctx.lineTo(C[0], C[1]);
  ctx.lineTo(tx, ty);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(C[0], C[1]);
  ctx.lineTo(B[0], B[1]);
  ctx.lineTo(tx, ty);
  ctx.closePath();
  ctx.fillStyle = shade(color, -0.25);
  ctx.fill();
}

function tree(ctx, gx, gy, s = 1, color = "#15803d") {
  const x = PX(gx, gy);
  const y = PY(gx, gy);
  ctx.fillStyle = "#78350f";
  ctx.fillRect(x - 1, y - 6 * s, 2, 6 * s);
  ctx.beginPath();
  ctx.ellipse(x, y - 9 * s, 6 * s, 5.5 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x - 1.5 * s, y - 10.5 * s, 3 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(color, 0.18);
  ctx.fill();
}

function cylinder(ctx, gx, gy, r, h, color) {
  const x = PX(gx, gy);
  const y = PY(gx, gy);
  ctx.fillStyle = shade(color, -0.25);
  ctx.beginPath();
  ctx.ellipse(x, y, r, r / 2, 0, 0, Math.PI);
  ctx.lineTo(x - r, y - h);
  ctx.ellipse(x, y - h, r, r / 2, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y - h, r, r / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function emoji(ctx, ch, x, y, size) {
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ch, x, y);
}

// ---------- ground ----------
function groundColor(w, tl, x, y) {
  if (tl.t === "sea") {
    const shore = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inMap(x + dx, y + dy) && w.tiles[idx(x + dx, y + dy)].t !== "sea");
    return shore ? "#38bdf8" : hash(x, y) > 0.5 ? "#0ea5e9" : "#0b9bd9";
  }
  if (tl.t === "res") return hash(x, y) > 0.5 ? "#3b9fd8" : "#3698d1";
  if (tl.road) return "#52525b";
  if (tl.b) {
    const b = tl.b;
    if (b === "park" || b === "gardens") return "#65a30d";
    if (b === "airport" || b === "port") return "#a8a29e";
    return "#d6d3d1";
  }
  if (tl.z && tl.lv > 0) return tl.z === "ind" ? "#a8a29e" : tl.z === "com" ? "#cbd5e1" : tl.z === "pte" ? "#a3c76a" : "#c7d2b4";
  const coastal = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inMap(x + dx, y + dy) && w.tiles[idx(x + dx, y + dy)].t === "sea");
  if (coastal && !tl.z) return "#e7d9a6";
  const h = hash(x, y);
  return h > 0.66 ? "#86b84a" : h > 0.33 ? "#7fb244" : "#79ab40";
}

const ROAD_DIRS = [
  [1, 0, 1, 0.5],
  [-1, 0, 0, 0.5],
  [0, 1, 0.5, 1],
  [0, -1, 0.5, 0],
];

function drawRoadMarks(ctx, w, x, y) {
  const cx = PX(x + 0.5, y + 0.5);
  const cy = PY(x + 0.5, y + 0.5);
  ctx.beginPath();
  let n = 0;
  for (const [dx, dy, ex, ey] of ROAD_DIRS) {
    if (inMap(x + dx, y + dy) && w.tiles[idx(x + dx, y + dy)].road) {
      ctx.moveTo(cx, cy);
      ctx.lineTo(PX(x + ex, y + ey), PY(x + ex, y + ey));
      n++;
    }
  }
  ctx.strokeStyle = "#fde68a";
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);
  if (n === 0) {
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
  }
}

function drawRail(ctx, w, x, y) {
  const Z = 12;
  const cx = PX(x + 0.5, y + 0.5);
  const cy = PY(x + 0.5, y + 0.5);
  // pillar
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(cx - 2, cy - Z, 4, Z);
  const segs = [];
  for (const [dx, dy, ex, ey] of ROAD_DIRS) {
    const xx = x + dx;
    const yy = y + dy;
    if (!inMap(xx, yy)) continue;
    const t = w.tiles[idx(xx, yy)];
    if (t.rail || (t.b === "mrt" && t.o === idx(xx, yy))) segs.push([PX(x + ex, y + ey), PY(x + ex, y + ey) - Z]);
  }
  if (!segs.length) segs.push([cx + 6, cy - Z + 3]);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const [sx, sy] of segs) {
    ctx.moveTo(cx, cy - Z);
    ctx.lineTo(sx, sy);
  }
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.lineCap = "butt";
}

// ---------- zone buildings ----------
function drawZoneBuilding(ctx, tl, x, y, detail) {
  const h = hash(x, y);
  const lv = tl.lv;
  const flip = h > 0.5;
  if (tl.z === "hdb") {
    const paint = HDB_PAINT[Math.floor(h * HDB_PAINT.length)];
    if (lv === 1) {
      const p = flip ? box(ctx, x + 0.12, y + 0.28, x + 0.88, y + 0.72, 18, "#f5f0e6") : box(ctx, x + 0.28, y + 0.12, x + 0.72, y + 0.88, 18, "#f5f0e6");
      if (detail) floors(ctx, p, 4.5, "rgba(100,90,80,0.35)");
      box(ctx, flip ? x + 0.12 : x + 0.28, flip ? y + 0.28 : y + 0.12, flip ? x + 0.88 : x + 0.72, flip ? y + 0.72 : y + 0.88, 3, paint, 18);
    } else if (lv === 2) {
      const p = flip ? box(ctx, x + 0.08, y + 0.25, x + 0.92, y + 0.75, 44, "#f8f5ee") : box(ctx, x + 0.25, y + 0.08, x + 0.75, y + 0.92, 44, "#f8f5ee");
      if (detail) {
        floors(ctx, p, 3.6, "rgba(90,80,70,0.3)");
        ctx.fillStyle = paint;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(p.cx, p.cy);
        ctx.lineTo(p.cx, p.cy - p.h);
        ctx.lineTo(p.cx + (p.dx - p.cx) * 0.12, p.cy + (p.dy - p.cy) * 0.12 - p.h);
        ctx.lineTo(p.cx + (p.dx - p.cx) * 0.12, p.cy + (p.dy - p.cy) * 0.12);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      box(ctx, flip ? x + 0.08 : x + 0.25, flip ? y + 0.25 : y + 0.08, flip ? x + 0.92 : x + 0.75, flip ? y + 0.75 : y + 0.92, 3, paint, 44);
    } else {
      const p = box(ctx, x + 0.2, y + 0.2, x + 0.8, y + 0.8, 96, "#fbf8f2");
      if (detail) {
        floors(ctx, p, 3.2, "rgba(90,80,70,0.28)");
        columns(ctx, p, 3, "rgba(90,80,70,0.25)");
      }
      box(ctx, x + 0.2, y + 0.2, x + 0.8, y + 0.8, 5, paint, 96);
    }
  } else if (tl.z === "pte") {
    if (lv === 1) {
      const roof = h > 0.5 ? "#b91c1c" : "#9a3412";
      for (const [ox, oy] of [[0.1, 0.1], [0.55, 0.1], [0.1, 0.55], [0.55, 0.55]]) {
        box(ctx, x + ox, y + oy, x + ox + 0.35, y + oy + 0.35, 7, "#fef3c7");
        pyramidRoof(ctx, x + ox, y + oy, x + ox + 0.35, y + oy + 0.35, 7, 6, roof);
      }
    } else if (lv === 2) {
      fillDiamond(ctx, x + 0.05, y + 0.55, "#22d3ee", 0.05);
      const p = box(ctx, x + 0.15, y + 0.15, x + 0.6, y + 0.85, 38, "#99f6e4");
      if (detail) floors(ctx, p, 4, "rgba(15,118,110,0.45)");
    } else {
      const p = box(ctx, x + 0.22, y + 0.22, x + 0.78, y + 0.78, 108, "#5eead4", 0, { left: "#2dd4bf", right: "#0f766e" });
      if (detail) {
        floors(ctx, p, 5, "rgba(255,255,255,0.35)");
        columns(ctx, p, 4, "rgba(255,255,255,0.25)");
      }
      tree(ctx, x + 0.5, y + 0.5 - 0.0, 0.6);
    }
  } else if (tl.z === "com") {
    if (lv === 1) {
      const paint = SHOP_PAINT[Math.floor(h * SHOP_PAINT.length)];
      const p = box(ctx, x + 0.1, y + 0.1, x + 0.9, y + 0.9, 13, paint);
      if (detail) {
        floors(ctx, p, 6, "rgba(120,53,15,0.35)");
        columns(ctx, p, 4, "rgba(120,53,15,0.3)");
      }
      pyramidRoof(ctx, x + 0.1, y + 0.1, x + 0.9, y + 0.9, 13, 7, "#c2410c");
    } else if (lv === 2) {
      const p = box(ctx, x + 0.12, y + 0.12, x + 0.88, y + 0.88, 40, "#cbd5e1", 0, { left: "#94a3b8", right: "#64748b" });
      if (detail) {
        floors(ctx, p, 4, "rgba(30,64,175,0.5)");
        columns(ctx, p, 5, "rgba(255,255,255,0.3)");
      }
    } else {
      const tall = 120 + Math.floor(h * 50);
      const p = box(ctx, x + 0.16, y + 0.16, x + 0.84, y + 0.84, tall, "#93c5fd", 0, { left: "#60a5fa", right: "#1d4ed8" });
      if (detail) {
        floors(ctx, p, 5, "rgba(255,255,255,0.3)");
        columns(ctx, p, 4, "rgba(255,255,255,0.22)");
      }
      box(ctx, x + 0.3, y + 0.3, x + 0.7, y + 0.7, 14, "#bfdbfe", tall);
      if (h > 0.6) {
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(PX(x + 0.5, y + 0.5) - 0.5, PY(x + 0.5, y + 0.5) - tall - 34, 1, 20);
      }
    }
  } else if (tl.z === "ind") {
    if (lv === 1) {
      const p = box(ctx, x + 0.1, y + 0.15, x + 0.9, y + 0.85, 11, "#d6d3d1");
      if (detail) columns(ctx, p, 5, "rgba(68,64,60,0.35)");
      box(ctx, x + 0.7, y + 0.2, x + 0.82, y + 0.32, 26, "#78716c", 0);
    } else if (lv === 2) {
      const p = box(ctx, x + 0.1, y + 0.1, x + 0.9, y + 0.9, 26, "#fef3c7");
      if (detail) floors(ctx, p, 6.5, "rgba(37,99,235,0.6)");
    } else {
      const p = box(ctx, x + 0.08, y + 0.12, x + 0.92, y + 0.88, 18, "#f8fafc");
      if (detail) floors(ctx, p, 9, "rgba(14,165,233,0.6)");
      box(ctx, x + 0.25, y + 0.25, x + 0.45, y + 0.45, 5, "#94a3b8", 18);
      box(ctx, x + 0.55, y + 0.5, x + 0.75, y + 0.7, 5, "#94a3b8", 18);
    }
  }
}

// ---------- special buildings ----------
function drawBuilding(ctx, w, id, ox, oy, detail, time) {
  const bd = BUILDINGS[id];
  const s = bd.size;
  const x1 = ox + s;
  const y1 = oy + s;
  const cxp = PX(ox + s / 2, oy + s / 2);
  const cyp = PY(ox + s / 2, oy + s / 2);
  let top = cyp - 10;
  switch (id) {
    case "park":
      fillDiamond(ctx, ox, oy, "#4d7c0f", 0.1);
      ctx.strokeStyle = "#e7e5e4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PX(ox + 0.15, oy + 0.5), PY(ox + 0.15, oy + 0.5));
      ctx.lineTo(PX(ox + 0.85, oy + 0.5), PY(ox + 0.85, oy + 0.5));
      ctx.stroke();
      tree(ctx, ox + 0.3, oy + 0.3, 0.9);
      tree(ctx, ox + 0.75, oy + 0.3, 0.7, "#166534");
      tree(ctx, ox + 0.35, oy + 0.8, 0.8);
      top = null;
      break;
    case "solar":
      for (let k = 0; k < 3; k++) {
        const gy = oy + 0.15 + k * 0.27;
        box(ctx, ox + 0.1, gy, ox + 0.9, gy + 0.18, 2, "#1e3a8a", 0, { top: "#2563eb" });
      }
      top = null;
      break;
    case "power": {
      const p = box(ctx, ox + 0.15, oy + 0.6, x1 - 0.15, y1 - 0.15, 22, "#94a3b8");
      if (detail) floors(ctx, p, 7, "rgba(30,41,59,0.3)");
      for (const [gx, gy] of [[ox + 0.55, oy + 0.4], [ox + 1.25, oy + 0.4]]) {
        cylinder(ctx, gx, gy, 5, 52, "#e2e8f0");
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(PX(gx, gy) - 5, PY(gx, gy) - 50, 10, 6);
        ctx.fillRect(PX(gx, gy) - 5, PY(gx, gy) - 36, 10, 5);
        // smoke
        const t = (time / 900) % 1;
        ctx.fillStyle = `rgba(226,232,240,${0.6 - t * 0.5})`;
        ctx.beginPath();
        ctx.arc(PX(gx, gy) + t * 8, PY(gx, gy) - 58 - t * 14, 4 + t * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      top = cyp - 40;
      break;
    }
    case "waterworks":
    case "newater":
      cylinder(ctx, ox + 0.6, oy + 0.6, 12, 12, id === "newater" ? "#38bdf8" : "#bae6fd");
      cylinder(ctx, ox + 1.4, oy + 0.6, 12, 12, id === "newater" ? "#38bdf8" : "#bae6fd");
      box(ctx, ox + 0.2, oy + 1.15, x1 - 0.2, y1 - 0.15, 12, "#e2e8f0");
      top = cyp - 22;
      break;
    case "desal":
      fillDiamond(ctx, ox + 0.1, oy + 0.1, "#0284c7", 0.05);
      fillDiamond(ctx, ox + 0.1, oy + 0.9, "#0369a1", 0.1);
      box(ctx, ox + 1.05, oy + 0.15, x1 - 0.15, y1 - 0.15, 16, "#f1f5f9");
      top = cyp - 24;
      break;
    case "gardens": {
      ctx.fillStyle = "#4d7c0f";
      diamondPath(ctx, ox + 0.05, oy + 0.05, x1 - 0.05, y1 - 0.05);
      ctx.fill();
      // cooled conservatory domes
      for (const [gx, gy] of [[ox + 2.3, oy + 0.7], [ox + 0.7, oy + 2.3]]) {
        ctx.beginPath();
        ctx.ellipse(PX(gx, gy), PY(gx, gy), 22, 12, 0, Math.PI, 0);
        ctx.fillStyle = "rgba(186,230,253,0.9)";
        ctx.fill();
        ctx.strokeStyle = "#e0f2fe";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      const trees = [[1.0, 1.0, 40], [1.6, 1.3, 52], [1.3, 1.8, 46], [2.0, 2.0, 36], [1.9, 1.0, 30], [1.0, 1.6, 30]];
      for (const [gx, gy, ht] of trees) {
        const X = PX(ox + gx, oy + gy);
        const Y = PY(ox + gx, oy + gy);
        ctx.strokeStyle = "#7c3aed";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(X, Y);
        ctx.lineTo(X, Y - ht);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(X - 3, Y - ht + 6);
        ctx.lineTo(X - 10, Y - ht - 4);
        ctx.lineTo(X + 10, Y - ht - 4);
        ctx.lineTo(X + 3, Y - ht + 6);
        ctx.fillStyle = "#a855f7";
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(X, Y - ht - 4, 10, 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#c084fc";
        ctx.fill();
      }
      top = cyp - 62;
      break;
    }
    case "ir": {
      const towers = [[0.3, 1.9], [1.1, 1.9], [1.9, 1.9]];
      // podium
      box(ctx, ox + 0.1, oy + 2.2, x1 - 0.1, y1 - 0.1, 10, "#e2e8f0");
      for (const [gx] of towers) {
        const p = box(ctx, ox + gx, oy + 0.3, ox + gx + 0.6, oy + 2.0, 84, "#e2e8f0", 0, { left: "#cbd5e1", right: "#94a3b8" });
        if (detail) floors(ctx, p, 4, "rgba(100,116,139,0.35)");
      }
      // SkyPark
      box(ctx, ox + 0.1, oy + 0.6, x1 + 0.3, oy + 1.5, 4, "#f8fafc", 84, { top: "#f1f5f9" });
      for (let k = 0; k < 4; k++) tree(ctx, ox + 0.6 + k * 0.6, oy + 1.05, 0.35);
      ctx.fillStyle = "#38bdf8";
      diamondPath(ctx, ox + 2.2, oy + 0.7, x1 + 0.2, oy + 1.4, 88);
      ctx.fill();
      top = cyp - 110;
      break;
    }
    case "airport": {
      ctx.fillStyle = "#3f3f46";
      diamondPath(ctx, ox + 0.1, oy + 2.8, x1 - 0.1, oy + 3.6);
      ctx.fill();
      ctx.strokeStyle = "#fafafa";
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(PX(ox + 0.3, oy + 3.2), PY(ox + 0.3, oy + 3.2));
      ctx.lineTo(PX(x1 - 0.3, oy + 3.2), PY(x1 - 0.3, oy + 3.2));
      ctx.stroke();
      ctx.setLineDash([]);
      const p = box(ctx, ox + 0.3, oy + 0.3, x1 - 0.3, oy + 1.8, 14, "#f1f5f9", 0, { left: "#bae6fd", right: "#7dd3fc" });
      if (detail) columns(ctx, p, 10, "rgba(255,255,255,0.6)");
      box(ctx, ox + 3.2, oy + 2.0, ox + 3.5, oy + 2.3, 36, "#e5e7eb");
      box(ctx, ox + 3.05, oy + 1.85, ox + 3.65, oy + 2.45, 6, "#0ea5e9", 36);
      // plane
      const t = (time / 6000) % 1;
      const gx = ox + 0.2 + t * (s - 0.4);
      const X = PX(gx, oy + 3.2);
      const Y = PY(gx, oy + 3.2) - t * 30;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(X, Y - 4, 9, 2.5, 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(X - 2, Y - 4);
      ctx.lineTo(X - 7, Y + 2);
      ctx.lineTo(X + 1, Y - 3);
      ctx.fill();
      top = cyp - 40;
      break;
    }
    case "port": {
      const cols = ["#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed"];
      for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) {
        const c = cols[Math.floor(hash(ox + a, oy + b) * cols.length)];
        box(ctx, ox + 0.3 + a * 0.8, oy + 1.6 + b * 0.6, ox + 0.9 + a * 0.8, oy + 2.0 + b * 0.6, 6 + (a % 2) * 5, c);
      }
      for (const gx of [0.6, 1.6, 2.5]) {
        const X = PX(ox + gx, oy + 0.6);
        const Y = PY(ox + gx, oy + 0.6);
        ctx.strokeStyle = "#ea580c";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(X - 6, Y + 3);
        ctx.lineTo(X - 6, Y - 34);
        ctx.moveTo(X + 6, Y - 3);
        ctx.lineTo(X + 6, Y - 38);
        ctx.moveTo(X - 14, Y - 30);
        ctx.lineTo(X + 18, Y - 46);
        ctx.stroke();
      }
      top = cyp - 40;
      break;
    }
    case "mrt": {
      const p = box(ctx, ox + 0.08, oy + 0.08, x1 - 0.08, y1 - 0.08, 16, "#f8fafc", 0, { left: "#e2e8f0", right: "#cbd5e1" });
      box(ctx, ox + 0.03, oy + 0.03, x1 - 0.03, y1 - 0.03, 4, "#dc2626", 16);
      if (detail) columns(ctx, p, 4, "rgba(220,38,38,0.4)");
      top = cyp - 30;
      break;
    }
    case "hawker": {
      box(ctx, ox + 0.12, oy + 0.12, x1 - 0.12, y1 - 0.12, 8, "#fff7ed", 0, { left: "#fed7aa", right: "#fdba74" });
      pyramidRoof(ctx, ox + 0.04, oy + 0.04, x1 - 0.04, y1 - 0.04, 8, 10, "#ea580c");
      top = cyp - 26;
      break;
    }
    case "school": {
      fillDiamond(ctx, ox, oy, "#4ade80", 0.08);
      const p = box(ctx, ox + 0.1, oy + 0.1, x1 - 0.45, y1 - 0.1, 18, "#fef9c3", 0, { left: "#fde68a", right: "#facc15" });
      if (detail) floors(ctx, p, 6, "rgba(161,98,7,0.5)");
      top = cyp - 30;
      break;
    }
    case "hospital": {
      const p = box(ctx, ox + 0.2, oy + 0.2, x1 - 0.2, y1 - 0.2, 40, "#f8fafc");
      if (detail) {
        floors(ctx, p, 5, "rgba(14,116,144,0.4)");
        columns(ctx, p, 6, "rgba(14,116,144,0.25)");
      }
      top = cyp - 54;
      break;
    }
    default: {
      const h = bd.h || 12;
      const p = box(ctx, ox + 0.12, oy + 0.12, x1 - 0.12, y1 - 0.12, h, bd.color);
      if (detail) floors(ctx, p, 6, "rgba(0,0,0,0.18)");
      top = cyp - h - 12;
    }
  }
  return top;
}

// ---------- overlays ----------
function heat(v) {
  // v in 0..1 -> red..yellow..green
  const t = Math.max(0, Math.min(1, v));
  const r = t < 0.5 ? 239 : Math.round(239 - (t - 0.5) * 2 * (239 - 34));
  const g = t < 0.5 ? Math.round(68 + t * 2 * (179 - 68)) : Math.round(179 + (t - 0.5) * 2 * (197 - 179));
  const b = t < 0.5 ? 68 : Math.round(68 + (t - 0.5) * 2 * (94 - 68));
  return `rgba(${r},${g},${b},0.62)`;
}

export const OVERLAYS = {
  none: { name: "None", icon: "🗺️" },
  landValue: { name: "Land value", icon: "💎", get: (A, i) => A.landValue[i] / 80 },
  pollution: { name: "Pollution", icon: "🏭", get: (A, i) => 1 - A.pollution[i] / 50 },
  utilities: { name: "Power & water", icon: "💡", get: (A, i, w) => (w.tiles[i].z || w.tiles[i].b ? (A.pw[i] && A.wt[i] ? 1 : 0) : null) },
  food: { name: "Hawker cover", icon: "🍜", get: (A, i) => A.cover.food[i] },
  school: { name: "School cover", icon: "🏫", get: (A, i) => A.cover.school[i] },
  health: { name: "Health cover", icon: "🩺", get: (A, i) => A.cover.health[i] },
  safety: { name: "Police cover", icon: "👮", get: (A, i) => A.cover.safety[i] },
  fire: { name: "Fire cover", icon: "🚒", get: (A, i) => A.cover.fire[i] },
  transport: { name: "Transport", icon: "🚇", get: (A, i) => A.transportScore[i] },
  green: { name: "Greenery", icon: "🌳", get: (A, i) => A.cover.green[i] },
};

// ---------- main draw ----------
export function draw(ctx, w, A, cam, view) {
  const { width, height, dpr, overlay = "none", preview, selected, time = 0 } = view;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#0369a1");
  grad.addColorStop(1, "#075985");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.setTransform(dpr * cam.zoom, 0, 0, dpr * cam.zoom, dpr * cam.x, dpr * cam.y);
  const detail = cam.zoom >= 0.5;

  // visible grid range
  const corners = [screenToGrid(cam, 0, 0), screenToGrid(cam, width, 0), screenToGrid(cam, 0, height), screenToGrid(cam, width, height)];
  const minX = Math.max(0, Math.min(...corners.map((c) => c.x)) - 1);
  const maxX = Math.min(N - 1, Math.max(...corners.map((c) => c.x)) + 6);
  const minY = Math.max(0, Math.min(...corners.map((c) => c.y)) - 1);
  const maxY = Math.min(N - 1, Math.max(...corners.map((c) => c.y)) + 6);
  // bounds in iso px for quick culling
  const vx0 = -cam.x / cam.zoom - TW;
  const vx1 = (width - cam.x) / cam.zoom + TW;
  const vy0 = -cam.y / cam.zoom - TH;
  const vy1 = (height - cam.y) / cam.zoom + 200;
  const visible = (x, y) => {
    const px = PX(x + 0.5, y + 0.5);
    const py = PY(x + 0.5, y + 0.5);
    return px > vx0 && px < vx1 && py > vy0 && py < vy1;
  };

  const ov = overlay !== "none" ? OVERLAYS[overlay] : null;

  // Ground pass
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!visible(x, y)) continue;
      const i = idx(x, y);
      const tl = w.tiles[i];
      diamondPath(ctx, x, y, x + 1, y + 1);
      ctx.fillStyle = groundColor(w, tl, x, y);
      ctx.fill();
      if (tl.t === "land" && detail) {
        ctx.strokeStyle = "rgba(0,0,0,0.06)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      if (tl.road && detail) drawRoadMarks(ctx, w, x, y);
      if (tl.z && tl.lv === 0) {
        diamondPath(ctx, x + 0.08, y + 0.08, x + 0.92, y + 0.92);
        ctx.fillStyle = ZONES[tl.z].color + "70";
        ctx.fill();
        ctx.strokeStyle = ZONES[tl.z].color;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      if (ov && A && tl.t === "land") {
        const v = ov.get(A, i, w);
        if (v != null) {
          diamondPath(ctx, x, y, x + 1, y + 1);
          ctx.fillStyle = heat(v);
          ctx.fill();
        }
      }
    }
  }

  // Preview footprint on the ground
  if (preview && preview.cells) {
    for (const c of preview.cells) {
      if (!inMap(c.x, c.y)) continue;
      diamondPath(ctx, c.x + 0.04, c.y + 0.04, c.x + 0.96, c.y + 0.96);
      ctx.fillStyle = c.ok ? "rgba(250,250,250,0.55)" : "rgba(239,68,68,0.6)";
      ctx.fill();
      ctx.strokeStyle = c.ok ? "#fff" : "#b91c1c";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  if (selected) {
    diamondPath(ctx, selected.x, selected.y, selected.x + 1, selected.y + 1);
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Object pass in back-to-front diagonal order
  const icons = [];
  const blink = Math.floor(time / 700) % 2 === 0;
  if (ov) ctx.globalAlpha = 0.55;
  for (let s = minX + minY; s <= maxX + maxY; s++) {
    for (let x = Math.max(minX, s - maxY); x <= Math.min(maxX, s - minY); x++) {
      const y = s - x;
      if (!visible(x, y)) continue;
      const i = idx(x, y);
      const tl = w.tiles[i];
      if (tl.t !== "land") continue;
      if (tl.tr && !tl.b && !tl.road && !tl.rail && !(tl.z && tl.lv > 0)) {
        const h = hash(x, y);
        tree(ctx, x + 0.3, y + 0.3, 1.2, h > 0.5 ? "#15803d" : "#166534");
        tree(ctx, x + 0.75, y + 0.55, 1.05, "#14532d");
        if (h > 0.3) tree(ctx, x + 0.35, y + 0.8, 1.1);
      }
      if (tl.z && tl.lv > 0) {
        drawZoneBuilding(ctx, tl, x, y, detail);
        if (A && (!A.pw[i] || !A.wt[i]) && blink) icons.push([!A.pw[i] ? "⚡" : "💧", PX(x + 0.5, y + 0.5), PY(x + 0.5, y + 0.5) - 30]);
      }
      if (tl.b) {
        const o = tl.o;
        const ox = o % N;
        const oy = Math.floor(o / N);
        const bd = BUILDINGS[w.tiles[o].b];
        if (x === ox + bd.size - 1 && y === oy + bd.size - 1) {
          const top = drawBuilding(ctx, w, w.tiles[o].b, ox, oy, detail, time);
          const reason = A?.active.get(o);
          const cx = PX(ox + bd.size / 2, oy + bd.size / 2);
          if (reason && blink) icons.push(["⚠️", cx, (top ?? PY(ox + bd.size / 2, oy + bd.size / 2) - 10) - 12]);
          else if (top != null && detail) icons.push([bd.icon, cx, top]);
        }
      }
      if (tl.rail) drawRail(ctx, w, x, y);
    }
  }
  ctx.globalAlpha = 1;

  // Ghost of a placed building
  if (preview && preview.origin && preview.size) {
    const bd = preview.building && BUILDINGS[preview.building];
    if (bd) {
      ctx.globalAlpha = 0.65;
      const top = drawBuilding(ctx, w, preview.building, preview.origin.x, preview.origin.y, detail, time);
      ctx.globalAlpha = 1;
      if (top != null) icons.push([bd.icon, PX(preview.origin.x + bd.size / 2, preview.origin.y + bd.size / 2), top]);
    }
  }

  if (cam.zoom > 0.35) {
    const size = Math.max(12, Math.min(18, 14 / Math.sqrt(cam.zoom)));
    for (const [ch, x, y] of icons) emoji(ctx, ch, x, y, size);
  }
}
