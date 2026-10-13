// Cartoon isometric renderer for Lion City Planner.
// Ground is drawn directly each frame; buildings and trees are pre-drawn into
// cached sprites (art.js), so cars, trains, boats and clouds can animate smoothly.
import { N, ZONES, BUILDINGS } from "./defs.js";
import { idx, inMap } from "./sim.js";
import { PX, PY, HW, HH, INK, inkStyle, drawZone, drawBuilding, drawBuildingLive, tree, palm, ZONE_MAX_H, BUILD_MAX_H } from "./art.js";
import { createAgents, updateAgents, agentPos, drawCar, drawTrain, drawBoat, drawClouds } from "./agents.js";

export const TW = HW * 2;
export const TH = HH * 2;

export function screenToGrid(cam, sx, sy) {
  const ix = (sx - cam.x) / cam.zoom;
  const iy = (sy - cam.y) / cam.zoom;
  return { x: Math.floor((iy / HH + ix / HW) / 2), y: Math.floor((iy / HH - ix / HW) / 2) };
}

export function centerCamera(cam, width, height, gx = N / 2, gy = N / 2) {
  cam.x = width / 2 - PX(gx, gy) * cam.zoom;
  cam.y = height / 2 - PY(gx, gy) * cam.zoom;
}

export function createRenderer() {
  return { sprites: new Map(), S: 0, agents: createAgents(), lastTime: 0, terrainSig: -1, shore: null, coast: null };
}

const hash = (x, y) => {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h ^= h >>> 13;
  return ((h >>> 0) % 1000) / 1000;
};

// ---------- sprites ----------
function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function sprite(R, key, size, maxH, paint) {
  let sp = R.sprites.get(key);
  if (sp) return sp;
  const left = -size * HW - 8;
  const right = size * HW + 48;
  const top = -maxH - 14;
  const bottom = size * TH + 10;
  const w = right - left;
  const h = bottom - top;
  const S = R.S;
  const c = makeCanvas(Math.max(1, Math.ceil(w * S)), Math.max(1, Math.ceil(h * S)));
  const g = c.getContext("2d");
  g.setTransform(S, 0, 0, S, -left * S, -top * S);
  inkStyle(g);
  paint(g);
  sp = { c, left, top, w, h };
  R.sprites.set(key, sp);
  return sp;
}

function blit(ctx, sp, ox, oy) {
  ctx.drawImage(sp.c, PX(ox, oy) + sp.left, PY(ox, oy) + sp.top, sp.w, sp.h);
}

const TREE_KEYS = 6;
function treeSprite(R, v, coastal) {
  const key = `t:${coastal ? "p" : ""}${v}`;
  return sprite(R, key, 1, 40, (g) => {
    if (coastal) {
      palm(g, 0.35, 0.4, 0.95);
      if (v % 2) palm(g, 0.72, 0.72, 0.8);
      return;
    }
    const pals = [["#3fb85f", "#7be08a"], ["#2fa05a", "#63cf7d"], ["#58c24a", "#97e37a"], ["#2b9a6e", "#5fd0a0"]];
    tree(g, 0.3, 0.3, 1.05, pals[v % 4]);
    tree(g, 0.75, 0.5, 0.9, pals[(v + 1) % 4]);
    if (v > 1) tree(g, 0.38, 0.8, 0.95, pals[(v + 2) % 4]);
  });
}

// ---------- terrain caches ----------
function terrain(R, w) {
  let sig = 0;
  for (let i = 0; i < w.tiles.length; i++) if (w.tiles[i].t !== "land") sig += i * (w.tiles[i].t === "sea" ? 1 : 3);
  if (sig === R.terrainSig) return;
  R.terrainSig = sig;
  const shore = new Uint8Array(N * N); // sea: 1 = touches land, 2 = near land, 3 = open sea
  const coast = new Uint8Array(N * N); // land touching sea (4-neighbour)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const t = w.tiles[idx(x, y)];
      if (t.t === "sea") {
        let d = 3;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          if (!inMap(x + dx, y + dy) || w.tiles[idx(x + dx, y + dy)].t === "sea") continue;
          d = Math.min(d, Math.max(Math.abs(dx), Math.abs(dy)));
        }
        shore[idx(x, y)] = d;
      } else if (t.t === "land") {
        coast[idx(x, y)] = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inMap(x + dx, y + dy) && w.tiles[idx(x + dx, y + dy)].t === "sea") ? 1 : 0;
      }
    }
  }
  R.shore = shore;
  R.coast = coast;
}

