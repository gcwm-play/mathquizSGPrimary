// Simulation core for Lion City Planner. Pure functions on a plain "world" object
// so it can be saved to localStorage and tested outside the browser.
import { N, START_YEAR, DIFFICULTY, diffOf, ZONES, BUILDINGS, ALL_TOOLS, NEEDS, DEPTS, MILESTONES, EVENTS, MONTHS } from "./defs.js";

export const idx = (x, y) => y * N + x;
export const inMap = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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

// Stable 0..1 hash per tile, used to decide who loses power first in a shortage.
const tileHash = (i) => {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

// ---------- Map generation ----------

function makeNoise(rng, cell) {
  const g = Math.ceil(N / cell) + 2;
  const grid = Array.from({ length: g * g }, () => rng() * 2 - 1);
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = smooth(fx - x0);
    const ty = smooth(fy - y0);
    const v = (i, j) => grid[(y0 + j) * g + (x0 + i)];
    const a = v(0, 0) + (v(1, 0) - v(0, 0)) * tx;
    const b = v(0, 1) + (v(1, 1) - v(0, 1)) * tx;
    return a + (b - a) * ty;
  };
}

export function generateMap(seed) {
  const rng = makeRng(seed);
  const n1 = makeNoise(rng, 9);
  const n2 = makeNoise(rng, 4);
  const n3 = makeNoise(rng, 6);
  const tiles = [];
  // u runs left-right on screen, v runs top-bottom (north-south).
  const islets = [
    { u: 0.04, v: 0.6, r: 0.07 }, // Sentosa
    { u: 0.68, v: -0.3, r: 0.08 }, // Pulau Ubin
    { u: -0.62, v: 0.38, r: 0.08 }, // Jurong Island
  ];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = (x - y) / N;
      const v = (x + y - N + 1) / N;
      const noise = n1(x, y) * 0.22 + n2(x, y) * 0.08;
      let land = (u / 0.8) ** 2 + (v / 0.48) ** 2 + noise < 0.78;
      for (const s of islets) if (Math.hypot(u - s.u, v - s.v) + noise * 0.08 < s.r) land = true;
      if (x < 2 || y < 2 || x > N - 3 || y > N - 3) land = false;
      // Central catchment: reservoirs ringed by forest.
      const cu = u + 0.06;
      const cv = v + 0.1;
      const dc = Math.hypot(cu / 1.4, cv);
      let t = land ? "land" : "sea";
      let tr = false;
      if (land) {
        if (dc + n2(x, y) * 0.05 < 0.06 || Math.hypot(cu - 0.1, cv + 0.02) + n3(x, y) * 0.04 < 0.045) t = "res";
        else if (dc + n3(x, y) * 0.08 < 0.16) tr = true;
        else if (n3(x, y) > 0.45 || (n1(x + 30, y) > 0.5 && rng() < 0.7)) tr = true;
      }
      tiles.push({ t, tr, z: null, lv: 0, b: null, o: -1, road: false, rail: false });
    }
  }
  // Remove single-tile ponds/lakes that look like noise.
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      const tl = tiles[idx(x, y)];
      if (tl.t === "sea") {
        const landN = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => tiles[idx(x + dx, y + dy)].t !== "sea").length;
        if (landN >= 4) tl.t = "land";
      }
    }
  }
  return tiles;
}

// ---------- World ----------

export function newWorld({ difficulty = "normal", sandbox = false, seed = Math.floor(Math.random() * 1e9), name = "Lion City", starter = true } = {}) {
  const d = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  const w = {
    version: 1,
    name,
    seed,
    difficulty,
    sandbox,
    year: START_YEAR,
    month: 7,
    t: 0,
    tiles: generateMap(seed),
    cash: sandbox ? 9999999 : d.cash,
    reserves: d.reserves,
    waitlist: d.waitlist,
    approval: 55,
    needs: {},
    taxes: { property: 10, corporate: 17, gst: 3 },
    funding: Object.fromEntries(Object.keys(DEPTS).map((k) => [k, 100])),
    hdbGrant: 50,
    effects: [],
    pendingLandSales: 0,
    pendingHdb: { build: 0, sales: 0 },
    lastMonth: null,
    yearAcc: emptyLedger(),
    lastYear: null,
    history: [],
    news: [],
    reserveDrawn: false,
    negativeMonths: 0,
    gameOver: null,
    stats: { pop: 0, jobs: 0 },
    demand: { r: 0.8, c: 0, i: 0 },
    goalsDone: {},
    roadCount: 0,
    focus: null,
  };
  if (starter) seedStarterTown(w);
  checkGoals(w);
  return w;
}

// A small ready-made town (roads, zones, power, a hawker centre and a school)
// near the south of the island, so a new player sees the city working at once.
export function seedStarterTown(w) {
  const S = 13;
  let best = null;
  for (let y = 2; y < N - S - 2; y++) {
    for (let x = 2; x < N - S - 2; x++) {
      let ok = true;
      for (let yy = y; yy < y + S && ok; yy++) for (let xx = x; xx < x + S && ok; xx++) if (w.tiles[idx(xx, yy)].t !== "land") ok = false;
      if (!ok) continue;
      const cx = x + S / 2;
      const cy = y + S / 2;
      const score = Math.hypot((cx - cy) / N, (cx + cy - N) / N - 0.15);
      if (!best || score < best.score) best = { x, y, score };
    }
  }
  if (!best) return;
  const { x, y } = best;
  const wasSandbox = w.sandbox;
  w.sandbox = true;
  const T = (tool, a, b = a) => applyTool(w, tool, a, b);
  for (const k of [0, 6, 12]) {
    T("road", { x, y: y + k }, { x: x + 12, y: y + k });
    T("road", { x: x + k, y }, { x: x + k, y: y + 12 });
  }
  T("b:hawker", { x: x + 5, y: y + 5 });
  T("b:school", { x: x + 7, y: y + 5 });
  T("b:clinic", { x: x + 5, y: y + 7 });
  T("zone:hdb", { x: x + 1, y: y + 1 }, { x: x + 5, y: y + 5 });
  T("zone:hdb", { x: x + 7, y: y + 1 }, { x: x + 11, y: y + 5 });
  T("zone:com", { x: x + 1, y: y + 7 }, { x: x + 5, y: y + 11 });
  T("zone:ind", { x: x + 7, y: y + 7 }, { x: x + 11, y: y + 11 });
  // Power station just outside town, beside a road stub
  outer: for (let r = 1; r < 10; r++) {
    for (const [px, py] of [[x + S + r, y + 8], [x + 8, y + S + r], [x - 2 - r, y + 8], [x + 8, y - 2 - r]]) {
      if (previewTool(w, "b:power", { x: px, y: py }, { x: px, y: py }).ok) {
        T("b:power", { x: px, y: py });
        const road = px > x + S ? [{ x: x + 12, y: y + 9 }, { x: px - 1, y: y + 9 }] : py > y + S ? [{ x: x + 9, y: y + 12 }, { x: x + 9, y: py - 1 }] : null;
        if (road) T("road", road[0], road[1]);
        break outer;
      }
    }
  }
  w.sandbox = wasSandbox;
  w.monthAcc = null;
  w.focus = { x: x + 6, y: y + 6 };
}

