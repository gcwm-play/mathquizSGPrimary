// Dino Dash Party — game rules and simulation (no drawing here).
// World units: a lane is LANE_H tall; 20 units = 1 metre.

export const LANE_H = 160;
export const GROUND = 138;
export const UNITS_PER_M = 20;

const GRAVITY = 3000;
const JUMP_V = 740;
const JUMP_CUT = 280; // letting go of jump early caps upward speed → short hop
const BOOST = 1.45; // ▶ forward multiplier
const BRAKE = 0.55; // ◀ back multiplier

export const MODES = {
  race: {
    id: "race",
    icon: "🏁",
    name: "Race",
    blurb: "First dino to the finish flag wins. Every crash costs a life — lose them all and you're out.",
  },
  endless: {
    id: "endless",
    icon: "♾️",
    name: "Endless",
    blurb: "It never ends — it just keeps getting faster and harder. Whoever runs the furthest wins.",
  },
  coins: {
    id: "coins",
    icon: "🪙",
    name: "Coin Rush",
    blurb: "Grab the most coins before time runs out. A crash costs a life and 3 coins.",
  },
};

export const RACE_LENGTHS = { short: 500, medium: 1000, long: 1600 }; // metres
export const PACES = { chill: 0.8, normal: 1, turbo: 1.25 };

export const COLORS = [
  { id: "green", name: "Green", body: "#4cbb5e", hue: 95 },
  { id: "orange", name: "Orange", body: "#f2933a", hue: 30 },
  { id: "blue", name: "Blue", body: "#3d8ee8", hue: 212 },
  { id: "pink", name: "Pink", body: "#ec6fb0", hue: 322 },
  { id: "purple", name: "Purple", body: "#9b6be0", hue: 272 },
  { id: "yellow", name: "Yellow", body: "#e8c331", hue: 50 },
  { id: "red", name: "Red", body: "#e5544b", hue: 4 },
  { id: "teal", name: "Teal", body: "#2fb5a8", hue: 172 },
];

export const HATS = [
  { id: "none", name: "No hat", icon: "🚫" },
  { id: "cap", name: "Cap", icon: "🧢" },
  { id: "crown", name: "Crown", icon: "👑" },
  { id: "bow", name: "Bow", icon: "🎀" },
  { id: "party", name: "Party hat", icon: "🥳" },
];

// hitboxes relative to the dino's world x (left edge) and height above ground
const STAND = { x0: 8, x1: 40, h: 44 };
const DUCK = { x0: 4, x1: 54, h: 26 };

const OBSTACLES = {
  rock: { w: 26, h: 26, bottom: 0 },
  stump: { w: 30, h: 56, bottom: 0 },
  rocks: { w: 70, h: 32, bottom: 0 },
  spiky: { w: 40, h: 44, bottom: 0 },
  batLow: { w: 40, h: 26, bottom: 12, flying: true },
  batMid: { w: 40, h: 26, bottom: 36, flying: true },
};

// ---------- random numbers that are the same for every lane ----------
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- speeds ----------
function baseSpeed(state, t) {
  const p = state.pace;
  if (state.mode === "endless") return Math.min(380 * p + 8 * t, 1500 * p);
  if (state.mode === "race") return Math.min(420 * p + 2 * t, 560 * p);
  return Math.min(400 * p + 3 * t, 560 * p);
}

// speed a dino is likely to have at distance x (used to space obstacles fairly)
function expectedSpeedAt(state, x) {
  const p = state.pace;
  if (state.mode === "endless") {
    const s0 = 380 * p;
    const a = 8;
    const t = (-s0 + Math.sqrt(s0 * s0 + 2 * a * x)) / a;
    return Math.min(s0 + a * t, 1500 * p);
  }
  return 560 * p * 1.25;
}

// ---------- course ----------
// Endless gets one level harder every 250 m
export const LEVEL_M = 250;
function levelAt(x) {
  return 1 + Math.floor(x / UNITS_PER_M / LEVEL_M);
}
export function level(state) {
  return levelAt(Math.max(0, ...state.players.map((p) => p.best)));
}

function pickObstacle(rng, x, lvl) {
  const m = x / UNITS_PER_M;
  const opts = [["rock", Math.max(1, 4 - lvl)]];
  if (m > 40) opts.push(["stump", 3]);
  if (m > 90) opts.push(["rocks", 2], ["spiky", 2]);
  if (m > 140) opts.push(["batLow", 1 + lvl * 0.5], ["batMid", 1 + lvl * 0.5]);
  const total = opts.reduce((s, o) => s + o[1], 0);
  let r = rng() * total;
  for (const [type, w] of opts) {
    r -= w;
    if (r <= 0) return type;
  }
  return "rock";
}

