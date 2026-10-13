// Monthly simulation for Lion City Mayor: construction, ageing, demand, town
// happiness and feedback, money, elections and pledges.
import { LOT_TYPES, ZONE_LINE, STRUCTS, ROAD_TYPES, NEEDS, COMPLAINTS, PRAISE, MONTHS, GLOBAL_EVENTS, RANDOM_EVENTS, KAMPONG, diffOf, TERM_YEARS } from "./defs.js";
import { REGIONS } from "./regions.js";
import { terrainAt, segPts, townOf, latestType, refillLots } from "./world.js";
import { dist, clamp, polyLength, nearestOnPoly, makeRng } from "./geom.js";
import { residents, housingByTown, displace } from "./housing.js";
import { townTfr, townLife, baseTfr, lifeIndex, tfrIndex, financeIndex } from "./society.js";
import { stepEvents, EFFECT_ADD, autoDecide } from "./events.js";
import { stepObjectives } from "./objectives.js";
import { initRivals, stepRivals, decadeReport, finalReport } from "./rivals.js";

export const MODES = {
  campaign: { name: "Campaign", icon: "🗳️", desc: "Win elections to stay mayor. Play as long as you like." },
  sandbox: { name: "Sandbox", icon: "🏖️", desc: "Relaxed: you can't be voted out or go bust. Keep building forever." },
  legacy100: { name: "100-year legacy", icon: "🏛️", desc: "1965–2065. Be the best mayor you can, judged every decade against AI mayors.", years: 100 },
  legacy200: { name: "200-year legacy", icon: "👑", desc: "1965–2165. The long game: two centuries of crises, booms and elections.", years: 200 },
};
export const modeOf = (w) => MODES[w.mode] || MODES.campaign;
const canLose = (w) => w.mode !== "sandbox" && !w.sandbox;

// Fill in anything an older save is missing.
export function ensureWorld(w) {
  if (w.v2) return w;
  w.v2 = true;
  w.mode = w.mode || "campaign";
  if (modeOf(w).years && !w.endYear) w.endYear = 1965 + modeOf(w).years;
  w.policy = w.policy || {};
  w.boosts = w.boosts || [];
  w.followups = w.followups || [];
  w.dilemmaLog = w.dilemmaLog || [];
  w.crisesPast = w.crisesPast || [];
  w.log = w.log || [];
  w.objectives = w.objectives || [];
  w.fin = w.fin || [];
  w.yearly = w.yearly || [];
  w.reports = w.reports || [];
  w.rep = w.rep ?? 55;
  w.tfrLag = w.tfrLag ?? baseTfr(w.year - 20);
  w.nextDilemma = w.nextDilemma ?? w.t + 8;
  const rng = makeRng((w.seed || 1) + 7);
  // past 2026 the future is unwritten: imagined crises at random times
  w.nextFuture = w.nextFuture ?? (2027 - 1965) * 12 + Math.floor(rng() * 120);
  for (const t of w.towns) {
    t.maint = t.maint ?? 100;
    t.scc = t.scc ?? 100;
  }
  // past crises the save has already lived through don't happen again
  if (!w.crisesPast.length && w.year > 1966) {
    for (const [id, y] of [["withdrawal", 1968], ["oil", 1973], ["recession85", 1985], ["afc", 1997], ["sars", 2003], ["gfc", 2008], ["covid", 2020]]) if (w.year > y) w.crisesPast.push({ id, year: y, score: 50, skipped: true });
  }
  if (!w.rivals) initRivals(w, rng);
  if (!w.term) newTerm(w);
  return w;
}

// The central government's block grant for a term, fixed for six years.
function newTerm(w) {
  const D = diffOf(w);
  const base = (w.stats?.pop || 0) + w.waitlist * 0.6 + (w.kampongs || []).reduce((a, k) => a + k.houses.length * KAMPONG.housePop, 0) * (w.stats?.pop ? 0 : 1);
  const block = Math.round((base * 0.002 * 1.25 + 120) * D.income);
  const end = w.election.next;
  w.term = { start: w.t, end, block, months: end - w.t, total: block * (end - w.t) };
}

export const dateLabel = (w) => `${MONTHS[w.month]} ${w.year}`;
export const tToDate = (w, t) => {
  const m = w.month + (t - w.t);
  const y = w.year + Math.floor(m / 12);
  return `${MONTHS[((m % 12) + 12) % 12]} ${y}`;
};
export const isUnlocked = (w, year) => w.sandbox || !year || w.year >= year;

export function fmtMoney(k) {
  const neg = k < 0;
  const v = Math.abs(k);
  let s;
  if (v >= 1e6) s = `$${(v / 1e6).toFixed(v >= 1e7 ? 1 : 2)}B`;
  else if (v >= 1000) s = `$${(v / 1000).toFixed(v >= 1e4 ? 1 : 2)}M`;
  else s = `$${Math.round(v)}K`;
  return neg ? `-${s}` : s;
}
export const fmtNum = (n) => Math.round(n).toLocaleString("en-SG");

function pushNews(w, text) {
  w.news.unshift({ t: w.t, date: dateLabel(w), text });
  if (w.news.length > 50) w.news.length = 50;
}

// Effective housing quality of a building, accounting for age and upgrades.
export function quality(w, b) {
  const T = LOT_TYPES[b.type];
  if (!T.q) return 50;
  const since = b.up && b.up > b.built ? b.up : b.built;
  const age = b.wear != null ? b.wear / 12 : Math.max(0, (w.t - since) / 12);
  return clamp(T.q + (b.up ? 8 : 0) - Math.max(0, age - 18) * 0.9, 8, 100);
}
export const ageYears = (w, b) => Math.max(0, Math.floor((w.t - b.built) / 12));

// ---------- analysis ----------
const COVERS = ["food", "school", "health", "safety", "fire", "community", "green", "transport", "mrt"];

