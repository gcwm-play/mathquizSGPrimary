// Renderer for Lion City Mayor: smooth contoured terrain and curved roads drawn
// in world space through the isometric transform, plus depth-sorted cached
// sprites for buildings, trees and kampong houses.
import { MAP } from "./regions.js";
import { terrain, TERRAIN_GRID, RES, segPts, terrainAt } from "./world.js";
import { ROAD_TYPES, STRUCTS, LOT_TYPES, purposeOf } from "./defs.js";

const PURPOSE_SHORT = { mixed: "Mixed", residential: "Homes", commercial: "CBD", industrial: "Industry", heritage: "Heritage", resort: "Resort" };
import { PX, PY, INK, inkStyle, drawLotBuilding, drawConstruction, drawAttap, drawStruct, structHeight, LOT_HEIGHT, blobTree, prism, boxUV } from "./art.js";
import { tree as cityTree, palm } from "../city/art.js";
import { createAgents, updateAgents, agentPose, drawCar, drawTrain, initSea, moveSea, drawBoat, drawClouds } from "./agents.js";

const HW = 32;
const HH = 16;

export function screenToWorld(cam, sx, sy) {
  const ix = (sx - cam.x) / cam.zoom;
  const iy = (sy - cam.y) / cam.zoom;
  return { x: (iy / HH + ix / HW) / 2, y: (iy / HH - ix / HW) / 2 };
}
export function worldToScreen(cam, x, y) {
  return { x: PX(x, y) * cam.zoom + cam.x, y: PY(x, y) * cam.zoom + cam.y };
}
export function centerOn(cam, width, height, x, y) {
  cam.x = width / 2 - PX(x, y) * cam.zoom;
  cam.y = height / 2 - PY(x, y) * cam.zoom;
}

export function createRenderer() {
  return { sprites: new Map(), S: 0, agents: createAgents(), lastTime: 0, tkey: null, rev: -1, list: null };
}

const hash = (a, b) => {
  let h = Math.imul(Math.floor(a * 97) * 374761393 + Math.floor(b * 89) * 668265263, 1274126177);
  h ^= h >>> 13;
  return ((h >>> 0) % 1000) / 1000;
};

// ---------- terrain contours (marching squares) ----------
function contour(field, keep = () => true) {
  const G = TERRAIN_GRID;
  const fill = new Path2D();
  const lines = new Path2D();
  const v = (i, j) => field[j * G + i];
  for (let j = 0; j < G - 1; j++) {
    let run = -1;
    for (let i = 0; i < G - 1; i++) {
      const c = [v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)];
      const pos = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      const inside = c.map((x) => x > 0);
      const full = inside.every(Boolean) && keep(i, j);
      if (full) {
        if (run < 0) run = i;
        continue;
      }
      if (run >= 0) {
        fill.rect(run * RES, j * RES, (i - run) * RES, RES);
        run = -1;
      }
      if (!inside.some(Boolean) || !keep(i, j)) continue;
      const poly = [];
      const cross = [];
      for (let k = 0; k < 4; k++) {
        const a = c[k];
        const b = c[(k + 1) % 4];
        if (inside[k]) poly.push([pos[k][0] * RES, pos[k][1] * RES]);
        if (a > 0 !== b > 0) {
          const t = a / (a - b);
          const p = [(pos[k][0] + (pos[(k + 1) % 4][0] - pos[k][0]) * t) * RES, (pos[k][1] + (pos[(k + 1) % 4][1] - pos[k][1]) * t) * RES];
          poly.push(p);
          cross.push(p);
        }
      }
      fill.moveTo(poly[0][0], poly[0][1]);
      for (let k = 1; k < poly.length; k++) fill.lineTo(poly[k][0], poly[k][1]);
      fill.closePath();
      for (let k = 0; k + 1 < cross.length; k += 2) {
        lines.moveTo(cross[k][0], cross[k][1]);
        lines.lineTo(cross[k + 1][0], cross[k + 1][1]);
      }
    }
    if (run >= 0) fill.rect(run * RES, j * RES, (G - 1 - run) * RES, RES);
  }
  return { fill, lines };
}

function terrainPaths(R, w) {
  const T = terrain(w);
  if (R.tkey === T.key && R.tp) return R.tp;
  const G = TERRAIN_GRID;
  const land = contour(T.L);
  const fresh = contour(T.F, (i, j) => T.L[j * G + i] > -1 || T.L[(j + 1) * G + i + 1] > -1);
  const foreign = contour(T.J);
  // edge colours for the diorama sides
  const edgeX = [];
  const edgeY = [];
  for (let k = 0; k < G - 1; k++) {
    const a = (k + 0.5) * RES;
    edgeX.push(terrainAt(w, MAP - 0.01, a));
    edgeY.push(terrainAt(w, a, MAP - 0.01));
  }
  R.tp = { land, fresh, foreign, edgeX, edgeY, hasForeign: T.J.some((x) => x > 0) };
  R.tkey = T.key;
  // decorative Johor Bahru skyline
  R.jb = [];
  if (R.tp.hasForeign) {
    for (let k = 0; k < 40; k++) {
      const x = 4 + ((k * 37) % 56);
      const y = 4 + ((k * 23) % 56);
      const j = sampleField(T.J, x, y);
      if (j > 0.5 && j < 4) R.jb.push({ x, y, h: 20 + ((k * 13) % 50) });
    }
  }
  return R.tp;
}
function sampleField(arr, x, y) {
  const G = TERRAIN_GRID;
  const i = Math.max(0, Math.min(G - 1, Math.round(x / RES)));
  const j = Math.max(0, Math.min(G - 1, Math.round(y / RES)));
  return arr[j * G + i];
}

