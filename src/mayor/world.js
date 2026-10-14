// The world of Lion City Mayor: terrain, curved roads, lots, kampongs and
// services, plus every editing operation. Derived caches live on keys that
// start with "_" and are never saved.
import { MAP, REGIONS, es2w, w2es } from "./regions.js";
import { ROAD_TYPES, STRUCTS, LOT_TYPES, ZONE_LINE, DIFFICULTY, START_YEAR, FIRST_ELECTION, KAMPONG, PURPOSES } from "./defs.js";
import { residents, displace, relocationPlan } from "./housing.js";
import { dist, clamp, bezPoint, bezSplit, sampleBez, polyLength, pointAt, nearestOnPoly, polyCrossings, inQuad, rectQuad, quadCenter, makeRng, makeNoise, distToPath } from "./geom.js";

export const RES = 0.5;
export const C = MAP / RES; // occupancy cells per side
const G = C + 1; // terrain samples per side

// ---------- terrain ----------
export function terrain(w) {
  const key = `${w.region}:${w.seed}:${w.edits.length}`;
  if (w._terrainKey === key) return w._terrain;
  const R = REGIONS[w.region];
  const n1 = makeNoise(w.seed, 7, MAP + 20);
  const n2 = makeNoise(w.seed + 7, 3, MAP + 20);
  const L = new Float32Array(G * G);
  const F = new Float32Array(G * G);
  const J = new Float32Array(G * G).fill(-1);
  const fresh = (R.fresh || []).map((f) => (f.kind === "river" ? { ...f, wpath: f.path.map(([e, s]) => es2w(e, s)) } : f));
  for (let j = 0; j < G; j++) {
    for (let i = 0; i < G; i++) {
      const x = i * RES;
      const y = j * RES;
      const [e, s] = w2es(x, y);
      const n = n1(x, y) * 0.75 + n2(x, y) * 0.25;
      let l = R.land(e, s, n);
      for (const ed of w.edits) l = Math.max(l, ed.r - dist(x, y, ed.x, ed.y));
      L[j * G + i] = l;
      let f = -9;
      for (const fr of fresh) {
        if (fr.kind === "river") f = Math.max(f, fr.w / 2 - distToPath(fr.wpath, x, y) + n2(x, y) * 0.15);
        else f = Math.max(f, (1 - Math.hypot((e - fr.e) / fr.rx, (s - fr.s) / fr.ry)) * Math.min(fr.rx, fr.ry) + n * 0.4);
      }
      F[j * G + i] = f;
      if (R.foreign) J[j * G + i] = R.foreign(e, s, n);
    }
  }
  w._terrain = { L, F, J, key };
  w._terrainKey = key;
  return w._terrain;
}

function sample(arr, x, y) {
  const fx = clamp(x / RES, 0, G - 1.001);
  const fy = clamp(y / RES, 0, G - 1.001);
  const i = Math.floor(fx);
  const j = Math.floor(fy);
  const tx = fx - i;
  const ty = fy - j;
  const a = arr[j * G + i] + (arr[j * G + i + 1] - arr[j * G + i]) * tx;
  const b = arr[(j + 1) * G + i] + (arr[(j + 1) * G + i + 1] - arr[(j + 1) * G + i]) * tx;
  return a + (b - a) * ty;
}
export const TERRAIN_GRID = G;

export function terrainAt(w, x, y) {
  if (x < 0 || y < 0 || x > MAP || y > MAP) return "off";
  const T = terrain(w);
  if (sample(T.J, x, y) > 0) return "foreign";
  if (sample(T.L, x, y) <= 0) return "sea";
  if (sample(T.F, x, y) > 0) return "fresh";
  return "land";
}
export const isLand = (w, x, y) => terrainAt(w, x, y) === "land";

// ---------- roads ----------
export function segPts(w, seg) {
  if (!w._pts) w._pts = new Map();
  let p = w._pts.get(seg.id);
  if (!p) {
    const a = nodeById(w, seg.a);
    const b = nodeById(w, seg.b);
    p = sampleBez(a.x, a.y, seg.cx, seg.cy, b.x, b.y, 0.3);
    w._pts.set(seg.id, p);
  }
  return p;
}
export function nodeById(w, id) {
  if (!w._nodes || w._nodesRev !== w.rev) {
    w._nodes = new Map(w.nodes.map((n) => [n.id, n]));
    w._nodesRev = w.rev;
  }
  return w._nodes.get(id);
}
const layerOf = (type) => (ROAD_TYPES[type].rail ? "rail" : "road");
const touch = (w) => {
  w.rev = (w.rev || 0) + 1;
};

// ---------- occupancy grid ----------
// 0 free, >0 lot id, -1 road, -4 rail, -3 kampong house, <= -10 struct (-(10 + id))
export function occ(w) {
  if (w._occ && w._occRev === w.rev) return w._occ;
  const o = new Int32Array(C * C);
  for (const s of w.segs) {
    const rt = ROAD_TYPES[s.type];
    markPath(o, segPts(w, s), rt.half + 0.12, rt.rail ? -4 : -1, true);
  }
  for (const k of w.kampongs) for (const h of k.houses) markDisc(o, h[0], h[1], 0.55, -3);
  for (const st of w.structs) markQuad(o, st.q, -(10 + st.id));
  for (const l of w.lots) markQuad(o, l.q, l.id);
  w._occ = o;
  w._occRev = w.rev;
  return o;
}
const cellOf = (x, y) => {
  const i = Math.floor(x / RES);
  const j = Math.floor(y / RES);
  return i < 0 || j < 0 || i >= C || j >= C ? -1 : j * C + i;
};
export const occAt = (w, x, y) => {
  const c = cellOf(x, y);
  return c < 0 ? -99 : occ(w)[c];
};
function markQuad(o, q, v) {
  const xs = [q[0], q[2], q[4], q[6]];
  const ys = [q[1], q[3], q[5], q[7]];
  const i0 = Math.max(0, Math.floor(Math.min(...xs) / RES));
  const i1 = Math.min(C - 1, Math.floor(Math.max(...xs) / RES));
  const j0 = Math.max(0, Math.floor(Math.min(...ys) / RES));
  const j1 = Math.min(C - 1, Math.floor(Math.max(...ys) / RES));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (inQuad(q, (i + 0.5) * RES, (j + 0.5) * RES)) o[j * C + i] = v;
}
function markDisc(o, x, y, r, v) {
  for (let j = Math.floor((y - r) / RES); j <= Math.floor((y + r) / RES); j++)
    for (let i = Math.floor((x - r) / RES); i <= Math.floor((x + r) / RES); i++) {
      if (i < 0 || j < 0 || i >= C || j >= C) continue;
      if (dist((i + 0.5) * RES, (j + 0.5) * RES, x, y) <= r) o[j * C + i] = v;
    }
}
function markPath(o, pts, r, v, keepRoads) {
  for (let k = 0; k < pts.length; k += 2) {
    const x = pts[k];
    const y = pts[k + 1];
    for (let j = Math.floor((y - r) / RES); j <= Math.floor((y + r) / RES); j++)
      for (let i = Math.floor((x - r) / RES); i <= Math.floor((x + r) / RES); i++) {
        if (i < 0 || j < 0 || i >= C || j >= C) continue;
        if (dist((i + 0.5) * RES, (j + 0.5) * RES, x, y) > r) continue;
        const c = j * C + i;
        if (keepRoads && o[c] === -1) continue;
        o[c] = v;
      }
  }
}
// Everything a path of radius r touches
function hitsAlong(w, pts, r) {
  const o = occ(w);
  const lots = new Set();
  const structs = new Set();
  let kampong = false;
  for (let k = 0; k < pts.length; k += 2) {
    const x = pts[k];
    const y = pts[k + 1];
    for (let j = Math.floor((y - r) / RES); j <= Math.floor((y + r) / RES); j++)
      for (let i = Math.floor((x - r) / RES); i <= Math.floor((x + r) / RES); i++) {
        if (i < 0 || j < 0 || i >= C || j >= C || dist((i + 0.5) * RES, (j + 0.5) * RES, x, y) > r) continue;
        const v = o[j * C + i];
        if (v > 0) lots.add(v);
        else if (v <= -10) structs.add(-v - 10);
        else if (v === -3) kampong = true;
      }
  }
  return { lots, structs, kampong };
}

