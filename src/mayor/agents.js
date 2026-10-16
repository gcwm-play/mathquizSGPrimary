// Cars and buses on the curved roads, MRT trains on the viaduct, boats and clouds.
import { ROAD_TYPES } from "./defs.js";
import { segPts } from "./world.js";
import { pointAt, polyLength, rectQuad } from "./geom.js";
import { prism, inkStyle, PX, PY } from "./art.js";

const CAR_COLORS = ["#ff6b6b", "#4dabf7", "#ffd43b", "#69db7c", "#f783ac", "#ffffff", "#9775fa", "#ffa94d"];

export function createAgents() {
  return { cars: [], trains: [], boats: [], clouds: [], sig: "" };
}

function segsAt(w, node, rail) {
  return w.segs.filter((s) => (s.a === node || s.b === node) && !!ROAD_TYPES[s.type].rail === rail && !ROAD_TYPES[s.type].underground);
}

function place(w, list, rail, rng) {
  const s = list[Math.floor(rng() * list.length)];
  const L = polyLength(segPts(w, s));
  return { seg: s.id, s: rng() * L, dir: rng() < 0.5 ? 1 : -1, L };
}

function sync(ag, w, A, rng) {
  const roads = w.segs.filter((s) => !ROAD_TYPES[s.type].rail);
  const rails = w.segs.filter((s) => ROAD_TYPES[s.type].rail && !ROAD_TYPES[s.type].underground);
  const ids = new Set(w.segs.map((s) => s.id));
  ag.cars = ag.cars.filter((c) => ids.has(c.seg));
  ag.trains = ag.trains.filter((c) => ids.has(c.seg));
  const len = roads.reduce((a, s) => a + polyLength(segPts(w, s)), 0);
  const target = roads.length ? Math.min(110, Math.floor(len / 4 + (w.stats.pop || 0) / 2500) + 3) : 0;
  while (ag.cars.length > target) ag.cars.pop();
  while (ag.cars.length < target) {
    const c = place(w, roads, false, rng);
    c.speed = 1.1 + rng() * 0.8;
    c.bus = rng() < 0.12;
    c.color = c.bus ? "#ff5a5a" : CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)];
    ag.cars.push(c);
  }
  const tTarget = A?.mrtRunning && rails.length ? Math.min(4, Math.ceil(rails.length / 3)) : 0;
  while (ag.trains.length > tTarget) ag.trains.pop();
  while (ag.trains.length < tTarget) {
    const c = place(w, rails, true, rng);
    c.speed = 3;
    ag.trains.push(c);
  }
}

function advance(w, c, dt, rail, rng) {
  c.s += c.dir * c.speed * dt;
  let guard = 0;
  while ((c.s < 0 || c.s > c.L) && guard++ < 4) {
    const seg = w.segs.find((s) => s.id === c.seg);
    if (!seg) return;
    const node = c.s > c.L ? seg.b : seg.a;
    const over = c.s > c.L ? c.s - c.L : -c.s;
    const options = segsAt(w, node, rail).filter((s) => s.id !== seg.id);
    const next = options.length ? options[Math.floor(rng() * options.length)] : seg;
    const L = polyLength(segPts(w, next));
    c.seg = next.id;
    c.L = L;
    if (next.a === node) {
      c.dir = 1;
      c.s = Math.min(L, over);
    } else {
      c.dir = -1;
      c.s = Math.max(0, L - over);
    }
  }
}

export function updateAgents(ag, w, A, dt, rng = Math.random) {
  const sig = `${w.rev}:${A?.mrtRunning}:${Math.round((w.stats.pop || 0) / 5000)}`;
  if (sig !== ag.sig) {
    ag.sig = sig;
    sync(ag, w, A, rng);
  }
  for (const c of ag.cars) advance(w, c, dt, false, rng);
  for (const c of ag.trains) advance(w, c, dt, true, rng);
}

// position of an agent (with lane offset) for drawing and depth sorting
export function agentPose(w, c, lane) {
  const seg = w.segs.find((s) => s.id === c.seg);
  if (!seg) return null;
  const p = pointAt(segPts(w, seg), c.s);
  const tx = p.tx * c.dir;
  const ty = p.ty * c.dir;
  return { x: p.x + -ty * lane, y: p.y + tx * lane, ang: Math.atan2(ty, tx) };
}

