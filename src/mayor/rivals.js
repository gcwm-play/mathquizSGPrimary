// AI mayors running the other regions, and the ten-year report card that
// compares you with them.
import { REGIONS, REGION_ORDER } from "./regions.js";
import { clamp } from "./geom.js";
import { baseLife, baseTfr, mayorScore, METRICS, grade } from "./society.js";
import { CRISES } from "./events.js";
import { STRUCTS } from "./defs.js";

export const STYLES = {
  builder: { name: "The Builder", blurb: "Builds homes fast, worries about money later.", bias: { housing: 9, happy: 2, finance: -6, health: -1, fert: 2, rep: 1 } },
  gardener: { name: "The Gardener", blurb: "Parks, clean air and healthy living first.", bias: { health: 8, happy: 3, housing: -3, finance: -2, fert: 0, rep: 3 } },
  accountant: { name: "The Accountant", blurb: "Balanced books above all.", bias: { finance: 13, happy: -4, housing: -2, health: 0, fert: -2, rep: 2 } },
  showman: { name: "The Showman", blurb: "Big promises, big parties, big bills.", bias: { happy: 7, finance: -9, rep: -2, housing: 1, health: 0, fert: 1 } },
  futurist: { name: "The Futurist", blurb: "Bets on technology and bold ideas.", bias: { rep: 7, health: 3, finance: -3, happy: 0, housing: 0, fert: -1 } },
  conservator: { name: "The Conservator", blurb: "Protects heritage and the old ways.", bias: { rep: 3, happy: 3, housing: -5, finance: 2, health: 0, fert: 1 } },
};

const NAMES = ["Tan Bee Lian", "Rahim Osman", "S. Gopal", "Lim Swee Hock", "Grace Ong", "Farah Ismail", "Chua Kok Leong", "Priya Menon", "Wong Mei Ling", "Hassan Yusof", "Teo Boon Huat", "Jasmine Koh", "Ravi Pillai", "Ng Siew Choo", "Daniel Lee", "Aisha Rahman"];