export function analyze(w) {
  const fund = clamp(w.funding / 100, 0, 1.2);
  // active services
  const services = [];
  let tourism = 0;
  let trade = REGIONS[w.region].causewayTrade || 0;
  let structJobs = 0;
  const landmarks = [];
  const polluters = [];
  let upkeep = 0;
  const upkeepTown = w.towns.map(() => 0);
  const rails = w.segs.filter((s) => ROAD_TYPES[s.type].rail);
  const stations = [];
  for (const s of w.structs) {
    const S = STRUCTS[s.type];
    if (!S.fixed && S.upkeep) {
      upkeep += S.upkeep * fund;
      upkeepTown[townOf(w, s.x, s.y)] += S.upkeep * fund;
    }
    if (s.type === "mrt") {
      const nearRail = rails.some((r) => nearestOnPoly(segPts(w, r), s.x, s.y).d < 2.6);
      if (!nearRail) continue;
      stations.push(s);
    }
    if (S.cover) services.push({ x: s.x, y: s.y, cover: S.cover, r: S.r, f: fund, type: s.type });
    if (s.type === "sports") services.push({ x: s.x, y: s.y, cover: "community", r: S.r, f: fund });
    if (S.tourism) tourism += S.tourism;
    if (S.trade) trade += S.trade;
    if (S.jobs) structJobs += S.jobs;
    if (S.landmark) landmarks.push(s);
    if (S.poll) polluters.push({ x: s.x, y: s.y, p: S.poll, r: 8 });
  }
  const mrtRunning = stations.length >= 2;
  let roadLen = 0;
  for (const s of w.segs) {
    const pts = segPts(w, s);
    const len = polyLength(pts) * (ROAD_TYPES[s.type].rail ? 3 : 1);
    roadLen += len;
    const mi = Math.floor(pts.length / 4) * 2;
    upkeepTown[townOf(w, pts[mi], pts[mi + 1])] += len * 0.12 * fund;
  }
  upkeep += roadLen * 0.12 * fund;

  const lotsLive = w.lots.filter((l) => l.b && l.b.state !== "build");
  const comLots = lotsLive.filter((l) => l.zone === "com");
  for (const l of lotsLive) {
    const T = LOT_TYPES[l.b.type];
    if (T.poll) polluters.push({ x: l.x, y: l.y, p: T.poll, r: 5 });
    if (l.b.conserved) tourism += 25;
  }

  const coverAt = (x, y) => {
    const c = {};
    for (const k of COVERS) c[k] = 0;
    for (const s of services) {
      const d = dist(x, y, s.x, s.y);
      if (d > s.r) continue;
      if (s.cover === "mrt" && !mrtRunning) continue;
      const v = s.f * (1 - 0.45 * (d / s.r));
      if (v > c[s.cover]) c[s.cover] = v;
    }
    return c;
  };
  const pollAt = (x, y) => {
    let p = 0;
    for (const q of polluters) {
      const d = dist(x, y, q.x, q.y);
      if (d < q.r) p += q.p * (1 - d / q.r) * 0.6;
    }
    return clamp(p, 0, 100);
  };
  const avenueNear = new Set(w.segs.filter((s) => s.type === "avenue").map((s) => s.id));

  // per-lot desirability
  const info = new Map();
  for (const l of w.lots) {
    const c = coverAt(l.x, l.y);
    const p = pollAt(l.x, l.y);
    let green = c.green;
    let wet = 0;
    for (let a = 0; a < 6; a++) {
      const t = terrainAt(w, l.x + Math.cos(a) * 2.6, l.y + Math.sin(a) * 2.6);
      if (t === "sea" || t === "fresh") wet = 1;
    }
    let comNear = 0;
    for (const cl of comLots) if (Math.abs(cl.x - l.x) < 4 && Math.abs(cl.y - l.y) < 4) comNear++;
    let lm = 0;
    for (const s of landmarks) {
      const d = dist(l.x, l.y, s.x, s.y);
      if (d < 12) lm += 14 * (1 - d / 12);
    }
    const transport = Math.max(c.mrt, c.transport * 0.75, 0.3) + (avenueNear.has(l.seg) ? 0.1 : 0);
    const lv = clamp(24 + wet * 9 + green * 12 + c.mrt * 18 + c.transport * 5 + c.health * 4 + c.school * 4 + c.safety * 5 + Math.min(16, comNear * 1.4) + lm - p * 0.6, 0, 100);
    info.set(l.id, { c, p, lv, transport });
  }
  const want = (l, zone) => {
    const I = info.get(l.id);
    const c = I.c;
    switch (zone) {
      case "hdb":
        return 16 + I.lv * 0.35 + c.food * 10 + c.school * 8 + c.health * 6 + I.transport * 12 + c.community * 5 - I.p * 0.3;
      case "pte":
        return I.lv * 0.9 + c.school * 5 + c.green * 5 - I.p * 0.4;
      case "com":
        return I.lv * 0.7 + I.transport * 18 + Math.min(8, comLots.length * 0.1);
      case "ind":
        return 18 + I.transport * 22 + Math.min(14, (w.stats.pop || 0) / 3000) + (REGIONS[w.region].indBoost || 0) * 30;
      default:
        return 0;
    }
  };

  // towns: residents' needs
  const T = w.towns.map(() => ({ pop: 0, kpop: 0, jobs: 0, sum: Object.fromEntries(Object.keys(NEEDS).map((k) => [k, 0])), lots: 0, old: 0, cap: 0, vacant: 0, hdbCap: 0, hdbOcc: 0 }));
  const healthHit = effect(w, "health");
  let pop = 0;
  let comJobs = 0;
  let indJobs = 0;
  let hdbPop = 0;
  let ptePop = 0;
  let kampongPop = 0;
  const addRes = (ti, n, c, p, q, transport) => {
    const t = T[ti];
    t.pop += n;
    t.sum.housing += n * q;
    t.sum.food += n * Math.min(1, c.food * 1.2) * 100;
    t.sum.school += n * Math.min(1, c.school * 1.2) * 100;
    t.sum.health += n * Math.min(1, c.health * 1.2 + 0.08) * 100 * (c.health > 0 ? 1 - (1 - healthHit) * 0.4 : healthHit);
    t.sum.safety += n * Math.min(1, (c.safety * 0.7 + c.fire * 0.3) * 1.25) * 100;
    t.sum.transport += n * Math.min(1, transport) * 100;
    t.sum.green += n * Math.min(1, c.green * 1.3 + 0.15) * 100;
    t.sum.community += n * Math.min(1, c.community * 1.2 + 0.1) * 100;
    t.sum.environment += n * clamp(100 - p * 1.6, 0, 100);
  };
  for (const l of lotsLive) {
    const Ty = LOT_TYPES[l.b.type];
    const I = info.get(l.id);
    if (Ty.cap) {
      const n = residents(l.b);
      T[l.town].cap += Ty.cap;
      T[l.town].vacant += Ty.cap - n;
      if (Ty.zone === "hdb") {
        T[l.town].hdbCap += Ty.cap;
        T[l.town].hdbOcc += n;
      }
      pop += n;
      if (Ty.zone === "hdb") hdbPop += n;
      else if (Ty.zone === "pte") ptePop += n;
      addRes(l.town, n, I.c, I.p, quality(w, l.b), I.transport);
      if (Ty.q && quality(w, l.b) < 45) T[l.town].old++;
    }
    if (Ty.jobs) {
      if (Ty.zone === "com") comJobs += Ty.jobs;
      else indJobs += Ty.jobs;
      T[l.town].jobs += Ty.jobs;
    }
  }
  for (const k of w.kampongs) {
    const n = k.houses.length * KAMPONG.housePop;
    kampongPop += n;
    pop += n;
    T[k.town].kpop += n;
    const c = coverAt(k.x, k.y);
    addRes(k.town, n, c, pollAt(k.x, k.y), k.q, 0.2);
  }
  const jobs = (comJobs + indJobs + structJobs) * effect(w, "jobs");
  const workforce = pop * 0.5;
  // some people commute to jobs in other regions
  const unemployment = workforce > 0 ? Math.max(0, workforce - jobs - workforce * 0.3) / workforce : 0;
  const pteShare = pop ? ptePop / pop : 0;
  const costNeed = clamp(100 - Math.max(0, w.taxes.property - 8) * 4 - Math.max(0, pteShare - 0.3) * 120 + (w.hdbGrant - 50) * 0.25, 0, 100);
  // a young region gives its new mayor some benefit of the doubt
  const grace = Math.min(1, pop / 30000);
  // families still waiting for a home are voters too, and unhappy ones
  const unhoused = w.waitlist / Math.max(1, pop + w.waitlist);
  const uw = unhoused * Math.min(0.6, w.t / 120);
  const mood = effectAdd(w, "mood");
  const towns = T.map((t, i) => {
    const town = w.towns[i];
    const needs = {};
    for (const k of Object.keys(NEEDS)) needs[k] = t.pop ? t.sum[k] / t.pop : 50;
    needs.jobs = pop ? clamp(100 - unemployment * 260, 0, 100) : 50;
    // estate upkeep paid for by S&CC charges
    const maint = (town.maint ?? 100) / 100;
    const scc = (town.scc ?? 100) / 100;
    needs.cost = clamp(costNeed - (scc - 1) * 18, 0, 100);
    if (t.hdbCap) needs.housing = clamp(needs.housing + (maint - 1) * 10, 0, 100);
    for (const b of w.boosts || []) if (b.town === i && needs[b.need] != null) needs[b.need] = clamp(needs[b.need] + b.v, 0, 100);
    let tw = 0;
    let ta = 0;
    for (const [k, nd] of Object.entries(NEEDS)) {
      tw += nd.weight;
      ta += nd.weight * needs[k];
    }
    needs.housing = needs.housing * (1 - unhoused * 0.7) + 10 * unhoused * 0.7;
    const base = t.pop ? 60 * (1 - grace) + (ta / tw) * grace : 55;
    return { ...t, needs, unhoused, happy: clamp(base * (1 - uw) + 15 * uw + mood, 0, 100) };
  });
  const vacant = T.reduce((a, t) => a + t.vacant, 0);
  return { info, want, towns, vacant, upkeepTown, pop, hdbPop, ptePop, kampongPop, comJobs, indJobs, structJobs, jobs, workforce, unemployment, tourism, trade, upkeep, roadLen, mrtRunning, stations, coverAt, pollAt, services };
}