function extendCourse(state, upto) {
  const c = state.course;
  const end = state.finishX ? state.finishX - 400 : Infinity;
  while (c.genX < upto) {
    const sp = expectedSpeedAt(state, c.genX);
    const squeeze = state.mode === "endless" ? Math.max(0.25, 1 - 0.1 * (levelAt(c.genX) - 1)) : 1;
    const gap = Math.max(420, sp * 0.8) + c.rng() * sp * 0.9 * squeeze;
    const prevX = c.genX;
    c.genX += gap;
    if (c.genX > end) {
      c.genX = Infinity;
      break;
    }
    const type = pickObstacle(c.rng, c.genX, state.mode === "endless" ? levelAt(c.genX) : 1);
    const spec = OBSTACLES[type];
    c.obstacles.push({ id: c.nextId++, type, x: c.genX, ...spec });

    if (state.mode === "coins") {
      const r = c.rng();
      if (r < 0.45) {
        // an arc of coins over the obstacle — jump to collect
        const n = 5;
        for (let k = 0; k < n; k++) {
          const f = k / (n - 1);
          c.pickups.push({
            id: c.nextId++,
            kind: "coin",
            x: c.genX + spec.w / 2 - 110 + f * 220,
            y: 30 + Math.sin(f * Math.PI) * 60,
          });
        }
      } else {
        // a row on the ground between obstacles
        const n = 3 + Math.floor(c.rng() * 4);
        const start = prevX + 120 + c.rng() * Math.max(0, gap - 160 - n * 34);
        const high = c.rng() < 0.3;
        for (let k = 0; k < n; k++) {
          const cx = start + k * 34;
          if (cx > c.genX - 60) break;
          c.pickups.push({ id: c.nextId++, kind: high ? "gem" : "coin", x: cx, y: high ? 70 : 18 });
        }
      }
    } else if (state.mode === "race" && c.rng() < 0.18) {
      c.pickups.push({ id: c.nextId++, kind: "bolt", x: prevX + gap / 2, y: 20 + c.rng() * 50 });
    }
  }
  // drop things far behind every dino
  const minX = Math.min(...state.players.map((p) => p.x)) - 600;
  while (c.obstacles.length && c.obstacles[0].x + 100 < minX) c.obstacles.shift();
  while (c.pickups.length && c.pickups[0].x + 100 < minX) c.pickups.shift();
}

// lives: 1–3, or 0 / "inf" for never running out
export const INFINITE_LIVES = 0;
function livesFor(rp) {
  if (rp.lives === INFINITE_LIVES || rp.lives === "inf") return Infinity;
  return Math.min(3, Math.max(1, Number(rp.lives) || 3));
}

// for now the only control is jump (no faster / slower / duck)
function jumpOnly(inp) {
  return { jump: !!inp.jump, fwd: false, back: false, duck: false };
}

// end the round right away (used by "Finish now" when nobody can run out of lives)
export function finishNow(state) {
  if (state.phase === "done") return;
  if (state.phase === "countdown") state.phase = "play";
  state.endTimer = -1;
  state.phase = "done";
  state.results = results(state);
  state.events.push({ type: "end" });
}

// ---------- create ----------
export function createGame(room) {
  const seed = (Math.random() * 2 ** 31) | 0;
  const s = room.settings;
  const state = {
    mode: s.mode,
    pace: PACES[s.pace] ?? 1,
    duration: s.mode === "coins" ? Number(s.coinTime) || 60 : 0,
    finishX: s.mode === "race" ? (RACE_LENGTHS[s.raceLength] ?? 300) * UNITS_PER_M : 0,
    phase: "countdown",
    countdown: 3.5,
    t: 0,
    camX: 0,
    scroll: 0,
    viewW: 800,
    endTimer: -1,
    firstFinishT: -1,
    finishOrder: 0,
    events: [],
    particles: [],
    course: { rng: mulberry32(seed), obstacles: [], pickups: [], genX: 900, nextId: 1 },
    players: room.players.map((rp, i) => ({
      idx: i,
      id: rp.id,
      name: rp.name,
      color: rp.color,
      hat: rp.hat,
      species: rp.species === "raptor" ? "raptor" : "trex",
      bot: rp.scheme === "bot" ? { skill: rp.botSkill || "normal", plan: null, rng: mulberry32(seed + i * 99) } : null,
      x: 0,
      y: 0,
      vy: 0,
      vx: 0,
      onGround: true,
      ducking: false,
      stamina: 1,
      boosting: false,
      lives: livesFor(rp),
      maxLives: livesFor(rp),
      alive: true,
      outT: -1,
      stun: 0,
      inv: 0,
      coins: 0,
      best: 0,
      taken: new Set(),
      finished: false,
      finishT: -1,
      place: 0,
      screenX: 150,
      camX: -150,
      runPhase: Math.random() * 6,
      hits: 0,
      jumps: 0,
    })),
  };
  if (state.mode === "endless") {
    state.camX = -150;
  }
  extendCourse(state, 3000);
  return state;
}

