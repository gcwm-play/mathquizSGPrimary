// Adaptive objectives: once the starter goals are nearly done, new ones are
// generated from whatever the region needs most right now.
import { NEEDS, LOT_TYPES } from "./defs.js";
import { clamp } from "./geom.js";
import { scaleOf, rollIn } from "./events.js";
import { townOf } from "./world.js";

const fmt = (n) => Math.round(n).toLocaleString("en-SG");
const roundTo = (n, s) => Math.ceil(n / s) * s;
const townPop = (A, i) => A.towns[i].pop;
const liveTowns = (w, A) => w.towns.map((_, i) => i).filter((i) => townPop(A, i) > 300);

function oldBlocks(w, town) {
  return w.lots.filter((l) => l.town === town && l.b && l.b.state === "live" && LOT_TYPES[l.b.type].zone === "hdb" && (w.t - (l.b.up || l.b.built)) / 12 >= 22).length;
}
function renewedSince(w, town, t) {
  return w.lots.filter((l) => l.town === town && l.b && ((l.b.up && l.b.up >= t) || (l.b.renewed && l.b.built >= t && l.b.state !== "build"))).length;
}
const hasStructIn = (w, types, town, since = -1e9) => w.structs.some((s) => types.includes(s.type) && (s.built ?? -1e9) >= since && townOf(w, s.x, s.y) === town);