export function effect(w, key) {
  if (EFFECT_ADD.includes(key)) return effectAdd(w, key);
  let m = 1;
  for (const e of w.effects) if (typeof e.effect?.[key] === "number") m *= e.effect[key];
  return m;
}
const effectAdd = (w, key) => w.effects.reduce((a, e) => a + (e.effect?.[key] || 0), 0);

// ---------- budget ----------
// ov: what-if overrides { property, funding, maint: [..], scc: [..] }
export function monthlyBudget(w, A, ov = null) {
  const D = diffOf(w);
  const n = w.towns.length;
  const taxP = ov?.property ?? w.taxes.property;
  const fundK = ov?.funding != null ? ov.funding / Math.max(1, w.funding) : 1;
  const z = () => w.towns.map(() => 0);
  const T = { property: z(), business: z(), scc: z(), grant: z(), tourism: z(), trade: z(), schemes: z(), landSales: z(), hdbSales: z() };
  const X = { services: z(), maintenance: z(), hdbBuild: z(), policies: z(), construction: z() };
  const biz = effect(w, "business");
  const hdbOcc = z();
  const hdbCap = z();
  for (const l of w.lots) {
    if (!l.b || l.b.state === "build") continue;
    const Ty = LOT_TYPES[l.b.type];
    const lv = 0.5 + (A.info.get(l.id)?.lv || 30) / 100;
    if (Ty.cap) {
      const occ = residents(l.b);
      T.property[l.town] += occ * lv * (Ty.zone === "pte" ? 0.012 : 0.003) * (taxP / 10) * D.income;
      if (Ty.zone === "hdb") {
        hdbOcc[l.town] += occ;
        hdbCap[l.town] += Ty.cap;
      }
    }
    if (Ty.jobs) T.business[l.town] += Ty.jobs * lv * 0.004 * D.income * biz;
  }
  const pops = A.towns.map((t) => t.pop + t.kpop);
  const tp = pops.reduce((a, b) => a + b, 0);
  const share = (i) => (tp ? pops[i] / tp : 1 / n);
  const block = w.term?.block ?? (A.pop * 0.0035 + 120) * D.income;
  const grant = block + A.pop * 0.0015 * D.income;
  const tourism = A.tourism * 0.5 * Math.min(1, A.pop / 40000 + 0.3) * effect(w, "tourism");
  const trade = A.trade * 0.4 * effect(w, "trade");
  const land = effect(w, "land");
  const upk = effect(w, "upkeep");
  const policy = Math.max(0, w.policy?.monthly || 0);
  const scheme = Math.max(0, -(w.policy?.monthly || 0));
  const pend = w.pending?.towns;
  for (let i = 0; i < n; i++) {
    const maint = (ov?.maint?.[i] ?? w.towns[i].maint ?? 100) / 100;
    const scc = (ov?.scc?.[i] ?? w.towns[i].scc ?? 100) / 100;
    T.scc[i] = hdbOcc[i] * 0.006 * scc;
    T.grant[i] = grant * share(i);
    T.tourism[i] = tourism * share(i);
    T.trade[i] = trade * share(i);
    T.landSales[i] = (pend?.[i]?.land || 0) * land;
    T.hdbSales[i] = (pend?.[i]?.hdbSales || 0) * land;
    X.services[i] = (A.upkeepTown?.[i] || 0) * upk * fundK;
    X.maintenance[i] = hdbCap[i] * 0.005 * maint * upk;
    X.hdbBuild[i] = pend?.[i]?.hdbBuild || 0;
    X.policies[i] = policy * share(i);
    T.schemes[i] = scheme * share(i);
    X.construction[i] = w.spend?.towns?.[i] || 0;
  }
  const sum = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0)]));
  const rev = sum(T);
  const exp = sum(X);
  const towns = w.towns.map((_, i) => ({
    rev: Object.fromEntries(Object.entries(T).map(([k, v]) => [k, v[i]])),
    exp: Object.fromEntries(Object.entries(X).map(([k, v]) => [k, v[i]])),
  }));
  return { rev, exp, towns };
}
const LUMPY_REV = ["landSales", "hdbSales"];
const LUMPY_EXP = ["hdbBuild", "construction"];
const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const recurRev = (o) => total(o) - LUMPY_REV.reduce((a, k) => a + (o[k] || 0), 0);
const recurExp = (o) => total(o) - LUMPY_EXP.reduce((a, k) => a + (o[k] || 0), 0);
const lumpyNet = (B) => LUMPY_REV.reduce((a, k) => a + (B.rev[k] || 0), 0) - LUMPY_EXP.reduce((a, k) => a + (B.exp[k] || 0), 0);

