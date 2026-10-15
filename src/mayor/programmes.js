// The mayor's programmes: ongoing perks for residents and businesses that a
// town council could afford. Each runs until stopped, costs money every month
// (more as the region grows), and works a little better or worse each time
// it's started. Stopping one that people have come to rely on makes them angry.
import { STRUCTS, LOT_TYPES } from "./defs.js";
import { clamp } from "./geom.js";
import { fmtRange } from "./events.js";

const MULT = ["business", "tourism", "trade", "land", "jobs", "health", "upkeep", "growth"];
const popOf = (w) => w.stats?.pop || 0;
const inDownturn = (w) => !!w.crisis || (w.effects || []).some((e) => e.id === "recession");
const hawkers = (w) => w.structs.filter((s) => s.type === "hawker" && s.state !== "build").length;
const comJobs = (w) => w.lots.reduce((a, l) => a + (l.zone === "com" && l.b && l.b.state !== "build" ? LOT_TYPES[l.b.type].jobs || 0 : 0), 0);
const hasTown = (w, ...p) => w.towns.some((t) => p.includes(t.purpose));

// cost: $K a month. needs: points added to every town's need. effect: region multipliers/adds.
// perYear: trust/rep gained per year of running. anger: how much stopping it hurts.
export const PROGRAMMES = [
  {
    id: "newFamily",
    group: "families",
    icon: "🍼",
    name: "New-family gift",
    desc: "A welcome hamper and vouchers for every newborn.",
    from: 1965,
    cost: (w) => popOf(w) * 0.0005,
    costNote: "about $0.5K a month per 1,000 residents",
    effect: { fert: 0.03, mood: 0.4 },
    anger: 0.5,
  },
  {
    id: "childcare",
    group: "families",
    icon: "🧸",
    name: "Childcare top-ups",
    desc: "Help with fees at town childcare centres, so both parents can work.",
    from: 1980,
    cost: (w) => popOf(w) * 0.0011,
    costNote: "about $1.1K a month per 1,000 residents",
    effect: { fert: 0.06 },
    needs: { school: 4 },
    anger: 0.9,
  },
  {
    id: "cdc",
    group: "families",
    icon: "🛒",
    name: "Community vouchers",
    desc: "Vouchers for every household to spend at heartland shops and hawker stalls.",
    from: 2000,
    cost: (w) => popOf(w) * 0.0024,
    costNote: "about $2.4K a month per 1,000 residents",
    needs: { cost: 8 },
    effect: { business: 1.04 },
    anger: 1.1,
  },
  {
    id: "ageing",
    group: "families",
    icon: "🧓",
    name: "Active ageing",
    desc: "Senior activity centres and free health screenings. Costs more as the region ages.",
    from: 1975,
    cost: (w) => popOf(w) * (0.0003 + 0.000012 * clamp(w.year - 1975, 0, 70)),
    costNote: "about $0.3–1.1K a month per 1,000 residents, rising as people age",
    needs: { health: 5 },
    effect: { life: -0.5 },
    anger: 1,
  },
  {
    id: "bursary",
    group: "families",
    icon: "🎒",
    name: "Student bursaries",
    desc: "Help with school fees, books and uniforms for low-income families.",
    from: 1965,
    cost: (w) => popOf(w) * 0.0006,
    costNote: "about $0.6K a month per 1,000 residents",
    needs: { school: 5 },
    perYear: { trust: 1.5 },
    anger: 0.7,
  },
  {
    id: "homeRepair",
    group: "families",
    icon: "🔧",
    name: "Home repair grants",
    desc: "Minor repairs, grab bars and ramps in older flats.",
    from: 1980,
    cost: (w) => popOf(w) * 0.0008,
    costNote: "about $0.8K a month per 1,000 residents",
    needs: { housing: 4 },
    anger: 0.6,
  },
  {
    id: "festivals",
    group: "families",
    icon: "🎉",
    name: "Festivals & light-ups",
    desc: "Chinese New Year, Hari Raya and Deepavali light-ups, and National Day block parties.",
    from: 1965,
    cost: (w) => 6 + popOf(w) * 0.0003,
    costNote: "$6K a month plus $0.3K per 1,000 residents",
    needs: { community: 5 },
    effect: { mood: 0.8, tourism: 1.03 },
    anger: 0.5,
  },
  {
    id: "gardens",
    group: "families",
    icon: "🌻",
    name: "Community gardens",
    desc: "Allotments and rooftop gardens in every estate, run by residents.",
    from: 1970,
    cost: (w) => 3 + popOf(w) * 0.0003,
    costNote: "$3K a month plus $0.3K per 1,000 residents",
    needs: { green: 5, community: 3 },
    anger: 0.4,
  },
  {
    id: "jobsCentre",
    group: "families",
    icon: "💼",
    name: "Job-matching centre",
    desc: "Career fairs, retraining and job matching. Worth most in a downturn.",
    from: 1965,
    cost: (w) => 8 + popOf(w) * 0.0006,
    costNote: "$8K a month plus $0.6K per 1,000 residents",
    needs: { jobs: 6 },
    downturnBonus: { jobs: 1.03 },
    anger: 0.6,
  },
  {
    id: "shopRebate",
    group: "business",
    icon: "🏪",
    name: "Heartland shop rebates",
    desc: "Rent rebates for shops in housing estates so they stay open.",
    from: 1970,
    cost: (w) => 4 + comJobs(w) * 0.003,
    costNote: "about $3K a month per 1,000 shop and office jobs",
    needs: { food: 3 },
    effect: { comDemand: 0.15, business: 0.97 },
    anger: 0.8,
  },
  {
    id: "downturn",
    group: "business",
    icon: "🆘",
    name: "Downturn assistance",
    desc: "Wage support and rent relief to keep firms afloat. Only during a recession or crisis; it winds down when the downturn ends.",
    from: 1965,
    only: inDownturn,
    onlyText: "Only during a recession or crisis",
    cost: (w) => popOf(w) * 0.003,
    costNote: "about $3K a month per 1,000 residents",
    effect: { jobs: 1.06, business: 1.04 },
    crisisRelief: true,
    anger: 1.4,
  },
  {
    id: "startup",
    group: "business",
    icon: "🚀",
    name: "Start-up grants",
    desc: "Seed grants and an incubator for new firms.",
    from: 1990,
    cost: (w) => 25 + popOf(w) * 0.0004,
    costNote: "$25K a month plus $0.4K per 1,000 residents",
    effect: { comDemand: 0.1, business: 1.03 },
    perYear: { rep: 1 },
    anger: 0.4,
  },
  {
    id: "hawkerCulture",
    group: "business",
    icon: "🍜",
    name: "Hawker culture support",
    desc: "Stall rent subsidies and an apprenticeship scheme so hawkers have successors.",
    from: 2000,
    need: (w) => (hawkers(w) ? null : "Build a hawker centre first"),
    cost: (w) => 4 + hawkers(w) * 5,
    costNote: "$4K a month plus $5K per hawker centre",
    needs: { food: 5, cost: 3 },
    effect: { tourism: 1.04 },
    anger: 0.9,
  },
  {
    id: "factoryMove",
    group: "business",
    icon: "🏭",
    name: "Factory relocation grants",
    desc: "Help polluting factories move away from homes.",
    from: 1975,
    need: (w) => (w.lots.some((l) => l.zone === "ind" && l.b) ? null : "No factories yet"),
    cost: (w) => 10 + popOf(w) * 0.0006,
    costNote: "$10K a month plus $0.6K per 1,000 residents",
    needs: { environment: 8 },
    effect: { indDemand: -0.1 },
    anger: 0.3,
  },
  {
    id: "greenBiz",
    group: "business",
    icon: "☀️",
    name: "Green business incentives",
    desc: "Solar panels and efficient cooling on factory and mall roofs.",
    from: 2010,
    cost: (w) => 15 + popOf(w) * 0.0005,
    costNote: "$15K a month plus $0.5K per 1,000 residents",
    needs: { environment: 4 },
    effect: { upkeep: 0.97 },
    anger: 0.3,
  },
  {
    id: "trails",
    group: "business",
    icon: "🗺️",
    name: "Heritage trails & night markets",
    desc: "Guided trails, signage and weekend night markets.",
    from: 1975,
    need: (w) => (hasTown(w, "heritage", "commercial") ? null : "Needs a heritage or commercial town"),
    cost: (w) => 8 + popOf(w) * 0.0003,
    costNote: "$8K a month plus $0.3K per 1,000 residents",
    needs: { community: 2 },
    effect: { tourism: 1.08 },
    anger: 0.4,
  },
];
export const PROGRAMME = Object.fromEntries(PROGRAMMES.map((p) => [p.id, p]));