// ---------- computer players ----------
const BOT_SKILL = {
  easy: { mistake: 0.16, leadMin: 0.07, leadMax: 0.2, boostAt: 0.5 },
  normal: { mistake: 0.07, leadMin: 0.09, leadMax: 0.16, boostAt: 0.35 },
  hard: { mistake: 0.015, leadMin: 0.1, leadMax: 0.13, boostAt: 0.2 },
};

function botInput(state, p) {
  const sk = BOT_SKILL[p.bot.skill] || BOT_SKILL.normal;
  const inp = { back: false, fwd: false, jump: false, duck: false };
  const front = p.x + STAND.x1;
  const next = state.course.obstacles.find((o) => o.x + o.w > p.x + STAND.x0);
  const v = Math.max(p.vx, 1);

  if (next) {
    if (!p.bot.plan || p.bot.plan.id !== next.id) {
      const r = p.bot.rng;
      p.bot.plan = {
        id: next.id,
        fail: r() < sk.mistake,
        lead: sk.leadMin + r() * (sk.leadMax - sk.leadMin),
        duck: false, // ducking is switched off for now — everyone jumps bats
      };
    }
    const plan = p.bot.plan;
    const dist = next.x - front;
    const tReach = dist / v;
    if (plan.duck) {
      if (tReach < 0.25 && next.x + next.w > p.x) inp.duck = true;
    } else {
      const lead = plan.fail ? plan.lead * 0.3 : plan.lead + (next.w / v) * 0.4;
      if (tReach < lead && dist > -next.w) inp.jump = true;
      if (!p.onGround && p.vy > 0) inp.jump = true; // hold for full height
    }
    const clearAhead = tReach > 0.7;
    if (state.mode === "endless") {
      const target = state.viewW * 0.4;
      if (p.screenX < target - 40) inp.fwd = true;
      else if (p.screenX > target + 40) inp.back = true;
    } else if (clearAhead && p.stamina > sk.boostAt) {
      inp.fwd = true;
    }
    if (state.mode === "coins" && p.onGround && !inp.duck) {
      const gem = state.course.pickups.find((c) => !p.taken.has(c.id) && c.x > front && c.x - front < v * 0.25);
      if (gem && gem.y > 50 && tReach > 0.5) inp.jump = true;
    }
  }
  return inp;
}

// ---------- step ----------
function overlap(p, o) {
  const hb = p.ducking ? DUCK : STAND;
  const ax0 = p.x + hb.x0;
  const ax1 = p.x + hb.x1;
  if (ax1 <= o.x + 4 || ax0 >= o.x + o.w - 4) return false;
  const ay0 = p.y;
  const ay1 = p.y + hb.h;
  return ay1 > o.bottom + 3 && ay0 < o.bottom + o.h - 3;
}

function burst(state, p, kind, n, x, y) {
  for (let i = 0; i < n; i++) {
    state.particles.push({
      lane: p.idx,
      kind,
      x,
      y,
      vx: (Math.random() - 0.3) * 300,
      vy: 200 + Math.random() * 300,
      life: 0.8 + Math.random() * 0.4,
    });
  }
}

function hit(state, p) {
  p.hits++;
  state.events.push({ type: "hit", lane: p.idx });
  burst(state, p, "star", 6, p.x + 30, p.y + 30);
  if (Number.isFinite(p.lives)) p.lives--;
  if (state.mode === "endless") {
    p.inv = 1.8;
    p.stun = 0.35;
  } else {
    p.stun = 0.8;
    p.inv = 1.6;
    p.vx *= 0.35;
  }
  if (state.mode === "coins") {
    const lost = Math.min(3, p.coins);
    p.coins -= lost;
    if (lost) burst(state, p, "coin", lost, p.x + 30, p.y + 30);
  }
  if (p.lives <= 0) {
    p.alive = false;
    p.outT = state.t;
    p.vx = 0;
    p.stun = 0;
    state.events.push({ type: "out", lane: p.idx });
  }
}