// Project the budget forward using current settings (or what-if overrides).
export function projectFinance(w, A, ov = null, months = 72) {
  const B = monthlyBudget(w, A, ov);
  const recent = w.fin.slice(-12);
  const avgL = recent.length ? recent.reduce((a, f) => a + f.l, 0) / recent.length : 0;
  // growth: homes being built and empty flats fill up, then the trend
  const H = housingByTown(w);
  const pipe = H.reduce((a, h) => a + h.building, 0);
  const fillable = Math.min(pipe + A.vacant, w.waitlist + pipe * 0.5);
  const pop = Math.max(1, A.pop);
  const h = w.history;
  const past = h.length > 24 ? h[h.length - 25].pop : h[0]?.pop || pop;
  const trend = clamp(past > 0 ? Math.pow(pop / past, 1 / Math.min(24, h.length || 1)) - 1 : 0, -0.008, 0.012);
  // crisis drag that will lift when it ends
  const until = w.crisis ? w.crisis.until : -1;
  const recov = (k) => 1 / Math.max(0.2, effect(w, k));
  const recur = (side) => Object.fromEntries(Object.entries(B[side]).filter(([k]) => !LUMPY_REV.includes(k) && !LUMPY_EXP.includes(k)));
  const rr = recur("rev");
  const re = recur("exp");
  const out = [];
  const towns = w.towns.map(() => []);
  let cash = w.cash;
  for (let k = 1; k <= months; k++) {
    const t = w.t + k;
    const gf = 1 + (fillable / pop) * Math.min(1, k / 18) + (Math.pow(1 + trend, k) - 1) * 0.7;
    const after = until > 0 && t >= until;
    let r = 0;
    for (const [key, v] of Object.entries(rr)) {
      let x = v;
      if (key === "property" || key === "scc" || key === "business" || key === "tourism") x *= gf;
      if (key === "grant") x = (w.term?.block || 0) + (v - (w.term?.block || 0)) * gf;
      if (after && key === "business") x *= recov("business");
      if (after && key === "tourism") x *= recov("tourism");
      if (after && key === "trade") x *= recov("trade");
      r += x;
    }
    let e = 0;
    for (const [key, v] of Object.entries(re)) e += key === "maintenance" ? v * (1 + (gf - 1) * 0.8) : key === "services" && after ? v / recov("upkeep") : v;
    const lump = avgL * Math.max(0.3, 1 - k / 60);
    cash += r - e + lump;
    out.push({ t, r, e, c: cash });
    w.towns.forEach((_, i) => {
      const tr = total(B.towns[i].rev) - LUMPY_REV.reduce((a, q) => a + B.towns[i].rev[q], 0);
      const te = total(B.towns[i].exp) - LUMPY_EXP.reduce((a, q) => a + B.towns[i].exp[q], 0);
      const rec = after ? 1 + (recov("business") - 1) * (B.towns[i].rev.business / Math.max(1, tr)) : 1;
      towns[i].push({ t, r: tr * gf * rec, e: te * (1 + (gf - 1) * 0.6) });
    });
  }
  return { region: out, towns, budget: B };
}

export const REV_LABELS = {
  property: "🏠 Property tax",
  scc: "🧹 S&CC charges",
  business: "🏢 Business tax",
  grant: "🏛️ Government grant",
  tourism: "📸 Tourism",
  trade: "⚓ Trade",
  schemes: "🚦 Road pricing & resort levies",
  landSales: "📜 Land sales",
  hdbSales: "🔑 HDB flat sales",
};
export const EXP_LABELS = {
  services: "🛠️ Services & roads upkeep",
  maintenance: "🧽 Estate maintenance",
  hdbBuild: "🏗️ HDB construction",
  policies: "📋 Ongoing schemes",
  construction: "🚧 Projects & compensation",
};

// ---------- pledges ----------
const hasNewStruct = (w, p, types, town) => w.structs.some((s) => types.includes(s.type) && s.built >= p.made && (town == null || townOf(w, s.x, s.y) === town));
export const PLEDGE_KINDS = {
  clinic: { icon: "🩺", text: (t) => `A polyclinic for ${t}`, need: "health", boost: 6, years: 4, check: (w, p) => hasNewStruct(w, p, ["clinic", "hospital"], p.town) },
  food: { icon: "🍜", text: (t) => `A hawker centre or market for ${t}`, need: "food", boost: 5, years: 3, check: (w, p) => hasNewStruct(w, p, ["hawker", "market", "causewayPoint"], p.town) },
  school: { icon: "🏫", text: (t) => `A new school in ${t}`, need: "school", boost: 5, years: 4, check: (w, p) => hasNewStruct(w, p, ["school", "scienceCentre"], p.town) },
  cc: { icon: "🏓", text: (t) => `A community centre for ${t}`, need: "community", boost: 4, years: 3, check: (w, p) => hasNewStruct(w, p, ["cc", "sports", "tampinesHub", "esplanade"], p.town) },
  transport: { icon: "🚌", text: (t) => `Better transport for ${t}`, need: "transport", boost: 6, years: 4, check: (w, p) => hasNewStruct(w, p, w.year >= 1987 ? ["mrt", "bus"] : ["bus"], p.town) },
  homes: { icon: "🏢", text: (t, n) => `${fmtNum(n)} more residents housed in ${t}`, need: "housing", boost: 7, years: 5, check: (w, p) => (w.towns[p.town].pop || 0) >= p.base + p.n },
  upgrade: { icon: "🔧", text: (t) => `Upgrade or rebuild 3 old blocks in ${t}`, need: "housing", boost: 6, years: 5, minYear: 1989, check: (w, p) => w.lots.filter((l) => l.town === p.town && l.b && ((l.b.up && l.b.up >= p.made) || (l.b.renewed && l.b.built >= p.made))).length >= 3 },
  park: { icon: "🌳", text: () => "A new park in every town", need: "green", boost: 3, years: 4, all: true, check: (w, p) => w.towns.every((_, i) => hasNewStruct(w, p, ["park", "sports", "gardensBay", "eastCoastPark", "sungeiBuloh", "birdPark"], i)) },
  taxfreeze: { icon: "🧾", text: () => "No property tax rise this term", need: "cost", boost: 3, years: 6, all: true, keepUntilDeadline: true, broken: (w, p) => w.taxes.property > p.base },
  nokampong: { icon: "🏚️", text: (t) => `No more kampong resettlement in ${t} this term`, need: null, boost: 4, years: 6, keepUntilDeadline: true, broken: (w, p) => (w.resettledThisTerm || []).includes(p.town) },
};

export function pledgeOffers(w, A) {
  const offers = [];
  const towns = A.towns.map((t, i) => ({ i, t })).filter((x) => x.t.pop > 0);
  for (const [kind, K] of Object.entries(PLEDGE_KINDS)) {
    if (K.minYear && w.year < K.minYear) continue;
    if (kind === "nokampong") {
      for (const k of w.kampongs) if (!offers.some((o) => o.kind === kind)) offers.push({ kind, town: k.town, score: 30 });
      continue;
    }
    if (K.all) {
      offers.push({ kind, town: null, score: K.need ? 100 - A.towns.reduce((a, t) => a + t.needs[K.need], 0) / A.towns.length : 30 });
      continue;
    }
    for (const { i, t } of towns) offers.push({ kind, town: i, score: 100 - (t.needs[K.need] ?? 50) + (kind === "homes" ? 10 : 0) });
  }
  offers.sort((a, b) => b.score - a.score);
  const picked = [];
  for (const o of offers) {
    if (picked.length >= 6) break;
    if (picked.some((p) => p.kind === o.kind)) continue;
    picked.push(o);
  }
  return picked.map((o) => describePledge(w, A, o));
}

function describePledge(w, A, o) {
  const K = PLEDGE_KINDS[o.kind];
  const tname = o.town != null ? w.towns[o.town].name : "every town";
  const n = o.kind === "homes" ? Math.max(1000, Math.round(((A.towns[o.town]?.pop || 2000) * 0.4) / 500) * 500) : 0;
  return { kind: o.kind, town: o.town, n, icon: K.icon, text: K.text(tname, n), boost: K.boost, years: K.years, all: !!K.all };
}

export function makePledge(w, offer) {
  if ((w.pledges || []).filter((p) => p.status === "open" && p.term === w.election.next).length >= 3) return { ok: false, msg: "You can make up to 3 pledges per election." };
  const K = PLEDGE_KINDS[offer.kind];
  const p = {
    id: (w.nextId = (w.nextId || 1) + 1),
    kind: offer.kind,
    town: offer.town,
    n: offer.n,
    text: offer.text,
    icon: offer.icon,
    boost: offer.boost,
    made: w.t,
    deadline: w.t + K.years * 12,
    base: offer.kind === "homes" ? w.towns[offer.town].pop : offer.kind === "taxfreeze" ? w.taxes.property : 0,
    status: "open",
    term: w.election.next,
  };
  w.pledges.push(p);
  pushNews(w, `📣 You pledged: ${p.text} (by ${tToDate(w, p.deadline)}).`);
  return { ok: true };
}