// kind: { make(w, A) -> candidate | null, progress(w, A, o) -> { cur, target, done } }
export const OBJECTIVES = {
  need: {
    make(w, A) {
      let best = null;
      for (const i of liveTowns(w, A)) {
        for (const k of Object.keys(NEEDS)) {
          if (k === "jobs" || k === "cost") continue;
          const v = A.towns[i].needs[k];
          if (v < 58 && (!best || v < best.v)) best = { i, k, v };
        }
      }
      if (!best) return null;
      const target = Math.min(80, Math.round(best.v + 15));
      return { key: `need:${best.i}:${best.k}`, town: best.i, need: best.k, target, months: 48, score: 70 - best.v, text: `Lift ${NEEDS[best.k].icon} ${NEEDS[best.k].name.toLowerCase()} in ${w.towns[best.i].name} to ${target}`, hint: hintFor(best.k) };
    },
    progress: (w, A, o) => ({ cur: Math.round(A.towns[o.town].needs[o.need]), target: o.target, done: A.towns[o.town].needs[o.need] >= o.target }),
  },
  queue: {
    make(w, A) {
      if (w.waitlist < Math.max(1500, A.pop * 0.06)) return null;
      const target = roundTo(Math.max(300, w.waitlist * 0.45), 100);
      return { key: "queue", target, months: 48, score: 40 + Math.min(40, (w.waitlist / Math.max(1, A.pop)) * 200), text: `Cut the housing queue below ${fmt(target)}`, hint: "Zone more HDB and keep empty flats available. Bigger, newer blocks house more people." };
    },
    progress: (w, A, o) => ({ cur: Math.round(w.waitlist), target: o.target, done: w.waitlist <= o.target, lower: true }),
  },
  pop: {
    make(w, A) {
      if (A.pop < 5000) return null;
      const step = A.pop < 50000 ? 10000 : A.pop < 200000 ? 25000 : 50000;
      const target = roundTo(A.pop * 1.25, step);
      return { key: "pop", target, months: 72, score: 25, text: `Grow the region to ${fmt(target)} residents`, hint: "New estates near jobs, schools and transport fill quickly." };
    },
    progress: (w, A, o) => ({ cur: Math.round(A.pop), target: o.target, done: A.pop >= o.target }),
  },
  renew: {
    make(w, A) {
      if (w.year < 1989) return null;
      let best = null;
      for (const i of liveTowns(w, A)) {
        const n = oldBlocks(w, i);
        if (n >= 3 && (!best || n > best.n)) best = { i, n };
      }
      if (!best) return null;
      const target = Math.min(4, best.n);
      return { key: `renew:${best.i}`, town: best.i, target, months: 60, score: 30 + best.n * 3, text: `Upgrade or rebuild ${target} ageing blocks in ${w.towns[best.i].name}`, hint: "Tap an old HDB block and use 🏗️ Renew. Check where residents will be rehoused first." };
    },
    progress: (w, A, o) => {
      const cur = renewedSince(w, o.town, o.made);
      return { cur, target: o.target, done: cur >= o.target };
    },
  },
  kampong: {
    make(w, A) {
      if (w.year < 1972 || !w.kampongs.length) return null;
      const n = w.kampongs.filter((k) => !k.improved).length;
      if (!n) return null;
      return { key: "kampong", target: 0, months: 96, score: 30 + n * 5, text: `Improve or rehouse every kampong (${n} left)`, hint: "🏗️ Renew a kampong. Make sure there are empty flats first so families aren't left waiting." };
    },
    progress: (w) => {
      const n = w.kampongs.filter((k) => !k.improved).length;
      return { cur: n, target: 0, done: n === 0, lower: true };
    },
  },
  surplus: {
    make(w, A) {
      if (w.t < 24) return null;
      const net = (w.fin?.slice(-12) || []).reduce((a, f) => a + f.r - f.e, 0);
      if (net >= 0) return null;
      return { key: "surplus", target: 12, months: 48, score: 45, text: "Run a surplus for 12 months in a row", hint: "Open 💰 Finances: try S&CC, maintenance and tax sliders and watch the projection." };
    },
    progress: (w, A, o) => ({ cur: w.surplusRun || 0, target: 12, done: (w.surplusRun || 0) >= 12 }),
  },
  reserves: {
    make(w, A) {
      const spend = w.ledger ? Object.values(w.ledger.exp).reduce((a, b) => a + b, 0) : 0;
      if (!spend || w.cash > spend * 12) return null;
      const target = roundTo(spend * 18, 500);
      return { key: "reserves", target, months: 72, score: 30, text: `Build reserves of $${fmt(target / 1000)}M for a rainy day`, hint: "Crises hit harder when the bank is empty. Projections in 💰 Finances show where you'll be." };
    },
    progress: (w, A, o) => ({ cur: Math.round(w.cash), target: o.target, done: w.cash >= o.target, money: true }),
  },
  fert: {
    make(w, A) {
      if (w.year < 1985 || !w.stats.tfr) return null;
      const target = Math.round((w.stats.tfr + 0.12) * 100) / 100;
      return { key: "fert", target, months: 72, score: w.stats.tfr < 1.3 ? 40 : 15, text: `Raise the birth rate to ${target.toFixed(2)} babies per woman`, hint: "Good homes, short queues, schools and community centres help young families." };
    },
    progress: (w, A, o) => ({ cur: Math.round((w.stats.tfr || 0) * 100) / 100, target: o.target, done: (w.stats.tfr || 0) >= o.target, dec: true }),
  },
  jobs: {
    make(w, A) {
      if (A.unemployment < 0.06 || A.pop < 3000) return null;
      return { key: "jobs", target: 4, months: 48, score: 30 + A.unemployment * 300, text: "Bring unemployment below 4%", hint: "Zone shops, offices and factories (factories away from homes)." };
    },
    progress: (w, A) => ({ cur: Math.round(A.unemployment * 1000) / 10, target: 4, done: A.unemployment < 0.04, lower: true, pct: true }),
  },
  approval: {
    make(w, A) {
      let worst = null;
      for (const i of liveTowns(w, A)) if (!worst || w.towns[i].approval < w.towns[worst].approval) worst = i;
      if (worst == null || w.towns[worst].approval > 55) return null;
      return { key: `approval:${worst}`, town: worst, target: 62, months: 48, score: 60 - w.towns[worst].approval, text: `Win back ${w.towns[worst].name}: approval above 62%`, hint: "Check the town's feedback in 🏘️ Towns and fix its worst needs." };
    },
    progress: (w, A, o) => ({ cur: Math.round(w.towns[o.town].approval), target: o.target, done: w.towns[o.town].approval >= o.target }),
  },
  mrt: {
    make(w, A) {
      if (w.year < 1987) return null;
      const towns = liveTowns(w, A).filter((i) => !A.liveStations.some((s) => townOf(w, s.x, s.y) === i));
      if (!towns.length) return null;
      const i = towns.reduce((a, b) => (townPop(A, b) > townPop(A, a) ? b : a), towns[0]);
      return { key: `mrt:${i}`, town: i, target: 1, months: 72, score: 35, text: `Bring the MRT to ${w.towns[i].name}`, hint: "Lay MRT track, then build a station beside it in the town (you need 2+ stations on a line)." };
    },
    progress: (w, A, o) => {
      const done = A.mrtRunning && A.liveStations.some((s) => townOf(w, s.x, s.y) === o.town);
      return { cur: done ? 1 : 0, target: 1, done };
    },
  },
  health: {
    make(w, A) {
      if (!w.stats.life) return null;
      const target = Math.round((w.stats.life + 1.2) * 10) / 10;
      return { key: "health", target, months: 72, score: (w.stats.lifeIdx ?? 50) < 50 ? 35 : 12, text: `Raise life expectancy to ${target} years`, hint: "Clinics and hospitals near homes, clean air and parks." };
    },
    progress: (w, A, o) => ({ cur: Math.round((w.stats.life || 0) * 10) / 10, target: o.target, done: (w.stats.life || 0) >= o.target, dec: true }),
  },
  rival: {
    make(w, A) {
      if (!w.rivals?.length || !w.yearly?.length) return null;
      const me = w.yearly[w.yearly.length - 1];
      let best = null;
      for (const r of w.rivals) {
        for (const k of ["happy", "health", "housing", "rep"]) {
          const gap = (r.m[k] ?? 50) - (me[k] ?? 50);
          if (gap > 4 && (!best || gap > best.gap)) best = { r, k, gap };
        }
      }
      if (!best) return null;
      const names = { happy: "happiness", health: "health", housing: "housing", rep: "reputation" };
      return { key: `rival:${best.r.region}:${best.k}`, rival: best.r.region, metric: best.k, target: 0, months: 84, score: 20 + best.gap, text: `Overtake ${best.r.mayor} (${best.r.regionName}) on ${names[best.k]}`, hint: "Check the latest decade report in 📊 Rivals to see what they did well." };
    },
    progress: (w, A, o) => {
      const r = w.rivals.find((x) => x.region === o.rival);
      const me = w.yearly[w.yearly.length - 1] || {};
      const gap = Math.round((r?.m[o.metric] ?? 0) - (me[o.metric] ?? 0));
      return { cur: -gap, target: 0, done: gap < 0, gap: true };
    },
  },
  crisisJobs: {
    make(w, A) {
      if (!w.crisis) return null;
      return { key: "crisisJobs", target: 8, months: Math.max(6, w.crisis.until - w.t), score: 80, text: "Keep unemployment under 8% until the crisis ends", hint: "Zone jobs and keep services funded. Survive to the end of the crisis.", untilEnd: true };
    },
    progress: (w, A, o) => ({ cur: Math.round(A.unemployment * 1000) / 10, target: 8, done: !w.crisis && A.unemployment < 0.08, fail: A.unemployment >= 0.08, lower: true, pct: true }),
  },
};