// ---------- sprites ----------
function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function sprite(R, key, left, top, w, h, paint) {
  let sp = R.sprites.get(key);
  if (sp) return sp;
  const S = R.S;
  const c = makeCanvas(Math.max(1, Math.ceil(w * S)), Math.max(1, Math.ceil(h * S)));
  const g = c.getContext("2d");
  g.setTransform(S, 0, 0, S, -left * S, -top * S);
  inkStyle(g);
  paint(g);
  sp = { c, left, top, w, h };
  R.sprites.set(key, sp);
  if (R.sprites.size > 1800) R.sprites.delete(R.sprites.keys().next().value);
  return sp;
}
const blit = (ctx, sp, dx = 0, dy = 0) => ctx.drawImage(sp.c, sp.left + dx, sp.top + dy, sp.w, sp.h);

function quadBounds(q, height) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let k = 0; k < 4; k++) {
    const sx = PX(q[k * 2], q[k * 2 + 1]);
    const sy = PY(q[k * 2], q[k * 2 + 1]);
    minX = Math.min(minX, sx);
    maxX = Math.max(maxX, sx);
    minY = Math.min(minY, sy);
    maxY = Math.max(maxY, sy);
  }
  return { left: minX - 10, top: minY - height - 16, w: maxX - minX + 70, h: maxY - minY + height + 30 };
}

const ANIMATED = new Set(["changiAirport", "airbase", "jurongIsland"]);
const TREE_PALS = [["#3fb85f", "#7be08a"], ["#2fa05a", "#63cf7d"], ["#58c24a", "#97e37a"], ["#2b9a6e", "#5fd0a0"]];

// Static things to draw, sorted back to front. Rebuilt when the world changes.
function buildList(R, w) {
  const list = [];
  const qmax = (q) => Math.max(q[0] + q[1], q[2] + q[3], q[4] + q[5], q[6] + q[7]);
  for (const l of w.lots) {
    if (l.b) list.push({ d: qmax(l.q) - 0.2, k: "lot", o: l, x: l.x, y: l.y });
    else if (l.ruin) list.push({ d: qmax(l.q) - 0.2, k: "ruin", o: l, x: l.x, y: l.y });
  }
  for (const s of w.structs) list.push({ d: qmax(s.q) - 0.2, k: "struct", o: s, x: s.x, y: s.y });
  for (const k of w.kampongs) k.houses.forEach((h, i) => list.push({ d: h[0] + h[1], k: "house", o: h, kid: k.id, i, x: h[0], y: h[1] }));
  for (const t of w.trees) list.push({ d: t[0] + t[1], k: "tree", o: t, x: t[0], y: t[1] });
  for (const s of w.segs) {
    if (!ROAD_TYPES[s.type].rail) continue;
    const p = segPts(w, s);
    for (let k = 0; k + 2 < p.length; k += 2) list.push({ d: (p[k] + p[k + 1] + p[k + 2] + p[k + 3]) / 2 + 0.05, k: "rail", x0: p[k], y0: p[k + 1], x1: p[k + 2], y1: p[k + 3], pillar: k % 8 === 0, x: p[k], y: p[k + 1] });
  }
  for (const j of R.jb || []) list.push({ d: j.x + j.y, k: "jb", o: j, x: j.x, y: j.y });
  list.sort((a, b) => a.d - b.d);
  return list;
}

// ---------- ground layers built per world revision ----------
function groundPaths(R, w) {
  if (R.gRev === w.rev && R.g) return R.g;
  const zoned = { hdb: new Path2D(), pte: new Path2D(), com: new Path2D(), ind: new Path2D() };
  const pads = { hdb: new Path2D(), pte: new Path2D(), com: new Path2D(), ind: new Path2D() };
  const empty = new Path2D();
  const ruins = new Path2D();
  const quad = (p, q) => {
    p.moveTo(q[0], q[1]);
    p.lineTo(q[2], q[3]);
    p.lineTo(q[4], q[5]);
    p.lineTo(q[6], q[7]);
    p.closePath();
  };
  for (const l of w.lots) {
    if (l.ruin && !l.b) quad(ruins, l.q);
    else if (l.b) quad(pads[l.zone] || pads.com, l.q);
    else if (l.zone) quad(zoned[l.zone], l.q);
    else quad(empty, l.q);
  }
  const roads = { road: new Path2D(), avenue: new Path2D(), rail: new Path2D() };
  for (const s of w.segs) {
    const p = segPts(w, s);
    const path = roads[s.type];
    path.moveTo(p[0], p[1]);
    for (let k = 2; k < p.length; k += 2) path.lineTo(p[k], p[k + 1]);
  }
  const kam = new Path2D();
  for (const k of w.kampongs) {
    for (const h of k.houses) {
      kam.moveTo(h[0] + 0.8, h[1]);
      kam.arc(h[0], h[1], 0.8, 0, Math.PI * 2);
    }
  }
  R.g = { zoned, pads, empty, roads, kam, ruins };
  R.gRev = w.rev;
  return R.g;
}