function checkPledges(w) {
  for (const p of w.pledges) {
    if (p.status !== "open") continue;
    const K = PLEDGE_KINDS[p.kind];
    const towns = p.town != null ? [p.town] : w.towns.map((_, i) => i);
    if (K.broken && K.broken(w, p)) {
      p.status = "broken";
      w.trust = clamp(w.trust - 12, 0, 100);
      for (const i of towns) w.towns[i].anger += 1.2;
      pushNews(w, `💔 Broken promise: "${p.text}". Voters remember!`);
      continue;
    }
    if (!K.keepUntilDeadline && K.check(w, p)) {
      p.status = "kept";
      w.trust = clamp(w.trust + 6, 0, 100);
      for (const i of towns) w.towns[i].anger = Math.max(0, w.towns[i].anger - 0.8);
      pushNews(w, `✅ Promise kept: "${p.text}". Trust in you rises.`);
      continue;
    }
    if (w.t >= p.deadline) {
      if (K.keepUntilDeadline) {
        p.status = "kept";
        w.trust = clamp(w.trust + 5, 0, 100);
        pushNews(w, `✅ Promise kept: "${p.text}".`);
      } else {
        p.status = "broken";
        w.trust = clamp(w.trust - 12, 0, 100);
        for (const i of towns) w.towns[i].anger += 1.2;
        pushNews(w, `💔 Deadline missed: "${p.text}". Trust in you falls.`);
      }
    }
  }
}

export const inSeason = (w) => w.t >= w.election.next - 6 && w.t < w.election.next;
export const monthsToElection = (w) => w.election.next - w.t;

// support % for a town if the vote were held now
export function townSupport(w, i) {
  const t = w.towns[i];
  let s = t.approval * 0.7 + 20 + (w.trust - 60) * 0.35 - t.anger * 3.5 + effectAdd(w, "mood");
  for (const p of w.pledges || []) if (p.status === "open" && p.term === w.election.next && (p.town === i || p.town == null)) s += p.boost;
  return clamp(s, 2, 98);
}

function holdElection(w, rng) {
  const D = diffOf(w);
  let votes = 0;
  let total = 0;
  const results = w.towns.map((t, i) => {
    const swing = (rng() - 0.5) * 6;
    const pct = clamp(townSupport(w, i) + swing, 1, 99);
    const voters = Math.max(1, t.pop);
    votes += pct * voters;
    total += voters;
    return { name: t.name, pct: Math.round(pct), won: pct >= 50 };
  });
  const share = total ? votes / total : 50;
  const won = share >= 50;
  const rec = { year: w.year, share: Math.round(share * 10) / 10, results, won };
  w.election.history.push(rec);
  w.election.last = rec;
  w.election.next += TERM_YEARS * 12;
  w.resettledThisTerm = [];
  if (won) {
    w.trust = clamp(w.trust + 3, 0, 100);
    pushNews(w, `🗳️ ${w.year} election: you won ${rec.share}% of the vote! Next election in ${TERM_YEARS} years.`);
  } else if (D.voteMin && canLose(w)) {
    w.gameOver = { reason: "election", text: `You lost the ${w.year} election with ${rec.share}% of the vote. A new mayor takes over ${w.name}.` };
    if (w.yearly.length) w.gameOver.final = finishReports(w);
  } else {
    w.trust = clamp(w.trust - 5, 0, 100);
    pushNews(w, `🗳️ ${w.year} election: only ${rec.share}% voted for you. ${w.mode === "sandbox" ? "In Sandbox" : "On Easy"} you stay on, but residents want change!`);
  }
  w.log.push({ year: w.year, text: `${won ? "won" : "lost"} the ${w.year} election with ${rec.share}%`, tone: won ? "good" : "bad" });
  w.rep = clamp((w.rep ?? 50) + (share - 50) * 0.15, 0, 100);
  newTerm(w);
  const termM = w.term.months;
  pushNews(w, `🏛️ New term budget: the government's block grant is ${fmtMoney(w.term.block)} a month (${fmtMoney(w.term.block * termM)} over ${Math.round(termM / 12)} years), plus a grant per resident.`);
  w.election.justHeld = rec;
}

// ---------- monthly step ----------
export const wearRate = (maint) => {
  const m = maint / 100;
  return m <= 1 ? 2 - m : Math.max(0.4, 1 - 0.8 * (m - 1));
};

function finishReports(w) {
  const lastTo = w.reports.length ? w.reports[w.reports.length - 1].to + 1 : 1965;
  if (w.year - lastTo >= 3) {
    const r = decadeReport(w, lastTo, w.year + 1);
    if (r) w.reports.push(r);
  }
  return finalReport(w);
}