const NEED_NAME = { food: "🍜 Food", school: "🏫 Schools", health: "🩺 Healthcare", housing: "🏠 Housing", cost: "🧾 Cost of living", community: "🏓 Community", green: "🌳 Greenery", environment: "🌬️ Clean air", jobs: "💼 Jobs" };
const EFF_NAME = { business: "🏢 Business tax", tourism: "📸 Tourism", jobs: "💼 Jobs", upkeep: "🔧 Running costs", comDemand: "🏬 Shop demand", indDemand: "🏭 Factory demand" };

// benefit chips with ranges, for the panel
export function programmeBenefits(P) {
  const out = [];
  for (const [k, v] of Object.entries(P.needs || {})) out.push({ t: `${NEED_NAME[k]} ${fmtRange(v, { spread: 0.3 })} in every town`, good: true });
  for (const [k, v] of Object.entries(P.effect || {})) {
    if (k === "fert") out.push({ t: `👶 Births ${fmtRange(v * 100, { unit: "%", spread: 0.3 })}`, good: true });
    else if (k === "life") out.push({ t: `🩺 Life expectancy ${fmtRange(-v, { unit: " yrs", dp: 1, spread: 0.3 })}`, good: true });
    else if (k === "mood") out.push({ t: `😊 Happiness ${fmtRange(v, { unit: "%", spread: 0.3 })}`, good: true });
    else if (MULT.includes(k)) {
      const pct = (v - 1) * 100;
      out.push({ t: `${EFF_NAME[k]} ${fmtRange(pct, { unit: "%", spread: 0.3 })}`, good: k === "upkeep" ? pct < 0 : pct > 0 });
    } else if (EFF_NAME[k]) out.push({ t: `${EFF_NAME[k]} ${fmtRange(v * 100, { unit: "%", spread: 0.3 })}`, good: k === "indDemand" ? true : v > 0 });
  }
  for (const [k, v] of Object.entries(P.perYear || {})) out.push({ t: `${k === "trust" ? "🤝 Trust" : "⭐ Reputation"} ${fmtRange(v, { spread: 0.3 })} a year`, good: true });
  if (P.downturnBonus) out.push({ t: "💼 Extra jobs help in a downturn", good: true });
  if (P.crisisRelief) out.push({ t: "⚠️ Softens the current crisis", good: true });
  return out;
}