// ---------- ground helpers ----------
function diamond(ctx, x0, y0, x1, y1) {
  ctx.beginPath();
  ctx.moveTo(PX(x0, y0), PY(x0, y0));
  ctx.lineTo(PX(x1, y0), PY(x1, y0));
  ctx.lineTo(PX(x1, y1), PY(x1, y1));
  ctx.lineTo(PX(x0, y1), PY(x0, y1));
  ctx.closePath();
}

const ZONE_PAD = { hdb: "#e9f1d8", pte: "#bfe8a1", com: "#e4e9f4", ind: "#ece3d2" };
const BUILD_PAD = { park: "#7ed957", gardens: "#7ed957", school: "#7ed957", airport: "#c9d6c0", port: "#c8c3b8", solar: "#d9e6c7" };
export const ZONE_TINT = { hdb: "#2fd06f", pte: "#f45fae", com: "#4b9bff", ind: "#ffb020" };

function landColor(R, tl, x, y, i) {
  if (tl.road) return null;
  if (tl.b) return BUILD_PAD[tl.b] || "#ece7dc";
  if (tl.z && tl.lv > 0) return ZONE_PAD[tl.z];
  if (R.coast[i] && !tl.z) return hash(x, y) > 0.5 ? "#ffe9a8" : "#fbe39c";
  const h = hash(x, y);
  return h > 0.66 ? "#9fe070" : h > 0.33 ? "#98dc68" : "#93d862";
}