export function stepMonth(w, rng = Math.random) {
  if (w.gameOver) return null;
  ensureWorld(w);
  if (w.decision) return null; // waiting for the mayor to decide
  const D = diffOf(w);
  const nT = w.towns.length;
  const pend = { land: 0, hdbSales: 0, hdbBuild: 0, towns: w.towns.map(() => ({ land: 0, hdbSales: 0, hdbBuild: 0 })) };
  w.pending = pend;
  const push = (text) => pushNews(w, text);
  let A = analyze(w);
  w.election.justHeld = null;
  w.boosts = w.boosts.filter((b) => b.until > w.t);

  // finish construction and upgrades; buildings age with wear
  for (const l of w.lots) {
    const b = l.b;
    if (!b) continue;
    const T = LOT_TYPES[b.type];
    if (b.state === "build" && w.t >= b.until) {
      b.state = "live";
      b.built = w.t;
      b.wear = 0;
      if (T.cap) b.occ = 0; // flats are empty until families move in
      w.trees = w.trees.filter((t) => !(Math.abs(t[0] - l.x) < 1 && Math.abs(t[1] - l.y) < 1));
    } else if (b.state === "upgrade" && w.t >= b.until) {
      b.state = "live";
      b.up = w.t;
      b.wear = 0;
    } else if (b.state !== "build" && T.q) {
      if (b.wear == null) b.wear = Math.max(0, w.t - (b.up && b.up > b.built ? b.up : b.built));
      b.wear += T.zone === "hdb" ? wearRate(w.towns[l.town].maint ?? 100) : 1;
    }
  }

  // demand
  const pipe = { res: 0, com: 0, ind: 0 };
  for (const l of w.lots) {
    if (l.b?.state !== "build") continue;
    const T = LOT_TYPES[l.b.type];
    if (T.cap) pipe.res += T.cap;
    if (T.jobs) pipe[T.zone === "ind" ? "ind" : "com"] += T.jobs;
  }
  const comTarget = A.pop * 0.18 + A.tourism * 0.5;
  const indTarget = A.pop * 0.17 + A.trade * 0.8 + (REGIONS[w.region].indBoost || 0) * A.pop * 0.3;
  // families elsewhere in Singapore who would move here if there were homes
  const attract = clamp(w.approval / 60, 0.3, 1.3);
  const era = w.year < 1990 ? 1 : w.year < 2030 ? 0.7 : 0.45;
  const latent = (A.pop * 0.03 + 800) * attract * era;
  const effWait = w.waitlist + latent - pipe.res - A.vacant;
  w.demand = {
    hdb: clamp(effWait / Math.max(500, A.pop * 0.05), -1, 1),
    pte: clamp((effWait * 0.25) / Math.max(300, A.pop * 0.02) + (A.jobs > A.workforce ? 0.2 : 0), -1, 1),
    com: clamp((comTarget - A.comJobs - pipe.com) / Math.max(200, comTarget * 0.35), -1, 1) + effectAdd(w, "comDemand"),
    ind: clamp((indTarget - A.indJobs - pipe.ind) / Math.max(200, indTarget * 0.35), -1, 1) + effectAdd(w, "indDemand"),
  };

  // the housing queue grows with new households (yesterday's babies) and jobs
  const spare = A.jobs + A.workforce * 0.3 - A.workforce;
  const happy = w.approval / 60;
  const births = clamp(0.45 + 0.55 * (w.tfrLag / 2.1), 0.6, 1.7);
  const inflow = ((A.pop + w.waitlist) * 0.0011 * births + 18 + (spare > 0 ? spare * 0.05 * happy : spare * 0.02)) * effect(w, "growth");
  w.waitlist = Math.max(0, w.waitlist + inflow);
  // some families give up waiting and move elsewhere
  const giveUp = w.waitlist * 0.003 * (w.waitlist > A.pop * 0.1 ? 1.5 : 1);
  w.waitlist -= giveUp;
  w.leftRegion = (w.leftRegion || 0) + giveUp;

  // unhappy towns lose residents
  for (let i = 0; i < nT; i++) {
    const ap = w.towns[i].approval;
    if (ap >= 42 || !A.towns[i].pop) continue;
    const rate = 0.0025 * ((42 - ap) / 20);
    let gone = 0;
    for (const l of w.lots) {
      if (l.town !== i || !l.b || l.b.state === "build" || !LOT_TYPES[l.b.type].cap) continue;
      const n = residents(l.b);
      const k = Math.round(n * rate);
      if (k > 0) {
        l.b.occ = n - k;
        gone += k;
      }
    }
    w.leftRegion = (w.leftRegion || 0) + gone;
    if (gone > 150 && rng() < 0.15) push(`🚚 ${gone.toLocaleString("en-SG")} residents moved out of ${w.towns[i].name} this month. They're unhappy with the town.`);
  }

  // families move into empty flats (newest and best first)
  const vac = w.lots.filter((l) => l.b && l.b.state !== "build" && LOT_TYPES[l.b.type].cap && residents(l.b) < LOT_TYPES[l.b.type].cap);
  if (vac.length && w.waitlist >= 1) {
    const free = vac.reduce((a, l) => a + LOT_TYPES[l.b.type].cap - residents(l.b), 0);
    const outsiders = free * 0.06 * attract * era;
    let movers = Math.floor(Math.min(w.waitlist + outsiders, free, Math.max(250, free * 0.35)));
    vac.sort((a, b) => quality(w, b.b) + w.towns[b.town].approval * 0.3 - (quality(w, a.b) + w.towns[a.town].approval * 0.3));
    const hdbPrice = 0.55 * (0.9 - 0.4 * (w.hdbGrant / 100));
    for (const l of vac) {
      if (movers <= 0) break;
      const T = LOT_TYPES[l.b.type];
      const k = Math.min(T.cap - residents(l.b), movers, Math.ceil(T.cap * 0.45));
      l.b.occ = residents(l.b) + k;
      movers -= k;
      w.waitlist -= k; // goes negative when outsiders move in; clamped below
      if (T.zone === "hdb") {
        pend.hdbSales += k * hdbPrice;
        pend.towns[l.town].hdbSales += k * hdbPrice;
      }
    }
  }
  w.waitlist = Math.max(0, Math.round(w.waitlist));

  // new construction on zoned lots
  const empty = w.lots.filter((l) => l.zone && !l.b);
  for (let k = empty.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [empty[k], empty[j]] = [empty[j], empty[k]];
  }
  let starts = 0;
  const maxStarts = 5 + Math.floor(w.lots.length / 40);
  const fast = (w.policy.fastUntil || 0) > w.t ? 0.8 : 1;
  for (const l of empty) {
    if (starts >= maxStarts) break;
    const dem = w.demand[l.zone];
    if (dem <= 0.03) continue;
    if (rng() > (0.08 + dem * 0.3) * D.growth) continue;
    const want = A.want(l, l.zone);
    let pick = null;
    for (const id of ZONE_LINE[l.zone]) {
      const T = LOT_TYPES[id];
      if (w.year < T.from || (T.until && w.year >= T.until)) continue;
      if (want >= T.need) pick = id;
    }
    if (!pick) continue;
    const T = LOT_TYPES[pick];
    if (T.zone === "hdb") {
      pend.hdbBuild += T.cost;
      pend.towns[l.town].hdbBuild += T.cost;
    } else {
      const v = (T.cap || T.jobs || 0) * (A.info.get(l.id).lv / 100) * (l.zone === "pte" ? 1.4 : 0.6);
      pend.land += v;
      pend.towns[l.town].land += v;
    }
    const build = Math.round(T.build * fast);
    l.b = { type: pick, state: "build", until: w.t + build, built: w.t + build, v: Math.floor(rng() * 12) };
    starts++;
  }

  // kampong fires and small random events
  const R = REGIONS[w.region];
  if (w.t > 3 && !w.effects.some((e) => e.id && RANDOM_EVENTS.some((r) => r.id === e.id))) {
    for (const ev of RANDOM_EVENTS) {
      if (ev.minYear && w.year < ev.minYear) continue;
      if (ev.id === "recession" && w.crisis) continue;
      let chance = ev.chance;
      if (ev.kampongFire) {
        if (!w.kampongs.length) continue;
        chance *= D.fire * Math.min(2, w.kampongs.length / 3);
      }
      if (rng() >= chance) continue;
      if (ev.kampongFire) {
        const k = w.kampongs[Math.floor(rng() * w.kampongs.length)];
        const cov = A.coverAt(k.x, k.y).fire;
        const lost = Math.ceil(k.houses.length * (cov > 0 ? 0.25 : 0.6));
        k.houses.splice(0, lost);
        const plan = displace(w, lost * KAMPONG.housePop, k.town);
        if (!k.houses.length) w.kampongs = w.kampongs.filter((x) => x.id !== k.id);
        const rehoused = plan ? plan.same + plan.other : 0;
        pushNews(w, ev.text.replace("{kampong}", k.name) + (cov > 0 ? " Firefighters saved most homes." : "") + (rehoused ? ` ${rehoused.toLocaleString("en-SG")} people moved straight into empty flats.` : ""));
        w.rev++;
        refillLots(w, k.x, k.y, k.r);
      } else {
        if (ev.months) w.effects.push({ id: ev.id, until: w.t + ev.months, effect: ev.effect || {} });
        if (ev.cost) w.cash -= ev.cost;
        pushNews(w, ev.text);
      }
      break;
    }
  }

  // re-analyse for the new month
  A = analyze(w);
  let tfrSum = 0;
  let lifeSum = 0;
  const lifeHit = effectAdd(w, "life");
  for (const [i, t] of A.towns.entries()) {
    const town = w.towns[i];
    town.pop = t.pop + t.kpop;
    town.kpop = t.kpop;
    town.needs = t.needs;
    town.old = t.old;
    town.cap = t.cap;
    town.vacant = t.vacant;
    town.approval = clamp(town.approval * 0.8 + t.happy * 0.2, 0, 100);
    town.anger = Math.max(0, town.anger * 0.975 - 0.01);
    town.support = townSupport(w, i);
    town.feedback = feedbackFor(t, i + w.t);
    town.tfr = townTfr(w.year, t.needs, town.approval, t.unhoused, (w.policy.fert || 0) + effectAdd(w, "fert"));
    town.life = townLife(w.year, t.needs, w.policy.health || 0, lifeHit);
    tfrSum += town.tfr * town.pop;
    lifeSum += town.life * town.pop;
  }
  const tp = A.towns.reduce((a, t) => a + t.pop + t.kpop, 0);
  w.approval = tp ? A.towns.reduce((a, t, i) => a + w.towns[i].approval * (t.pop + t.kpop), 0) / tp : 55;
  const tfr = tp ? tfrSum / tp : baseTfr(w.year);
  const life = tp ? lifeSum / tp : 65;
  w.tfrLag += (tfr - w.tfrLag) / 240;
  w.stats = {
    pop: A.pop,
    hdbPop: A.hdbPop,
    ptePop: A.ptePop,
    kampongPop: A.kampongPop,
    jobs: A.jobs,
    comJobs: A.comJobs,
    indJobs: A.indJobs,
    unemployment: A.unemployment,
    vacant: A.vacant,
    building: w.lots.filter((l) => l.b?.state === "build").length,
    resettled: w.stats.resettled || 0,
    tfr: Math.round(tfr * 100) / 100,
    life: Math.round(life * 10) / 10,
    lifeIdx: lifeIndex(w.year, life),
  };

  // money
  const B = monthlyBudget(w, A);
  const rTot = total(B.rev);
  const eTot = total(B.exp);
  const paid = B.exp.construction; // already taken out when spent
  if (!w.sandbox) w.cash += rTot - eTot + paid;
  w.ledger = B;
  for (const side of ["rev", "exp"]) for (const [k, v] of Object.entries(B[side])) w.yearAcc[side][k] = (w.yearAcc[side][k] || 0) + v;
  w.surplusRun = rTot - eTot >= 0 ? (w.surplusRun || 0) + 1 : 0;
  const r0 = (x) => Math.round(x);
  w.fin.push({
    t: w.t,
    r: r0(rTot),
    e: r0(eTot),
    c: r0(w.cash),
    l: r0(lumpyNet(B)),
    rr: r0(recurRev(B.rev)),
    re: r0(recurExp(B.exp)),
    trr: B.towns.map((x) => r0(recurRev(x.rev))),
    tre: B.towns.map((x) => r0(recurExp(x.exp))),
    tr: B.towns.map((x) => r0(total(x.rev))),
    te: B.towns.map((x) => r0(total(x.exp))),
    tl: B.towns.map((x) => r0(lumpyNet(x))),
  });
  if (w.fin.length > 480) w.fin.shift();
  w.spend = { total: 0, towns: [] };

  // reputation drifts towards how the region is really doing
  const spendM = Math.max(1, eTot - paid);
  const finIdx = financeIndex(w.cash / spendM);
  const repTarget = w.approval * 0.35 + w.trust * 0.25 + w.stats.lifeIdx * 0.15 + finIdx * 0.1 + (1 - Math.min(1, w.waitlist / Math.max(1, A.pop * 0.3))) * 15;
  w.rep = clamp(w.rep + (repTarget - w.rep) * 0.02, 0, 100);

  // pledges, crises, dilemmas, objectives
  checkPledges(w);
  stepEvents(w, A, rng, push);
  stepObjectives(w, A, push);

  w.t++;
  w.month++;
  if (w.month > 11) {
    w.month = 0;
    w.year++;
    w.lastYear = w.yearAcc;
    w.yearAcc = { rev: {}, exp: {} };
    yearEnd(w, A, rng, finIdx);
  }
  w.effects = w.effects.filter((e) => e.until > w.t);
  if (w.t === w.election.next - 6) {
    w.election.offers = pledgeOffers(w, A);
    pushNews(w, `🗳️ Election season! Polling day is ${tToDate(w, w.election.next)}. Open the 🗳️ panel to make pledges.`);
  }
  if (w.t === w.election.next) holdElection(w, rng);

  for (const ev of [...GLOBAL_EVENTS, ...(R.events || [])]) if (ev.year === w.year && ev.month === w.month) pushNews(w, ev.text);
  if (w.cash < -10000 && canLose(w) && D.voteMin) {
    w.gameOver = w.gameOver || { reason: "broke", text: "The region ran out of money. The central government has appointed a new mayor." };
    if (w.yearly.length && !w.gameOver.final) w.gameOver.final = finishReports(w);
  }
  if (w.endYear && w.year >= w.endYear && !w.gameOver) {
    w.gameOver = { reason: "legacy", text: `${w.endYear - 1965} years as mayor of ${w.name} are over. Time to see your legacy.`, final: finishReports(w) };
  }

  w.rev = (w.rev || 0) + 1; // buildings started or finished: redraw
  w.history.push({ t: w.t, pop: A.pop, cash: Math.round(w.cash), approval: Math.round(w.approval) });
  if (w.history.length > 400) w.history.shift();
  checkGoals(w);
  return A;
}