// Things rival mayors do. good/bad from residents' point of view.
const ACTIONS = [
  { styles: ["builder"], from: 1965, to: 1990, text: "cleared kampongs at record speed to build slab blocks", d: { housing: 6, happy: -2 }, tone: "neutral" },
  { styles: ["builder"], from: 1975, to: 2300, text: "built a whole new town in under five years", d: { housing: 8, finance: -5 }, tone: "good", innov: true },
  { styles: ["builder"], from: 1990, to: 2300, text: "rushed a batch of flats that soon needed costly repairs", d: { housing: -4, finance: -4, rep: -3 }, tone: "bad" },
  { styles: ["builder", "showman"], from: 1980, to: 2300, text: "borrowed heavily for a stadium that sits half-empty", d: { finance: -8, rep: -3, happy: 1 }, tone: "bad" },
  { styles: ["gardener"], from: 1967, to: 2300, text: "planted a tree on every street for 'Garden City' week", d: { health: 3, happy: 2 }, tone: "good" },
  { styles: ["gardener"], from: 1990, to: 2300, text: "turned a concrete canal into a winding river park", d: { health: 4, happy: 4, rep: 4, finance: -3 }, tone: "good", innov: true },
  { styles: ["gardener"], from: 2000, to: 2300, text: "covered HDB roofs in gardens and solar panels", d: { health: 3, finance: 2, rep: 3 }, tone: "good", innov: true },
  { styles: ["gardener", "conservator"], from: 1975, to: 2300, text: "blocked a new industrial park to protect a forest", d: { health: 3, rep: 1, finance: -3 }, tone: "neutral" },
  { styles: ["accountant"], from: 1965, to: 2300, text: "banked a large budget surplus", d: { finance: 6, happy: -1 }, tone: "neutral" },
  { styles: ["accountant"], from: 1970, to: 2300, text: "cut community centre funding to balance the books", d: { finance: 4, happy: -4 }, tone: "bad" },
  { styles: ["accountant"], from: 1990, to: 2300, text: "invested reserves wisely and paid residents a dividend", d: { finance: 3, happy: 3, rep: 2 }, tone: "good", innov: true },
  { styles: ["showman"], from: 1965, to: 2300, text: "threw a huge National Day street party", d: { happy: 4, finance: -2 }, tone: "neutral" },
  { styles: ["showman"], from: 1965, to: 2300, text: "froze S&CC charges just before the election", d: { happy: 3, finance: -4 }, tone: "neutral" },
  { styles: ["showman"], from: 1987, to: 2300, text: "promised an MRT line that arrived years late", d: { rep: -5, happy: -3 }, tone: "bad" },
  { styles: ["showman"], from: 1970, to: 2300, text: "was caught in a town council spending scandal", d: { rep: -8, happy: -3 }, tone: "bad" },
  { styles: ["futurist"], from: 1980, to: 2300, text: "built the first computerised traffic lights", d: { rep: 3, happy: 2 }, tone: "good", innov: true },
  { styles: ["futurist"], from: 2000, to: 2300, text: "launched a smart-estate sensor network", d: { rep: 4, health: 2, finance: -2 }, tone: "good", innov: true },
  { styles: ["futurist"], from: 2015, to: 2300, text: "piloted driverless buses", d: { rep: 5, happy: 1, finance: -3 }, tone: "good", innov: true },
  { styles: ["futurist"], from: 1990, to: 2300, text: "lost money on a hi-tech park nobody moved into", d: { finance: -6, rep: -3 }, tone: "bad" },
  { styles: ["futurist", "accountant"], from: 2000, to: 2300, text: "built an early NEWater plant", d: { rep: 4, finance: -2 }, tone: "good", innov: true },
  { styles: ["conservator"], from: 1985, to: 2300, text: "restored a row of shophouses into a buzzing food street", d: { rep: 4, happy: 3, finance: 2 }, tone: "good", innov: true },
  { styles: ["conservator"], from: 1965, to: 2000, text: "let kampongs stay much longer than elsewhere", d: { housing: -4, happy: 2 }, tone: "neutral" },
  { styles: ["conservator"], from: 1990, to: 2300, text: "blocked new BTO towers to protect the skyline", d: { housing: -4, rep: 1 }, tone: "bad" },
  { styles: null, from: 1965, to: 2300, text: "faced a serious fire in an old estate", d: { housing: -3, happy: -3 }, tone: "bad" },
  { styles: null, from: 1980, to: 2300, text: "opened a much-loved new hawker centre", d: { happy: 3 }, tone: "good" },
  { styles: null, from: 1995, to: 2300, text: "ran a popular lift-upgrading programme for seniors", d: { housing: 3, health: 2, happy: 2 }, tone: "good" },
  { styles: null, from: 2001, to: 2300, text: "introduced a generous baby bonus", d: { fert: 5, finance: -3 }, tone: "good", innov: true },
  { styles: null, from: 1975, to: 2300, text: "suffered a long-running dengue outbreak", d: { health: -4, happy: -2 }, tone: "bad" },
  { styles: null, from: 2010, to: 2300, text: "built 'kampong admiralty'-style senior hubs", d: { health: 3, rep: 4, finance: -3 }, tone: "good", innov: true },
  { styles: null, from: 2030, to: 2300, text: "raised a sea wall around the whole coast", d: { rep: 3, finance: -5, health: 1 }, tone: "good", innov: true },
];

// how each style tends to handle a crisis (rough multiplier on damage)
const CRISIS_SKILL = { builder: 1, gardener: 0.95, accountant: 0.7, showman: 1.2, futurist: 0.85, conservator: 1 };

export function initRivals(w, rng) {
  const others = REGION_ORDER.filter((r) => r !== w.region);
  const names = [...NAMES].sort(() => rng() - 0.5);
  const styles = Object.keys(STYLES).sort(() => rng() - 0.5);
  w.rivals = others.map((region, i) => {
    const m = { happy: 52, housing: 48, health: 50, fert: 50, finance: 50, rep: 50 };
    return {
      region,
      regionName: REGIONS[region].name,
      mayor: names[i],
      style: styles[i],
      m,
      skill: 0.9 + rng() * 0.3,
      pop: Math.round(20000 + rng() * 15000),
      notes: [],
      hist: [],
    };
  });
}