// ---------- world creation ----------
export function townOf(w, x, y) {
  let best = 0;
  let bd = Infinity;
  w.towns.forEach((t, i) => {
    const d = dist(x, y, t.x, t.y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

export function newWorld({ region = "east", difficulty = "normal", name, seed = Math.floor(Math.random() * 1e9), mode = "campaign" } = {}) {
  const R = REGIONS[region];
  const D = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  const w = {
    version: 1,
    kind: "mayor",
    mode,
    region,
    difficulty,
    name: name || R.name,
    seed,
    year: START_YEAR,
    month: 7,
    t: 0,
    rev: 0,
    nextId: 1,
    edits: [],
    nodes: [],
    segs: [],
    lots: [],
    structs: [],
    kampongs: [],
    trees: [],
    towns: R.towns.map((t) => {
      const [x, y] = es2w(t.e, t.s);
      return { name: t.name, x, y, approval: 55, support: 55, anger: 0, needs: {}, pop: 0, feedback: [], purpose: t.resort ? "resort" : R.purposes?.[t.name] || "mixed" };
    }),
    cash: D.cash,
    waitlist: D.waitlist,
    trust: 60,
    taxes: { property: 10 },
    funding: 100,
    hdbGrant: 50,
    effects: [],
    pledges: [],
    // first poll in April 1968, like the real general election
    election: { next: (FIRST_ELECTION - START_YEAR) * 12 + 3 - 7, history: [] },
    news: [],
    history: [],
    stats: { pop: 0, jobs: 0, kampongPop: 0 },
    demand: { hdb: 0.8, pte: 0.2, com: 0.3, ind: 0.3 },
    approval: 55,
    goalsDone: {},
    gameOver: null,
    ledger: null,
    yearAcc: { rev: {}, exp: {} },
    lastYear: null,
    focus: null,
    sentosa: R.sentosa ? { fee: 6, marketing: 0, visitors: 0, sat: 60, rev: 0 } : null,
  };
  const rng = makeRng(seed);

  // Kampongs: clusters of attap houses
  for (const k of R.kampongs) {
    const [cx, cy] = es2w(k.e, k.s);
    const houses = [];
    const want = Math.round(k.pop / KAMPONG.housePop);
    for (let tries = 0; tries < want * 40 && houses.length < want; tries++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * k.r;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (!isLand(w, x, y) || houses.some((h) => dist(h[0], h[1], x, y) < 0.95)) continue;
      houses.push([+x.toFixed(2), +y.toFixed(2), +(rng() * Math.PI).toFixed(2), Math.floor(rng() * 4)]);
    }
    w.kampongs.push({ id: w.nextId++, name: k.name, x: cx, y: cy, r: k.r, houses, q: KAMPONG.q, town: townOf(w, cx, cy) });
  }
  touch(w);

  // Old roads (free), lots along them
  // keep authored road ends a little inside the map
  const inside = ([x, y]) => [clamp(x, 0.8, MAP - 0.8), clamp(y, 0.8, MAP - 0.8)];
  for (const [a, c, b] of R.roads) {
    const A = inside(es2w(...a));
    const Cc = es2w(...c);
    const B = inside(es2w(...b));
    const plan = planRoad(w, "road", { x: A[0], y: A[1] }, { x: B[0], y: B[1] }, { x: Cc[0], y: Cc[1] }, { init: true });
    if (plan.ok) commitRoad(w, plan, { free: true });
  }
  w.startSegs = w.segs.length;
  if (R.causeway) {
    const [a, b] = R.causeway.map((p) => es2w(...p));
    w.causeway = { ax: a[0], ay: a[1], bx: b[0], by: b[1] };
  }

  // Old shophouses and farms already standing
  for (const ot of R.oldTown || []) {
    const [ox, oy] = es2w(ot.e, ot.s);
    for (const l of w.lots) if (dist(l.x, l.y, ox, oy) < ot.r) {
      l.zone = "com";
      l.b = { type: "shophouse", state: "live", built: -360, v: Math.floor(rng() * 6) };
    }
  }
  for (const l of w.lots) {
    if (!l.zone && w.towns[l.town].purpose !== "resort" && rng() < 0.18) {
      l.zone = "ind";
      l.b = { type: "farm", state: "live", built: -120, v: Math.floor(rng() * 4) };
    }
  }

  // Fixed scenery
  for (const st of R.structs || []) {
    const [x, y] = es2w(st.e, st.s);
    const S = STRUCTS[st.type];
    const q = rectQuad(x, y, st.ang, S.w, S.d);
    removeLotsInQuad(w, q);
    w.structs.push({ id: w.nextId++, type: st.type, x, y, ang: st.ang, q, built: -300 });
  }
  touch(w);

  // Forests and plantations
  const fn = makeNoise(seed + 99, 5, MAP + 20);
  for (let y = 0.6; y < MAP; y += 1.15) {
    for (let x = 0.6; x < MAP; x += 1.15) {
      const px = x + (rng() - 0.5) * 0.8;
      const py = y + (rng() - 0.5) * 0.8;
      if (!isLand(w, px, py)) continue;
      const ti = townOf(w, px, py);
      const nearTown = dist(px, py, w.towns[ti].x, w.towns[ti].y);
      const density = fn(px, py) + Math.min(0.5, nearTown / 30) - 0.05;
      if (density < 0.2) continue;
      const o = occAt(w, px, py);
      if (o < 0 || (o > 0 && w.lots.find((l) => l.id === o)?.b)) continue;
      w.trees.push([+px.toFixed(2), +py.toFixed(2), Math.floor(rng() * 6)]);
    }
  }
  const mid = w.towns[1] || w.towns[0];
  w.focus = { x: mid.x, y: mid.y };
  return w;
}

// ---------- road planning ----------
// Snap a point to a nearby junction or road of the same layer.
export function snapPoint(w, x, y, layer) {
  let best = null;
  for (const n of w.nodes) {
    const d = dist(x, y, n.x, n.y);
    if (d < 1.8 && (!best || d < best.d)) {
      const segs = w.segs.filter((s) => (s.a === n.id || s.b === n.id) && layerOf(s.type) === layer);
      if (segs.length) best = { d, x: n.x, y: n.y, node: n.id };
    }
  }
  if (best) return best;
  for (const s of w.segs) {
    if (layerOf(s.type) !== layer) continue;
    const hit = nearestOnPoly(segPts(w, s), x, y);
    if (hit.d < 1.5 && (!best || hit.d < best.d)) best = { d: hit.d, x: hit.x, y: hit.y, seg: s.id, t: hit.t };
  }
  return best || { x, y };
}

// If a road end stops just short of another road, carry it on to join it.
function extendToRoad(w, from, end, layer, reach = 3.2) {
  const dx = end.x - from.x;
  const dy = end.y - from.y;
  const L = Math.hypot(dx, dy);
  if (L < 0.01) return end;
  const ux = dx / L;
  const uy = dy / L;
  for (let k = 0.25; k <= reach; k += 0.25) {
    const sp = snapPoint(w, end.x + ux * k, end.y + uy * k, layer);
    if ((sp.node != null || sp.seg != null) && sp.d < 0.6) return sp;
  }
  return end;
}

export function planRoad(w, type, A, B, Cc, opts = {}) {
  const rt = ROAD_TYPES[type];
  const layer = layerOf(type);
  let sa = snapPoint(w, A.x, A.y, layer);
  let sb = snapPoint(w, B.x, B.y, layer);
  const c = Cc || { x: (sa.x + sb.x) / 2, y: (sa.y + sb.y) / 2 };
  if (!opts.init) {
    if (sb.node == null && sb.seg == null) sb = extendToRoad(w, c, sb, layer);
    if (sa.node == null && sa.seg == null) sa = extendToRoad(w, c, sa, layer);
  }
  const pts = sampleBez(sa.x, sa.y, c.x, c.y, sb.x, sb.y, 0.3);
  const len = polyLength(pts);
  const base = { ok: false, type, sa, sb, c, pts, len, cost: 0 };
  if (len < 1.2) return { ...base, msg: "Too short: tap further away" };
  if (sa.seg != null && sa.seg === sb.seg) return { ...base, msg: "That's the same road" };
  // terrain: water crossings become bridges
  let water = 0;
  let run = 0;
  let maxRun = 0;
  for (let k = 0; k < pts.length; k += 2) {
    const t = terrainAt(w, pts[k], pts[k + 1]);
    if (t === "off") return { ...base, msg: "Stay inside your region" };
    if (t === "foreign") return { ...base, msg: "That's Johor, across the border!" };
    if (t === "sea" || t === "fresh") {
      run += 0.3;
      water += 0.3;
      maxRun = Math.max(maxRun, run);
    } else run = 0;
  }
  if (maxRun > 9) return { ...base, msg: "Too much water to bridge" };
  const hit = hitsAlong(w, pts, rt.half + 0.1);
  const lots = [...hit.lots].map((id) => w.lots.find((l) => l.id === id)).filter(Boolean);
  const structs = [...hit.structs].map((id) => w.structs.find((s) => s.id === id)).filter(Boolean);
  if (structs.some((s) => STRUCTS[s.type].fixed) && !opts.init) return { ...base, msg: "Can't build through that base" };
  const houses = [];
  for (const k of w.kampongs) k.houses.forEach((h, i) => {
    const near = nearestOnPoly(pts, h[0], h[1]);
    if (near.d < rt.half + 0.55) houses.push([k.id, i]);
  });
  let comp = 0;
  for (const l of lots) if (l.b) comp += buildingComp(l);
  for (const s of structs) comp += (STRUCTS[s.type].cost || 0) * 0.2;
  comp += houses.length * 18;
  const cost = Math.round(len * rt.cost + water * rt.cost * 3 + comp);
  return {
    ...base,
    ok: true,
    cost,
    bridge: water,
    demolish: { lots: lots.map((l) => l.id), built: lots.filter((l) => l.b).length, structs: structs.map((s) => s.id), houses },
    msg: houses.length ? `Resettles ${houses.length} kampong home${houses.length > 1 ? "s" : ""}` : lots.some((l) => l.b) ? plural(lots.filter((l) => l.b).length) : water > 0 ? "Includes a bridge" : null,
  };
}

const plural = (n) => `Demolishes ${n} building${n > 1 ? "s" : ""}`;

function buildingComp(l) {
  const T = LOT_TYPES[l.b.type];
  return ((T.cap || 0) + (T.jobs || 0) * 0.5) * 0.4;
}

// Clear buildings. Their residents move into empty flats nearby if there
// are any, otherwise join the waiting list (and some leave the region).
export function clearLots(w, lots, keepLot = false) {
  const byTown = new Map();
  const ids = new Set(lots.map((l) => l.id));
  for (const l of lots) {
    const n = residents(l.b);
    if (n) byTown.set(l.town, (byTown.get(l.town) || 0) + n);
    if (l.b?.state === "live" && LOT_TYPES[l.b.type].jobs) w.towns[l.town].anger += LOT_TYPES[l.b.type].jobs / 2000;
    l.b = null;
  }
  if (!keepLot) w.lots = w.lots.filter((x) => !ids.has(x.id));
  let out = null;
  for (const [town, n] of byTown) out = displace(w, n, town);
  return out;
}
function demolishLot(w, l, keepLot = false) {
  clearLots(w, [l], keepLot);
}

// Preview of where the residents of these lots would go.
export function clearPreview(w, lotIds) {
  const byTown = new Map();
  for (const id of lotIds) {
    const l = w.lots.find((x) => x.id === id);
    const n = residents(l?.b);
    if (n) byTown.set(l.town, (byTown.get(l.town) || 0) + n);
  }
  if (!byTown.size) return null;
  const sum = { n: 0, same: 0, other: 0, queue: 0, leave: 0, anger: 0 };
  for (const [town, n] of byTown) {
    const p = relocationPlan(w, n, town, { excludeLots: new Set(lotIds) });
    for (const k of Object.keys(sum)) sum[k] += p[k];
  }
  sum.queueAfter = w.waitlist + sum.queue;
  return sum;
}

function removeLotsInQuad(w, q) {
  const hit = w.lots.filter((l) => inQuad(q, l.x, l.y) || [0, 1, 2, 3].some((k) => inQuad(q, l.q[k * 2], l.q[k * 2 + 1])));
  if (hit.length) clearLots(w, hit);
  touch(w);
}

function removeTreesNear(w, test) {
  w.trees = w.trees.filter((t) => !test(t[0], t[1]));
}

function newNode(w, x, y) {
  const n = { id: w.nextId++, x: +x.toFixed(3), y: +y.toFixed(3) };
  w.nodes.push(n);
  touch(w);
  return n.id;
}

// Split a road at curve parameter t. Returns the junction node id.
export function splitSeg(w, segId, t) {
  const s = w.segs.find((x) => x.id === segId);
  w._lastSplit = null;
  if (!s) return null;
  if (t < 0.04) return s.a;
  if (t > 0.96) return s.b;
  const a = nodeById(w, s.a);
  const b = nodeById(w, s.b);
  const sp = bezSplit(a.x, a.y, s.cx, s.cy, b.x, b.y, t);
  const m = newNode(w, sp.mx, sp.my);
  const s1 = { id: w.nextId++, a: s.a, b: m, cx: sp.c1x, cy: sp.c1y, type: s.type };
  const s2 = { id: w.nextId++, a: m, b: s.b, cx: sp.c2x, cy: sp.c2y, type: s.type };
  const old = segPts(w, s);
  w.segs = w.segs.filter((x) => x.id !== segId).concat([s1, s2]);
  for (const l of w.lots) if (l.seg === segId) l.seg = nearestOnPoly(old, l.x, l.y).t < t ? s1.id : s2.id;
  w._pts?.delete(segId);
  w._lastSplit = [s1.id, s2.id];
  touch(w);
  return m;
}

// Control point of the piece of a quadratic curve between t0 and t1.
const subControl = (p0, p1, p2, t0, t1) => p0 * (1 - t0) * (1 - t1) + p1 * ((1 - t0) * t1 + t0 * (1 - t1)) + p2 * t0 * t1;

export function commitRoad(w, plan, opts = {}) {
  const { type, c } = plan;
  const layer = layerOf(type);
  // clear what's in the way
  const hit = plan.demolish.lots.map((id) => w.lots.find((x) => x.id === id)).filter(Boolean);
  if (hit.length) clearLots(w, hit);
  for (const id of plan.demolish.structs) w.structs = w.structs.filter((s) => s.id !== id);
  const byK = new Map();
  for (const [kid, hi] of plan.demolish.houses) {
    if (!byK.has(kid)) byK.set(kid, new Set());
    byK.get(kid).add(hi);
  }
  for (const [kid, set] of byK) {
    const k = w.kampongs.find((x) => x.id === kid);
    k.houses = k.houses.filter((_, i) => !set.has(i));
    if (!opts.free) displace(w, set.size * KAMPONG.housePop, k.town, { kampong: true });
  }
  w.kampongs = w.kampongs.filter((k) => k.houses.length > 0);
  touch(w);

  const resolve = (p) => {
    const s = snapPoint(w, p.x, p.y, layer);
    if (s.node != null) return s.node;
    if (s.seg != null) return splitSeg(w, s.seg, s.t);
    return newNode(w, p.x, p.y);
  };
  const A = resolve(plan.sa);
  const B = resolve(plan.sb);
  const an = nodeById(w, A);
  const bn = nodeById(w, B);
  const pts = sampleBez(an.x, an.y, c.x, c.y, bn.x, bn.y, 0.3);

  // where the new road crosses existing ones of the same layer
  const cuts = [];
  for (const s of [...w.segs]) {
    if (layerOf(s.type) !== layer || s.a === A || s.b === A || s.a === B || s.b === B) continue;
    for (const h of polyCrossings(pts, segPts(w, s))) if (h.ta > 0.03 && h.ta < 0.97) cuts.push({ ta: h.ta, seg: s.id, tb: h.tb });
  }
  // split crossed roads (several cuts on one road: go from the far end back)
  const nodeAt = [];
  const bySeg = new Map();
  for (const ct of cuts) {
    if (!bySeg.has(ct.seg)) bySeg.set(ct.seg, []);
    bySeg.get(ct.seg).push(ct);
  }
  for (const [segId, list] of bySeg) {
    list.sort((p, q) => q.tb - p.tb);
    let cur = segId;
    let scale = 1;
    for (const ct of list) {
      const node = splitSeg(w, cur, ct.tb / scale);
      nodeAt.push({ ta: ct.ta, node });
      // the first half keeps the start of the old road; later cuts are on it
      if (w._lastSplit) {
        cur = w._lastSplit[0];
        scale = ct.tb;
      }
    }
  }
  nodeAt.sort((p, q) => p.ta - q.ta);
  const stops = [{ ta: 0, node: A }, ...nodeAt, { ta: 1, node: B }];
  const made = [];
  for (let i = 1; i < stops.length; i++) {
    const t0 = stops[i - 1].ta;
    const t1 = stops[i].ta;
    if (stops[i - 1].node === stops[i].node || t1 - t0 < 0.01) continue;
    const s = {
      id: w.nextId++,
      a: stops[i - 1].node,
      b: stops[i].node,
      cx: +subControl(an.x, c.x, bn.x, t0, t1).toFixed(3),
      cy: +subControl(an.y, c.y, bn.y, t0, t1).toFixed(3),
      type,
    };
    w.segs.push(s);
    made.push(s);
  }
  touch(w);
  const half = ROAD_TYPES[type].half + 0.15;
  removeTreesNear(w, (x, y) => nearestOnPoly(pts, x, y).d < half + 0.3);
  for (const s of made) genLots(w, s);
  if (!opts.free) {
    const mid = segPts(w, made[Math.floor(made.length / 2)] || made[0]);
    charge(w, plan.cost, mid?.[Math.floor(mid.length / 4) * 2], mid?.[Math.floor(mid.length / 4) * 2 + 1]);
  }
  return made;
}

// Record one-off spending so the finance charts can show it per town.
export function charge(w, cost, x, y) {
  w.cash -= cost;
  if (!cost) return;
  const m = (w.spend = w.spend || { total: 0, towns: [] });
  m.total += cost;
  const ti = x == null ? null : townOf(w, x, y);
  if (ti == null) {
    // split by population when it can't be placed
    const tp = w.towns.reduce((a, t) => a + (t.pop || 0), 0) || 1;
    w.towns.forEach((t, i) => (m.towns[i] = (m.towns[i] || 0) + cost * ((t.pop || 0) / tp || 1 / w.towns.length)));
  } else m.towns[ti] = (m.towns[ti] || 0) + cost;
}

// ---------- lots ----------
const LOT_W = 1.3;
const LOT_D = 1.7;

export function genLots(w, seg) {
  const rt = ROAD_TYPES[seg.type];
  if (!rt.lots) return 0;
  const pts = segPts(w, seg);
  const L = polyLength(pts);
  const off = rt.half + 0.14;
  const o = occ(w);
  let made = 0;
  for (const side of [1, -1]) {
    const n = Math.floor((L - 0.7) / LOT_W);
    if (n < 1) continue;
    const start = (L - n * LOT_W) / 2;
    for (let k = 0; k < n; k++) {
      const s0 = start + k * LOT_W;
      const p0 = pointAt(pts, s0);
      const p1 = pointAt(pts, s0 + LOT_W);
      const n0x = -p0.ty * side;
      const n0y = p0.tx * side;
      const n1x = -p1.ty * side;
      const n1y = p1.tx * side;
      const q = [
        p0.x + n0x * off, p0.y + n0y * off,
        p1.x + n1x * off, p1.y + n1y * off,
        p1.x + n1x * (off + LOT_D), p1.y + n1y * (off + LOT_D),
        p0.x + n0x * (off + LOT_D), p0.y + n0y * (off + LOT_D),
      ].map((v) => +v.toFixed(3));
      if (!convex(q)) continue;
      let ok = true;
      for (const u of [0.12, 0.5, 0.88]) {
        for (const v of [0.1, 0.5, 0.9]) {
          const ax = q[0] + (q[2] - q[0]) * u;
          const ay = q[1] + (q[3] - q[1]) * u;
          const bx = q[6] + (q[4] - q[6]) * u;
          const by = q[7] + (q[5] - q[7]) * u;
          const x = ax + (bx - ax) * v;
          const y = ay + (by - ay) * v;
          const c = cellOf(x, y);
          if (c < 0 || o[c] !== 0 || !isLand(w, x, y)) {
            ok = false;
            break;
          }
        }
        if (!ok) break;
      }
      if (!ok) continue;
      const [cx, cy] = quadCenter(q);
      const lot = { id: w.nextId++, seg: seg.id, q, x: +cx.toFixed(3), y: +cy.toFixed(3), ang: +Math.atan2(p0.ty + p1.ty, p0.tx + p1.tx).toFixed(3), town: townOf(w, cx, cy), zone: null, b: null };
      w.lots.push(lot);
      markQuad(o, q, lot.id);
      made++;
    }
  }
  touch(w);
  w._occ = null;
  return made;
}

function convex(q) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const ax = q[((i + 1) % 4) * 2] - q[i * 2];
    const ay = q[((i + 1) % 4) * 2 + 1] - q[i * 2 + 1];
    const bx = q[((i + 2) % 4) * 2] - q[((i + 1) % 4) * 2];
    const by = q[((i + 2) % 4) * 2 + 1] - q[((i + 1) % 4) * 2 + 1];
    const cr = ax * by - ay * bx;
    if (Math.abs(cr) < 1e-6) continue;
    if (!sign) sign = Math.sign(cr);
    else if (Math.sign(cr) !== sign) return false;
  }
  return true;
}

// Fill gaps with new lots near a point (after clearing land).
export function refillLots(w, x, y, r) {
  for (const s of [...w.segs]) if (nearestOnPoly(segPts(w, s), x, y).d < r + 3) genLots(w, s);
}

export function removeRoad(w, segId) {
  const s = w.segs.find((x) => x.id === segId);
  if (!s) return { ok: false };
  clearLots(w, w.lots.filter((l) => l.seg === segId));
  w.segs = w.segs.filter((x) => x.id !== segId);
  w._pts?.delete(segId);
  w.nodes = w.nodes.filter((n) => w.segs.some((x) => x.a === n.id || x.b === n.id));
  touch(w);
  return { ok: true };
}

export function nearestSeg(w, x, y, layer = null, maxD = 1.5) {
  let best = null;
  for (const s of w.segs) {
    if (layer && layerOf(s.type) !== layer) continue;
    const h = nearestOnPoly(segPts(w, s), x, y);
    if (h.d < maxD && (!best || h.d < best.d)) best = { ...h, seg: s };
  }
  return best;
}

// ---------- zoning & brushes ----------
export function lotsNear(w, x, y, r) {
  return w.lots.filter((l) => dist(l.x, l.y, x, y) <= r);
}

export function paintZone(w, zone, x, y, r) {
  let n = 0;
  let skipped = 0;
  let blocked = null;
  for (const l of lotsNear(w, x, y, r)) {
    if (l.b) {
      if (l.zone !== zone) skipped++;
      continue;
    }
    const z = zone === "none" ? null : zone;
    if (z && PURPOSES[w.towns[l.town].purpose]?.growth[z] === 0) {
      blocked = w.towns[l.town];
      continue;
    }
    if (l.zone !== z) {
      l.zone = z;
      n++;
    }
  }
  const cost = zone === "none" ? 0 : n * 2;
  charge(w, cost, x, y);
  if (n) touch(w);
  return { n, cost, skipped, blocked: blocked && `${blocked.name} is planned as a ${PURPOSES[blocked.purpose].name.toLowerCase()}: no ${zone === "hdb" ? "HDB flats" : zone === "ind" ? "industry" : zone === "pte" ? "private housing" : "shops"} here` };
}

// Re-plan what a town is for. Free in the first three years, then it costs.
export const purposeCost = (w) => (w.t < 36 || (w.purposeFreeUntil || 0) > w.t ? 0 : Math.round(300 + (w.stats?.pop || 0) * 0.01));
export function setPurpose(w, i, purpose) {
  const t = w.towns[i];
  if (!PURPOSES[purpose] || PURPOSES[t.purpose]?.fixed || PURPOSES[purpose].fixed) return { ok: false, msg: "Can't change this town" };
  const cost = purposeCost(w);
  if (cost > w.cash && !w.sandbox) return { ok: false, msg: "Not enough money" };
  charge(w, cost, t.x, t.y);
  t.purpose = purpose;
  if (cost) t.anger += 0.3;
  touch(w);
  return { ok: true, cost };
}

export function plantTrees(w, x, y, r, rng = Math.random) {
  let n = 0;
  for (let k = 0; k < 6; k++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * r;
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d;
    if (!isLand(w, px, py) || occAt(w, px, py) !== 0) continue;
    if (w.trees.some((t) => dist(t[0], t[1], px, py) < 0.8)) continue;
    w.trees.push([+px.toFixed(2), +py.toFixed(2), Math.floor(rng() * 6)]);
    n++;
  }
  charge(w, n * 4, x, y);
  if (n) touch(w);
  return { n, cost: n * 4 };
}

// What a bulldoze brush stroke would remove
export function bulldozeSelect(w, x, y, r, sel) {
  for (const l of lotsNear(w, x, y, r)) if (l.b) sel.lots.add(l.id);
  for (const s of w.structs) if (!STRUCTS[s.type].fixed && dist(s.x, s.y, x, y) <= r + 1) sel.structs.add(s.id);
  w.trees.forEach((t, i) => {
    if (dist(t[0], t[1], x, y) <= r) sel.trees.add(i);
  });
  return sel;
}
export function bulldozeCost(w, sel) {
  let c = sel.trees.size;
  for (const id of sel.lots) {
    const l = w.lots.find((x) => x.id === id);
    if (l?.b) c += buildingComp(l) + 10;
  }
  for (const id of sel.structs) {
    const s = w.structs.find((x) => x.id === id);
    if (s) c += (STRUCTS[s.type].cost || 0) * 0.1;
  }
  return Math.round(c);
}
export function bulldozeCommit(w, sel) {
  const cost = bulldozeCost(w, sel);
  const lots = [...sel.lots].map((id) => w.lots.find((x) => x.id === id)).filter(Boolean);
  const first = lots[0] || w.structs.find((s) => sel.structs.has(s.id));
  clearLots(w, lots, true);
  const gone = w.structs.filter((s) => sel.structs.has(s.id));
  w.structs = w.structs.filter((s) => !sel.structs.has(s.id));
  w.trees = w.trees.filter((_, i) => !sel.trees.has(i));
  charge(w, cost, first?.x, first?.y);
  touch(w);
  for (const s of gone) refillLots(w, s.x, s.y, 3);
  return cost;
}

// Reclaim: circles of new land touching existing land
export function reclaimOk(w, x, y, r) {
  if (x < 1 || y < 1 || x > MAP - 1 || y > MAP - 1) return false;
  const t = terrainAt(w, x, y);
  if (t === "foreign" || t === "off") return false;
  for (let a = 0; a < 12; a++) {
    const px = x + Math.cos((a / 12) * Math.PI * 2) * (r + 1.2);
    const py = y + Math.sin((a / 12) * Math.PI * 2) * (r + 1.2);
    if (terrainAt(w, px, py) === "land") return true;
  }
  return t === "land";
}
export function reclaimCommit(w, circles) {
  for (const c of circles) w.edits.push({ x: +c.x.toFixed(2), y: +c.y.toFixed(2), r: c.r });
  const cost = circles.length * 120;
  charge(w, cost, circles[0]?.x, circles[0]?.y);
  touch(w);
  for (const c of circles) refillLots(w, c.x, c.y, c.r + 1);
  return cost;
}

// ---------- services & landmarks ----------
export function planStruct(w, type, x, y) {
  const S = STRUCTS[type];
  const layer = S.rail ? "rail" : "road";
  const near = nearestSeg(w, x, y, layer, 4.5);
  if (!near) return { ok: false, msg: S.rail ? "Place it beside an MRT track" : "Place it beside a road" };
  const pts = segPts(w, near.seg);
  const i = Math.min(pts.length / 2 - 2, Math.floor(near.t * (pts.length / 2 - 1)));
  let tx = pts[i * 2 + 2] - pts[i * 2];
  let ty = pts[i * 2 + 3] - pts[i * 2 + 1];
  const tl = Math.hypot(tx, ty) || 1;
  tx /= tl;
  ty /= tl;
  const side = Math.sign(tx * (y - near.y) - ty * (x - near.x)) || 1;
  const nx = -ty * side;
  const ny = tx * side;
  const off0 = ROAD_TYPES[near.seg.type].half + 0.2 + S.d / 2;
  const ang0 = Math.atan2(ty, tx);
  const o = occ(w);
  // Does the footprint fit here? On a curve the first try may clip the road,
  // so we also nudge it further from the road and turn it a little.
  const fit = (cx, cy, ang) => {
    const q = rectQuad(cx, cy, ang, S.w, S.d).map((v) => +v.toFixed(3));
    const lots = new Set();
    for (let a = 0; a < 5; a++) {
      for (let b = 0; b < 5; b++) {
        const u = 0.1 + a * 0.2;
        const v = 0.1 + b * 0.2;
        const px = q[0] + (q[2] - q[0]) * u + (q[6] - q[0]) * v;
        const py = q[1] + (q[3] - q[1]) * u + (q[7] - q[1]) * v;
        const t = terrainAt(w, px, py);
        if (t !== "land") return { q, msg: t === "foreign" ? "That's Johor!" : "Needs dry land" };
        const c = cellOf(px, py);
        const v0 = c < 0 ? -99 : o[c];
        if (v0 === -1 || v0 === -4) return { q, msg: "Overlaps a road" };
        if (v0 === -3) return { q, msg: "A kampong is here. Resettle it first (🏗️ Renew)" };
        if (v0 <= -10) return { q, msg: "Something is already built here" };
        if (v0 > 0) lots.add(v0);
      }
    }
    return { q, ok: true, lots };
  };
  let found = null;
  let first = null;
  for (const extra of [0, 0.3, 0.6, 1, 1.5]) {
    for (const da of [0, 0.2, -0.2, 0.4, -0.4, 0.7, -0.7]) {
      const off = off0 + extra;
      const cx = near.x + nx * off;
      const cy = near.y + ny * off;
      const r = fit(cx, cy, ang0 + da);
      if (!first) first = { ...r, cx, cy, ang: ang0 + da };
      if (r.ok) {
        found = { ...r, cx, cy, ang: ang0 + da };
        break;
      }
    }
    if (found) break;
  }
  const pick = found || first;
  const { cx, cy, ang, q } = pick;
  const base = { ok: false, type, q, x: cx, y: cy, ang, cost: S.cost, town: townOf(w, cx, cy) };
  if (!found) return { ...base, msg: first.msg };
  const lots = found.lots;
  if (S.coastal) {
    let wet = false;
    for (let a = 0; a < 16 && !wet; a++) {
      const r = Math.max(S.w, S.d) / 2 + 1.5;
      const tt = terrainAt(w, cx + Math.cos((a / 16) * Math.PI * 2) * r, cy + Math.sin((a / 16) * Math.PI * 2) * r);
      if (tt === "sea" || tt === "fresh") wet = true;
    }
    if (!wet) return { ...base, msg: "Must touch the water" };
  }
  if (S.onResort || S.notResort) {
    const resort = w.towns[townOf(w, cx, cy)].purpose === "resort";
    if (S.onResort && !resort) return { ...base, msg: "Build it on the resort island" };
    if (S.notResort && resort) return { ...base, msg: "Build it on the mainland" };
  }
  if (S.facesJohor && !bridgeEnd(w, cx, cy, "johor")) return { ...base, msg: "Must be on the western shore facing Johor" };
  if (S.sentosaLink && !S.onResort && !bridgeEnd(w, cx, cy, "sentosa")) return { ...base, msg: "Must be on the shore facing Sentosa" };
  if (S.needIsland) {
    const [, s] = w2es(cx, cy);
    if (s < 13) return { ...base, msg: "Build it on the southern islands (reclaim to join them)" };
  }
  const hit = [...lots].map((id) => w.lots.find((l) => l.id === id)).filter(Boolean);
  const built = hit.filter((l) => l.b);
  const cost = S.cost + Math.round(built.reduce((a, l) => a + buildingComp(l), 0));
  return { ...base, ok: true, cost, lots: hit.map((l) => l.id), msg: built.length ? plural(built.length) : null };
}

// Remember how things stood so the game can report the change 6 months on.
export function noteImpact(w, label, town, need) {
  w.impacts = w.impacts || [];
  const fin = (w.fin || []).slice(-3);
  w.impacts.push({
    at: w.t + 6,
    label,
    town: town ?? null,
    need: need || null,
    base: {
      happy: Math.round(town != null ? w.towns[town].approval : w.approval),
      need: need && town != null ? Math.round(w.towns[town].needs?.[need] ?? 0) : null,
      trust: Math.round(w.trust),
      net: fin.length ? Math.round(fin.reduce((a, f) => a + (f.rr ?? f.r) - (f.re ?? f.e), 0) / fin.length) : null,
    },
  });
  if (w.impacts.length > 30) w.impacts.shift();
}

// Where a bridge from (x, y) lands: Johor to the west, or Sentosa to the south.
export function bridgeEnd(w, x, y, to) {
  const [de, ds] = to === "johor" ? [-1, 0] : [0, 1];
  const dx = (de + ds) * Math.SQRT1_2;
  const dy = (ds - de) * Math.SQRT1_2;
  let crossed = false;
  for (let k = 0.5; k < 14; k += 0.25) {
    const px = x + dx * k;
    const py = y + dy * k;
    const t = terrainAt(w, px, py);
    if (t === "off") return null;
    if (t === "sea" || t === "fresh") crossed = true;
    else if (crossed) {
      // land the bridge a little way onto the far shore
      if (to === "johor" && t === "foreign") return [px + dx * 1.2, py + dy * 1.2];
      if (to === "sentosa" && t === "land" && w.towns[townOf(w, px, py)].purpose === "resort") return [px + dx * 1.2, py + dy * 1.2];
      if (t === "land") return null;
    }
  }
  return null;
}

// Who has already built this landmark somewhere in Singapore?
export function landmarkFirst(w, type) {
  return (w.lmBuilt || []).find((x) => x.type === type) || null;
}

export function commitStruct(w, plan, opts = {}) {
  const hit = plan.lots.map((id) => w.lots.find((x) => x.id === id)).filter(Boolean);
  if (hit.length) clearLots(w, hit);
  const q = plan.q;
  const S = STRUCTS[plan.type];
  const ti = townOf(w, plan.x, plan.y);
  const st = { id: w.nextId++, type: plan.type, x: +plan.x.toFixed(3), y: +plan.y.toFixed(3), ang: +plan.ang.toFixed(3), q, built: w.t, state: "live" };
  if (opts.name && opts.name.trim() && opts.name.trim() !== S.name) st.name = opts.name.trim().slice(0, 40);
  // big projects take time: they open when finished
  if (S.landmark && S.build) {
    st.state = "build";
    st.until = w.t + S.build;
    st.built = st.until;
  }
  const to = S.facesJohor ? "johor" : S.sentosaLink && !S.onResort ? "sentosa" : null;
  const end = to && bridgeEnd(w, plan.x, plan.y, to);
  if (end) st.bridge = [st.x, st.y, +end[0].toFixed(2), +end[1].toFixed(2), plan.type === "cableCar" ? "cable" : plan.type === "sentosaExpress" ? "rail" : "road"];
  // first in Singapore, or a copy of someone else's?
  if (S.landmark && !S.group) {
    const first = landmarkFirst(w, plan.type);
    if (first && first.by !== "you") st.copy = { by: first.by, region: first.region, year: first.year };
    w.lmBuilt = w.lmBuilt || [];
    if (!first) w.lmBuilt.push({ type: plan.type, name: st.name || S.name, by: "you", region: w.name, year: w.year });
  }
  w.structs.push(st);
  const NEED_OF = { food: "food", school: "school", health: "health", safety: "safety", fire: "safety", community: "community", green: "green", transport: "transport", mrt: "transport" };
  if (st.state === "live") noteImpact(w, `you built the ${st.name || S.name} in ${w.towns[ti].name}`, ti, NEED_OF[S.cover]);
  removeTreesNear(w, (x, y) => inQuad(q, x, y));
  charge(w, plan.cost, plan.x, plan.y);
  touch(w);
  return st;
}

// ---------- renewal ----------
export function latestType(w, zone) {
  const line = ZONE_LINE[zone];
  let best = null;
  for (const id of line) {
    const T = LOT_TYPES[id];
    if (w.year >= T.from && (!T.until || w.year < T.until)) best = id;
  }
  return best;
}

const lc = (s) => s.replace(/^[A-Z][a-z]/, (m) => m.toLowerCase());

export function renewOptions(w, target) {
  const out = [];
  if (target.kind === "kampong") {
    const k = target.k;
    const pop = k.houses.length * KAMPONG.housePop;
    const half = Math.ceil(k.houses.length / 2) * KAMPONG.housePop;
    out.push({
      id: "improve",
      icon: "🚰",
      name: "Improve the kampong",
      desc: "Stand-pipes, electricity and drains. Residents stay put and are grateful, but it's still a kampong.",
      cost: Math.round(pop * 0.25),
      months: 4,
      ok: !k.improved,
      why: k.improved ? "Already improved" : null,
      effect: "Happier residents, no new homes",
    });
    out.push({
      id: "resettle",
      icon: "🏚️",
      name: "Resettle the whole kampong",
      desc: `Pay compensation and move ${pop.toLocaleString()} people out. The land is cleared for new roads and estates.`,
      cost: Math.round(pop * 0.9),
      months: 3,
      ok: true,
      effect: "Frees all the land · residents upset for a few years",
      impact: relocationPlan(w, pop, k.town, { kampong: true }),
    });
    if (k.houses.length >= 6)
      out.push({
        id: "resettleHalf",
        icon: "🪜",
        name: "Resettle in phases (half now)",
        desc: `Move the outer ${half.toLocaleString()} residents now and the rest later, so fewer families wait at once.`,
        cost: Math.round(half * 1.0),
        months: 3,
        ok: true,
        effect: "Less anger at a time · frees part of the land",
        impact: relocationPlan(w, half, k.town, { kampong: true }),
      });
    return out;
  }
  if (target.kind === "lot") {
    const l = target.l;
    if (!l.b || l.b.state !== "live") return out;
    const T = LOT_TYPES[l.b.type];
    const age = Math.floor((w.t - l.b.built) / 12);
    const occ = residents(l.b);
    if (T.zone === "hdb") {
      const recent = l.b.up && w.t - l.b.up < 12 * 15;
      out.push({
        id: "upgrade",
        icon: "🔧",
        name: "Upgrade the block",
        desc: "New lifts, toilets and paint (like the Main Upgrading Programme). Residents stay during the works.",
        cost: Math.round(T.cap * 0.3),
        months: 6,
        ok: w.year >= 1989 && age >= 15 && !recent,
        why: w.year < 1989 ? "Available from 1989" : age < 15 ? "Block is still fairly new" : recent ? "Upgraded recently" : null,
        effect: "+ housing quality, wear reset · nobody moves out",
      });
    }
    if (l.zone === "com" && l.b.type === "shophouse" && REGIONS[w.region].heritage) {
      out.push({
        id: "conserve",
        icon: "🏮",
        name: "Conserve these shophouses",
        desc: "Protect them as heritage. They can never be redeveloped, but tourists love them.",
        cost: 150,
        months: 2,
        ok: w.year >= 1989 && !l.b.conserved,
        why: w.year < 1989 ? "Conservation starts in 1989" : l.b.conserved ? "Already conserved" : null,
        effect: "+ tourism money",
      });
    }
    const newest = latestType(w, l.zone);
    const N = newest && LOT_TYPES[newest];
    const better = N && newest !== l.b.type && (N.cap || 0) + (N.jobs || 0) > (T.cap || 0) + (T.jobs || 0);
    const res = occ > 0;
    const sers = T.zone === "hdb" && w.year >= 1995;
    const ex = new Set([l.id]);
    out.push({
      id: "rebuild",
      icon: "🏗️",
      name: T.zone === "hdb" ? (sers ? "Redevelop (en bloc / SERS)" : "Tear down and rebuild") : "Redevelop the site",
      desc: better
        ? `Replace the ${lc(T.name)} (${age} years old) with ${lc(N.name)}. ${res ? `${occ.toLocaleString()} residents must move out while it's built${sers ? " (SERS gives them priority for new flats nearby)" : ""}.` : T.jobs ? "Business stops during the works." : ""}`
        : "There's nothing newer to build here yet.",
      cost: better ? Math.round(N.cost + occ * 0.5 + (T.jobs || 0) * 0.2) : 0,
      months: better ? N.build + 4 : 0,
      ok: !!better && !l.b.conserved,
      why: l.b.conserved ? "Conserved heritage" : !better ? "No better building type yet" : null,
      effect: better ? `${(N.cap || N.jobs || 0).toLocaleString()} ${N.cap ? "residents" : "jobs"} when done (${N.cap && T.cap ? `+${(N.cap - T.cap).toLocaleString()} homes` : "more jobs"})` : "",
      to: newest,
      impact: res && better ? relocationPlan(w, occ, l.town, { sers, excludeLots: ex }) : null,
      gain: better && N.cap ? N.cap - (T.cap || 0) : 0,
    });
    return out;
  }
  return out;
}

export function applyRenew(w, target, optId) {
  const opt = renewOptions(w, target).find((o) => o.id === optId);
  if (!opt || !opt.ok) return { ok: false, msg: opt?.why || "Not possible" };
  if (opt.cost > w.cash && !w.sandbox) return { ok: false, msg: "Not enough money" };
  const at = target.kind === "kampong" ? target.k : target.l;
  charge(w, opt.cost, at.x, at.y);
  if (target.kind === "kampong") {
    const k = target.k;
    if (optId === "improve") {
      k.improved = true;
      k.q = KAMPONG.q + 14;
      w.towns[k.town].anger = Math.max(0, w.towns[k.town].anger - 1);
    } else {
      let moved;
      if (optId === "resettleHalf") {
        const n = Math.ceil(k.houses.length / 2);
        k.houses.sort((a, b) => dist(b[0], b[1], k.x, k.y) - dist(a[0], a[1], k.x, k.y));
        k.houses.splice(0, n);
        moved = n * KAMPONG.housePop;
      } else {
        moved = k.houses.length * KAMPONG.housePop;
        w.kampongs = w.kampongs.filter((x) => x.id !== k.id);
      }
      displace(w, moved, k.town, { kampong: true });
      w.stats.resettled = (w.stats.resettled || 0) + moved;
      w.resettledThisTerm = (w.resettledThisTerm || []).concat([k.town]);
      touch(w);
      refillLots(w, k.x, k.y, k.r + 1);
    }
  } else {
    const l = target.l;
    const T = LOT_TYPES[l.b.type];
    if (optId === "upgrade") {
      l.b.state = "upgrade";
      l.b.until = w.t + opt.months;
      w.towns[l.town].anger += 0.15;
    } else if (optId === "conserve") {
      l.b.conserved = true;
    } else if (optId === "rebuild") {
      const n = residents(l.b);
      const sers = T.zone === "hdb" && w.year >= 1995;
      l.b = { type: opt.to, state: "build", until: w.t + opt.months, built: w.t + opt.months, v: l.b.v, renewed: true };
      if (n) displace(w, n, l.town, { sers, excludeLots: new Set([l.id]) });
      touch(w);
    }
  }
  touch(w);
  const tt = target.kind === "kampong" ? target.k.town : target.l.town;
  noteImpact(w, `you chose "${opt.name}" in ${w.towns[tt].name}`, tt, "housing");
  return { ok: true, cost: opt.cost };
}

// ---------- save / load / undo ----------
// One campaign per region: each has its own save, election checkpoint and
// pre-vote save. A small index lists them so the title screen loads fast.
const SAVE_KEY = "lion-city-mayor-save";
const CHECK_KEY = "lion-city-mayor-election";
const PREVOTE_KEY = "lion-city-mayor-prevote";
const INDEX_KEY = "lion-city-mayor-slots";
const key = (base, region) => `${base}:${region}`;

function readIndex() {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeIndex(ix) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(ix));
  } catch {
    // ignore
  }
}