// once a year: record how you're doing, move the AI mayors, decade reports
function yearEnd(w, A, rng, finIdx) {
  let hs = 0;
  let n = 0;
  for (const t of A.towns) {
    const p = t.pop + t.kpop;
    hs += t.needs.housing * p;
    n += p;
  }
  const queue = w.waitlist / Math.max(1, A.pop + w.waitlist);
  const housing = clamp((n ? hs / n : 40) * 0.75 + (1 - queue * 2.5) * 25, 0, 100);
  w.yearly.push({
    year: w.year - 1,
    pop: Math.round(A.pop),
    happy: Math.round(w.approval),
    housing: Math.round(housing),
    health: Math.round(lifeIndex(w.year - 1, w.stats.life)),
    fert: Math.round(tfrIndex(w.year - 1, w.stats.tfr)),
    finance: Math.round(finIdx),
    rep: Math.round(w.rep),
    life: w.stats.life,
    tfr: w.stats.tfr,
    cash: Math.round(w.cash),
  });
  if (w.yearly.length > 260) w.yearly.shift();
  stepRivals(w, rng);
  if (w.year % 10 === 5 && w.year > 1966) {
    const r = decadeReport(w, w.year - 10, w.year);
    if (r) {
      w.reports.push(r);
      w.reportReady = w.reports.length - 1;
      pushNews(w, `📊 Your ${r.from}–${r.to} report card is in: ${r.headline}`);
    }
  }
}

// for bots and tests: answer any pending decision automatically
export function autoPlayDecision(w, rng = Math.random) {
  if (w.decision) autoDecide(w, (t) => pushNews(w, t), rng);
}

function feedbackFor(t, seed) {
  const out = [];
  if (t.unhoused > 0.2) out.push({ need: "housing", v: Math.round(t.needs.housing), text: "We're still waiting for a flat! Build more homes." });
  const worst = Object.entries(t.needs)
    .filter(([k]) => COMPLAINTS[k])
    .sort((a, b) => a[1] - b[1]);
  for (const [k, v] of worst.slice(0, 3)) {
    if (v >= 55 || out.length >= 3) break;
    if (k === "housing" && out.length) continue;
    const list = COMPLAINTS[k];
    const extra = k === "housing" && t.kpop > t.pop * 0.5 ? 1 : 0;
    out.push({ need: k, v: Math.round(v), text: list[(seed + extra + k.length) % list.length] });
  }
  if (!out.length && t.pop) out.push({ need: null, v: 80, text: PRAISE[seed % PRAISE.length] });
  return out;
}