function emptyLedger() {
  return { rev: {}, exp: {} };
}

export function dateLabel(w) {
  return `${MONTHS[w.month]} ${w.year}`;
}

export const isUnlocked = (w, year) => w.sandbox || !year || w.year >= year;

// Footprint tiles of a building whose origin (top corner) is (x, y).
export function footprint(x, y, size) {
  const out = [];
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) out.push([x + dx, y + dy]);
  return out;
}

function touchesSea(w, x, y, size) {
  for (let dy = -1; dy <= size; dy++) {
    for (let dx = -1; dx <= size; dx++) {
      const xx = x + dx;
      const yy = y + dy;
      if (inMap(xx, yy) && w.tiles[idx(xx, yy)].t === "sea") return true;
    }
  }
  return false;
}

// ---------- Tools ----------

function linePath(a, b) {
  const cells = [];
  const dx = Math.sign(b.x - a.x);
  const dy = Math.sign(b.y - a.y);
  const xFirst = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
  let x = a.x;
  let y = a.y;
  cells.push([x, y]);
  if (xFirst) {
    while (x !== b.x) cells.push([(x += dx), y]);
    while (y !== b.y) cells.push([x, (y += dy)]);
  } else {
    while (y !== b.y) cells.push([x, (y += dy)]);
    while (x !== b.x) cells.push([(x += dx), y]);
  }
  return cells;
}

function rectCells(a, b, max = 600) {
  const cells = [];
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (cells.length < max) cells.push([x, y]);
  return cells;
}

const isBuildable = (tl) => tl.t === "land" && tl.b == null && !(tl.z && tl.lv > 0);

// Per-cell cost for a tool, or null if it can't go there.
function cellCost(w, tool, x, y) {
  if (!inMap(x, y)) return null;
  const tl = w.tiles[idx(x, y)];
  const treeFee = tl.tr ? 5 : 0;
  switch (tool.id) {
    case "road":
      if (tl.road || !isBuildable(tl)) return null;
      return tool.cost + treeFee;
    case "rail":
      if (tl.rail || !isBuildable(tl)) return null;
      return tool.cost + treeFee;
    case "zone:hdb":
    case "zone:pte":
    case "zone:com":
    case "zone:ind": {
      const z = tool.id.slice(5);
      if (!isBuildable(tl) || tl.road || tl.rail || tl.z === z) return null;
      return tool.cost + treeFee;
    }
    case "dezone":
      return tl.z && tl.lv === 0 ? tool.cost : null;
    case "trees":
      return tl.t === "land" && !tl.tr && !tl.road && !tl.rail && tl.b == null && !tl.z ? tool.cost : null;
    case "bulldoze":
      if (tl.t === "sea" || tl.t === "res") return null;
      if (tl.b != null) return Math.max(5, Math.round(BUILDINGS[w.tiles[tl.o].b].cost * 0.05 / BUILDINGS[w.tiles[tl.o].b].size ** 2));
      if (tl.z && tl.lv > 0) return 6 * tl.lv;
      if (tl.road || tl.rail || tl.tr || tl.z) return tool.cost;
      return null;
    default:
      if (tool.building) {
        // rect-mode buildings (parks, solar) are 1x1
        if (!isBuildable(tl) || tl.road || tl.rail) return null;
        return tool.cost + treeFee;
      }
      return null;
  }
}

// Work out what a tool would do between drag start a and end b.
export function previewTool(w, toolId, a, b) {
  const tool = ALL_TOOLS[toolId];
  if (!tool || tool.mode === "inspect") return { cells: [], cost: 0, ok: false };
  if (!isUnlocked(w, tool.year)) return { cells: [], cost: 0, ok: false, msg: `Available from ${tool.year}` };

  if (tool.mode === "place") {
    const bd = BUILDINGS[tool.building];
    const s = bd.size;
    const ox = b.x - Math.floor((s - 1) / 2);
    const oy = b.y - Math.floor((s - 1) / 2);
    let ok = true;
    let cost = bd.cost;
    const cells = footprint(ox, oy, s).map(([x, y]) => {
      const tl = inMap(x, y) ? w.tiles[idx(x, y)] : null;
      const good = !!tl && isBuildable(tl) && !tl.road && !tl.rail;
      if (tl && tl.tr) cost += 5;
      if (!good) ok = false;
      return { x, y, ok: good };
    });
    let msg = null;
    if (ok && bd.coastal && !touchesSea(w, ox, oy, s)) {
      ok = false;
      msg = "Must be built next to the sea";
    }
    if (ok && tool.building === "mrt" && !nearRail(w, ox, oy, s)) msg = "Tip: place next to an MRT track";
    if (!ok) cells.forEach((c) => (c.ok = c.ok && !msg));
    return { cells, cost, ok, origin: { x: ox, y: oy }, size: s, building: tool.building, msg };
  }

  if (tool.id === "reclaim") {
    const cells = rectCells(a, b, 300).map(([x, y]) => ({ x, y, ok: false }));
    const set = new Set();
    const isLand = (x, y) => inMap(x, y) && (w.tiles[idx(x, y)].t !== "sea" || set.has(idx(x, y)));
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of cells) {
        if (c.ok || !inMap(c.x, c.y) || c.x < 1 || c.y < 1 || c.x > N - 2 || c.y > N - 2) continue;
        if (w.tiles[idx(c.x, c.y)].t !== "sea") continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isLand(c.x + dx, c.y + dy))) {
          c.ok = true;
          set.add(idx(c.x, c.y));
          changed = true;
        }
      }
    }
    const good = cells.filter((c) => c.ok);
    return { cells, cost: good.length * tool.cost, ok: good.length > 0 };
  }

  const raw = tool.mode === "line" ? linePath(a, b) : rectCells(a, b);
  let cost = 0;
  let n = 0;
  const cells = raw.map(([x, y]) => {
    const c = cellCost(w, tool, x, y);
    if (c != null) {
      cost += c;
      n++;
    }
    // road over existing road is harmless; show it as fine
    const tl = inMap(x, y) ? w.tiles[idx(x, y)] : null;
    const already = tl && ((tool.id === "road" && tl.road) || (tool.id === "rail" && tl.rail));
    return { x, y, ok: c != null || !!already };
  });
  return { cells, cost, ok: n > 0 };
}