export function progState(w, id) {
  w.prog = w.prog || {};
  return (w.prog[id] = w.prog[id] || { on: false, cur: 0, last: 0, total: 0, yr: w.year, runs: 0 });
}
export const progCost = (w, id) => Math.max(0, PROGRAMME[id].cost(w));
export const progMonthly = (w) => PROGRAMMES.reduce((a, P) => a + (w.prog?.[P.id]?.on ? progCost(w, P.id) : 0), 0);
export function progAvailable(w, P) {
  if (w.year < P.from) return { ok: false, why: `From ${P.from}` };
  // like any new spending, frozen while the region is in debt
  if (w.cash < 0 && !w.sandbox) return { ok: false, why: "In debt" };
  if (P.only && !P.only(w)) return { ok: false, why: P.onlyText };
  const n = P.need?.(w);
  if (n) return { ok: false, why: n };
  return { ok: true };
}
// how angry people get if it's stopped now
export function stopPenalty(w, id) {
  const st = w.prog?.[id];
  const months = st?.on ? w.t - st.since : 0;
  const k = Math.min(1, months / 24) * PROGRAMME[id].anger;
  return { months, anger: 0.5 * k, trust: 1 + 3 * Math.min(1, months / 36) * PROGRAMME[id].anger };
}

export function startProgramme(w, id, push, rng = Math.random) {
  const P = PROGRAMME[id];
  const st = progState(w, id);
  if (st.on || !progAvailable(w, P).ok) return false;
  st.on = true;
  st.since = w.t;
  st.k = Math.round((0.7 + rng() * 0.6) * 100) / 100; // how well it turns out this time: 70–130%
  st.runs++;
  push(`${P.icon} You started ${P.name.toLowerCase()}: it's working ${Math.round(st.k * 100)}% as well as a typical scheme.`);
  return true;
}