// ---------- goals ----------
export const GOALS = [
  { id: "road", text: "Draw a new road", hint: "Pick 🛣️ Roads → Road. Tap where it starts, tap where it ends, drag the round handle to curve it, then ✓ Build.", test: (w) => w.segs.length > (w.startSegs || 0) },
  { id: "zone", text: "Zone HDB lots along a road", hint: "Pick 🏘️ Zones → HDB and paint along the road with one finger. Lots turn green.", test: (w) => w.lots.some((l) => l.zone === "hdb") },
  { id: "flats", text: "Finish your first flats", hint: "Press ▶ and wait. Cranes appear, then families move in.", test: (w) => w.lots.some((l) => l.zone === "hdb" && l.b?.state === "live") },
  { id: "food", text: "Open a market or hawker centre", hint: "🍜 Services → Wet market. Tap beside a road near homes, then ✓.", test: (w) => w.structs.some((s) => s.type === "market" || s.type === "hawker") },
  { id: "jobs", text: "Zone shops or factories for jobs", hint: "🏘️ Zones → Commercial or Industrial. Keep factories away from homes.", test: (w) => w.lots.some((l) => (l.zone === "com" || l.zone === "ind") && l.b && l.b.type !== "farm" && l.b.type !== "shophouse") },
  { id: "kampong", text: "Improve or resettle a kampong", hint: "🏗️ Renew, then tap a kampong. Improving keeps people happy; resettling frees land for flats.", test: (w) => (w.stats.resettled || 0) > 0 || w.kampongs.some((k) => k.improved) },
  { id: "pop10k", text: "Reach 10,000 residents", hint: "Keep zoning HDB beside roads and add a school and clinic so blocks keep coming.", test: (w) => w.stats.pop >= 10000 },
  { id: "win", text: "Win an election", hint: "Elections come every 6 years. Check 🗳️ for each town's support and make pledges in election season.", test: (w) => w.election.history.some((e) => e.won) },
  { id: "pop30k", text: "Reach 30,000 residents", hint: "Newer housing types hold more people. Rebuild old blocks with 🏗️ Renew.", test: (w) => w.stats.pop >= 30000 },
  { id: "upgrade", text: "Upgrade or rebuild an old block", hint: "From 1989, tap an old HDB block with 🏗️ Renew.", test: (w) => w.lots.some((l) => l.b?.up || l.b?.renewed) },
  { id: "mrt", text: "Open two MRT stations on a line", hint: "From 1987: 🛣️ Roads → MRT track, then 🍜 Services → MRT station beside it at each end.", test: (w, A) => A?.mrtRunning || w.structs.filter((s) => s.type === "mrt").length >= 2 },
  { id: "pop80k", text: "Reach 80,000 residents", hint: "Bigger, modern estates and good transport.", test: (w) => w.stats.pop >= 80000 },
];

export const nextGoal = (w) => GOALS.find((g) => !w.goalsDone[g.id]) || (w.objectives || []).find((o) => o.status === "open") || null;

export function checkGoals(w) {
  let left = 0;
  for (const g of GOALS) {
    if (!w.goalsDone[g.id] && g.test(w)) {
      w.goalsDone[g.id] = true;
      if (w.t > 0) pushNews(w, `✅ Goal reached: ${g.text}`);
    }
    if (!w.goalsDone[g.id]) left++;
  }
  w.starterLeft = left;
}

// ---------- describe for the inspector ----------
export function describe(w, A, hit) {
  if (!hit) return null;
  if (hit.kind === "lot") {
    const l = hit.l;
    const town = w.towns[l.town].name;
    const I = A?.info.get(l.id);
    if (!l.b) {
      const lines = [l.zone ? `Zoned for ${l.zone === "hdb" ? "HDB" : l.zone === "pte" ? "private housing" : l.zone === "com" ? "shops & offices" : "industry"}. Waiting for demand.` : "Empty lot. Paint a zone on it with 🏘️ Zones."];
      if (I) lines.push(`Land value ${Math.round(I.lv)} · Pollution ${Math.round(I.p)}`);
      return { title: `Lot in ${town}`, icon: "🟩", lines };
    }
    const T = LOT_TYPES[l.b.type];
    const lines = [];
    if (l.b.state === "build") lines.push(`🏗️ Under construction, ready ${tToDate(w, l.b.until)}`);
    else if (l.b.state === "upgrade") lines.push(`🔧 Being upgraded, done ${tToDate(w, l.b.until)}`);
    if (T.cap && l.b.state === "build") lines.push(`👥 Room for ${fmtNum(T.cap)} residents`);
    else if (T.cap) {
      const n = residents(l.b);
      lines.push(`👥 ${fmtNum(n)} of ${fmtNum(T.cap)} residents${n < T.cap ? ` · ${fmtNum(T.cap - n)} empty homes` : " · full"}`);
    }
    if (T.jobs) lines.push(`💼 ${fmtNum(T.jobs)} jobs`);
    if (l.b.state !== "build") lines.push(`Built ${ageYears(w, l.b)} years ago (${T.era} design)`);
    if (T.q && l.b.state !== "build") lines.push(`Housing quality ${Math.round(quality(w, l.b))}/100${quality(w, l.b) < 45 ? " · ageing, consider 🏗️ Renew" : ""}`);
    if (l.b.conserved) lines.push("🏮 Conserved heritage");
    if (I) lines.push(`Land value ${Math.round(I.lv)} · Pollution ${Math.round(I.p)}`);
    return { townName: town, title: `${T.name} · ${town}`, icon: T.zone === "hdb" ? "🏢" : T.zone === "pte" ? "🏡" : T.zone === "com" ? "🏬" : "🏭", lines, renew: true };
  }
  if (hit.kind === "kampong") {
    const k = hit.k;
    return {
      townName: w.towns[k.town].name,
      title: k.name,
      icon: "🛖",
      lines: [`👥 About ${fmtNum(k.houses.length * KAMPONG.housePop)} people in ${k.houses.length} attap houses`, k.improved ? "🚰 Has stand-pipes and electricity" : "No piped water or proper sanitation", "Fires spread fast here without a fire station.", "Use 🏗️ Renew to improve or resettle it."],
      renew: true,
    };
  }
  if (hit.kind === "struct") {
    const s = hit.s;
    const S = STRUCTS[s.type];
    const lines = [S.tip || ""];
    if (S.cover) lines.push(`Serves homes within ${S.r * 50} m`);
    if (s.type === "mrt" && A && !A.stations.includes(s)) lines.push("⚠️ Not beside an MRT track");
    else if (s.type === "mrt" && A && !A.mrtRunning) lines.push("⚠️ Needs a second station on the line");
    if (S.upkeep) lines.push(`Upkeep ${fmtMoney(S.upkeep)}/month`);
    return { title: S.name, icon: S.icon, lines };
  }
  if (hit.kind === "road") return { title: ROAD_TYPES[hit.s.type].name, icon: "🛣️", lines: ["Lots line both sides of roads. Zone them to build."] };
  return null;
}