function nearRail(w, ox, oy, s) {
  for (let dy = -1; dy <= s; dy++) for (let dx = -1; dx <= s; dx++) {
    const x = ox + dx;
    const y = oy + dy;
    if (inMap(x, y) && w.tiles[idx(x, y)].rail) return true;
  }
  return false;
}

// Remove whatever building covers tile i, returning displaced residents to the waitlist.
function clearTile(w, i) {
  const tl = w.tiles[i];
  if (tl.b != null) {
    const o = tl.o;
    const ot = w.tiles[o];
    const s = BUILDINGS[ot.b].size;
    const ox = o % N;
    const oy = Math.floor(o / N);
    for (const [x, y] of footprint(ox, oy, s)) {
      const t2 = w.tiles[idx(x, y)];
      t2.b = null;
      t2.o = -1;
    }
    return;
  }
  if (tl.z && tl.lv > 0) {
    const zd = ZONES[tl.z];
    if (zd.pop) w.waitlist += Math.round(zd.pop[tl.lv] * 0.7);
  }
  tl.z = null;
  tl.lv = 0;
  tl.road = false;
  tl.rail = false;
  tl.tr = false;
}

export function applyTool(w, toolId, a, b) {
  const tool = ALL_TOOLS[toolId];
  const p = previewTool(w, toolId, a, b);
  if (!p.ok) return { ok: false, msg: p.msg || "Can't build there" };
  if (!w.sandbox && p.cost > w.cash) return { ok: false, msg: `Not enough money: this costs ${fmtMoney(p.cost)}. Open the budget to raise income.` };
  const before = w.tiles.map((t) => ({ ...t }));
  const waitBefore = w.waitlist;

  if (tool.mode === "place") {
    const { x: ox, y: oy } = p.origin;
    const o = idx(ox, oy);
    for (const [x, y] of footprint(ox, oy, p.size)) {
      const tl = w.tiles[idx(x, y)];
      tl.z = null;
      tl.lv = 0;
      tl.tr = false;
      tl.b = tool.building;
      tl.o = o;
    }
  } else {
    for (const c of p.cells) {
      if (!c.ok) continue;
      const tl = w.tiles[idx(c.x, c.y)];
      switch (tool.id) {
        case "road":
          if (!tl.road) {
            tl.road = true;
            tl.tr = false;
            tl.z = null;
          }
          break;
        case "rail":
          if (!tl.rail) {
            tl.rail = true;
            tl.tr = false;
            tl.z = null;
          }
          break;
        case "dezone":
          tl.z = null;
          break;
        case "trees":
          tl.tr = true;
          break;
        case "reclaim":
          tl.t = "land";
          tl.tr = false;
          break;
        case "bulldoze":
          clearTile(w, idx(c.x, c.y));
          break;
        default:
          if (tool.id.startsWith("zone:")) {
            tl.z = tool.id.slice(5);
            tl.lv = 0;
            tl.tr = false;
          } else if (tool.building) {
            tl.tr = false;
            tl.z = null;
            tl.b = tool.building;
            tl.o = idx(c.x, c.y);
          }
      }
    }
  }
  if (!w.sandbox) w.cash -= p.cost;
  addLedger(w, "exp", "construction", p.cost);
  const changed = [];
  for (let i = 0; i < w.tiles.length; i++) {
    const t = w.tiles[i];
    const o = before[i];
    if (t.t !== o.t || t.tr !== o.tr || t.z !== o.z || t.lv !== o.lv || t.b !== o.b || t.o !== o.o || t.road !== o.road || t.rail !== o.rail) changed.push([i, o]);
  }
  return { ok: true, cost: p.cost, undo: { toolId, tiles: changed, cost: p.cost, waitDelta: w.waitlist - waitBefore } };
}

// Reverse one build: restore the tiles it touched and refund what it cost.
export function undoAction(w, u) {
  for (const [i, o] of u.tiles) Object.assign(w.tiles[i], o);
  if (!w.sandbox) w.cash += u.cost;
  addLedger(w, "exp", "construction", -u.cost);
  w.waitlist = Math.max(0, w.waitlist - u.waitDelta);
}

function addLedger(w, side, key, amount) {
  if (!w.monthAcc) w.monthAcc = emptyLedger();
  w.monthAcc[side][key] = (w.monthAcc[side][key] || 0) + amount;
}

// ---------- Analysis (derived maps, recomputed each month and after edits) ----------

const ZONE_POWER = { hdb: [0, 1, 2, 4], pte: [0, 0.5, 1.5, 3], com: [0, 1, 2, 5], ind: [0, 2, 3, 4] };
const ZONE_WATER = { hdb: [0, 1, 3, 6], pte: [0, 0.5, 1.5, 3], com: [0, 0.5, 1, 2], ind: [0, 2, 3, 2] };
export const COVER_TYPES = ["food", "school", "health", "safety", "fire", "community", "green", "bus", "mrt"];
export const IMPORTED_WATER = 150;

const fundFactor = (w, dept) => clamp((w.funding[dept] ?? 100) / 100, 0, 1.2);

export function effectMult(w, key) {
  let m = 1;
  for (const e of w.effects) if (e.effect[key] != null) m *= e.effect[key];
  return m;
}
export function effectAdd(w, key) {
  let s = 0;
  for (const e of w.effects) if (e.effect[key] != null) s += e.effect[key];
  return s;
}