export function drawCar(ctx, w, c) {
  const p = agentPose(w, c, 0.13);
  if (!p) return;
  inkStyle(ctx, 0.9);
  const L = c.bus ? 0.55 : 0.32;
  const q = rectQuad(p.x, p.y, p.ang, L, 0.18);
  const pts = [[q[0], q[1]], [q[2], q[3]], [q[4], q[5]], [q[6], q[7]]];
  if (c.bus) prism(ctx, pts, 8, "#ffffff", 0, { wall: (f) => (f < -0.2 ? "#d94848" : c.color) });
  else {
    prism(ctx, pts, 3.5, c.color);
    const q2 = rectQuad(p.x, p.y, p.ang, L * 0.5, 0.15);
    prism(ctx, [[q2[0], q2[1]], [q2[2], q2[3]], [q2[4], q2[5]], [q2[6], q2[7]]], 2.6, "#dff3ff", 3.5);
  }
  inkStyle(ctx);
}

export function drawTrain(ctx, w, c) {
  inkStyle(ctx, 0.9);
  for (let k = 0; k < 2; k++) {
    const p = agentPose(w, { ...c, s: Math.max(0, Math.min(c.L, c.s - c.dir * k * 0.75)) }, 0);
    if (!p) continue;
    const q = rectQuad(p.x, p.y, p.ang, 0.6, 0.21);
    const pts = [[q[0], q[1]], [q[2], q[3]], [q[4], q[5]], [q[6], q[7]]];
    prism(ctx, pts, 7, "#ffffff", 14);
    prism(ctx, pts, 1.6, "#ff4d4d", 16);
  }
  inkStyle(ctx);
}

export function trainPose(w, c) {
  return agentPose(w, c, 0);
}

export function initSea(ag, w, isSea, rng = Math.random) {
  if (ag.boats.length) return;
  for (let k = 0; k < 40 && ag.boats.length < 7; k++) {
    const x = 2 + rng() * 60;
    const y = 2 + rng() * 60;
    if (!isSea(x, y)) continue;
    const a = rng() * Math.PI * 2;
    ag.boats.push({ x, y, vx: Math.cos(a) * 0.3, vy: Math.sin(a) * 0.3, big: rng() < 0.4 });
  }
  for (let k = 0; k < 7; k++) ag.clouds.push({ x: rng() * 64, y: rng() * 64, s: 0.8 + rng() * 0.9 });
}

export function moveSea(ag, isSea, dt) {
  for (const b of ag.boats) {
    const nx = b.x + b.vx * dt;
    const ny = b.y + b.vy * dt;
    if (!isSea(nx, ny)) {
      const a = Math.random() * Math.PI * 2;
      b.vx = Math.cos(a) * 0.3;
      b.vy = Math.sin(a) * 0.3;
    } else {
      b.x = nx;
      b.y = ny;
    }
  }
  for (const c of ag.clouds) {
    c.x += dt * 0.15;
    c.y -= dt * 0.15;
    if (c.x > 72 || c.y < -8) {
      c.x = -8 + Math.random() * 12;
      c.y = 72 - Math.random() * 64;
    }
  }
}

export function drawBoat(ctx, b, time) {
  const x = PX(b.x, b.y);
  const y = PY(b.x, b.y);
  const s = b.big ? 1.4 : 1;
  const bob = Math.sin(time / 500 + b.x) * 0.8;
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - 12 * s, y + 3);
  ctx.lineTo(x, y + 1);
  ctx.lineTo(x - 12 * s, y - 2);
  ctx.stroke();
  inkStyle(ctx, 1);
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, y - 2 + bob);
  ctx.lineTo(x + 8 * s, y - 2 + bob);
  ctx.lineTo(x + 5 * s, y + 3 + bob);
  ctx.lineTo(x - 6 * s, y + 3 + bob);
  ctx.closePath();
  ctx.fillStyle = b.big ? "#ff7a45" : "#ffffff";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(x - 3 * s, y - 7 * s + bob, 6 * s, 5 * s);
  ctx.fillStyle = b.big ? "#ffffff" : "#4dabf7";
  ctx.fill();
  ctx.stroke();
  inkStyle(ctx);
}

export function drawClouds(ctx, ag, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const c of ag.clouds) {
    const x = PX(c.x, c.y);
    const y = PY(c.x, c.y) - 170;
    const s = c.s * 15;
    ctx.fillStyle = "rgba(40,60,120,0.12)";
    ctx.beginPath();
    ctx.ellipse(x + 10, y + 170, s * 2.6, s * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x - s * 1.4, y, s, 0, Math.PI * 2);
    ctx.arc(x, y - s * 0.5, s * 1.35, 0, Math.PI * 2);
    ctx.arc(x + s * 1.5, y + s * 0.1, s * 0.95, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