export const ZONE_TINT = { hdb: "#2fd06f", pte: "#f45fae", com: "#4b9bff", ind: "#ffb020" };
const PAD = { hdb: "#e6eed6", pte: "#bfe8a1", com: "#e3e8f3", ind: "#e8dfcd" };

export const OVERLAYS = {
  none: { name: "Normal map", icon: "🗺️" },
  towns: { name: "Towns", icon: "🏘️" },
  landValue: { name: "Land value", icon: "💎", get: (A, l) => A.info.get(l.id)?.lv / 80 },
  pollution: { name: "Clean air", icon: "🏭", get: (A, l) => 1 - (A.info.get(l.id)?.p || 0) / 50 },
  food: { name: "Food cover", icon: "🍜", get: (A, l) => A.info.get(l.id)?.c.food },
  school: { name: "Primary schools", icon: "🏫", get: (A, l) => A.info.get(l.id)?.c.school },
  school2: { name: "Secondary schools", icon: "🎒", get: (A, l) => A.info.get(l.id)?.c.school2 },
  school3: { name: "Polytechnic / uni", icon: "🎓", get: (A, l) => A.info.get(l.id)?.c.school3 },
  health: { name: "Health cover", icon: "🩺", get: (A, l) => A.info.get(l.id)?.c.health },
  safety: { name: "Police cover", icon: "👮", get: (A, l) => A.info.get(l.id)?.c.safety },
  fire: { name: "Fire cover", icon: "🚒", get: (A, l) => A.info.get(l.id)?.c.fire },
  transport: { name: "Transport", icon: "🚌", get: (A, l) => A.info.get(l.id)?.transport },
  green: { name: "Greenery", icon: "🌳", get: (A, l) => A.info.get(l.id)?.c.green },
  age: { name: "Building age", icon: "🏚️", get: (A, l, w) => (l.b && LOT_TYPES[l.b.type].q ? 1 - Math.max(0, (w.t - (l.b.up || l.b.built)) / 12 - 10) / 35 : null) },
};
const TOWN_COLORS = ["#ff6b6b", "#4dabf7", "#51cf66", "#fcc419", "#cc5de8", "#ff922b"];

function heat(v) {
  const t = Math.max(0, Math.min(1, v));
  const r = t < 0.5 ? 255 : Math.round(255 - (t - 0.5) * 2 * 200);
  const g = t < 0.5 ? Math.round(90 + t * 2 * 130) : 220;
  const b = t < 0.5 ? 90 : Math.round(90 + (t - 0.5) * 2 * 40);
  return `rgba(${r},${g},${b},0.7)`;
}