export function analyze(w) {
  const T = w.tiles;
  const NN = N * N;
  const roadNear = new Uint8Array(NN);
  let roadCount = 0;
  let railCount = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const tl = T[idx(x, y)];
    if (tl.rail) railCount++;
    if (!tl.road) continue;
    roadCount++;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (inMap(x + dx, y + dy)) roadNear[idx(x + dx, y + dy)] = 1;
  }

  // Buildings (origins only)
  const builds = [];
  for (let i = 0; i < NN; i++) if (T[i].b != null && T[i].o === i) builds.push(i);

  // Utilities: supply & demand
  let powerSupply = 0;
  let waterSupply = w.year < 2061 ? IMPORTED_WATER : 0;
  let powerDemand = 0;
  let waterDemand = 0;
  const waterSources = { imported: waterSupply, catchment: 0, newater: 0, desal: 0 };
  for (const i of builds) {
    const bd = BUILDINGS[T[i].b];
    powerDemand += bd.power || 0;
    waterDemand += bd.water || 0;
    if (bd.supply?.power) powerSupply += bd.supply.power;
    if (bd.supply?.water) {
      let s = bd.supply.water;
      if (T[i].b === "waterworks") {
        const x0 = i % N;
        const y0 = Math.floor(i / N);
        let res = 0;
        for (let dy = -6; dy <= 7; dy++) for (let dx = -6; dx <= 7; dx++) if (inMap(x0 + dx, y0 + dy) && T[idx(x0 + dx, y0 + dy)].t === "res") res++;
        s += Math.min(40, res) * 4;
        waterSources.catchment += s;
      } else waterSources[T[i].b] = (waterSources[T[i].b] || 0) + s;
      waterSupply += s;
    }
  }
  for (let i = 0; i < NN; i++) {
    const tl = T[i];
    if (tl.z && tl.lv > 0) {
      powerDemand += ZONE_POWER[tl.z][tl.lv];
      waterDemand += ZONE_WATER[tl.z][tl.lv];
    }
  }
  // No supply at all means no power, even before anything is drawing on it.
  const powerRatio = powerDemand > 0 ? Math.min(1, powerSupply / powerDemand) : powerSupply > 0 ? 1 : 0;
  const waterRatio = waterDemand > 0 ? Math.min(1, waterSupply / waterDemand) : waterSupply > 0 ? 1 : 0;
  const pw = new Uint8Array(NN);
  const wt = new Uint8Array(NN);
  for (let i = 0; i < NN; i++) {
    const tl = T[i];
    // Empty zoned lots are flagged too, so they only start building once served.
    const isConsumer = tl.z || (tl.b != null && tl.o === i);
    if (!isConsumer) {
      pw[i] = 1;
      wt[i] = 1;
      continue;
    }
    const bd = tl.b != null ? BUILDINGS[tl.b] : null;
    pw[i] = (bd && !bd.power) || bd?.supply?.power || tileHash(i) < powerRatio ? 1 : 0;
    wt[i] = (bd && !bd.water) || bd?.supply?.water || tileHash(i + 7777) < waterRatio ? 1 : 0;
  }

  // MRT stations: must touch track; network runs with >= 2 linked stations.
  const stationOk = new Set();
  for (const i of builds) if (T[i].b === "mrt" && nearRail(w, i % N, Math.floor(i / N), 1)) stationOk.add(i);
  const mrtRunning = stationOk.size >= 2;

  // Amenity status + coverage
  const cover = Object.fromEntries(COVER_TYPES.map((k) => [k, new Float32Array(NN)]));
  const active = new Map();
  let landmarks = [];
  let tourism = 0;
  let trade = 0;
  let bigJobs = 0;
  const upkeep = Object.fromEntries(Object.keys(DEPTS).map((k) => [k, 0]));
  for (const i of builds) {
    const id = T[i].b;
    const bd = BUILDINGS[id];
    const s = bd.size;
    const ox = i % N;
    const oy = Math.floor(i / N);
    let reason = null;
    const hasRoad = footprint(ox, oy, s).some(([x, y]) => roadNear[idx(x, y)]) || id === "park" || id === "solar";
    if (!hasRoad) reason = "No road nearby";
    else if (!pw[i]) reason = "No power";
    else if (!wt[i]) reason = "No water";
    else if (id === "mrt" && !stationOk.has(i)) reason = "Not next to an MRT track";
    else if (id === "mrt" && !mrtRunning) reason = "Needs a 2nd linked station";
    active.set(i, reason);
    let up = bd.upkeep * fundFactor(w, bd.dept);
    if (id === "power") up *= effectMult(w, "powerCost");
    upkeep[bd.dept] += up;
    if (reason) continue;
    if (bd.tourism) tourism += bd.tourism;
    if (bd.trade) trade += bd.trade;
    if (bd.jobs) bigJobs += bd.jobs;
    if (bd.landmark) landmarks.push({ x: ox + s / 2, y: oy + s / 2, v: bd.landmark });
    if (bd.cover) {
      const f = fundFactor(w, bd.dept);
      const cx = ox + (s - 1) / 2;
      const cy = oy + (s - 1) / 2;
      const r = bd.radius;
      const map = cover[bd.cover];
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if (!inMap(x, y)) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d > r) continue;
        const v = f * (1 - 0.45 * (d / r));
        const j = idx(x, y);
        if (v > map[j]) map[j] = v;
      }
    }
  }

  // Pollution
  const pollution = new Float32Array(NN);
  const spread = (x0, y0, amount, r) => {
    for (let y = Math.floor(y0 - r); y <= Math.ceil(y0 + r); y++) for (let x = Math.floor(x0 - r); x <= Math.ceil(x0 + r); x++) {
      if (!inMap(x, y)) continue;
      const d = Math.hypot(x - x0, y - y0);
      if (d <= r) pollution[idx(x, y)] += amount * (1 - d / (r + 1));
    }
  };
  for (let i = 0; i < NN; i++) {
    const tl = T[i];
    if (tl.z === "ind" && tl.lv > 0) spread(i % N, Math.floor(i / N), ZONES.ind.pollution[tl.lv] * 0.35, 4);
  }
  for (const i of builds) {
    const bd = BUILDINGS[T[i].b];
    if (bd.pollution) spread(i % N + bd.size / 2, Math.floor(i / N) + bd.size / 2, bd.pollution * 0.6, 6);
  }
  const air = effectMult(w, "air");
  for (let i = 0; i < NN; i++) {
    let p = pollution[i];
    p -= cover.green[i] * 14;
    if (T[i].tr) p -= 6;
    pollution[i] = clamp(p, 0, 100);
  }

  // Commercial density for land value
  const comLv = new Float32Array(NN);
  for (let i = 0; i < NN; i++) {
    const tl = T[i];
    if (tl.z !== "com" || tl.lv === 0) continue;
    const x0 = i % N;
    const y0 = Math.floor(i / N);
    for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) if (inMap(x0 + dx, y0 + dy)) comLv[idx(x0 + dx, y0 + dy)] += tl.lv;
  }

  // Distance to sea (capped) for waterfront bonus
  const coastal = new Uint8Array(NN);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (T[idx(x, y)].t === "sea") continue;
    outer: for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (inMap(x + dx, y + dy) && T[idx(x + dx, y + dy)].t !== "land") {
        coastal[idx(x, y)] = 1;
        break outer;
      }
    }
  }

  const mrtOn = mrtRunning ? 1 : 0;
  const landValue = new Float32Array(NN);
  const transportScore = new Float32Array(NN);
  for (let i = 0; i < NN; i++) {
    if (T[i].t !== "land") continue;
    const x = i % N;
    const y = Math.floor(i / N);
    const mrt = cover.mrt[i] * mrtOn;
    const tr = Math.max(mrt, cover.bus[i] * 0.75, roadNear[i] ? 0.35 : 0);
    transportScore[i] = tr;
    let lv = 26;
    lv += coastal[i] * 10;
    lv += cover.green[i] * 12;
    lv += mrt * 18 + cover.bus[i] * 6;
    lv += cover.health[i] * 4 + cover.school[i] * 4 + cover.safety[i] * 5;
    lv += Math.min(20, comLv[i] * 1.2);
    for (const m of landmarks) {
      const d = Math.hypot(x - m.x, y - m.y);
      if (d < 12) lv += m.v * (1 - d / 12);
    }
    lv -= pollution[i] * 0.7;
    landValue[i] = clamp(lv, 0, 100);
  }

  // Development score per zone type at each tile
  const score = (i, z) => {
    const lv = landValue[i];
    switch (z) {
      case "hdb":
        return 18 + lv * 0.4 + cover.food[i] * 12 + cover.school[i] * 10 + cover.health[i] * 8 + transportScore[i] * 14 + cover.community[i] * 6 - pollution[i] * 0.3;
      case "pte":
        return lv * 0.9 + cover.school[i] * 6 + cover.green[i] * 6 - pollution[i] * 0.4;
      case "com":
        return lv * 0.75 + transportScore[i] * 18 + Math.min(10, comLv[i] * 0.5);
      case "ind":
        return 15 + transportScore[i] * 25 + (trade > 0 ? 15 : 0) + Math.min(15, w.stats.pop / 8000);
      default:
        return 0;
    }
  };

  // Population, jobs, resident-weighted needs
  let hdbPop = 0;
  let ptePop = 0;
  let comJobs = 0;
  let indJobs = 0;
  const cov = { food: 0, school: 0, health: 0, safety: 0, transport: 0, green: 0, community: 0, utilities: 0, environment: 0 };
  for (let i = 0; i < NN; i++) {
    const tl = T[i];
    if (!tl.z || tl.lv === 0) continue;
    const zd = ZONES[tl.z];
    if (zd.pop) {
      const p = zd.pop[tl.lv];
      if (tl.z === "hdb") hdbPop += p;
      else ptePop += p;
      cov.food += p * Math.min(1, cover.food[i] * 1.2);
      cov.school += p * Math.min(1, cover.school[i] * 1.2);
      cov.health += p * Math.min(1, cover.health[i] * 1.2) * (effectMult(w, "health") < 1 && cover.health[i] === 0 ? 0.3 : 1);
      cov.safety += p * Math.min(1, (cover.safety[i] * 0.7 + cover.fire[i] * 0.3) * 1.2);
      cov.transport += p * transportScore[i];
      cov.green += p * Math.min(1, cover.green[i] * 1.3 + (T[i].tr ? 0.2 : 0));
      cov.community += p * Math.min(1, cover.community[i] * 1.2);
      cov.utilities += p * (pw[i] && wt[i] ? 1 : 0);
      cov.environment += p * (1 - pollution[i] / 60);
    } else if (tl.z === "com") comJobs += zd.jobs[tl.lv];
    else indJobs += zd.jobs[tl.lv];
  }
  const pop = hdbPop + ptePop;
  const jobs = comJobs + indJobs + bigJobs;

  const needs = {};
  for (const k of Object.keys(cov)) needs[k] = pop > 0 ? clamp((cov[k] / pop) * 100, 0, 100) : 50;
  needs.environment = clamp(needs.environment * air, 0, 100);
  if (effectMult(w, "health") < 1) needs.health *= 0.85;
  const workforce = pop * 0.52;
  const unemployment = workforce > 0 ? Math.max(0, workforce - jobs) / workforce : 0;
  needs.jobs = pop > 0 ? clamp(100 - unemployment * 280, 0, 100) : 50;
  needs.housing = pop + w.waitlist > 0 ? clamp((pop / (pop + w.waitlist)) * 100, 0, 100) : 100;
  const pteShare = pop > 0 ? ptePop / pop : 0;
  needs.cost = clamp(100 - Math.max(0, w.taxes.gst - 3) * 4 - Math.max(0, w.taxes.property - 8) * 3 - Math.max(0, pteShare - 0.3) * 120 + (w.hdbGrant - 50) * 0.2, 0, 100);

  let tw = 0;
  let ta = 0;
  for (const [k, nd] of Object.entries(NEEDS)) {
    tw += nd.weight;
    ta += nd.weight * needs[k];
  }
  // Early on, residents give a new nation's planner some benefit of the doubt.
  const grace = Math.min(1, pop / 40000);
  const approvalTarget = 62 * (1 - grace) + (ta / tw) * grace;

  return {
    roadNear, roadCount, railCount, builds, pw, wt, powerSupply, powerDemand, waterSupply, waterDemand, powerRatio, waterRatio, waterSources,
    stationOk, mrtRunning, cover, active, pollution, landValue, transportScore, score, tourism, trade, bigJobs, upkeep,
    hdbPop, ptePop, pop, comJobs, indJobs, jobs, workforce, unemployment, needs, approvalTarget,
  };
}