function updatePlayer(state, p, inp, dt, base) {
  const racingDone = state.mode === "race" && p.finished;
  if (!p.alive) return;

  // speed: forward / back / normal
  let target = base;
  p.boosting = false;
  if (racingDone) {
    target = base * 0.5;
  } else if (p.stun > 0) {
    target = base * 0.3;
  } else if (inp.back && !inp.fwd) {
    target = base * BRAKE;
  } else if (inp.fwd && p.stamina > 0.02) {
    target = base * BOOST;
    p.boosting = true;
  }
  if (state.mode === "endless") {
    // no stamina limit in survival — position on screen is what matters
    p.stamina = 1;
  } else if (p.boosting) {
    p.stamina = Math.max(0, p.stamina - 0.38 * dt);
  } else {
    p.stamina = Math.min(1, p.stamina + 0.2 * dt);
  }
  const accel = target > p.vx ? 2.6 : 4;
  p.vx += (target - p.vx) * Math.min(1, dt * accel);
  p.x += p.vx * dt;

  // jump & duck
  const canAct = p.stun <= 0 && !racingDone;
  if (canAct && inp.jump && p.onGround) {
    p.vy = JUMP_V;
    p.onGround = false;
    p.jumps++;
    state.events.push({ type: "jump", lane: p.idx });
  }
  if (!p.onGround) {
    if (!inp.jump && p.vy > JUMP_CUT) p.vy = JUMP_CUT;
    p.vy -= GRAVITY * (inp.duck ? 2.6 : 1) * dt;
    p.y += p.vy * dt;
    if (p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      p.onGround = true;
    }
  }
  p.ducking = canAct && inp.duck && p.onGround;
  p.runPhase += dt * (6 + p.vx / 50);

  p.stun = Math.max(0, p.stun - dt);
  p.inv = Math.max(0, p.inv - dt);

  // survival: stay inside the screen
  if (state.mode === "endless") {
    const maxX = state.camX + Math.max(200, state.viewW - 140);
    if (p.x > maxX) {
      p.x = maxX;
      p.vx = Math.min(p.vx, state.scroll);
    }
    if (p.x < state.camX - 20) {
      // fell off the back
      if (p.inv <= 0) hit(state, p);
      p.x = state.camX + 160;
      p.vx = state.scroll;
    }
  }

  // bumps
  if (!racingDone && p.inv <= 0) {
    for (const o of state.course.obstacles) {
      if (o.x > p.x + 70) break;
      if (o.x + o.w < p.x) continue;
      if (overlap(p, o)) {
        hit(state, p);
        break;
      }
    }
  }

  // pickups
  if (!racingDone) {
    for (const c of state.course.pickups) {
      if (c.x > p.x + 70) break;
      if (c.x < p.x - 20 || p.taken.has(c.id)) continue;
      const hb = p.ducking ? DUCK : STAND;
      if (c.x + 10 > p.x + hb.x0 && c.x - 10 < p.x + hb.x1 && c.y + 10 > p.y && c.y - 10 < p.y + hb.h) {
        p.taken.add(c.id);
        if (c.kind === "bolt") {
          p.stamina = 1;
          state.events.push({ type: "bolt", lane: p.idx });
        } else {
          p.coins += c.kind === "gem" ? 3 : 1;
          state.events.push({ type: "coin", lane: p.idx });
        }
      }
    }
  }

  // race finish
  if (state.mode === "race" && !p.finished && p.x >= state.finishX) {
    p.finished = true;
    p.finishT = state.t;
    p.place = ++state.finishOrder;
    if (state.firstFinishT < 0) state.firstFinishT = state.t;
    state.events.push({ type: "finish", lane: p.idx, place: p.place });
    burst(state, p, "confetti", 24, p.x + 20, 80);
  }

  // camera for this lane (race & coins): the dino slides forward when fast, back when slow
  if (state.mode !== "endless") {
    const rel = Math.max(-0.5, Math.min(0.5, (p.vx - base) / base));
    const want = Math.min(state.viewW * 0.25, 180) + rel * Math.min(state.viewW * 0.5, 320);
    p.screenX += (want - p.screenX) * Math.min(1, dt * 2.5);
    p.camX = p.x - p.screenX;
  }
  p.best = Math.max(p.best, p.x);
}