// once a year
// Now and then an AI mayor opens a landmark of their own.
function rivalLandmark(w, r, rng, out) {
  const keen = { futurist: 0.2, showman: 0.2, gardener: 0.14, builder: 0.12, conservator: 0.1, accountant: 0.06 }[r.style] || 0.1;
  if (rng() > keen) return;
  r.built = r.built || [];
  const ready = Object.entries(STRUCTS).filter(([k, S]) => S.landmark && !S.group && !S.hidden && S.year <= w.year && !r.built.includes(k) && (!S.regionOnly || S.region === r.region));
  // their own region's famous sights come first; copying others is rarer
  const home = ready.filter(([, S]) => S.region === r.region);
  const pool = home.length ? home : rng() < 0.35 ? ready : [];
  if (!pool.length) return;
  const k = pool[Math.floor(rng() * pool.length)][0];
  const S = STRUCTS[k];
  r.built.push(k);
  w.lmBuilt = w.lmBuilt || [];
  const first = w.lmBuilt.find((x) => x.type === k);
  if (!first) w.lmBuilt.push({ type: k, name: S.name, by: r.mayor, region: r.regionName, year: w.year });
  const copy = first && first.by !== r.mayor;
  r.m.rep += copy ? -2 : 4;
  r.m.finance -= 5;
  r.notes.push({ year: w.year, text: copy ? `opened a copy of ${S.name}` : `opened ${S.name}, a first for Singapore`, tone: copy ? "neutral" : "good", innov: !copy });
  out.push({ rival: r, type: k, copy, copiedYou: copy && first.by === "you" });
}

export function stepRivals(w, rng) {
  const crisis = w.crisis ? CRISES[w.crisis.id] : null;
  const opened = [];
  for (const r of w.rivals) {
    rivalLandmark(w, r, rng, opened);
    const S = STYLES[r.style];
    for (const M of METRICS) {
      const k = M.k;
      const target = 54 + S.bias[k] * 0.9 + (r.skill - 1) * 20 + Math.min(4, (w.year - 1965) / 25);
      r.m[k] += (target - r.m[k]) * 0.18 + (rng() - 0.5) * 4;
    }
    if (crisis) {
      const hit = 7 * (CRISIS_SKILL[r.style] || 1) * (1.6 - r.skill);
      const e = crisis.effect;
      if (e.health) r.m.health -= hit * 0.8;
      if (e.jobs || e.business) {
        r.m.happy -= hit * 0.6;
        r.m.finance -= hit * (r.style === "accountant" ? 0.3 : 0.8);
      }
      if (e.tourism) r.m.finance -= hit * 0.3;
    }
    if (rng() < 0.4) {
      const recent = new Set(r.notes.filter((n) => n.year > w.year - 12).map((n) => n.text));
      const pool = ACTIONS.filter((a) => w.year >= a.from && w.year <= a.to && (!a.styles || a.styles.includes(r.style)) && !recent.has(a.text));
      const a = pool[Math.floor(rng() * pool.length)];
      if (a) {
        for (const [k, v] of Object.entries(a.d)) r.m[k] += v;
        r.notes.push({ year: w.year, text: a.text, tone: a.tone, innov: !!a.innov });
        if (r.notes.length > 60) r.notes.shift();
      }
    }
    for (const k of Object.keys(r.m)) r.m[k] = clamp(r.m[k], 5, 95);
    const growth = w.year < 1990 ? 0.045 : w.year < 2030 ? 0.022 : 0.006;
    r.pop = Math.round(r.pop * (1 + growth * (0.6 + r.m.housing / 100) + (rng() - 0.5) * 0.01));
    r.life = Math.round((baseLife(w.year) + (r.m.health - 50) / 9) * 10) / 10;
    r.tfr = Math.round(baseTfr(w.year) * (1 + (r.m.fert - 50) / 160) * 100) / 100;
    r.hist.push({ year: w.year, score: mayorScore(r.m) });
    if (r.hist.length > 300) r.hist.shift();
  }
  return opened;
}

