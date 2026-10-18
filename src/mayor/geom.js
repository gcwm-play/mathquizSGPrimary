// Geometry helpers for free-flowing roads: quadratic Bézier curves, polylines,
// nearest points, intersections and convex quads. World units: 1 ≈ 50 m.

export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function bezPoint(ax, ay, cx, cy, bx, by, t) {
  const u = 1 - t;
  return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by];
}

export function bezLength(ax, ay, cx, cy, bx, by) {
  return (dist(ax, ay, bx, by) + dist(ax, ay, cx, cy) + dist(cx, cy, bx, by)) / 2;
}

// Split a quadratic curve at t. Returns the control points of both halves.
export function bezSplit(ax, ay, cx, cy, bx, by, t) {
  const c1x = lerp(ax, cx, t);
  const c1y = lerp(ay, cy, t);
  const c2x = lerp(cx, bx, t);
  const c2y = lerp(cy, by, t);
  const mx = lerp(c1x, c2x, t);
  const my = lerp(c1y, c2y, t);
  return { mx, my, c1x, c1y, c2x, c2y };
}

// Sample a curve into a polyline with roughly `step` spacing. Points are uniform in t.
export function sampleBez(ax, ay, cx, cy, bx, by, step = 0.35) {
  const n = Math.max(2, Math.ceil(bezLength(ax, ay, cx, cy, bx, by) / step));
  const pts = new Float32Array((n + 1) * 2);
  for (let i = 0; i <= n; i++) {
    const [x, y] = bezPoint(ax, ay, cx, cy, bx, by, i / n);
    pts[i * 2] = x;
    pts[i * 2 + 1] = y;
  }
  return pts;
}

export function polyLength(pts) {
  let L = 0;
  for (let i = 2; i < pts.length; i += 2) L += dist(pts[i - 2], pts[i - 1], pts[i], pts[i + 1]);
  return L;
}

// Point and unit tangent at arc length s along a polyline.
export function pointAt(pts, s) {
  let acc = 0;
  for (let i = 2; i < pts.length; i += 2) {
    const x0 = pts[i - 2];
    const y0 = pts[i - 1];
    const x1 = pts[i];
    const y1 = pts[i + 1];
    const l = dist(x0, y0, x1, y1);
    if (acc + l >= s || i === pts.length - 2) {
      const f = l > 0 ? clamp((s - acc) / l, 0, 1) : 0;
      return { x: lerp(x0, x1, f), y: lerp(y0, y1, f), tx: l > 0 ? (x1 - x0) / l : 1, ty: l > 0 ? (y1 - y0) / l : 0 };
    }
    acc += l;
  }
  return { x: pts[0], y: pts[1], tx: 1, ty: 0 };
}

// Nearest point on a polyline. t is the fraction along the samples (≈ curve parameter).
export function nearestOnPoly(pts, px, py) {
  let best = { d: Infinity, x: 0, y: 0, t: 0 };
  const n = pts.length / 2 - 1;
  for (let i = 0; i < n; i++) {
    const x0 = pts[i * 2];
    const y0 = pts[i * 2 + 1];
    const x1 = pts[i * 2 + 2];
    const y1 = pts[i * 2 + 3];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l2 = dx * dx + dy * dy;
    const f = l2 > 0 ? clamp(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1) : 0;
    const x = x0 + dx * f;
    const y = y0 + dy * f;
    const d = dist(px, py, x, y);
    if (d < best.d) best = { d, x, y, t: (i + f) / n };
  }
  return best;
}

// Intersection of segments p1p2 and p3p4: returns {t, u} along each, or null.
export function segHit(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { t, u };
}

// All crossings between two polylines, as fractions along each.
export function polyCrossings(a, b) {
  const out = [];
  const na = a.length / 2 - 1;
  const nb = b.length / 2 - 1;
  for (let i = 0; i < na; i++) {
    const ax0 = a[i * 2], ay0 = a[i * 2 + 1], ax1 = a[i * 2 + 2], ay1 = a[i * 2 + 3];
    const minx = Math.min(ax0, ax1), maxx = Math.max(ax0, ax1), miny = Math.min(ay0, ay1), maxy = Math.max(ay0, ay1);
    for (let j = 0; j < nb; j++) {
      const bx0 = b[j * 2], by0 = b[j * 2 + 1], bx1 = b[j * 2 + 2], by1 = b[j * 2 + 3];
      if (Math.max(bx0, bx1) < minx || Math.min(bx0, bx1) > maxx || Math.max(by0, by1) < miny || Math.min(by0, by1) > maxy) continue;
      const h = segHit(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1);
      if (h) out.push({ ta: (i + h.t) / na, tb: (j + h.u) / nb, x: lerp(ax0, ax1, h.t), y: lerp(ay0, ay1, h.t) });
    }
  }
  return out;
}

// Convex quad given as [x0,y0,x1,y1,x2,y2,x3,y3]
export function inQuad(q, px, py) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const x0 = q[i * 2];
    const y0 = q[i * 2 + 1];
    const x1 = q[((i + 1) % 4) * 2];
    const y1 = q[((i + 1) % 4) * 2 + 1];
    const c = (x1 - x0) * (py - y0) - (y1 - y0) * (px - x0);
    if (c !== 0) {
      if (sign === 0) sign = Math.sign(c);
      else if (Math.sign(c) !== sign) return false;
    }
  }
  return true;
}

// Bilinear point inside a lot quad: u along the road (0..1), v away from it (0..1).
export function quadPoint(q, u, v) {
  const ax = lerp(q[0], q[2], u);
  const ay = lerp(q[1], q[3], u);
  const bx = lerp(q[6], q[4], u);
  const by = lerp(q[7], q[5], u);
  return [lerp(ax, bx, v), lerp(ay, by, v)];
}

// A rectangle footprint centred at (x, y), rotated by angle, as a quad.
export function rectQuad(x, y, ang, w, d) {
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  const vx = -uy;
  const vy = ux;
  const hw = w / 2;
  const hd = d / 2;
  return [
    x - ux * hw - vx * hd, y - uy * hw - vy * hd,
    x + ux * hw - vx * hd, y + uy * hw - vy * hd,
    x + ux * hw + vx * hd, y + uy * hw + vy * hd,
    x - ux * hw + vx * hd, y - uy * hw + vy * hd,
  ];
}

export function quadCenter(q) {
  return [(q[0] + q[2] + q[4] + q[6]) / 4, (q[1] + q[3] + q[5] + q[7]) / 4];
}

export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeNoise(seed, cell, size = 80) {
  const rng = makeRng(seed);
  const g = Math.ceil(size / cell) + 3;
  const grid = Array.from({ length: g * g }, () => rng() * 2 - 1);
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = (x + cell) / cell;
    const fy = (y + cell) / cell;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    if (x0 < 0 || y0 < 0 || x0 >= g - 1 || y0 >= g - 1) return 0;
    const tx = sm(fx - x0);
    const ty = sm(fy - y0);
    const v = (i, j) => grid[(y0 + j) * g + (x0 + i)];
    const a = v(0, 0) + (v(1, 0) - v(0, 0)) * tx;
    const b = v(0, 1) + (v(1, 1) - v(0, 1)) * tx;
    return a + (b - a) * ty;
  };
}

// Distance from a point to a polyline given as [[x,y],...]
export function distToPath(path, px, py) {
  let d = Infinity;
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1];
    const [x1, y1] = path[i];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l2 = dx * dx + dy * dy;
    const f = l2 > 0 ? clamp(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1) : 0;
    d = Math.min(d, dist(px, py, x0 + dx * f, y0 + dy * f));
  }
  return d;
}