export function step(state, dt, inputs) {
  state.events.length = 0;
  if (state.phase === "countdown") {
    const before = Math.ceil(state.countdown - 0.5);
    state.countdown -= dt;
    const after = Math.ceil(state.countdown - 0.5);
    if (after !== before) state.events.push({ type: after > 0 ? "count" : "go", n: after });
    if (state.countdown <= 0.5) state.phase = "play";
    // dinos can hop while waiting
    for (const p of state.players) {
      const inp = p.bot ? {} : inputs[p.idx] || {};
      if (inp.jump && p.onGround) {
        p.vy = JUMP_V * 0.7;
        p.onGround = false;
      }
      if (!p.onGround) {
        p.vy -= GRAVITY * dt;
        p.y = Math.max(0, p.y + p.vy * dt);
        if (p.y === 0) p.onGround = true;
      }
      if (state.mode !== "endless") p.camX = p.x - p.screenX;
      else p.screenX = p.x - state.camX;
    }
    return;
  }
  if (state.phase === "done") {
    updateParticles(state, dt);
    return;
  }

  state.t += dt;
  const base = baseSpeed(state, state.t);
  state.scroll = base;
  if (state.mode === "endless") state.camX += base * dt;

  for (const p of state.players) {
    const inp = jumpOnly(p.bot ? botInput(state, p) : inputs[p.idx] || {});
    updatePlayer(state, p, inp, dt, base);
    if (state.mode === "endless") p.screenX = p.x - state.camX;
  }
  const lead = Math.max(...state.players.map((p) => p.x), state.camX);
  extendCourse(state, lead + 2600);
  updateParticles(state, dt);

  // end of round?
  if (state.endTimer < 0) {
    let over = false;
    const allOut = state.players.every((p) => !p.alive);
    if (state.mode === "endless") {
      over = allOut;
    } else if (state.mode === "race") {
      const done = state.players.every((p) => p.finished || !p.alive);
      over = done || (state.firstFinishT >= 0 && state.t - state.firstFinishT > 20);
    } else {
      over = allOut || state.t >= state.duration;
    }
    if (over) state.endTimer = 1.6;
  } else {
    state.endTimer -= dt;
    if (state.endTimer <= 0) {
      state.phase = "done";
      state.results = results(state);
      state.events.push({ type: "end" });
    }
  }
}

function updateParticles(state, dt) {
  for (const q of state.particles) {
    q.life -= dt;
    q.vy -= 900 * dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
  }
  state.particles = state.particles.filter((q) => q.life > 0);
}

export function metres(x) {
  return Math.max(0, Math.floor(x / UNITS_PER_M));
}

export function timeLeft(state) {
  return Math.max(0, state.duration - state.t);
}

// current standings (used for the HUD and the results)
export function standings(state) {
  const ps = [...state.players];
  if (state.mode === "race") {
    ps.sort((a, b) => {
      if (a.finished && b.finished) return a.finishT - b.finishT;
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return b.x - a.x;
    });
  } else if (state.mode === "endless") {
    ps.sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return b.best - a.best;
    });
  } else {
    ps.sort((a, b) => b.coins - a.coins || b.x - a.x);
  }
  return ps;
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return m ? `${m}:${r.toFixed(1).padStart(4, "0")}` : `${r.toFixed(1)}s`;
}

function results(state) {
  const order = standings(state);
  const out = [];
  order.forEach((p, i) => {
    // ties share a place
    let place = i + 1;
    const prev = out[i - 1];
    if (prev) {
      const same =
        (state.mode === "coins" && prev.p.coins === p.coins) ||
        (state.mode === "endless" && metres(prev.p.best) === metres(p.best));
      if (same) place = prev.place;
    }
    let main;
    if (state.mode === "race")
      main = p.finished ? `Finished in ${fmtTime(p.finishT)}` : p.alive ? `Reached ${metres(p.x)} m` : `Out at ${metres(p.x)} m`;
    else if (state.mode === "endless") main = `${metres(p.best)} m · level ${levelAt(p.best)}`;
    else main = `${p.coins} coins`;
    out.push({
      p,
      id: p.id,
      name: p.name,
      color: p.color,
      hat: p.hat,
      species: p.species,
      place,
      main,
      best: metres(p.best),
      extra:
        state.mode === "endless"
          ? `Lasted ${fmtTime(p.alive ? state.t : p.outT)} · ${p.jumps} jumps · ${p.hits} crashes`
          : `${metres(p.best)} m · ${p.jumps} jumps · ${p.hits} crashes`,
    });
  });
  return out;
}