// ---------- Finance ----------

export function monthlyBudget(w, A) {
  const T = w.tiles;
  let resTax = 0;
  let corpTax = 0;
  for (let i = 0; i < T.length; i++) {
    const tl = T[i];
    if (!tl.z || tl.lv === 0) continue;
    const lvf = 0.5 + A.landValue[i] / 100;
    if (tl.z === "hdb") resTax += ZONES.hdb.pop[tl.lv] * lvf * 0.0022;
    else if (tl.z === "pte") resTax += ZONES.pte.pop[tl.lv] * lvf * 0.01;
    else corpTax += ZONES[tl.z].jobs[tl.lv] * lvf * 0.0045;
  }
  corpTax += A.bigJobs * 0.003;
  const popScale = Math.min(1, A.pop / 120000);
  const inc = diffOf(w).income;
  const rev = {
    property: resTax * (w.taxes.property / 10) * inc,
    corporate: corpTax * (w.taxes.corporate / 17) * effectMult(w, "corpTax") * inc,
    gst: A.pop * 0.0016 * w.taxes.gst * (0.55 + 0.45 * Math.min(1, A.comJobs / Math.max(1, A.pop * 0.24))) * inc,
    tourism: A.tourism * popScale * effectMult(w, "tourism") * 0.5,
    trade: A.trade * Math.min(1, A.indJobs / 6000) * 0.5,
    landSales: w.pendingLandSales,
    hdbSales: w.pendingHdb.sales,
    nirc: (w.reserves * 0.04) / 12 / 2,
  };
  const tf = clamp(w.funding.transport / 100, 0, 1.2);
  const exp = {
    roads: A.roadCount * 0.22 * tf + A.railCount * 1.1 * tf,
    education: A.upkeep.education,
    health: A.upkeep.health,
    safety: A.upkeep.safety,
    transport: A.upkeep.transport,
    community: A.upkeep.community,
    utilities: A.upkeep.utilities,
    hdbBuild: w.pendingHdb.build,
  };
  return { rev, exp };
}

