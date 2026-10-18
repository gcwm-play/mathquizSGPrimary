// Little moving things that make the city feel alive: cars and buses on roads,
// MRT trains on the viaduct, boats at sea and clouds overhead. Purely visual.
import { N } from "./defs.js";
import { PX, PY, box, inkStyle } from "./art.js";

const idx = (x, y) => y * N + x;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const CAR_COLORS = ["#ff6b6b", "#4dabf7", "#ffd43b", "#69db7c", "#f783ac", "#ffffff", "#9775fa", "#ffa94d"];

export function createAgents() {
  return { cars: [], trains: [], boats: [], clouds: [], sig: "" };
}

function neighbours(w, i, key) {
  const x = i % N;
  const y = Math.floor(i / N);
  const out = [];
  for (const [dx, dy] of DIRS) {
    const xx = x + dx;
    const yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
    const j = idx(xx, yy);
    if (w.tiles[j][key]) out.push(j);
  }
  return out;
}

function nextStep(w, from, at, key, rng) {
  const ns = neighbours(w, at, key);
  if (!ns.length) return at;
  const fwd = ns.filter((j) => j !== from);
  const pool = fwd.length ? fwd : ns;
  return pool[Math.floor(rng() * pool.length)];
}

function spawnOn(w, list, key, rng) {
  const i = list[Math.floor(rng() * list.length)];
  return { a: i, b: nextStep(w, -1, i, key, rng), t: rng() };
}

// Keep the agent lists matched to the current map and city size.
function sync(ag, w, A) {
  const roads = [];
  const rails = [];
  const shallow = [];
  for (let i = 0; i < w.tiles.length; i++) {
    const t = w.tiles[i];
    if (t.road) roads.push(i);
    if (t.rail) rails.push(i);
  }
  for (let y = 3; y < N - 3; y++) for (let x = 3; x < N - 3; x++) if (w.tiles[idx(x, y)].t === "sea") shallow.push(idx(x, y));
  const rng = Math.random;
  ag.cars = ag.cars.filter((c) => w.tiles[c.a].road && w.tiles[c.b].road);
  const target = roads.length ? Math.min(90, Math.floor(roads.length * 0.3 + (A?.pop || 0) / 2500) + 2) : 0;
  while (ag.cars.length > target) ag.cars.pop();
  while (ag.cars.length < target) {
    const c = spawnOn(w, roads, "road", rng);
    c.speed = 0.7 + rng() * 0.6;
    c.bus = rng() < 0.12;
    c.color = c.bus ? "#ff5a5a" : CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)];
    ag.cars.push(c);
  }
  ag.trains = ag.trains.filter((c) => w.tiles[c.a].rail && w.tiles[c.b].rail);
  const tTarget = A?.mrtRunning && rails.length > 3 ? Math.min(4, Math.ceil(rails.length / 18)) : 0;
  while (ag.trains.length > tTarget) ag.trains.pop();
  while (ag.trains.length < tTarget) {
    const c = spawnOn(w, rails, "rail", rng);
    c.speed = 1.6;
    ag.trains.push(c);
  }
  if (!ag.boats.length && shallow.length) {
    for (let k = 0; k < 7; k++) {
      const i = shallow[Math.floor(rng() * shallow.length)];
      const ang = rng() * Math.PI * 2;
      ag.boats.push({ x: (i % N) + 0.5, y: Math.floor(i / N) + 0.5, vx: Math.cos(ang) * 0.25, vy: Math.sin(ang) * 0.25, big: rng() < 0.4 });
    }
  }
  if (!ag.clouds.length) {
    for (let k = 0; k < 7; k++) ag.clouds.push({ gx: rng() * N, gy: rng() * N, s: 0.8 + rng() * 0.9 });
  }
}

