// Who lives where: occupancy of homes, vacancies, and where displaced
// residents go when homes are cleared. Shared by world.js (actions) and
// sim.js (monthly simulation) so previews and outcomes use the same rules.
import { LOT_TYPES, KAMPONG } from "./defs.js";

// residents living in a building right now
export function residents(b) {
  if (!b) return 0;
  const T = LOT_TYPES[b.type];
  if (!T.cap || b.state === "build") return 0;
  return b.occ ?? T.cap;
}

// homes, people and empty flats per town
export function housingByTown(w) {
  const out = w.towns.map(() => ({ cap: 0, occ: 0, vacant: 0, building: 0, kampong: 0 }));
  for (const l of w.lots) {
    if (!l.b) continue;
    const T = LOT_TYPES[l.b.type];
    if (!T.cap) continue;
    const o = out[l.town];
    if (l.b.state === "build") {
      o.building += T.cap;
      continue;
    }
    const n = residents(l.b);
    o.cap += T.cap;
    o.occ += n;
    o.vacant += T.cap - n;
  }
  for (const k of w.kampongs) out[k.town].kampong += k.houses.length * KAMPONG.housePop;
  return out;
}

// Plan where n displaced residents of town `town` would go.
// They take empty flats in their own town first, then elsewhere in the
// region; some give up and leave the region; the rest join the queue.
export function relocationPlan(w, n, town, opts = {}) {
  const H = opts.housing || housingByTown(w);
  const exclude = opts.excludeLots || new Set();
  // empty flats in buildings that are about to be cleared don't count
  let lostVacant = 0;
  for (const id of exclude) {
    const l = w.lots.find((x) => x.id === id);
    if (l?.b && l.town === town && l.b.state !== "build") {
      const T = LOT_TYPES[l.b.type];
      if (T.cap) lostVacant += T.cap - residents(l.b);
    }
  }
  const sameFree = Math.max(0, H[town].vacant - lostVacant);
  const same = Math.min(n, sameFree);
  let rest = n - same;
  const otherFree = H.reduce((a, h, i) => a + (i === town ? 0 : h.vacant), 0);
  // not everyone wants to move to another town
  const other = Math.min(Math.round(rest * 0.6), otherFree);
  rest -= other;
  const leaveRate = opts.sers ? 0.03 : 0.08 + Math.min(0.25, w.waitlist / Math.max(20000, (w.stats.pop || 0) * 2));
  const leave = Math.round(rest * leaveRate);
  const queue = rest - leave;
  const anger = ((queue + leave) / 220 + other / 900) * (opts.sers ? 0.4 : 1) * (opts.kampong ? 1.4 : 1);
  return { n, same, other, queue, leave, anger, queueAfter: w.waitlist + queue, sameFree, otherFree };
}

// Move people into empty flats (same town first, then others).
function fillVacancies(w, n, town, exclude) {
  let left = n;
  const order = w.lots
    .filter((l) => l.b && l.b.state !== "build" && LOT_TYPES[l.b.type].cap && !exclude.has(l.id))
    .sort((a, b) => (a.town === town ? 0 : 1) - (b.town === town ? 0 : 1));
  for (const l of order) {
    if (left <= 0) break;
    const T = LOT_TYPES[l.b.type];
    const free = T.cap - residents(l.b);
    if (free <= 0) continue;
    const k = Math.min(free, left);
    l.b.occ = residents(l.b) + k;
    left -= k;
  }
  return n - left;
}

// Apply a relocation. Returns the plan that happened.
export function displace(w, n, town, opts = {}) {
  n = Math.round(n);
  if (n <= 0) return null;
  const plan = relocationPlan(w, n, town, opts);
  const exclude = opts.excludeLots || new Set();
  // same-town moves
  const sameDone = fillVacancies(w, plan.same, town, exclude);
  // moves to other towns
  let otherDone = 0;
  if (plan.other > 0) {
    const others = w.lots.filter((l) => l.b && l.b.state !== "build" && l.town !== town && LOT_TYPES[l.b.type].cap && !exclude.has(l.id));
    let left = plan.other;
    for (const l of others) {
      if (left <= 0) break;
      const T = LOT_TYPES[l.b.type];
      const free = T.cap - residents(l.b);
      if (free <= 0) continue;
      const k = Math.min(free, left);
      l.b.occ = residents(l.b) + k;
      left -= k;
      otherDone += k;
    }
  }
  const unplaced = plan.same - sameDone + (plan.other - otherDone);
  w.waitlist += plan.queue + unplaced;
  w.leftRegion = (w.leftRegion || 0) + plan.leave;
  w.towns[town].anger += plan.anger;
  return plan;
}