export const REV_LABELS = {
  property: "🏠 Property tax",
  corporate: "🏢 Corporate tax",
  gst: "🛒 GST",
  tourism: "📸 Tourism",
  trade: "⚓ Port trade",
  landSales: "📜 Government land sales",
  hdbSales: "🔑 HDB flat sales",
  nirc: "🏦 Reserves returns (NIRC)",
};
export const EXP_LABELS = {
  roads: "🛣️ Roads & rail upkeep",
  education: "🎓 Education",
  health: "⚕️ Healthcare",
  safety: "👮 Home Affairs",
  transport: "🚇 Transport services",
  community: "🌳 Community & parks",
  utilities: "⚡ Utilities",
  hdbBuild: "🏗️ HDB construction",
  construction: "🚧 New construction",
};

const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

// ---------- Monthly step ----------

function pushNews(w, text) {
  w.news.unshift({ t: w.t, date: dateLabel(w), text });
  if (w.news.length > 40) w.news.length = 40;
}

export function stepMonth(w, rng = Math.random) {
  if (w.gameOver) return;
  w.pendingLandSales = 0;
  w.pendingHdb = { build: 0, sales: 0 };
  let A = analyze(w);
  w.roadCount = A.roadCount;

  // Demand
  const comTarget = A.pop * 0.31 + A.tourism * 0.6;
  const indTarget = A.pop * 0.29 + A.trade * 1.5;
  const c = clamp((comTarget - A.comJobs) / Math.max(250, comTarget * 0.35), -1, 1) + effectAdd(w, "comDemand");
  const i = clamp((indTarget - A.indJobs) / Math.max(250, indTarget * 0.35), -1, 1) + effectAdd(w, "indDemand");
  const r = clamp(w.waitlist / Math.max(600, A.pop * 0.06), 0, 1) - (A.unemployment > 0.15 ? 0.3 : 0);
  w.demand = { r: clamp(r, -1, 1), c: clamp(c, -1, 1), i: clamp(i, -1, 1) };

  // Housing waitlist: natural growth + migration for jobs
  const happy = w.approval / 60;
  const natural = (A.pop + w.waitlist) * 0.0011 + 25;
  const spareJobs = A.jobs - A.workforce;
  const migration = spareJobs > 0 ? spareJobs * 0.07 * happy : spareJobs * 0.03;
  w.waitlist = Math.max(0, Math.round(w.waitlist + natural + migration));

  // Growth & decline
  const order = [];
  for (let k = 0; k < w.tiles.length; k++) if (w.tiles[k].z) order.push(k);
  for (let k = order.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [order[k], order[j]] = [order[j], order[k]];
  }
  let grown = 0;
  const maxGrow = 24 + Math.floor(order.length / 25);
  const grant = w.hdbGrant / 100;
  const D = diffOf(w);
  for (const k of order) {
    const tl = w.tiles[k];
    const zd = ZONES[tl.z];
    const ok = A.roadNear[k] && A.pw[k] && A.wt[k];
    if (tl.lv > 0 && (!A.pw[k] || !A.wt[k])) {
      if (rng() < 0.02) downgrade(w, tl);
      continue;
    }
    if (!ok) continue;
    const sc = A.score(k, tl.z);
    if (tl.lv > 0 && sc < zd.need[tl.lv].score - 18 && rng() < 0.04) {
      downgrade(w, tl);
      continue;
    }
    if (tl.lv >= 3 || grown >= maxGrow) continue;
    const nx = zd.need[tl.lv + 1];
    if (sc < nx.score || (!w.sandbox && w.year < nx.year)) continue;
    let p = 0;
    if (zd.pop) {
      const delta = zd.pop[tl.lv + 1] - zd.pop[tl.lv];
      if (w.waitlist < delta * 0.4) continue;
      p = (0.08 + 0.22 * w.demand.r) * D.growth;
      p *= tl.z === "hdb" ? 0.6 + grant * 0.7 : 0.25 + A.landValue[k] / 120 + Math.max(0, w.demand.c) * 0.2;
      if (rng() >= p) continue;
      w.waitlist = Math.max(0, w.waitlist - delta);
      if (tl.z === "hdb") {
        w.pendingHdb.build += delta * 0.6;
        w.pendingHdb.sales += delta * 0.6 * (0.88 - 0.42 * grant);
      } else w.pendingLandSales += delta * A.landValue[k] * 0.012;
    } else {
      const dem = tl.z === "com" ? w.demand.c : w.demand.i;
      if (dem <= 0.02) continue;
      p = (0.06 + 0.3 * dem) * D.growth;
      if (rng() >= p) continue;
      const delta = zd.jobs[tl.lv + 1] - zd.jobs[tl.lv];
      w.pendingLandSales += delta * (tl.z === "com" ? A.landValue[k] * 0.008 : 0.25);
    }
    tl.lv++;
    grown++;
  }
  // Excess jobs space shrinks slowly
  for (const k of order) {
    const tl = w.tiles[k];
    if (tl.lv === 0 || ZONES[tl.z].pop) continue;
    const dem = tl.z === "com" ? w.demand.c : w.demand.i;
    if (dem < -0.35 && rng() < 0.03) downgrade(w, tl);
  }
  // Residents leave when very unhappy
  if (w.approval < 28) {
    for (const k of order) {
      const tl = w.tiles[k];
      if (tl.lv > 0 && ZONES[tl.z].pop && rng() < 0.015) downgrade(w, tl, true);
    }
  }

  // Fires
  let fires = 0;
  for (const k of order) {
    const tl = w.tiles[k];
    if (tl.lv === 0) continue;
    const chance = (A.cover.fire[k] > 0 ? 0.00004 : 0.0007) * D.fire;
    if (rng() < chance) {
      downgrade(w, tl, true);
      if (tl.lv > 0) downgrade(w, tl, true);
      fires++;
    }
  }
  if (fires) pushNews(w, `🔥 Fire destroyed ${fires === 1 ? "a building" : fires + " buildings"}! Fire stations prevent this.`);

  // Re-analyse after growth so finances & approval match the new city
  A = analyze(w);
  w.mrtRunning = A.mrtRunning;
  w.stats = {
    pop: A.pop,
    hdbPop: A.hdbPop,
    ptePop: A.ptePop,
    jobs: A.jobs,
    comJobs: A.comJobs,
    indJobs: A.indJobs,
    unemployment: A.unemployment,
    powerSupply: A.powerSupply,
    powerDemand: A.powerDemand,
    waterSupply: A.waterSupply,
    waterDemand: A.waterDemand,
    waterSources: A.waterSources,
  };

  // Finances
  const B = monthlyBudget(w, A);
  const acc = w.monthAcc || emptyLedger();
  for (const [k, v] of Object.entries(B.rev)) acc.rev[k] = (acc.rev[k] || 0) + v;
  for (const [k, v] of Object.entries(B.exp)) acc.exp[k] = (acc.exp[k] || 0) + v;
  const net = sum(B.rev) - sum(B.exp);
  if (!w.sandbox) w.cash += net;
  w.reserves += B.rev.nirc; // the other half of returns stays in reserves
  w.lastMonth = acc;
  for (const side of ["rev", "exp"]) for (const [k, v] of Object.entries(acc[side])) w.yearAcc[side][k] = (w.yearAcc[side][k] || 0) + v;
  w.monthAcc = emptyLedger();

  // Approval (smoothed)
  w.needs = A.needs;
  w.approval = clamp(w.approval * 0.75 + A.approvalTarget * 0.25, 0, 100);

  if (w.cash < 0) {
    w.negativeMonths++;
    if (w.negativeMonths === 1) pushNews(w, "💸 The treasury is in the red! Raise taxes, cut funding, or draw on reserves.");
  } else w.negativeMonths = 0;

  // Effects tick
  w.effects = w.effects.filter((e) => e.until > w.t);

  // Advance date
  w.t++;
  w.month++;
  if (w.month > 11) {
    w.month = 0;
    w.year++;
    w.lastYear = w.yearAcc;
    w.yearAcc = emptyLedger();
  }

  for (const m of MILESTONES) if (m.year === w.year && m.month === w.month) pushNews(w, m.text);

  // Random events
  if (w.t > 6 && !w.effects.length) {
    for (const ev of EVENTS) {
      if (w.year >= ev.minYear && rng() < ev.chance) {
        w.effects.push({ id: ev.id, until: w.t + ev.months, effect: ev.effect });
        if (ev.once) ev.once(w);
        pushNews(w, ev.text);
        break;
      }
    }
  }

  // Ministerial review every 5 years (each January from 1970)
  if (w.month === 0 && w.year >= 1970 && (w.year - START_YEAR) % 5 === 0) {
    w.reserveDrawn = false;
    const a = Math.round(w.approval);
    if (!w.sandbox && a < D.reviewMin) {
      w.gameOver = { reason: "review", text: `At the ${w.year} ministerial review, approval was only ${a}%. You've been reassigned to a desk job at the Ministry of Paperwork.` };
    } else pushNews(w, `📋 ${w.year} ministerial review passed with ${a}% approval.${a < 45 ? " Residents are restless though!" : ""}`);
  }
  if (!w.sandbox && D.reviewMin > 0 && w.cash < -15000 && w.negativeMonths > 6) {
    w.gameOver = { reason: "broke", text: "The treasury ran dry for too long. The Ministry of Finance has taken over planning." };
  }

  w.history.push({ t: w.t, pop: A.pop, cash: Math.round(w.cash), approval: Math.round(w.approval) });
  if (w.history.length > 360) w.history.shift();
  checkGoals(w);
  return A;
}

