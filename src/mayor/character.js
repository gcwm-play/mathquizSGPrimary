// Neighbourhood character and education (Bukit Timah / Clementi).
//
// Landed-estate residents push back when their neighbourhood changes too
// fast: each town is compared with itself about 10 years earlier, so slow
// change is tolerated and patience beats the system. Pushback is weak in the
// 1970s and strong after 2000. Their votes are few, so the cost lands
// elsewhere: property income, reputation, trust and the prestige of the
// top-school belt.
import { REGIONS } from "./regions.js";
import { LOT_TYPES } from "./defs.js";
import { clamp, dist } from "./geom.js";
import { rollIn } from "./events.js";
import { townOf } from "./world.js";

const LANDED = "terrace";
// blocks that change the look of a landed street
// (taller counts more, so rebuilding a slab block as sky towers is change too)
const TALL = { slab: 1, point: 1.2, ng: 1.2, modern: 1.4, bto: 2, condo: 1.2, luxury: 2, office: 1.6, mixed: 2 };
const NEAR = 5; // about 250 m
const MIN_LANDED = 6; // fewer landed homes than this: no organised lobby

export const charOn = (w) => !!REGIONS[w.region]?.character;
export const eduOn = (w) => !!REGIONS[w.region]?.education;
// weak in the 1970s, building through the 1980s and 90s, strong after 2000
export const charEra = (year) => clamp((year - 1970) / 30, 0.15, 1);

// lots within ~250 m of a landed home, and which town's landed estate they face
export function nearLanded(w) {
  if (w._nearLanded && w._nearLandedRev === w.rev) return w._nearLanded;
  const landed = w.lots.filter((l) => l.b?.type === LANDED);
  const m = new Map();
  for (const l of w.lots) {
    if (l.b?.type === LANDED) continue;
    let best = null;
    for (const h of landed) {
      const d = dist(l.x, l.y, h.x, h.y);
      if (d < NEAR && (!best || d < best.d)) best = { d, town: h.town };
    }
    if (best) m.set(l.id, best.town);
  }
  w._nearLanded = m;
  w._nearLandedRev = w.rev;
  return m;
}

// What each town looks like now: landed homes, tall blocks next to them,
// forest and avenues.
function snapshot(w, A) {
  const s = w.towns.map(() => ({ landed: 0, tall: 0, trees: 0, ave: 0 }));
  for (const l of w.lots) if (l.b?.type === LANDED) s[l.town].landed++;
  const near = nearLanded(w);
  for (const l of w.lots) {
    if (!l.b || !TALL[l.b.type]) continue;
    const ti = near.get(l.id);
    if (ti == null) continue;
    // a park between the towers and the houses softens it
    const green = A?.info.get(l.id)?.c.green || 0;
    s[ti].tall += TALL[l.b.type] * (green >= 0.5 ? 0.5 : 1);
  }
  for (const t of w.trees) s[townOf(w, t[0], t[1])].trees++;
  for (const sg of w.segs) if (sg.type === "avenue") {
    const n = w.nodes.find((x) => x.id === sg.a);
    if (n) s[townOf(w, n.x, n.y)].ave++;
  }
  return s;
}

// how much a town has changed since `base`, before era scaling
function change(now, base) {
  if (!base || base.landed < MIN_LANDED) return 0;
  return (
    2.5 * Math.max(0, now.tall - base.tall) +
    3 * Math.max(0, base.landed - now.landed) +
    2 * Math.max(0, now.ave - base.ave) +
    40 * Math.max(0, (base.trees - now.trees) / Math.max(60, base.trees))
  );
}

export function stepCharacter(w, A, push, rng) {
  if (!charOn(w)) return;
  w.charHist = w.charHist || [];
  // a snapshot a year, keeping just over 10 years
  if (!w.charHist.length || w.t - w.charHist[w.charHist.length - 1].t >= 12) {
    w.charHist.push({ t: w.t, s: snapshot(w, A) });
    if (w.charHist.length > 12) w.charHist.shift();
  }
  const now = snapshot(w, A);
  // what things looked like 10 years ago (or as far back as we have)
  const old = w.charHist.find((h) => h.t >= w.t - 126) || w.charHist[0];
  const era = charEra(w.year);
  const inCampaign = w.election && w.t >= w.election.next - 6 && w.t < w.election.next;
  w.towns.forEach((town, i) => {
    // after a petition is settled, only changes since then count
    const base = town.charBase && town.charBase.t > old.t ? town.charBase.s : old.s[i];
    const target = clamp(change(now[i], base) * era, 0, 100);
    town.charLoss = (town.charLoss ?? 0) * 0.85 + target * 0.15;
    town.landed = now[i].landed;
    const s = town.charLoss;
    if (s < 1) return;
    town.anger += (s / 100) * 0.03;
    // influential voices spread doubt about you everywhere
    if (s > 40) w.trust = clamp(w.trust - (0.04 * (s - 40)) / 60, 0, 100);
    if (s >= 30 && !w.decision && !inCampaign && w.t - (town.petitionT ?? -999) >= 36) {
      town.petitionT = w.t;
      w.decision = { kind: "dilemma", id: "petition", town: i };
    }
  });
  // a happy landed estate gives back now and then
  if (w.year >= 1980 && rng() < 1 / 110) {
    const calm = w.towns.map((t, i) => i).filter((i) => (w.towns[i].landed || 0) >= MIN_LANDED && (w.towns[i].charLoss ?? 0) < 8);
    if (calm.length) {
      const i = calm[Math.floor(rng() * calm.length)];
      const gift = Math.round(rollIn(450, rng));
      w.cash += gift;
      w.boosts.push({ town: i, need: "school", v: rollIn(5, rng), until: w.t + 120 });
      push(`🎁 Alumni and clan associations in ${w.towns[i].name} donate $${gift}K for a new school wing. Residents there are pleased with how you've looked after the area.`);
    }
  }
}

// Settling a petition: what each choice does.
export function settlePetition(w, i, how) {
  const town = w.towns[i];
  if (!town) return;
  // a real concession: past change is forgiven, only new change counts
  if (how === "lowrise") {
    town.charBase = { t: w.t, s: snapshot(w, null)[i] };
    town.charLoss = (town.charLoss ?? 0) * 0.5;
    town.lowRise = true;
  }
  // being heard calms things for now, but more towers will stir it up again
  if (how === "consult") {
    town.charLoss = (town.charLoss ?? 0) * 0.5;
    town.slowUntil = w.t + 12;
  }
}

// Low-rise HDB near landed homes, when the town has chosen it.
export function lowRiseHere(w, l) {
  return !!w.towns[l.town]?.lowRise && nearLanded(w).has(l.id) && w.year >= LOT_TYPES.lowrise.from;
}

// Private property income lost when landed owners sell up.
export const landedFlight = (town) => 1 - Math.min(0.25, (town?.charLoss ?? 0) / 250);

// Education: top campuses and universities in reach, and private housing,
// raise it slowly. Higher means higher incomes but fewer babies.
export function eduTarget(t) {
  if (!t.pop) return 50;
  return clamp(45 + (40 * (t.edu || 0)) / t.pop + (25 * (t.ptePop || 0)) / t.pop, 0, 100);
}
export const eduTfr = (edu) => 1 - clamp(((edu ?? 50) - 50) / 50, 0, 1) * 0.18;
export const eduIncome = (edu) => 1 + clamp(((edu ?? 50) - 50) / 50, 0, 1) * 0.2;