// ---------- main draw ----------
export function draw(ctx, R, w, A, cam, view) {
  const { width, height, dpr, overlay = "none", preview, selected, time = 0, interacting = false, motion = true } = view;
  const dt = Math.min(0.1, R.lastTime ? (time - R.lastTime) / 1000 : 0);
  R.lastTime = time;
  const zq = Math.pow(2, Math.round(Math.log2(cam.zoom) * 3) / 3);
  const S = Math.min(4, dpr * zq);
  if (!R.S || (!interacting && Math.abs(S - R.S) > 1e-3)) {
    R.sprites.clear();
    R.S = S;
  }
  const tp = terrainPaths(R, w);
  const isSea = (x, y) => terrainAt(w, x, y) === "sea";
  initSea(R.agents, w, isSea);
  if (motion) {
    updateAgents(R.agents, w, A, dt);
    moveSea(R.agents, isSea, dt);
  } else if (!R.agents.sig) updateAgents(R.agents, w, A, 0);

  // sky
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#bfe9ff");
  grad.addColorStop(1, "#7fcdf3");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const z = cam.zoom * dpr;
  const iso = () => ctx.setTransform(HW * z, HH * z, -HW * z, HH * z, dpr * cam.x, dpr * cam.y);
  const flat = () => ctx.setTransform(z, 0, 0, z, dpr * cam.x, dpr * cam.y);

  // diorama sides along the two front edges of the map
  flat();
  const E = 14;
  for (let k = 0; k < tp.edgeX.length; k++) {
    const a = k * RES;
    const b = (k + 1) * RES;
    for (const [edge, A0, B0] of [[tp.edgeX[k], [MAP, a], [MAP, b]], [tp.edgeY[k], [a, MAP], [b, MAP]]]) {
      const c = edge === "land" ? "#c7955a" : edge === "foreign" ? "#9aa57a" : "#1f7fbf";
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(PX(...A0), PY(...A0));
      ctx.lineTo(PX(...B0), PY(...B0));
      ctx.lineTo(PX(...B0), PY(...B0) + E);
      ctx.lineTo(PX(...A0), PY(...A0) + E);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PX(MAP, 0), PY(MAP, 0));
  ctx.lineTo(PX(MAP, 0), PY(MAP, 0) + E);
  ctx.lineTo(PX(MAP, MAP), PY(MAP, MAP) + E);
  ctx.lineTo(PX(0, MAP), PY(0, MAP) + E);
  ctx.lineTo(PX(0, MAP), PY(0, MAP));
  ctx.stroke();

  // terrain in world space
  iso();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, MAP, MAP);
  ctx.clip();
  ctx.fillStyle = "#3db3ea";
  ctx.fillRect(0, 0, MAP, MAP);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#8fe3f7";
  ctx.lineWidth = 2.6;
  ctx.stroke(tp.land.lines);
  if (tp.hasForeign) ctx.stroke(tp.foreign.lines);
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 0.6;
  ctx.stroke(tp.land.lines);
  if (tp.hasForeign) {
    ctx.fillStyle = "#b5cf98";
    ctx.fill(tp.foreign.fill);
  }
  ctx.fillStyle = "#98dc68";
  ctx.fill(tp.land.fill);
  ctx.save();
  ctx.clip(tp.land.fill);
  ctx.strokeStyle = "#fbe39c";
  ctx.lineWidth = 1.5;
  ctx.stroke(tp.land.lines);
  ctx.restore();
  ctx.fillStyle = "#5fcdf5";
  ctx.fill(tp.fresh.fill);
  ctx.strokeStyle = "#cdeffc";
  ctx.lineWidth = 0.3;
  ctx.stroke(tp.fresh.lines);

  // kampong dirt, lots and roads
  const g = groundPaths(R, w);
  ctx.fillStyle = "#e3cf9f";
  ctx.fill(g.kam);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill(g.empty);
  for (const zk of Object.keys(g.pads)) {
    ctx.fillStyle = PAD[zk];
    ctx.fill(g.pads[zk]);
  }
  ctx.fillStyle = "#8a8378";
  ctx.fill(g.ruins);
  for (const zk of Object.keys(g.zoned)) {
    ctx.fillStyle = ZONE_TINT[zk] + "55";
    ctx.fill(g.zoned[zk]);
    ctx.strokeStyle = ZONE_TINT[zk];
    ctx.lineWidth = 0.08;
    ctx.setLineDash([0.25, 0.18]);
    ctx.stroke(g.zoned[zk]);
    ctx.setLineDash([]);
  }
  for (const [type, path] of Object.entries(g.roads)) {
    const rt = ROAD_TYPES[type];
    if (rt.rail) {
      ctx.strokeStyle = "rgba(40,60,100,0.18)";
      ctx.lineWidth = 0.7;
      ctx.stroke(path);
      continue;
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = rt.half * 2 + 0.34;
    ctx.stroke(path);
    ctx.strokeStyle = "#e3e6ee";
    ctx.lineWidth = rt.half * 2 + 0.2;
    ctx.stroke(path);
    ctx.strokeStyle = "#5a6078";
    ctx.lineWidth = rt.half * 2 - 0.12;
    ctx.stroke(path);
  }
  if (w.causeway) {
    // the 1924 Causeway across the Strait to Johor Bahru
    const c = w.causeway;
    ctx.beginPath();
    ctx.moveTo(c.ax, c.ay);
    ctx.lineTo(c.bx, c.by);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = "#cfc6b4";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.strokeStyle = "#5a6078";
    ctx.lineWidth = 0.75;
    ctx.stroke();
  }
  // bridges to Johor and Sentosa, and the cable car line
  for (const st of w.structs) {
    if (!st.bridge) continue;
    const [ax, ay, bx, by, kind] = st.bridge;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    if (kind === "cable") {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.08;
      ctx.stroke();
      ctx.fillStyle = "#ff5a5f";
      const k = (Date.now() / 9000) % 1;
      ctx.fillRect(ax + (bx - ax) * k - 0.25, ay + (by - ay) * k - 0.25, 0.5, 0.5);
      continue;
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = kind === "rail" ? 0.9 : 1.5;
    ctx.stroke();
    ctx.strokeStyle = kind === "rail" ? "#d6dbe8" : "#cfc6b4";
    ctx.lineWidth = kind === "rail" ? 0.7 : 1.3;
    ctx.stroke();
    if (kind === "road") {
      ctx.strokeStyle = "#5a6078";
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }
  }
  if (cam.zoom > 0.5) {
    ctx.strokeStyle = "#fff3c4";
    ctx.lineWidth = 0.06;
    ctx.setLineDash([0.35, 0.35]);
    ctx.stroke(g.roads.road);
    ctx.stroke(g.roads.avenue);
    ctx.setLineDash([]);
  }

  // overlays
  const ov = overlay !== "none" ? OVERLAYS[overlay] : null;
  if (ov && A) {
    for (const l of w.lots) {
      let fill = null;
      if (overlay === "towns") fill = TOWN_COLORS[l.town % TOWN_COLORS.length] + "aa";
      else {
        const v = ov.get(A, l, w);
        if (v != null && !Number.isNaN(v)) fill = heat(v);
      }
      if (!fill) continue;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(l.q[0], l.q[1]);
      ctx.lineTo(l.q[2], l.q[3]);
      ctx.lineTo(l.q[4], l.q[5]);
      ctx.lineTo(l.q[6], l.q[7]);
      ctx.closePath();
      ctx.fill();
    }
  }

  // town borders (dashed), so you can tell which town a spot belongs to
  const tb = townBorders(w);
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 0.42;
  ctx.stroke(tb);
  ctx.setLineDash([0.7, 0.45]);
  ctx.strokeStyle = "rgba(112,72,232,0.9)";
  ctx.lineWidth = 0.2;
  ctx.stroke(tb);
  ctx.setLineDash([]);

  // fantasy danger zones
  for (const z of w.fantasy?.zones || []) {
    const zombie = z.kind === "zombie";
    const pulse = motion ? 0.5 + 0.5 * Math.sin(time / 600 + z.id) : 0.5;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
    ctx.fillStyle = zombie ? `rgba(112,40,160,${0.2 + pulse * 0.08})` : `rgba(170,230,40,${0.2 + pulse * 0.08})`;
    ctx.fill();
    if (zombie && w.fantasy.state?.wall) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.strokeStyle = "#adb5bd";
      ctx.lineWidth = 0.36;
      ctx.stroke();
    } else {
      ctx.setLineDash([0.5, 0.35]);
      ctx.strokeStyle = zombie ? "rgba(112,40,160,0.9)" : "rgba(120,160,0,0.95)";
      ctx.lineWidth = 0.18;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // previews on the ground
  if (preview) drawPreviewGround(ctx, w, preview, time);
  if (selected) {
    ctx.strokeStyle = "#ffd43b";
    ctx.lineWidth = 0.22;
    ctx.beginPath();
    if (selected.q) {
      const q = selected.q;
      ctx.moveTo(q[0], q[1]);
      ctx.lineTo(q[2], q[3]);
      ctx.lineTo(q[4], q[5]);
      ctx.lineTo(q[6], q[7]);
      ctx.closePath();
    } else if (selected.r) ctx.arc(selected.x, selected.y, selected.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // service coverage: the one you're placing or looking at, plus others of the same kind
  const pS = preview?.kind === "struct" && preview.q ? STRUCTS[preview.type] : null;
  const cov = selected?.cover || (pS?.cover && pS.r ? { x: preview.x, y: preview.y, r: pS.r, kind: pS.cover } : null);
  if (cov) {
    ctx.setLineDash([0.4, 0.3]);
    for (const st of w.structs) {
      const S = STRUCTS[st.type];
      if (S.cover !== cov.kind || !S.r || (st.x === cov.x && st.y === cov.y)) continue;
      ctx.beginPath();
      ctx.arc(st.x, st.y, S.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(120,130,150,0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(60,70,90,0.45)";
      ctx.lineWidth = 0.1;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cov.x, cov.y, cov.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(42,120,214,0.12)";
    ctx.fill();
    ctx.strokeStyle = "rgba(42,120,214,0.9)";
    ctx.lineWidth = 0.16;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  // boats
  flat();
  for (const b of R.agents.boats) drawBoat(ctx, b, time);

  // objects
  if (R.listRev !== w.rev || !R.list) {
    R.list = buildList(R, w);
    R.listRev = w.rev;
  }
  const dyn = [];
  if (cam.zoom > 0.42) {
    for (const c of R.agents.cars) {
      const p = agentPose(w, c, 0.13);
      if (p) dyn.push({ d: p.x + p.y, k: "car", o: c });
    }
  }
  for (const c of R.agents.trains) {
    const p = agentPose(w, c, 0);
    if (p) dyn.push({ d: p.x + p.y + 0.1, k: "train", o: c });
  }
  dyn.sort((a, b) => a.d - b.d);
  const vx0 = -cam.x / cam.zoom - 120;
  const vx1 = (width - cam.x) / cam.zoom + 120;
  const vy0 = -cam.y / cam.zoom - 40;
  const vy1 = (height - cam.y) / cam.zoom + 240;
  const vis = (x, y) => {
    const sx = PX(x, y);
    const sy = PY(x, y);
    return sx > vx0 && sx < vx1 && sy > vy0 && sy < vy1;
  };
  if (ov) ctx.globalAlpha = 0.55;
  let di = 0;
  const flushDyn = (upto) => {
    while (di < dyn.length && dyn[di].d <= upto) {
      const e = dyn[di++];
      if (e.k === "car") drawCar(ctx, w, e.o);
      else drawTrain(ctx, w, e.o);
    }
  };
  const badges = [];
  for (const e of R.list) {
    flushDyn(e.d);
    if (!vis(e.x, e.y)) continue;
    drawEntry(ctx, R, w, A, e, time, motion, badges, cam);
  }
  flushDyn(Infinity);
  ctx.globalAlpha = 1;

  // ghost of a service being placed
  if (preview?.kind === "struct" && preview.q) {
    ctx.globalAlpha = preview.ok ? 0.85 : 0.4;
    inkStyle(ctx);
    drawStruct(ctx, preview.q, preview.type, time);
    ctx.globalAlpha = 1;
  }
  if (preview?.kind === "road") drawRoadHandles(ctx, preview, time);

  for (const z of w.fantasy?.zones || []) badges.push({ ch: z.kind === "zombie" ? "🧟" : "☢️", x: PX(z.x, z.y), y: PY(z.x, z.y), bg: z.kind === "zombie" ? "#d0bfff" : "#d8f5a2" });
  for (const b of badges) badge(ctx, b.ch, b.x, b.y, 13, b.bg);
  if (motion) drawClouds(ctx, R.agents, Math.max(0, Math.min(0.85, 1.2 - cam.zoom * 1.1)));

  // town names
  if (cam.zoom < 1.4) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const t of w.towns) {
      const sx = PX(t.x, t.y) * cam.zoom + cam.x;
      const sy = PY(t.x, t.y) * cam.zoom + cam.y - 30;
      if (sx < -80 || sx > width + 80 || sy < -30 || sy > height + 30) continue;
      ctx.font = '700 16px "Fredoka", ui-rounded, system-ui, sans-serif';
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(47,43,74,0.85)";
      ctx.lineJoin = "round";
      // what the town is planned for, as a reminder: icon beside the name, short name in the pill
      const P = purposeOf(t);
      const nw = ctx.measureText(t.name).width;
      ctx.strokeText(t.name, sx + 10, sy);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(t.name, sx + 10, sy);
      ctx.font = '16px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      ctx.fillText(P.icon, sx + 10 - nw / 2 - 12, sy + 1);
      const ap = Math.round(t.approval);
      const face = ap >= 65 ? "😄" : ap >= 50 ? "🙂" : ap >= 38 ? "😐" : "😟";
      ctx.font = '600 12px "Fredoka", ui-rounded, system-ui, sans-serif';
      const label = `${PURPOSE_SHORT[t.purpose] || "Mixed"} · ${face} ${ap}%`;
      const tw = ctx.measureText(label).width + 14;
      ctx.fillStyle = "rgba(255,253,246,0.95)";
      ctx.beginPath();
      ctx.roundRect?.(sx - tw / 2, sy + 10, tw, 18, 9);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.fillText(label, sx, sy + 19.5);
    }
  }
  // a falling-ash haze, and the glass dome
  const fs = w.fantasy?.state;
  if (fs && ((fs.ashUntil || 0) > w.t || fs.dome)) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = (fs.ashUntil || 0) > w.t ? "rgba(110,105,100,0.22)" : "rgba(120,220,255,0.07)";
    ctx.fillRect(0, 0, width, height);
  }
}

function drawEntry(ctx, R, w, A, e, time, motion, badges, cam) {
  switch (e.k) {
    case "lot": {
      const l = e.o;
      const b = l.b;
      if (b.state === "build") {
        const T = LOT_TYPES[b.type];
        const prog = Math.max(0, Math.min(1, 1 - (b.until - w.t) / T.build));
        const bucket = Math.floor(prog * 4);
        const H = (LOT_HEIGHT[b.type] || 40) * 0.8 + 40;
        const bd = quadBounds(l.q, H);
        blit(ctx, sprite(R, `c${l.id}:${l.q[0]}:${b.type}:${bucket}`, bd.left, bd.top, bd.w, bd.h, (g) => drawConstruction(g, l.q, b.type, (bucket + 0.5) / 4, 0)));
        return;
      }
      const H = LOT_HEIGHT[b.type] || 40;
      const bd = quadBounds(l.q, H);
      blit(ctx, sprite(R, `l${l.id}:${l.q[0]}:${b.type}:${b.v}:${b.up ? 1 : 0}:${b.conserved ? 1 : 0}`, bd.left, bd.top, bd.w, bd.h, (g) => drawLotBuilding(g, l.q, b)));
      if (b.state === "upgrade") {
        const [cx, cy] = [PX(l.x, l.y), PY(l.x, l.y)];
        badges.push({ ch: "🔧", x: cx, y: cy - H * 0.6, bg: "#ffe066" });
      }
      return;
    }
    case "struct": {
      const s = e.o;
      const H = structHeight(s.type) + 30;
      if (s.state === "build") {
        const S0 = STRUCTS[s.type];
        const prog = Math.max(0, Math.min(1, 1 - (s.until - w.t) / (S0.build || 12)));
        const bucket = Math.min(3, Math.floor(prog * 4));
        const bd = quadBounds(s.q, H);
        blit(ctx, sprite(R, `sb${s.id}:${s.x}:${bucket}`, bd.left, bd.top, bd.w, bd.h, (g) => drawConstruction(g, s.q, "office", (bucket + 0.5) / 4, 0)));
        badges.push({ ch: "🏗️", x: PX(s.x, s.y), y: PY(s.x, s.y) - 40, bg: "#ffe066" });
        return;
      }
      if (ANIMATED.has(s.type)) {
        inkStyle(ctx);
        drawStruct(ctx, s.q, s.type, motion ? time : 0);
      } else {
        const bd = quadBounds(s.q, H);
        blit(ctx, sprite(R, `s${s.id}:${s.x}:${s.type}`, bd.left, bd.top, bd.w, bd.h, (g) => drawStruct(g, s.q, s.type, 0)));
      }
      const S = STRUCTS[s.type];
      const cx = PX(s.x, s.y);
      const cy = PY(s.x, s.y) - Math.min(H, 50) - 6;
      if (s.type === "mrt" && A && !(A.liveStations || A.stations).includes(s)) badges.push({ ch: "⚠️", x: cx, y: cy, bg: "#ffe066" });
      else if (!S.fixed && cam.zoom >= 0.75) badge(ctx, S.icon, cx, cy, Math.max(11, Math.min(15, 13 / Math.sqrt(cam.zoom))), "#ffffff");
      return;
    }
    case "house": {
      const h = e.o;
      const key = `h${e.kid}:${e.i}:${h[0]}`;
      const bd = { left: PX(h[0], h[1]) - 26, top: PY(h[0], h[1]) - 40, w: 60, h: 56 };
      blit(ctx, sprite(R, key, bd.left, bd.top, bd.w, bd.h, (g) => drawAttap(g, h[0], h[1], h[2], h[3])));
      return;
    }
    case "tree": {
      const t = e.o;
      const v = t[2];
      const coastal = terrainCoastal(w, t[0], t[1]);
      const key = `t${coastal ? "p" : ""}${v}`;
      const sp = sprite(R, key, -24, -40, 52, 50, (g) => {
        if (coastal) palm(g, 0, 0, 0.9);
        else if (v % 3 === 2) blobTree(g, 0, 0, 1.05, TREE_PALS[v % 4]);
        else cityTree(g, 0, 0, 1, TREE_PALS[v % 4]);
      });
      blit(ctx, sp, PX(t[0], t[1]), PY(t[0], t[1]));
      return;
    }
    case "rail": {
      const Z = 14;
      const a = [PX(e.x0, e.y0), PY(e.x0, e.y0) - Z];
      const b = [PX(e.x1, e.y1), PY(e.x1, e.y1) - Z];
      if (e.pillar) {
        inkStyle(ctx, 1);
        ctx.fillStyle = "#d5dae6";
        ctx.beginPath();
        ctx.rect(a[0] - 2.5, a[1], 5, Z);
        ctx.fill();
        ctx.stroke();
      }
      ctx.lineCap = "round";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.strokeStyle = "#eef1f7";
      ctx.lineWidth = 8.5;
      ctx.stroke();
      ctx.strokeStyle = "#9aa3b8";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      inkStyle(ctx);
      return;
    }
    case "ruin": {
      const l = e.o;
      const bd = quadBounds(l.q, 20);
      blit(ctx, sprite(R, `r${l.id}:${l.q[0]}`, bd.left, bd.top, bd.w, bd.h, (g) => drawRuin(g, l.q, l.id)));
      return;
    }
    case "jb": {
      const j = e.o;
      inkStyle(ctx, 1);
      const s = 0.45;
      prism(ctx, [[j.x - s, j.y - s], [j.x + s, j.y - s], [j.x + s, j.y + s], [j.x - s, j.y + s]], j.h, "#b8c4d8");
      inkStyle(ctx);
      return;
    }
    default:
  }
}

function drawRuin(g, q, seed) {
  const r = (k) => ((Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
  boxUV(g, q, 0.15, 0.2, 0.45, 0.35, 6 + r(1) * 10, "#9c958a");
  boxUV(g, q, 0.15, 0.2, 0.25, 0.75, 4 + r(2) * 14, "#a8a196");
  for (let k = 0; k < 5; k++) {
    const u = 0.25 + r(k + 3) * 0.55;
    const v = 0.3 + r(k + 9) * 0.55;
    boxUV(g, q, u, v, u + 0.1, v + 0.08, 2 + r(k + 20) * 3, k % 2 ? "#6f675c" : "#b5ad9f");
  }
  inkStyle(g);
}

function terrainCoastal(w, x, y) {
  for (let a = 0; a < 4; a++) {
    const t = terrainAt(w, x + Math.cos(a * 1.57) * 1.6, y + Math.sin(a * 1.57) * 1.6);
    if (t === "sea") return true;
  }
  return false;
}

function badge(ctx, ch, x, y, size, bg) {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.72, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ch, x, y + size * 0.06);
}

// Town borders: the straight lines halfway between neighbouring town
// centres (each spot belongs to its nearest town), drawn over land only.
function townBorders(w) {
  const key = `${w.region}:${w.edits.length}:${w.towns.length}`;
  if (w._borders && w._bordersKey === key) return w._borders;
  const path = new Path2D();
  const T = w.towns;
  for (let a = 0; a < T.length; a++) {
    for (let b = a + 1; b < T.length; b++) {
      const mx = (T[a].x + T[b].x) / 2;
      const my = (T[a].y + T[b].y) / 2;
      let dx = -(T[b].y - T[a].y);
      let dy = T[b].x - T[a].x;
      const L = Math.hypot(dx, dy);
      dx /= L;
      dy /= L;
      let on = false;
      for (let k = -MAP * 1.5; k <= MAP * 1.5; k += 0.25) {
        const x = mx + dx * k;
        const y = my + dy * k;
        let ok = x > 0 && y > 0 && x < MAP && y < MAP && terrainAt(w, x, y) === "land";
        if (ok) {
          const da = (T[a].x - x) ** 2 + (T[a].y - y) ** 2;
          for (let c = 0; c < T.length && ok; c++) if (c !== a && c !== b && (T[c].x - x) ** 2 + (T[c].y - y) ** 2 < da - 1e-6) ok = false;
        }
        if (ok && !on) path.moveTo(x, y);
        else if (ok) path.lineTo(x, y);
        on = ok;
      }
    }
  }
  w._borders = path;
  w._bordersKey = key;
  return path;
}

// ---------- previews ----------
function drawPreviewGround(ctx, w, p, time) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (p.kind === "road" && p.pts) {
    const path = new Path2D();
    path.moveTo(p.pts[0], p.pts[1]);
    for (let k = 2; k < p.pts.length; k += 2) path.lineTo(p.pts[k], p.pts[k + 1]);
    const half = ROAD_TYPES[p.type].half;
    ctx.strokeStyle = p.ok ? "rgba(255,255,255,0.85)" : "rgba(255,80,80,0.75)";
    ctx.lineWidth = half * 2 + 0.3;
    ctx.stroke(path);
    ctx.strokeStyle = p.ok ? "#22c55e" : "#e03131";
    ctx.lineWidth = 0.12;
    ctx.setLineDash([0.4, 0.3]);
    ctx.lineDashOffset = -time / 300;
    ctx.stroke(path);
    ctx.setLineDash([]);
    for (const id of p.demolish?.lots || []) {
      const l = w.lots.find((x) => x.id === id);
      if (!l || !l.b) continue;
      fillQuad(ctx, l.q, "rgba(255,60,60,0.55)");
    }
  }
  if (p.kind === "struct" && p.q) fillQuad(ctx, p.q, p.ok ? "rgba(255,255,255,0.55)" : "rgba(255,70,70,0.55)", p.ok ? "#22c55e" : "#e03131");
  if (p.kind === "select") {
    for (const id of p.sel.lots) {
      const l = w.lots.find((x) => x.id === id);
      if (l) fillQuad(ctx, l.q, "rgba(255,60,60,0.6)");
    }
    for (const id of p.sel.structs) {
      const s = w.structs.find((x) => x.id === id);
      if (s) fillQuad(ctx, s.q, "rgba(255,60,60,0.6)");
    }
    ctx.fillStyle = "rgba(255,60,60,0.7)";
    for (const i of p.sel.trees) {
      const t = w.trees[i];
      if (!t) continue;
      ctx.beginPath();
      ctx.arc(t[0], t[1], 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (p.kind === "reclaim") {
    for (const c of p.circles) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fillStyle = c.ok ? "rgba(255,233,168,0.85)" : "rgba(255,80,80,0.4)";
      ctx.fill();
    }
  }
  if (p.brush) {
    ctx.beginPath();
    ctx.arc(p.brush.x, p.brush.y, p.brush.r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 0.14;
    ctx.stroke();
    ctx.fillStyle = (p.brush.color || "#ffffff") + "33";
    ctx.fill();
  }
}
function fillQuad(ctx, q, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(q[0], q[1]);
  ctx.lineTo(q[2], q[3]);
  ctx.lineTo(q[4], q[5]);
  ctx.lineTo(q[6], q[7]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.1;
    ctx.stroke();
  }
}

// Draggable handles for a pending road: both ends and the bend point
export const HANDLE_R = 13;
function drawRoadHandles(ctx, p, time) {
  const pulse = 1 + Math.sin(time / 250) * 0.08;
  const h = (x, y, fill, label) => {
    const sx = PX(x, y);
    const sy = PY(x, y);
    ctx.beginPath();
    ctx.arc(sx, sy, HANDLE_R * pulse, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = '700 12px "Fredoka", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, sx, sy + 0.5);
  };
  if (p.sa) h(p.sa.x, p.sa.y, "#ffffff", "A");
  if (p.sb && p.stage === "end") h(p.sb.x, p.sb.y, "#ffffff", "B");
  if (p.stage === "end" && p.bend) h(p.bend.x, p.bend.y, "#ffd43b", "↔");
}