function downgrade(w, tl, leave = false) {
  if (tl.lv <= 0) return;
  const zd = ZONES[tl.z];
  if (zd.pop && !leave) w.waitlist += Math.round((zd.pop[tl.lv] - zd.pop[tl.lv - 1]) * 0.6);
  tl.lv--;
}

// Draw on past reserves: needs the President's OK (cash must be low), once per 5-year term.
export function drawReserves(w) {
  if (w.reserveDrawn) return { ok: false, msg: "You've already drawn on reserves this term." };
  if (w.cash > 5000) return { ok: false, msg: "The President declines: reserves are only for real need. (Treasury must be below $5M.)" };
  const amt = Math.round(w.reserves * 0.2);
  w.reserves -= amt;
  w.cash += amt;
  w.reserveDrawn = true;
  w.approval = Math.max(0, w.approval - 4);
  pushNews(w, `🏛️ The President approved drawing ${fmtMoney(amt)} from past reserves. Some residents grumble.`);
  return { ok: true, amt };
}

// ---------- Goals ----------

export const GOALS = [
  { id: "road", text: "Build a road", hint: "Open 🛣️ Transport, pick Road, tap where it starts and where it ends, then press ✓ Build.", test: (w) => w.tiles.some((t) => t.road) },
  { id: "hdb", text: "Zone HDB flats beside a road", hint: "Open 🏘️ Zones, pick HDB Flats, tap two corners of a rectangle next to a road, then ✓.", test: (w) => w.tiles.some((t) => t.z === "hdb") },
  { id: "power", text: "Build a power station", hint: "Open ⚡ Utilities and place a Gas Power Station near a road, away from homes.", test: (w) => w.tiles.some((t) => t.b === "power" || t.b === "solar") },
  { id: "pop1k", text: "House 1,000 residents", hint: "Press ▶ to let time pass. Flats appear on HDB land that has a road and power.", test: (w) => w.stats.pop >= 1000 },
  { id: "jobs", text: "Zone commercial & industrial for jobs", hint: "Residents need work. Zone 🏬 Commercial and 🏭 Industrial land (factories away from homes).", test: (w) => w.stats.jobs >= 500 },
  { id: "hawker", text: "Open a hawker centre", hint: "Open 🍜 Services and place a Hawker Centre among the flats.", test: (w) => w.tiles.some((t) => t.b === "hawker") },
  { id: "school", text: "Open a primary school", hint: "Open 🍜 Services and place a Primary School near homes.", test: (w) => w.tiles.some((t) => t.b === "school") },
  { id: "pop5k", text: "Reach 5,000 residents", hint: "Zone more HDB land beside roads. Watch the R bar: tall green means people want homes.", test: (w) => w.stats.pop >= 5000 },
  { id: "water", text: "Build waterworks near the reservoirs", hint: "Imported water won't last forever. Place 🚰 Waterworks near the lakes in the middle of the island.", test: (w) => w.tiles.some((t) => t.b === "waterworks") },
  { id: "pop25k", text: "Reach 25,000 residents", hint: "Add polyclinics, police posts and parks so blocks grow taller. Tap any block with 👆 Look to see what it needs.", test: (w) => w.stats.pop >= 25000 },
  { id: "pop100k", text: "Reach 100,000 residents", hint: "Spread out with new towns. Each needs roads, a hawker centre, a school and a clinic.", test: (w) => w.stats.pop >= 100000 },
  { id: "mrt", text: "Run an MRT line (2 stations)", hint: "From 1987: lay 🛤️ MRT Track, then place a station beside the track at each end.", test: (w) => w.mrtRunning },
  { id: "pop300k", text: "Reach 300,000 residents", hint: "MRT stations raise land value a lot, so blocks near them grow into towers.", test: (w) => w.stats.pop >= 300000 },
  { id: "approval70", text: "Get approval to 70%", hint: "Open the 📊 report to see which needs are lowest.", test: (w) => w.approval >= 70 },
];