export function updateAgents(ag, w, A, dt) {
  const sig = `${A?.roadCount}:${A?.railCount}:${A?.mrtRunning}:${Math.round((A?.pop || 0) / 5000)}`;
  if (sig !== ag.sig) {
    ag.sig = sig;
    sync(ag, w, A);
  }
  const rng = Math.random;
  const step = (c, key) => {
    c.t += dt * c.speed;
    while (c.t >= 1) {
      c.t -= 1;
      const prev = c.a;
      c.a = c.b;
      c.b = nextStep(w, prev, c.a, key, rng);
    }
  };
  for (const c of ag.cars) step(c, "road");
  for (const c of ag.trains) step(c, "rail");
  for (const b of ag.boats) {
    const nx = b.x + b.vx * dt;
    const ny = b.y + b.vy * dt;
    const xi = Math.floor(nx);
    const yi = Math.floor(ny);
    if (xi < 1 || yi < 1 || xi >= N - 1 || yi >= N - 1 || w.tiles[idx(xi, yi)].t !== "sea") {
      const ang = Math.random() * Math.PI * 2;
      b.vx = Math.cos(ang) * 0.25;
      b.vy = Math.sin(ang) * 0.25;
    } else {
      b.x = nx;
      b.y = ny;
    }
  }
  for (const c of ag.clouds) {
    c.gx += dt * 0.12;
    c.gy -= dt * 0.12;
    if (c.gx > N + 6 || c.gy < -6) {
      c.gx = -6 + Math.random() * 10;
      c.gy = N - Math.random() * N;
    }
  }
}

// Where an agent is in grid space, and which tile it belongs to for depth sorting.
export function agentPos(c, laneOffset) {
  const ax = (c.a % N) + 0.5;
  const ay = Math.floor(c.a / N) + 0.5;
  const bx = (c.b % N) + 0.5;
  const by = Math.floor(c.b / N) + 0.5;
  const dx = bx - ax;
  const dy = by - ay;
  // Singapore drives on the left
  const gx = ax + dx * c.t + dy * laneOffset;
  const gy = ay + dy * c.t - dx * laneOffset;
  return { gx, gy, alongX: Math.abs(dx) >= Math.abs(dy), tile: c.t < 0.5 ? c.a : c.b };
}

export function drawCar(ctx, c) {
  const p = agentPos(c, 0.17);
  const L = c.bus ? 0.22 : 0.13;
  const W = 0.075;
  const [x0, y0, x1, y1] = p.alongX ? [p.gx - L, p.gy - W, p.gx + L, p.gy + W] : [p.gx - W, p.gy - L, p.gx + W, p.gy + L];
  inkStyle(ctx, 0.9);
  if (c.bus) {
    box(ctx, x0, y0, x1, y1, 8, "#ffffff", 0, { left: c.color, right: "#d94848" });
  } else {
    box(ctx, x0, y0, x1, y1, 3.5, c.color);
    const s = 0.45;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    box(ctx, cx - (cx - x0) * s, cy - (cy - y0) * 0.8, cx + (x1 - cx) * s, cy + (y1 - cy) * 0.8, 2.5, "#dff3ff", 3.5);
  }
}

export function drawTrain(ctx, c) {
  inkStyle(ctx, 0.9);
  for (let k = 0; k < 2; k++) {
    const q = { ...c, t: c.t - k * 0.42 };
    if (q.t < 0) {
      q.t += 1;
      q.b = c.a;
      q.a = c.a; // tail car waits on the previous tile
    }
    const p = agentPos(q, 0);
    const L = 0.2;
    const W = 0.1;
    const [x0, y0, x1, y1] = p.alongX ? [p.gx - L, p.gy - W, p.gx + L, p.gy + W] : [p.gx - W, p.gy - L, p.gx + W, p.gy + L];
    box(ctx, x0, y0, x1, y1, 7, "#ffffff", 14, { left: "#f1f3f8", right: "#c9d0de" });
    box(ctx, x0, y0, x1, y1, 1.6, "#ff4d4d", 16);
  }
}

export function drawBoat(ctx, b, time) {
  const x = PX(b.x, b.y);
  const y = PY(b.x, b.y);
  const s = b.big ? 1.4 : 1;
  const bob = Math.sin(time / 500 + b.x) * 0.8;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
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
}

export function drawClouds(ctx, ag, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const c of ag.clouds) {
    const x = PX(c.gx, c.gy);
    const y = PY(c.gx, c.gy) - 160;
    const s = c.s * 14;
    ctx.fillStyle = "rgba(40,60,120,0.12)";
    ctx.beginPath();
    ctx.ellipse(x + 10, y + 160, s * 2.6, s * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "rgba(47,43,74,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x - s * 1.4, y, s, 0, Math.PI * 2);
    ctx.arc(x, y - s * 0.5, s * 1.35, 0, Math.PI * 2);
    ctx.arc(x + s * 1.5, y + s * 0.1, s * 0.95, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
