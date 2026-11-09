// Dino Dash Party — canvas drawing. One horizontal lane per player.
import { LANE_H, GROUND, COLORS, metres, standings, timeLeft, MODES, level } from "./engine.js";

export const TOP_H = 36; // css px strip at the top of each player's view
// how much of the course a view shows: at least 480 units on a narrow phone, up to 1000 on a wide screen
function viewWidthFor(cssW) {
  return Math.max(480, Math.min(1000, cssW * 0.8));
}

const colorOf = (id) => (COLORS.find((c) => c.id === id) || COLORS[0]).body;

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  r = f(r);
  g = f(g);
  b = f(b);
  return `rgb(${r},${g},${b})`;
}

const ORD = ["", "1st", "2nd", "3rd", "4th"];

// ---------------- dino ----------------
export function drawDino(ctx, x, yb, color, hat, pose = {}) {
  const body = color;
  const dark = shade(color, -0.35);
  const belly = shade(color, 0.55);
  const ph = pose.phase || 0;
  const duck = pose.duck;
  const air = pose.air;
  ctx.save();
  if (pose.alpha != null) ctx.globalAlpha = pose.alpha;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  const sh = Math.max(0.3, 1 - (pose.height || 0) / 120);
  ctx.beginPath();
  ctx.ellipse(x + 26, GROUND + 2, 22 * sh, 4 * sh, 0, 0, Math.PI * 2);
  ctx.fill();

  const legA = air ? 3 : Math.sin(ph) * 5;
  const legB = air ? -3 : -Math.sin(ph) * 5;

  let hx, hy, hr;
  if (!duck) {
    // tail
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(x + 8, yb - 26);
    ctx.quadraticCurveTo(x - 10, yb - 24 + Math.sin(ph * 0.5) * 2, x - 12, yb - 14);
    ctx.quadraticCurveTo(x, yb - 14, x + 10, yb - 12);
    ctx.fill();
    // legs
    ctx.fillStyle = dark;
    ctx.fillRect(x + 12 + legA, yb - 12, 8, 12);
    ctx.fillRect(x + 26 + legB, yb - 12, 8, 12);
    // spikes
    ctx.fillStyle = dark;
    for (let k = 0; k < 3; k++) {
      const sx = x + 8 + k * 9;
      ctx.beginPath();
      ctx.moveTo(sx, yb - 30 - k * 2);
      ctx.lineTo(sx + 5, yb - 41 - k * 2);
      ctx.lineTo(sx + 10, yb - 32 - k * 2);
      ctx.fill();
    }
    // body
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(x + 22, yb - 22, 17, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(x + 26, yb - 17, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // arm
    ctx.strokeStyle = dark;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 32, yb - 22);
    ctx.lineTo(x + 39, yb - 18 + (air ? -5 : Math.sin(ph) * 2));
    ctx.stroke();
    hx = x + 38;
    hy = yb - 38;
    hr = 11;
  } else {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(x + 6, yb - 14);
    ctx.quadraticCurveTo(x - 10, yb - 12, x - 12, yb - 6);
    ctx.lineTo(x + 8, yb - 6);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(x + 14 + legA, yb - 8, 8, 8);
    ctx.fillRect(x + 30 + legB, yb - 8, 8, 8);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(x + 26, yb - 13, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(x + 30, yb - 8, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    hx = x + 50;
    hy = yb - 16;
    hr = 9.5;
  }
  // head + snout
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx + 8, hy + 3, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // cheek
  ctx.fillStyle = "rgba(255,120,140,0.45)";
  ctx.beginPath();
  ctx.arc(hx + 4, hy + 5, 2.6, 0, Math.PI * 2);
  ctx.fill();
  // nostril + smile
  ctx.fillStyle = dark;
  ctx.fillRect(hx + 12, hy, 2, 2);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (pose.stun) ctx.arc(hx + 10, hy + 8, 3, Math.PI * 1.1, Math.PI * 1.9);
  else ctx.arc(hx + 9, hy + 4, 4, 0.2, Math.PI * 0.7);
  ctx.stroke();
  // eye
  if (pose.stun) {
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx - 1, hy - 6);
    ctx.lineTo(hx + 5, hy);
    ctx.moveTo(hx + 5, hy - 6);
    ctx.lineTo(hx - 1, hy);
    ctx.stroke();
  } else if (hat !== "shades") {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(hx + 2, hy - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(hx + 3.2, hy - 3, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }
  drawHat(ctx, hat, hx, hy, hr);
  if (pose.stun) {
    ctx.fillStyle = "#ffd23f";
    for (let k = 0; k < 3; k++) {
      const a = (pose.time || 0) * 6 + (k * Math.PI * 2) / 3;
      star(ctx, hx + Math.cos(a) * 14, hy - hr - 6 + Math.sin(a) * 4, 3.5);
    }
  }
  ctx.restore();
}

function drawHat(ctx, hat, hx, hy, hr) {
  const top = hy - hr;
  if (hat === "cap") {
    ctx.fillStyle = "#e5544b";
    ctx.beginPath();
    ctx.arc(hx, top + 4, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(hx, top + 1, 15, 4);
  } else if (hat === "crown") {
    ctx.fillStyle = "#ffcc33";
    ctx.beginPath();
    ctx.moveTo(hx - 8, top + 3);
    ctx.lineTo(hx - 8, top - 7);
    ctx.lineTo(hx - 4, top - 2);
    ctx.lineTo(hx, top - 9);
    ctx.lineTo(hx + 4, top - 2);
    ctx.lineTo(hx + 8, top - 7);
    ctx.lineTo(hx + 8, top + 3);
    ctx.fill();
    ctx.fillStyle = "#e5544b";
    ctx.fillRect(hx - 1.5, top - 2, 3, 3);
  } else if (hat === "bow") {
    ctx.fillStyle = "#ff5fa2";
    ctx.beginPath();
    ctx.moveTo(hx - 2, top + 1);
    ctx.lineTo(hx - 11, top - 5);
    ctx.lineTo(hx - 11, top + 6);
    ctx.closePath();
    ctx.moveTo(hx - 2, top + 1);
    ctx.lineTo(hx + 7, top - 5);
    ctx.lineTo(hx + 7, top + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c93b7b";
    ctx.beginPath();
    ctx.arc(hx - 2, top + 1, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (hat === "party") {
    ctx.fillStyle = "#3d8ee8";
    ctx.beginPath();
    ctx.moveTo(hx - 7, top + 3);
    ctx.lineTo(hx - 1, top - 16);
    ctx.lineTo(hx + 6, top + 3);
    ctx.fill();
    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(hx - 4, top - 5, 7, 3);
    ctx.beginPath();
    ctx.arc(hx - 1, top - 17, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (hat === "shades") {
    ctx.fillStyle = "#222";
    ctx.fillRect(hx - 4, hy - 6, 13, 3);
    ctx.beginPath();
    ctx.ellipse(hx + 1, hy - 3, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(hx + 10, hy - 3, 4, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

// ---------------- scenery ----------------
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function drawBackdrop(ctx, W, camX, tint, night) {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, night ? "#1f2a55" : shade(tint, 0.72));
  g.addColorStop(1, night ? "#46507f" : shade(tint, 0.9));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, LANE_H);

  // sun or moon
  ctx.fillStyle = night ? "#f4f1d0" : "rgba(255,226,120,0.9)";
  ctx.beginPath();
  ctx.arc(W - 70, 34, 14, 0, Math.PI * 2);
  ctx.fill();

  // volcano + hills (far)
  const far = camX * 0.15;
  ctx.fillStyle = night ? "#2d3566" : shade(tint, 0.45);
  for (let k = Math.floor(far / 520) - 1; k < Math.floor((far + W) / 520) + 2; k++) {
    const bx = k * 520 - far + hash(k) * 200;
    const h = 40 + hash(k + 7) * 30;
    ctx.beginPath();
    ctx.moveTo(bx - 110, GROUND);
    ctx.lineTo(bx - 18, GROUND - h);
    ctx.lineTo(bx + 18, GROUND - h);
    ctx.lineTo(bx + 110, GROUND);
    ctx.fill();
    if (hash(k + 3) > 0.6) {
      ctx.fillStyle = "rgba(255,120,60,0.7)";
      ctx.fillRect(bx - 14, GROUND - h - 2, 28, 4);
      ctx.fillStyle = night ? "#2d3566" : shade(tint, 0.45);
    }
  }
  // clouds
  const cl = camX * 0.3;
  ctx.fillStyle = night ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.85)";
  for (let k = Math.floor(cl / 300) - 1; k < Math.floor((cl + W) / 300) + 2; k++) {
    const cx = k * 300 - cl + hash(k + 11) * 140;
    const cy = 18 + hash(k + 5) * 40;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.arc(cx + 12, cy - 5, 12, 0, Math.PI * 2);
    ctx.arc(cx + 26, cy, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  // palm trees (near)
  const nr = camX * 0.55;
  for (let k = Math.floor(nr / 380) - 1; k < Math.floor((nr + W) / 380) + 2; k++) {
    if (hash(k + 21) < 0.45) continue;
    const px = k * 380 - nr + hash(k + 2) * 200;
    const ph = 34 + hash(k + 9) * 22;
    ctx.strokeStyle = night ? "#4a4060" : "#a07a4c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px, GROUND);
    ctx.quadraticCurveTo(px + 6, GROUND - ph / 2, px + 2, GROUND - ph);
    ctx.stroke();
    ctx.fillStyle = night ? "#2f5148" : "#4f9a57";
    for (let a = 0; a < 5; a++) {
      const ang = Math.PI + (a * Math.PI) / 4;
      ctx.beginPath();
      ctx.ellipse(px + 2 + Math.cos(ang) * 10, GROUND - ph + Math.sin(ang) * 4 + 3, 12, 3.5, ang, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // ground
  ctx.fillStyle = night ? "#5b4f45" : "#d9b779";
  ctx.fillRect(0, GROUND, W, LANE_H - GROUND);
  ctx.fillStyle = night ? "#3f7d4c" : "#6cbf5a";
  ctx.fillRect(0, GROUND, W, 4);
  ctx.fillStyle = night ? "#4a4038" : "#c49d5f";
  for (let k = Math.floor(camX / 46) - 1; k < Math.floor((camX + W) / 46) + 2; k++) {
    const gx = k * 46 - camX + hash(k) * 30;
    ctx.fillRect(gx, GROUND + 8 + hash(k + 1) * 12, 4 + hash(k + 4) * 8, 2);
  }
}

function drawObstacle(ctx, o, sx, time) {
  const yb = GROUND - o.bottom;
  if (o.type === "rock" || o.type === "rocks") {
    const rocks =
      o.type === "rock"
        ? [[0, 26, 26]]
        : [
            [0, 26, 24],
            [20, 30, 32],
            [44, 26, 22],
          ];
    for (const [dx, w, h] of rocks) {
      ctx.fillStyle = "#8a8f99";
      ctx.beginPath();
      ctx.moveTo(sx + dx, yb);
      ctx.lineTo(sx + dx + 3, yb - h * 0.7);
      ctx.lineTo(sx + dx + w * 0.4, yb - h);
      ctx.lineTo(sx + dx + w * 0.85, yb - h * 0.8);
      ctx.lineTo(sx + dx + w, yb);
      ctx.fill();
      ctx.fillStyle = "#b3b8c2";
      ctx.beginPath();
      ctx.moveTo(sx + dx + 5, yb - h * 0.65);
      ctx.lineTo(sx + dx + w * 0.4, yb - h * 0.92);
      ctx.lineTo(sx + dx + w * 0.55, yb - h * 0.6);
      ctx.fill();
    }
  } else if (o.type === "stump") {
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(sx + 2, yb - o.h + 6, o.w - 4, o.h - 6);
    ctx.fillStyle = "#c98f55";
    ctx.beginPath();
    ctx.ellipse(sx + o.w / 2, yb - o.h + 6, o.w / 2 - 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(sx + o.w / 2, yb - o.h + 6, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#6e4420";
    ctx.fillRect(sx + 8, yb - o.h + 18, 3, 26);
    ctx.fillRect(sx + 18, yb - o.h + 24, 3, 22);
  } else if (o.type === "spiky") {
    ctx.fillStyle = "#3e8e4a";
    ctx.beginPath();
    ctx.ellipse(sx + o.w / 2, yb - 16, o.w / 2, 16, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(sx, yb - 16, o.w, 16);
    ctx.fillStyle = "#2a6a35";
    for (let k = 0; k < 5; k++) {
      const a = Math.PI + (k + 0.5) * (Math.PI / 5);
      const bx = sx + o.w / 2 + Math.cos(a) * (o.w / 2 - 2);
      const by = yb - 16 + Math.sin(a) * 14;
      ctx.beginPath();
      ctx.moveTo(bx - 4, by);
      ctx.lineTo(bx + Math.cos(a) * 12, by + Math.sin(a) * 12);
      ctx.lineTo(bx + 4, by);
      ctx.fill();
    }
    ctx.fillStyle = "#ff6b8b";
    ctx.beginPath();
    ctx.arc(sx + o.w / 2 + 4, yb - 22, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // bat
    const flap = Math.sin(time * 14 + o.id) * 9;
    const cx = sx + o.w / 2;
    const cy = yb - o.h / 2;
    ctx.fillStyle = "#5a3d7a";
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy);
    ctx.quadraticCurveTo(cx - 14, cy - 10 - flap, cx - 22, cy - 2 - flap);
    ctx.quadraticCurveTo(cx - 14, cy + 2, cx - 4, cy + 4);
    ctx.moveTo(cx + 4, cy);
    ctx.quadraticCurveTo(cx + 14, cy - 10 - flap, cx + 22, cy - 2 - flap);
    ctx.quadraticCurveTo(cx + 14, cy + 2, cx + 4, cy + 4);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe066";
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 1, 2, 0, Math.PI * 2);
    ctx.arc(cx + 1, cy - 1, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPickup(ctx, c, sx, time) {
  const y = GROUND - c.y;
  const spin = Math.abs(Math.cos(time * 4 + c.id));
  if (c.kind === "coin") {
    ctx.fillStyle = "#f4b400";
    ctx.beginPath();
    ctx.ellipse(sx, y, 9 * spin + 1.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe27a";
    ctx.beginPath();
    ctx.ellipse(sx, y, 5 * spin + 0.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.kind === "gem") {
    ctx.fillStyle = "#4fc3f7";
    ctx.beginPath();
    ctx.moveTo(sx, y - 10);
    ctx.lineTo(sx + 8 * spin + 2, y - 2);
    ctx.lineTo(sx, y + 10);
    ctx.lineTo(sx - 8 * spin - 2, y - 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(sx - 2, y - 6, 3, 4);
  } else {
    ctx.fillStyle = "#ffd23f";
    ctx.strokeStyle = "#e69500";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx + 3, y - 11);
    ctx.lineTo(sx - 6, y + 1);
    ctx.lineTo(sx, y + 1);
    ctx.lineTo(sx - 3, y + 11);
    ctx.lineTo(sx + 6, y - 2);
    ctx.lineTo(sx, y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawFinish(ctx, sx) {
  ctx.fillStyle = "#555";
  ctx.fillRect(sx - 2, GROUND - 96, 4, 96);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 6; c++) {
      ctx.fillStyle = (r + c) % 2 ? "#222" : "#fff";
      ctx.fillRect(sx + 2 + c * 6, GROUND - 96 + r * 6, 6, 6);
    }
  for (let k = 0; k < 6; k++) {
    ctx.fillStyle = k % 2 ? "#222" : "#fff";
    ctx.fillRect(sx - 3, GROUND + k * 4, 6, 4);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function chip(ctx, x, y, text, bg, fg = "#fff") {
  ctx.font = "600 13px Fredoka, ui-rounded, system-ui, sans-serif";
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, 20, 10);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 7, y + 10.5);
  return w;
}

function heart(ctx, x, y, s, full) {
  ctx.fillStyle = full ? "#ef4060" : "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  ctx.fill();
}

// ---------------- one lane ----------------
function drawLane(ctx, state, p, W, time, places) {
  const camX = state.mode === "endless" ? state.camX : p.camX;
  const color = colorOf(p.color);
  const night = state.mode === "endless" && level(state) % 2 === 0;
  drawBackdrop(ctx, W, camX, color, night);

  if (state.mode === "race") {
    const fx = state.finishX - camX;
    if (fx > -40 && fx < W + 40) drawFinish(ctx, fx);
    // start line
    const sx = -camX + 40;
    if (sx > -10 && sx < W) {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(sx, GROUND, 4, LANE_H - GROUND);
    }
  }

  for (const o of state.course.obstacles) {
    const sx = o.x - camX;
    if (sx < -80) continue;
    if (sx > W + 40) break;
    drawObstacle(ctx, o, sx, time);
  }
  for (const c of state.course.pickups) {
    if (p.taken.has(c.id)) continue;
    const sx = c.x - camX;
    if (sx < -20) continue;
    if (sx > W + 20) break;
    drawPickup(ctx, c, sx, time);
  }

  // other dinos as see-through ghosts (race & coins) so you can see who is near
  if (state.mode !== "endless") {
    for (const q of state.players) {
      if (q === p) continue;
      const sx = q.x - camX;
      const qc = colorOf(q.color);
      if (sx > -60 && sx < W) {
        drawDino(ctx, sx, GROUND - q.y, qc, q.hat, {
          phase: q.runPhase,
          duck: q.ducking,
          air: !q.onGround,
          alpha: 0.28,
          height: q.y,
        });
      } else {
        // arrow at the edge
        const ahead = sx >= W;
        const gap = Math.round(Math.abs(q.x - p.x) / 20);
        const label = `${q.name.slice(0, 8)} ${gap}m`;
        ctx.font = "600 11px Fredoka, ui-rounded, system-ui, sans-serif";
        const tw = ctx.measureText(label).width + 20;
        const ax = ahead ? W - tw - 6 : 6;
        const ay = 40 + (q.idx % 4) * 22;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = qc;
        roundRect(ctx, ax, ay, tw, 18, 9);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.textBaseline = "middle";
        ctx.fillText(ahead ? `${label} ▶` : `◀ ${label}`, ax + 6, ay + 9.5);
        ctx.globalAlpha = 1;
      }
    }
  }

  // particles
  for (const q of state.particles) {
    if (q.lane !== p.idx) continue;
    const sx = q.x - camX;
    const sy = GROUND - q.y;
    ctx.globalAlpha = Math.min(1, q.life * 1.5);
    if (q.kind === "coin") {
      ctx.fillStyle = "#f4b400";
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (q.kind === "confetti") {
      ctx.fillStyle = ["#ef4060", "#ffd23f", "#3d8ee8", "#4cbb5e"][Math.floor(q.vx) & 3];
      ctx.fillRect(sx, sy, 5, 5);
    } else {
      ctx.fillStyle = "#ffd23f";
      star(ctx, sx, sy, 5);
    }
    ctx.globalAlpha = 1;
  }

  // the dino
  const sx = p.x - camX;
  const blink = p.inv > 0 && Math.floor(time * 12) % 2 === 0;
  if (p.alive) {
    drawDino(ctx, sx, GROUND - p.y, color, p.hat, {
      phase: p.runPhase,
      duck: p.ducking,
      air: !p.onGround,
      stun: p.stun > 0,
      time,
      alpha: blink ? 0.35 : 1,
      height: p.y,
    });
    if (p.boosting) {
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        const ly = GROUND - p.y - 12 - k * 10;
        const off = ((time * 400 + k * 30) % 30) | 0;
        ctx.beginPath();
        ctx.moveTo(sx - 18 - off, ly);
        ctx.lineTo(sx - 34 - off, ly);
        ctx.stroke();
      }
    }
  }

  // big status messages
  let msg = null;
  if (!p.alive) msg = state.mode === "endless" ? `OUT · ${metres(p.best)} m` : "OUT!";
  else if (state.mode === "race" && p.finished) msg = `${ORD[p.place]} place!`;
  if (msg) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(0, 0, W, LANE_H);
    ctx.font = "700 34px Fredoka, ui-rounded, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = shade(color, -0.4);
    ctx.fillText(msg, W / 2, LANE_H / 2);
    ctx.textAlign = "left";
  }
}

// ---------------- whole frame ----------------
function skyTop(state, p) {
  const night = state.mode === "endless" && level(state) % 2 === 0;
  return night ? "#1f2a55" : shade(colorOf(p.color), 0.72);
}

// the strip at the top of a player's view: name, lives, score, boost and progress
function drawHeader(ctx, state, p, w, places) {
  const color = colorOf(p.color);
  ctx.fillStyle = "#24304a";
  ctx.fillRect(0, 0, w, TOP_H);
  const y = (TOP_H - 20) / 2;
  let x = 8;
  x += chip(ctx, x, y, `${p.name.slice(0, 10)}${p.bot ? " 🤖" : ""}`, color) + 8;
  for (let k = 0; k < p.maxLives; k++) heart(ctx, x + 7 + k * 17, y + 3, 14, k < p.lives);
  x += p.maxLives * 17 + 6;
  const place = places.get(p);
  const two = state.players.length > 1;
  if (state.mode === "endless") {
    x += chip(ctx, x, y, `${metres(p.best)} m`, "rgba(255,255,255,0.18)") + 6;
  } else if (state.mode === "coins") {
    x += chip(ctx, x, y, `🪙 ${p.coins}`, "#c98a00") + 6;
  }
  if (two && state.mode !== "endless") x += chip(ctx, x, y, ORD[place], place === 1 ? "#e6a700" : "rgba(255,255,255,0.18)") + 6;

  // boost bar (race & coins)
  if (state.mode !== "endless" && w - x > 120) {
    const bw = 46;
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    roundRect(ctx, x + 14, TOP_H / 2 - 4, bw, 8, 4);
    ctx.fill();
    ctx.fillStyle = p.stamina > 0.25 ? "#ffd23f" : "#ef8040";
    roundRect(ctx, x + 14, TOP_H / 2 - 4, Math.max(5, bw * p.stamina), 8, 4);
    ctx.fill();
    ctx.font = "12px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("⚡", x, TOP_H / 2 + 1);
    x += bw + 24;
  }

  // right side: progress / level / clock
  ctx.font = "600 13px Fredoka, ui-rounded, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "right";
  const right = w - 8;
  if (state.mode === "race") {
    const label = `${Math.min(metres(p.x), metres(state.finishX))}/${metres(state.finishX)} m`;
    ctx.fillText(label, right, TOP_H / 2 + 1);
    const x1 = right - ctx.measureText(label).width - 26;
    const x0 = x + 6;
    ctx.textAlign = "left";
    if (x1 - x0 > 40) {
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      roundRect(ctx, x0, TOP_H / 2 - 3, x1 - x0, 6, 3);
      ctx.fill();
      ctx.font = "12px sans-serif";
      ctx.fillText("🏁", x1 + 2, TOP_H / 2 + 1);
      // draw the other dino first so this player's dot is on top
      for (const q of [...state.players].sort((a) => (a === p ? 1 : -1))) {
        const f = Math.min(1, Math.max(0, q.x / state.finishX));
        ctx.fillStyle = colorOf(q.color);
        ctx.strokeStyle = q === p ? "#fff" : "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x0 + f * (x1 - x0), TOP_H / 2, q === p ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  } else if (state.mode === "endless") {
    ctx.fillText(`Level ${level(state)} · ⏱ ${Math.floor(state.t)}s`, right, TOP_H / 2 + 1);
  } else {
    ctx.fillText(`⏱ ${Math.ceil(timeLeft(state))}s`, right, TOP_H / 2 + 1);
  }
  ctx.textAlign = "left";
}

// one player's whole view (header + their lane). The caller may rotate it.
export function drawView(ctx, state, p, cssW, cssH, time) {
  const order = standings(state);
  const places = new Map(order.map((q, i) => [q, i + 1]));
  const areaH = Math.max(10, cssH - TOP_H);
  const scale = Math.max(0.25, Math.min(areaH / LANE_H, cssW / viewWidthFor(cssW)));
  const W = cssW / scale;
  const extra = areaH / scale - LANE_H; // extra sky above the lane on tall screens

  ctx.save();
  ctx.translate(0, TOP_H);
  ctx.beginPath();
  ctx.rect(0, 0, cssW, areaH);
  ctx.clip();
  ctx.scale(scale, scale);
  if (extra > 0) {
    ctx.fillStyle = skyTop(state, p);
    ctx.fillRect(0, 0, W, extra + 1);
    ctx.translate(0, extra);
  }
  drawLane(ctx, state, p, W, time, places);
  ctx.restore();

  drawHeader(ctx, state, p, cssW, places);

  const cx = cssW / 2;
  const cy = TOP_H + areaH / 2;
  const big = (f) => `700 ${Math.round(Math.min(cssW, areaH) * f)}px Fredoka, ui-rounded, system-ui, sans-serif`;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (state.phase === "countdown") {
    const n = Math.ceil(state.countdown - 0.5);
    const txt = n > 0 ? String(n) : "GO!";
    const frac = state.countdown - 0.5 - Math.floor(state.countdown - 0.5);
    ctx.font = big(0.35 + frac * 0.1);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#24304a";
    ctx.strokeText(txt, cx, cy);
    ctx.fillStyle = "#ffd23f";
    ctx.fillText(txt, cx, cy);
  } else if (state.phase === "done" && state.players.length > 1) {
    const won = places.get(p) === 1;
    ctx.font = big(0.2);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#24304a";
    const txt = won ? "🏆 YOU WIN!" : "So close!";
    ctx.strokeText(txt, cx, cy);
    ctx.fillStyle = won ? "#ffd23f" : "#fff";
    ctx.fillText(txt, cx, cy);
  }
  ctx.restore();
  return W;
}