export const nextGoal = (w) => GOALS.find((g) => !w.goalsDone[g.id]) || null;

export function checkGoals(w) {
  for (const g of GOALS) {
    if (!w.goalsDone[g.id] && g.test(w)) {
      w.goalsDone[g.id] = true;
      if (w.t > 0) pushNews(w, `✅ Goal reached: ${g.text}`);
    }
  }
}

// ---------- Helpers ----------

export function fmtMoney(k) {
  const neg = k < 0;
  const v = Math.abs(k);
  let s;
  if (v >= 1e6) s = `$${(v / 1e6).toFixed(v >= 1e7 ? 1 : 2)}B`;
  else if (v >= 1000) s = `$${(v / 1000).toFixed(v >= 1e4 ? 1 : 2)}M`;
  else s = `$${Math.round(v)}K`;
  return neg ? `-${s}` : s;
}

export function fmtNum(n) {
  return Math.round(n).toLocaleString("en-SG");
}

// Explain a tile for the inspector.
export function describeTile(w, A, x, y) {
  if (!inMap(x, y)) return null;
  const i = idx(x, y);
  const tl = w.tiles[i];
  const lines = [];
  let title = "";
  let icon = "";
  if (tl.t === "sea") {
    title = "Sea";
    icon = "🌊";
    lines.push("Reclaim it with the 🏝️ tool if it touches land.");
  } else if (tl.t === "res") {
    title = "Reservoir";
    icon = "💧";
    lines.push("Rainwater catchment. Waterworks nearby turn it into water supply.");
  } else if (tl.b != null) {
    const o = tl.o;
    const bd = BUILDINGS[w.tiles[o].b];
    title = bd.name;
    icon = bd.icon;
    const reason = A.active.get(o);
    lines.push(reason ? `⚠️ Not working: ${reason}` : "✅ Working");
    if (bd.cover) lines.push(`Covers ${bd.radius} tiles around it`);
    if (bd.supply?.power) lines.push(`Supplies ${bd.supply.power} power units`);
    if (bd.supply?.water) lines.push(`Supplies ${bd.supply.water}+ water units`);
    lines.push(`Upkeep ${fmtMoney(bd.upkeep)}/month`);
    lines.push(bd.tip);
  } else if (tl.z) {
    const zd = ZONES[tl.z];
    title = zd.levelNames[tl.lv];
    icon = zd.icon;
    if (zd.pop) lines.push(`👥 ${fmtNum(zd.pop[tl.lv])} residents`);
    else lines.push(`💼 ${fmtNum(zd.jobs[tl.lv])} jobs`);
    if (!A.roadNear[i]) lines.push("⚠️ Needs a road within 3 tiles");
    else if (!A.pw[i]) lines.push("⚠️ No power! Build more power stations");
    else if (!A.wt[i]) lines.push("⚠️ No water! Build more water supply");
    else if (tl.lv < 3) {
      const nx = zd.need[tl.lv + 1];
      const sc = A.score(i, tl.z);
      if (!w.sandbox && w.year < nx.year) lines.push(`Next level possible from ${nx.year}`);
      else if (sc < nx.score) lines.push(`Desirability ${Math.round(sc)} / ${nx.score} needed to grow. ${hintFor(tl.z)}`);
      else if (zd.pop && w.waitlist < 50) lines.push("Ready to grow when more people need homes");
      else if (!zd.pop && (tl.z === "com" ? w.demand.c : w.demand.i) <= 0) lines.push("Ready to grow when demand rises");
      else lines.push(`Desirability ${Math.round(sc)} — ready to grow 🌱`);
    } else lines.push("Fully developed ⭐");
  } else {
    title = tl.road && tl.rail ? "Road + MRT viaduct" : tl.road ? "Road" : tl.rail ? "MRT track" : tl.tr ? "Trees" : "Empty land";
    icon = tl.road ? "🛣️" : tl.rail ? "🛤️" : tl.tr ? "🌳" : "🟩";
  }
  if (tl.t === "land") {
    lines.push(`Land value ${Math.round(A.landValue[i])} · Pollution ${Math.round(A.pollution[i])}`);
  }
  return { title, icon, lines, x, y };
}

function hintFor(z) {
  if (z === "hdb") return "Add hawker centres, schools, clinics, transport.";
  if (z === "pte") return "Raise land value: parks, MRT, waterfront, less pollution.";
  if (z === "com") return "Needs good transport and land value.";
  return "Needs transport links and a bigger city.";
}

// ---------- Save / load ----------

const SAVE_KEY = "lion-city-planner-save";

export function saveWorld(w) {
  try {
    const { monthAcc, ...rest } = w;
    // Compact tiles: [t, tr, z, lv, b, o, road, rail]
    const T = { s: 0, l: 1, r: 2 };
    const tiles = w.tiles.map((t) => [T[t.t[0]], t.tr ? 1 : 0, t.z || 0, t.lv, t.b || 0, t.o, t.road ? 1 : 0, t.rail ? 1 : 0]);
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...rest, tiles }));
    return true;
  } catch {
    return false;
  }
}

export function loadWorld() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    const TT = ["sea", "land", "res"];
    d.tiles = d.tiles.map(([t, tr, z, lv, b, o, road, rail]) => ({ t: TT[t], tr: !!tr, z: z || null, lv, b: b || null, o, road: !!road, rail: !!rail }));
    return d;
  } catch {
    return null;
  }
}

// Name, date and population of the saved city, for the Continue button.
export function saveInfo() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return { name: d.name, date: `${MONTHS[d.month]} ${d.year}`, pop: d.stats?.pop || 0 };
  } catch {
    return null;
  }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}