function hintFor(k) {
  const h = {
    housing: "Upgrade or rebuild old blocks with 🏗️ Renew, and raise estate maintenance in 💰 Finances.",
    food: "Build a wet market or hawker centre near the homes.",
    school: "Build primary and secondary schools near the homes; one polytechnic or university serves a wide area.",
    health: "Build a polyclinic or hospital near the homes.",
    safety: "Build a police post and fire station.",
    transport: "Add a bus interchange, or MRT from 1987.",
    green: "Build a park, plant trees or a sports complex.",
    community: "Build a community centre or sports complex.",
    environment: "Move factories away from homes; plant trees between them.",
  };
  return h[k] || "";
}

// Money targets earn reputation; trust comes from doing things for residents.
export const REWARD = (w, o) => {
  const money = o.kind === "surplus" || o.kind === "reserves";
  return { cash: Math.round(300 * scaleOf(w) * (o.months / 48)), trust: money ? 0 : 3, rep: money ? 4 : 2 };
};

// keep up to 3 objectives active once the starter goals are mostly done
export function stepObjectives(w, A, push) {
  const starterLeft = w.starterLeft ?? 99;
  if (starterLeft > 3 && w.t < 120) return;
  w.objectives = w.objectives || [];
  w.objCool = w.objCool || {};
  for (const o of w.objectives) {
    if (o.status !== "open") continue;
    const P = OBJECTIVES[o.kind]?.progress(w, A, o);
    if (!P) continue;
    o.cur = P.cur;
    if (P.done) {
      o.status = "done";
      const R0 = o.reward || REWARD(w, o);
      // the bonus varies: the panel shows the range
      const R = { cash: Math.round(rollIn(R0.cash, Math.random, 1e9)), trust: rollIn(R0.trust), rep: rollIn(R0.rep) };
      w.cash += R.cash;
      w.trust = clamp(w.trust + R.trust, 0, 100);
      w.rep = clamp((w.rep ?? 50) + R.rep, 0, 100);
      w.objCool[o.key] = w.t + 36;
      push(`🎯 Objective complete: ${o.text}. Bonus grant of $${fmt(R.cash)}K${R.trust >= 0.5 ? `, trust +${Math.round(R.trust)}` : ""}, reputation +${Math.round(R.rep)}.`);
      w.log.push({ year: w.year, text: o.text.toLowerCase(), tone: "good" });
    } else if (w.t >= o.deadline || P.fail) {
      o.status = "missed";
      w.rep = clamp((w.rep ?? 50) - 1, 0, 100);
      w.objCool[o.key] = w.t + 24;
      push(`⌛ Objective missed: ${o.text}.`);
    }
  }
  // tidy: keep the last 12 finished ones
  const open = w.objectives.filter((o) => o.status === "open");
  const closed = w.objectives.filter((o) => o.status !== "open").slice(-12);
  w.objectives = [...closed, ...open];
  if (open.length >= 3) return;
  const cands = [];
  for (const [kind, K] of Object.entries(OBJECTIVES)) {
    const c = K.make(w, A);
    if (!c) continue;
    if (open.some((o) => o.key === c.key || o.kind === kind)) continue;
    if ((w.objCool[c.key] || 0) > w.t) continue;
    cands.push({ ...c, kind });
  }
  cands.sort((a, b) => b.score - a.score);
  for (const c of cands.slice(0, 3 - open.length)) {
    const o = { ...c, id: (w.nextId = (w.nextId || 1) + 1), made: w.t, deadline: w.t + c.months, status: "open" };
    o.reward = REWARD(w, o);
    w.objectives.push(o);
    if (w.t > 1) push(`🎯 New objective: ${o.text}.`);
  }
}

export const objectiveProgress = (w, A, o) => OBJECTIVES[o.kind]?.progress(w, A, o);