function drawRoad(ctx, w, x, y, detail) {
  diamond(ctx, x, y, x + 1, y + 1);
  ctx.fillStyle = "#dfe3ec";
  ctx.fill();
  const c = [x + 0.5, y + 0.5];
  const arms = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inMap(x + dx, y + dy) && w.tiles[idx(x + dx, y + dy)].road) arms.push([dx, dy]);
  ctx.fillStyle = "#565d75";
  const r = 0.36;
  diamond(ctx, c[0] - r, c[1] - r, c[0] + r, c[1] + r);
  ctx.fill();
  for (const [dx, dy] of arms) {
    const x0 = dx > 0 ? c[0] : dx < 0 ? x : c[0] - r;
    const x1 = dx > 0 ? x + 1 : dx < 0 ? c[0] : c[0] + r;
    const y0 = dy > 0 ? c[1] : dy < 0 ? y : c[1] - r;
    const y1 = dy > 0 ? y + 1 : dy < 0 ? c[1] : c[1] + r;
    diamond(ctx, x0, y0, x1, y1);
    ctx.fill();
  }
  if (!detail) return;
  ctx.strokeStyle = "#fff6c7";
  ctx.lineWidth = 1.3;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  for (const [dx, dy] of arms) {
    ctx.moveTo(PX(c[0], c[1]), PY(c[0], c[1]));
    ctx.lineTo(PX(c[0] + dx * 0.5, c[1] + dy * 0.5), PY(c[0] + dx * 0.5, c[1] + dy * 0.5));
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawRail(ctx, w, x, y) {
  const Z = 14;
  const cx = PX(x + 0.5, y + 0.5);
  const cy = PY(x + 0.5, y + 0.5);
  inkStyle(ctx, 1);
  ctx.fillStyle = "#d5dae6";
  ctx.beginPath();
  ctx.rect(cx - 2.5, cy - Z, 5, Z);
  ctx.fill();
  ctx.stroke();
  const segs = [];
  for (const [dx, dy, ex, ey] of [[1, 0, 1, 0.5], [-1, 0, 0, 0.5], [0, 1, 0.5, 1], [0, -1, 0.5, 0]]) {
    const xx = x + dx;
    const yy = y + dy;
    if (!inMap(xx, yy)) continue;
    const t = w.tiles[idx(xx, yy)];
    if (t.rail || (t.b === "mrt" && t.o === idx(xx, yy))) segs.push([PX(x + ex, y + ey), PY(x + ex, y + ey) - Z]);
  }
  if (!segs.length) segs.push([cx + 8, cy - Z + 4]);
  ctx.beginPath();
  for (const [sx, sy] of segs) {
    ctx.moveTo(cx, cy - Z);
    ctx.lineTo(sx, sy);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.strokeStyle = "#eef1f7";
  ctx.lineWidth = 8.5;
  ctx.stroke();
  ctx.strokeStyle = "#9aa3b8";
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function heat(v) {
  const t = Math.max(0, Math.min(1, v));
  const r = t < 0.5 ? 255 : Math.round(255 - (t - 0.5) * 2 * 200);
  const g = t < 0.5 ? Math.round(90 + t * 2 * 130) : 220;
  const b = t < 0.5 ? 90 : Math.round(90 + (t - 0.5) * 2 * 40);
  return `rgba(${r},${g},${b},0.62)`;
}

export const OVERLAYS = {
  none: { name: "Normal map", icon: "🗺️" },
  landValue: { name: "Land value", icon: "💎", get: (A, i) => A.landValue[i] / 80 },
  pollution: { name: "Clean air", icon: "🏭", get: (A, i) => 1 - A.pollution[i] / 50 },
  utilities: { name: "Power & water", icon: "💡", get: (A, i, w) => (w.tiles[i].z || w.tiles[i].b ? (A.pw[i] && A.wt[i] ? 1 : 0) : null) },
  roads: { name: "Road access", icon: "🛣️", get: (A, i) => (A.roadNear[i] ? 1 : 0) },
  food: { name: "Hawker cover", icon: "🍜", get: (A, i) => A.cover.food[i] },
  school: { name: "School cover", icon: "🏫", get: (A, i) => A.cover.school[i] },
  health: { name: "Health cover", icon: "🩺", get: (A, i) => A.cover.health[i] },
  safety: { name: "Police cover", icon: "👮", get: (A, i) => A.cover.safety[i] },
  fire: { name: "Fire cover", icon: "🚒", get: (A, i) => A.cover.fire[i] },
  transport: { name: "Transport", icon: "🚇", get: (A, i) => A.transportScore[i] },
  green: { name: "Greenery", icon: "🌳", get: (A, i) => A.cover.green[i] },
};

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

// ---------- main draw ----------
export function draw(ctx, R, w, A, cam, view) {
  const { width, height, dpr, overlay = "none", preview, selected, startMark, time = 0, interacting = false, motion = true } = view;
  const dt = Math.min(0.1, R.lastTime ? (time - R.lastTime) / 1000 : 0);
  R.lastTime = time;

  // Sprite resolution follows the zoom in steps; keep it fixed mid-gesture.
  const zq = Math.pow(2, Math.round(Math.log2(cam.zoom) * 3) / 3);
  const S = Math.min(4, dpr * zq);
  if (!R.S || (!interacting && Math.abs(S - R.S) > 1e-3)) {
    R.sprites.clear();
    R.S = S;
  }
  terrain(R, w);
  if (motion) updateAgents(R.agents, w, A, dt);
  else if (!R.agents.sig) updateAgents(R.agents, w, A, 0);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#43c4f0");
  grad.addColorStop(1, "#2a9be0");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.setTransform(dpr * cam.zoom, 0, 0, dpr * cam.zoom, dpr * cam.x, dpr * cam.y);
  const detail = cam.zoom >= 0.45;

  const corners = [screenToGrid(cam, 0, 0), screenToGrid(cam, width, 0), screenToGrid(cam, 0, height), screenToGrid(cam, width, height)];
  const minX = Math.max(0, Math.min(...corners.map((c) => c.x)) - 1);
  const maxX = Math.min(N - 1, Math.max(...corners.map((c) => c.x)) + 8);
  const minY = Math.max(0, Math.min(...corners.map((c) => c.y)) - 1);
  const maxY = Math.min(N - 1, Math.max(...corners.map((c) => c.y)) + 8);
  const vx0 = -cam.x / cam.zoom - TW;
  const vx1 = (width - cam.x) / cam.zoom + TW;
  const vy0 = -cam.y / cam.zoom - TH;
  const vy1 = (height - cam.y) / cam.zoom + 260;
  const visible = (x, y) => {
    const px = PX(x + 0.5, y + 0.5);
    const py = PY(x + 0.5, y + 0.5);
    return px > vx0 && px < vx1 && py > vy0 && py < vy1;
  };

  // Pass 1: shallow water, foam and sparkles
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = idx(x, y);
      if (w.tiles[i].t !== "sea" || !visible(x, y)) continue;
      const d = R.shore[i];
      if (d >= 3) continue;
      diamond(ctx, x, y, x + 1, y + 1);
      ctx.fillStyle = d === 1 ? "#8fe6fa" : "#68d4f6";
      ctx.fill();
      if (d === 1 && detail) {
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        if (inMap(x - 1, y) && w.tiles[idx(x - 1, y)].t !== "sea") {
          ctx.moveTo(PX(x, y), PY(x, y));
          ctx.lineTo(PX(x, y + 1), PY(x, y + 1));
        }
        if (inMap(x, y - 1) && w.tiles[idx(x, y - 1)].t !== "sea") {
          ctx.moveTo(PX(x, y), PY(x, y));
          ctx.lineTo(PX(x + 1, y), PY(x + 1, y));
        }
        ctx.stroke();
      }
    }
  }
  if (motion && detail) {
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let y = minY; y <= maxY; y += 2) {
      for (let x = minX + (y % 4 === 0 ? 0 : 1); x <= maxX; x += 2) {
        const i = idx(x, y);
        if (w.tiles[i].t !== "sea" || !visible(x, y)) continue;
        const h = hash(x, y);
        if (h < 0.55) continue;
        const ph = Math.sin(time / 900 + h * 20);
        if (ph < 0.4) continue;
        const sx = PX(x + 0.5, y + 0.5);
        const sy = PY(x + 0.5, y + 0.5);
        ctx.moveTo(sx - 5, sy);
        ctx.quadraticCurveTo(sx - 2.5, sy - 2, sx, sy);
        ctx.quadraticCurveTo(sx + 2.5, sy - 2, sx + 5, sy);
      }
    }
    ctx.stroke();
  }
  for (const b of R.agents.boats) if (visible(Math.floor(b.x), Math.floor(b.y))) drawBoat(ctx, b, time);

  // Pass 2: land, island edges, roads, zones
  const ov = overlay !== "none" ? OVERLAYS[overlay] : null;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!visible(x, y)) continue;
      const i = idx(x, y);
      const tl = w.tiles[i];
      if (tl.t === "sea") continue;
      // raised island edge where the sea is in front
      const seaR = inMap(x + 1, y) && w.tiles[idx(x + 1, y)].t === "sea";
      const seaB = inMap(x, y + 1) && w.tiles[idx(x, y + 1)].t === "sea";
      if (seaR || seaB) {
        inkStyle(ctx, 1);
        const E = 7;
        if (seaR) {
          ctx.beginPath();
          ctx.moveTo(PX(x + 1, y), PY(x + 1, y));
          ctx.lineTo(PX(x + 1, y + 1), PY(x + 1, y + 1));
          ctx.lineTo(PX(x + 1, y + 1), PY(x + 1, y + 1) + E);
          ctx.lineTo(PX(x + 1, y), PY(x + 1, y) + E);
          ctx.closePath();
          ctx.fillStyle = "#d9a86a";
          ctx.fill();
          ctx.stroke();
        }
        if (seaB) {
          ctx.beginPath();
          ctx.moveTo(PX(x, y + 1), PY(x, y + 1));
          ctx.lineTo(PX(x + 1, y + 1), PY(x + 1, y + 1));
          ctx.lineTo(PX(x + 1, y + 1), PY(x + 1, y + 1) + E);
          ctx.lineTo(PX(x, y + 1), PY(x, y + 1) + E);
          ctx.closePath();
          ctx.fillStyle = "#c7955a";
          ctx.fill();
          ctx.stroke();
        }
      }
      if (tl.t === "res") {
        diamond(ctx, x, y, x + 1, y + 1);
        ctx.fillStyle = hash(x, y) > 0.5 ? "#5fcdf5" : "#58c7f2";
        ctx.fill();
        continue;
      }
      if (tl.road) drawRoad(ctx, w, x, y, detail);
      else {
        diamond(ctx, x, y, x + 1, y + 1);
        ctx.fillStyle = landColor(R, tl, x, y, i);
        ctx.fill();
        if (detail && !tl.z && !tl.b && !tl.tr && hash(y, x) > 0.8) {
          // grass tufts and flowers
          const sx = PX(x + 0.5, y + 0.5);
          const sy = PY(x + 0.5, y + 0.5);
          ctx.strokeStyle = "#6cbf45";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(sx - 3, sy);
          ctx.lineTo(sx - 4, sy - 4);
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, sy - 5);
          ctx.moveTo(sx + 3, sy);
          ctx.lineTo(sx + 4, sy - 4);
          ctx.stroke();
          if (hash(x + 7, y) > 0.6) {
            ctx.fillStyle = hash(x, y + 3) > 0.5 ? "#ff8fc6" : "#fff27a";
            ctx.beginPath();
            ctx.arc(sx + 8, sy + 2, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      if (tl.z && tl.lv === 0) {
        const c = ZONE_TINT[tl.z];
        diamond(ctx, x + 0.06, y + 0.06, x + 0.94, y + 0.94);
        ctx.fillStyle = c + "40";
        ctx.fill();
        ctx.strokeStyle = c;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (ov && A && tl.t === "land") {
        const v = ov.get(A, i, w);
        if (v != null) {
          diamond(ctx, x, y, x + 1, y + 1);
          ctx.fillStyle = heat(v);
          ctx.fill();
        }
      }
    }
  }

  // Ghost footprint of what's about to be built
  if (preview && preview.cells) {
    for (const c of preview.cells) {
      if (!inMap(c.x, c.y)) continue;
      diamond(ctx, c.x + 0.05, c.y + 0.05, c.x + 0.95, c.y + 0.95);
      ctx.fillStyle = c.ok ? "rgba(255,255,255,0.6)" : "rgba(255,80,80,0.55)";
      ctx.fill();
      ctx.strokeStyle = c.ok ? "#22c55e" : "#e03131";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  if (startMark) {
    const pulse = 0.12 + 0.06 * Math.sin(time / 200);
    diamond(ctx, startMark.x - pulse, startMark.y - pulse, startMark.x + 1 + pulse, startMark.y + 1 + pulse);
    ctx.strokeStyle = "#ffd43b";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  if (selected) {
    diamond(ctx, selected.x, selected.y, selected.x + 1, selected.y + 1);
    ctx.strokeStyle = "#ffd43b";
    ctx.lineWidth = 3.5;
    ctx.stroke();
  }

  // Agents bucketed by tile so they sort with buildings
  const buckets = new Map();
  const put = (tile, f, up) => {
    const arr = buckets.get(tile);
    if (arr) arr.push({ f, up });
    else buckets.set(tile, [{ f, up }]);
  };
  if (detail) {
    for (const c of R.agents.cars) put(agentPos(c, 0.17).tile, () => drawCar(ctx, c), false);
    for (const c of R.agents.trains) put(agentPos(c, 0).tile, () => drawTrain(ctx, c), true);
  }

  // Pass 3: objects, back to front
  const icons = [];
  const blink = Math.floor(time / 700) % 2 === 0;
  if (ov) ctx.globalAlpha = 0.5;
  for (let s = minX + minY; s <= maxX + maxY; s++) {
    for (let x = Math.max(minX, s - maxY); x <= Math.min(maxX, s - minY); x++) {
      const y = s - x;
      if (!visible(x, y)) continue;
      const i = idx(x, y);
      const tl = w.tiles[i];
      if (tl.t !== "land") continue;
      const agents = buckets.get(i);
      if (agents) for (const a of agents) if (!a.up) a.f();
      if (tl.tr && !tl.b && !tl.road && !tl.rail && !(tl.z && tl.lv > 0)) {
        blit(ctx, treeSprite(R, Math.floor(hash(x, y) * TREE_KEYS), R.coast[i] === 1), x, y);
      }
      if (tl.z && tl.lv > 0) {
        const v = Math.floor(hash(x, y) * 14);
        const key = `z:${tl.z}:${tl.lv}:${v}`;
        blit(ctx, sprite(R, key, 1, ZONE_MAX_H[tl.z][tl.lv], (g) => drawZone(g, tl.z, tl.lv, v)), x, y);
        if (A && (!A.pw[i] || !A.wt[i]) && blink) icons.push([!A.pw[i] ? "⚡" : "💧", PX(x + 0.5, y + 0.5), PY(x + 0.5, y + 0.5) - ZONE_MAX_H[tl.z][tl.lv] * 0.5 - 10, "#ffe066"]);
      }
      if (tl.b) {
        const o = tl.o;
        const ox = o % N;
        const oy = Math.floor(o / N);
        const id = w.tiles[o].b;
        const bd = BUILDINGS[id];
        if (x === ox + bd.size - 1 && y === oy + bd.size - 1) {
          const maxH = BUILD_MAX_H[id] || 50;
          blit(ctx, sprite(R, `b:${id}`, bd.size, maxH, (g) => drawBuilding(g, id, bd.size)), ox, oy);
          if (motion) drawBuildingLive(ctx, id, ox, oy, time);
          const reason = A?.active.get(o);
          const cx = PX(ox + bd.size / 2, oy + bd.size / 2);
          const cy = PY(ox + bd.size / 2, oy + bd.size / 2);
          if (reason) {
            if (blink) icons.push(["⚠️", cx, cy - Math.min(maxH, 40) - 12, "#ffe066"]);
          } else if (id !== "park" && id !== "solar" && cam.zoom >= 0.8) {
            // drawn in depth order so buildings in front can hide it
            badge(ctx, bd.icon, cx, cy - Math.min(maxH, 40) - 12, Math.max(11, Math.min(15, 13 / Math.sqrt(cam.zoom))), "#ffffff");
          }
        }
      }
      if (tl.rail) {
        drawRail(ctx, w, x, y);
        if (agents) for (const a of agents) if (a.up) a.f();
      }
    }
  }
  ctx.globalAlpha = 1;

  // Ghost of a building being placed
  if (preview && preview.origin && preview.building) {
    const bd = BUILDINGS[preview.building];
    ctx.globalAlpha = preview.ok ? 0.8 : 0.45;
    blit(ctx, sprite(R, `b:${preview.building}`, bd.size, BUILD_MAX_H[preview.building] || 50, (g) => drawBuilding(g, preview.building, bd.size)), preview.origin.x, preview.origin.y);
    ctx.globalAlpha = 1;
  }

  // Badges above buildings
  if (cam.zoom > 0.32) {
    const size = Math.max(11, Math.min(16, 13 / Math.sqrt(cam.zoom)));
    for (const [ch, x, y, bg] of icons) badge(ctx, ch, x, y, size, bg);
  }

  if (motion) drawClouds(ctx, R.agents, Math.max(0, Math.min(0.85, 1.25 - cam.zoom * 1.1)));
}

// Zone colour for UI chips
export const zoneColor = (z) => ZONE_TINT[z] || ZONES[z]?.color;