// Saves from before regions had their own slots move into theirs once.
function migrateLegacy() {
  try {
    for (const base of [SAVE_KEY, CHECK_KEY, PREVOTE_KEY]) {
      const raw = localStorage.getItem(base);
      if (!raw) continue;
      const region = JSON.parse(raw).region;
      if (region && !localStorage.getItem(key(base, region))) localStorage.setItem(key(base, region), raw);
      localStorage.removeItem(base);
      if (base === SAVE_KEY && region) {
        const d = JSON.parse(raw);
        const ix = readIndex();
        ix[region] = slotInfo(d);
        writeIndex(ix);
      }
    }
  } catch {
    // ignore
  }
}

const slotInfo = (d) => ({ name: d.name, region: d.region, year: d.year, month: d.month, pop: d.stats?.pop || 0, mode: d.mode || "campaign", difficulty: d.difficulty, over: !!d.gameOver, updated: Date.now() });

// Write, and if storage is full, free space by dropping other regions' backups.
function put(k, value, region) {
  try {
    localStorage.setItem(k, value);
    return true;
  } catch {
    try {
      for (const r of Object.keys(readIndex())) {
        if (r === region) continue;
        localStorage.removeItem(key(PREVOTE_KEY, r));
        localStorage.removeItem(key(CHECK_KEY, r));
      }
      localStorage.setItem(k, value);
      return true;
    } catch {
      return false;
    }
  }
}
function get(k) {
  try {
    const raw = localStorage.getItem(k);
    return raw ? restore(raw) : null;
  } catch {
    return null;
  }
}