export function stopProgramme(w, id, push, why = null) {
  const P = PROGRAMME[id];
  const st = progState(w, id);
  if (!st.on) return null;
  const pen = why ? { anger: 0, trust: 0, months: w.t - st.since } : stopPenalty(w, id);
  st.on = false;
  st.stopped = w.t;
  w.trust = clamp(w.trust - pen.trust, 0, 100);
  for (const t of w.towns) t.anger = (t.anger || 0) + pen.anger;
  const msg = why ? `${P.icon} ${P.name} wound down: ${why}.` : `${P.icon} You stopped ${P.name.toLowerCase()} after ${Math.round(pen.months / 12) || "under a"} year${Math.round(pen.months / 12) === 1 ? "" : "s"}.${pen.anger > 0.1 ? " Residents who relied on it are upset." : ""}`;
  push(msg);
  return pen;
}

// every month: costs, effects, and anything that should wind down
export function stepProgrammes(w, push) {
  w.boosts = (w.boosts || []).filter((b) => b.src !== "prog");
  w.effects = (w.effects || []).filter((e) => !String(e.id).startsWith("prog:"));
  if (!w.prog) return;
  for (const P of PROGRAMMES) {
    const st = w.prog[P.id];
    if (!st) continue;
    if (st.yr !== w.year) {
      st.last = st.cur;
      st.cur = 0;
      st.yr = w.year;
    }
    if (!st.on) continue;
    if (P.only && !P.only(w)) {
      stopProgramme(w, P.id, push, "the downturn is over");
      continue;
    }
    const c = progCost(w, P.id);
    st.cur += c;
    st.total += c;
    // effects build up over the first half-year
    const k = (st.k ?? 1) * Math.min(1, (w.t - st.since + 1) / 6);
    for (const [need, v] of Object.entries(P.needs || {})) for (let i = 0; i < w.towns.length; i++) w.boosts.push({ town: i, need, v: v * k, until: w.t + 2, src: "prog" });
    const eff = {};
    for (const [key, v] of Object.entries({ ...(P.effect || {}), ...(P.downturnBonus && inDownturn(w) ? P.downturnBonus : {}) })) {
      eff[key] = MULT.includes(key) ? (eff[key] ?? 1) * (1 + (v - 1) * k) : (eff[key] || 0) + v * k;
    }
    if (Object.keys(eff).length) w.effects.push({ id: `prog:${P.id}`, until: w.t + 2, effect: eff });
    for (const [key, v] of Object.entries(P.perYear || {})) {
      if (key === "trust") w.trust = clamp(w.trust + (v * k) / 12, 0, 100);
      else w.rep = clamp((w.rep ?? 50) + (v * k) / 12, 0, 100);
    }
    if (P.crisisRelief && w.crisis) w.crisis.sev = Math.max(0.15, w.crisis.sev * (1 - 0.006 * k));
  }
}