// Build the report for the decade that just ended
export function decadeReport(w, from, to) {
  const mine = w.yearly.filter((y) => y.year >= from && y.year < to);
  const last = mine[mine.length - 1] || w.yearly[w.yearly.length - 1];
  if (!last) return null;
  const avg = (rows, k) => rows.reduce((a, r) => a + (r[k] ?? 50), 0) / Math.max(1, rows.length);
  const you = { name: w.name, mayor: "You", you: true, m: {}, pop: last.pop, life: last.life, tfr: last.tfr };
  for (const M of METRICS) you.m[M.k] = Math.round(avg(mine.length ? mine : [last], M.k));
  you.score = mayorScore(you.m);
  const rows = [you];
  for (const r of w.rivals) {
    const hs = r.hist.filter((h) => h.year >= from && h.year < to);
    rows.push({
      name: r.regionName,
      mayor: r.mayor,
      style: STYLES[r.style].name,
      m: Object.fromEntries(Object.entries(r.m).map(([k, v]) => [k, Math.round(v)])),
      score: hs.length ? Math.round(hs.reduce((a, h) => a + h.score, 0) / hs.length) : mayorScore(r.m),
      pop: r.pop,
      life: r.life,
      tfr: r.tfr,
      notes: r.notes.filter((n) => n.year >= from && n.year < to),
    });
  }
  rows.sort((a, b) => b.score - a.score);
  const rank = rows.findIndex((r) => r.you) + 1;
  const myLog = w.log.filter((l) => l.year >= from && l.year < to);
  const first = mine[0] || last;
  const facts = [];
  if (last.pop !== first.pop) facts.push(`Population ${first.pop < last.pop ? "grew" : "fell"} from ${Math.round(first.pop).toLocaleString("en-SG")} to ${Math.round(last.pop).toLocaleString("en-SG")}.`);
  facts.push(`Life expectancy ${last.life.toFixed(1)} years · ${last.tfr.toFixed(2)} babies per woman.`);
  const won = w.election.history.filter((e) => e.year >= from && e.year < to);
  if (won.length) facts.push(`Elections: ${won.map((e) => `${e.year} ${e.won ? "won" : "lost"} (${e.share}%)`).join(", ")}.`);
  const crises = w.crisesPast.filter((c) => c.year >= from && c.year < to);
  for (const c of crises) facts.push(`${CRISES[c.id].icon} ${CRISES[c.id].name}: handled ${c.score >= 60 ? "well" : c.score >= 35 ? "about average" : "poorly"}.`);
  // what stood out compared with the others
  const strengths = [];
  const weaknesses = [];
  for (const M of METRICS) {
    const others = rows.filter((r) => !r.you).map((r) => r.m[M.k]);
    const mean = others.reduce((a, b) => a + b, 0) / Math.max(1, others.length);
    const gap = you.m[M.k] - mean;
    if (gap >= 6) strengths.push(`${M.icon} ${M.name} (+${Math.round(gap)} vs the others)`);
    else if (gap <= -6) weaknesses.push(`${M.icon} ${M.name} (${Math.round(gap)} vs the others)`);
  }
  return {
    from,
    to: to - 1,
    rank,
    of: rows.length,
    rows,
    you,
    grade: grade(you.score),
    good: myLog.filter((l) => l.tone === "good" && !l.crisis).slice(-4).map((l) => l.text),
    bad: myLog.filter((l) => l.tone === "bad" && !l.crisis).slice(-3).map((l) => l.text),
    facts,
    strengths,
    weaknesses,
    headline: rank === 1 ? "You were the best mayor in Singapore this decade!" : rank === rows.length ? "You finished last among the four regional mayors." : `You ranked #${rank} of ${rows.length} regional mayors.`,
  };
}

export function finalReport(w) {
  const reps = w.reports || [];
  const scores = reps.map((r) => r.you.score);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 50;
  const best = reps.reduce((a, r) => (!a || r.you.score > a.you.score ? r : a), null);
  const worst = reps.reduce((a, r) => (!a || r.you.score < a.you.score ? r : a), null);
  const firsts = reps.filter((r) => r.rank === 1).length;
  const G = grade(avg);
  const title = avg >= 75 ? "Founding legend of the Lion City" : avg >= 68 ? "A mayor for the history books" : avg >= 60 ? "A steady pair of hands" : avg >= 52 ? "A mayor of mixed fortunes" : "A cautionary tale";
  return { avg, grade: G, title, best, worst, firsts, decades: reps.length };
}