export function snapshot(w) {
  return JSON.stringify(w, (k, v) => (k.startsWith("_") ? undefined : v));
}
export function restore(json) {
  const w = JSON.parse(json);
  w._pts = null;
  w._occ = null;
  w._terrainKey = null;
  return w;
}
export function saveWorld(w) {
  const ok = put(key(SAVE_KEY, w.region), snapshot(w), w.region);
  if (ok) {
    const ix = readIndex();
    ix[w.region] = slotInfo(w);
    writeIndex(ix);
  }
  return ok;
}
export function loadWorld(region) {
  migrateLegacy();
  return get(key(SAVE_KEY, region));
}
// every saved campaign, most recently played first
export function savedCampaigns() {
  migrateLegacy();
  const ix = readIndex();
  return Object.values(ix)
    .filter((x) => {
      try {
        return !!localStorage.getItem(key(SAVE_KEY, x.region));
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.updated - a.updated);
}
export function deleteCampaign(region) {
  try {
    for (const base of [SAVE_KEY, CHECK_KEY, PREVOTE_KEY]) localStorage.removeItem(key(base, region));
    const ix = readIndex();
    delete ix[region];
    writeIndex(ix);
  } catch {
    // ignore
  }
}
// kept for older callers: the most recent campaign
export function saveInfo() {
  return savedCampaigns()[0] || null;
}

// A separate save made right after each election win, to go back to if needed.
export function saveCheckpoint(w) {
  return put(key(CHECK_KEY, w.region), snapshot(w), w.region);
}
export function loadCheckpoint(region) {
  return get(key(CHECK_KEY, region));
}
export function checkpointInfo(region) {
  try {
    const raw = localStorage.getItem(key(CHECK_KEY, region));
    if (!raw) return null;
    const d = JSON.parse(raw);
    return { name: d.name, year: d.election?.last?.year || d.year, pop: d.stats?.pop || 0, seed: d.seed };
  } catch {
    return null;
  }
}

// A save made a year before each polling day, so a lost election can be replayed.
export function savePrevote(w) {
  return put(key(PREVOTE_KEY, w.region), snapshot(w), w.region);
}
export function loadPrevote(region) {
  return get(key(PREVOTE_KEY, region));
}
export function prevoteInfo(region) {
  try {
    const raw = localStorage.getItem(key(PREVOTE_KEY, region));
    if (!raw) return null;
    const d = JSON.parse(raw);
    return { name: d.name, year: d.year, month: d.month, seed: d.seed };
  } catch {
    return null;
  }
}

export { bezPoint };
