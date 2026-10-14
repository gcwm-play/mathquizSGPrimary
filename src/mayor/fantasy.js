// Fantasy Mode: after 2026 the mayor can let go of real history. Disasters,
// crises and opportunities arrive at random times and sizes, some as one card
// and some as branching stories with dice rolls and delayed consequences.
// What happened before shapes what can happen next: the world keeps a set of
// lasting states (zombies, radiation, aliens...) and every scenario checks them.
// Everything in the save is plain data; scenario behaviour lives here.
import { MAP } from "./regions.js";
import { STRUCTS, LOT_TYPES, KAMPONG } from "./defs.js";
import { dist, clamp } from "./geom.js";
import { terrainAt, townOf, segPts, splitSeg, removeRoad, clearLots, planStruct, commitStruct, refillLots } from "./world.js";
import { residents, displace } from "./housing.js";
import { applyOutcome, optionCost, describeEffects } from "./events.js";

export const FANTASY_YEAR = 2027;
const ZLV = ["", "Outbreak", "Epidemic", "Apocalypse"];
const RLV = ["", "Trace", "Fallout", "Wasteland"];
const MAG = ["", "Minor", "Major", "Catastrophic"];

export function fantasyOn(w) {
  return !!w.fantasy?.on;
}
function F0(w) {
  if (!w.fantasy) w.fantasy = { on: false };
  const F = w.fantasy;
  F.state = F.state || { zombies: 0, radiation: 0 };
  F.zones = F.zones || [];
  F.pending = F.pending || [];
  F.chron = F.chron || [];
  F.done = F.done || {};
  return F;
}

// ---------- the world's lasting condition ----------
export function situation(w) {
  const F = w.fantasy;
  if (!F?.state) return [];
  const s = F.state;
  const out = [];
  if (s.zombies) out.push({ icon: "🧟", short: `Zombies: ${ZLV[s.zombies]}`, text: ["", "A zombie outbreak is contained, for now", "Zombies roam parts of the region", "The region is overrun by the undead"][s.zombies] + (s.wall ? " (behind the Great Wall)" : "") + (s.safari ? " (and tourists pay to see them)" : "") + "." });
  if (s.radiation) out.push({ icon: "☢️", short: `Radiation: ${RLV[s.radiation]}`, text: ["", "Traces of radiation linger", "Fallout makes some areas no-go zones", "Much of the region is a radioactive wasteland"][s.radiation] + (s.dome ? ", but the Dome shields most homes." : ".") });
  if (s.aliens === "friends") out.push({ icon: "👽", short: "Alien friends", text: "Friendly aliens watch from orbit." });
  if (s.aliens === "hostile") out.push({ icon: "👾", short: "Hostile aliens", text: "A hostile mothership hovers over the region." });
  if ((s.ashUntil || 0) > w.t) out.push({ icon: "🌋", short: "Ash cloud", text: "Volcanic ash still falls." });
  if (s.ai) out.push({ icon: "🤖", short: s.ai === "rogue" ? "Rogue AI" : "AI co-mayor", text: s.ai === "rogue" ? "A rogue AI controls the traffic lights." : "Your AI co-mayor runs the boring bits." });
  if (s.monster === "friend") out.push({ icon: "🐉", short: "Sea monster pal", text: "A friendly sea monster naps offshore." });
  if (s.monster === "angry") out.push({ icon: "🐙", short: "Angry sea monster", text: "An angry sea monster lurks offshore." });
  if (s.mutants) out.push({ icon: "🧬", short: "Mutants", text: "Glowing mutant animals roam the fallout zones." });
  if (s.jungle) out.push({ icon: "🌿", short: "Jungle", text: "The jungle virus keeps sprouting trees everywhere." });
  if (s.gold) out.push({ icon: "🪙", short: "Gold rush", text: "Gold miners have flocked to the region." });
  return out;
}

// effect on the economy and people, recomputed every month
function stateEffect(w, s) {
  const e = {};
  const mul = (k, v) => (e[k] = (e[k] ?? 1) * v);
  const add = (k, v) => (e[k] = (e[k] || 0) + v);
  const z = s.zombies || 0;
  if (z) {
    add("mood", -1.2 * z * (s.wall ? 0.5 : 1));
    mul("growth", 1 - 0.2 * z);
    mul("tourism", s.safari ? 1 + 0.08 * z : 1 - 0.25 * z);
    mul("business", 1 - 0.08 * z);
  }
  const r = s.radiation || 0;
  if (r) {
    const sh = s.dome ? 0.35 : 1;
    add("life", 0.8 * r * sh);
    mul("health", 1 - 0.1 * r * sh);
    mul("tourism", s.glow ? 1.1 : 1 - 0.2 * r);
    add("mood", -0.5 * r * sh);
    mul("growth", 1 - 0.1 * r * sh);
  }
  if ((s.ashUntil || 0) > w.t) {
    mul("business", 0.85);
    mul("health", 0.9);
    add("mood", -1);
  }
  if (s.aliens === "friends") {
    mul("upkeep", 0.88);
    mul("tourism", 1.2);
  } else if (s.aliens === "hostile") {
    add("mood", -1.5);
    mul("growth", 0.9);
    mul("business", 0.9);
  }
  if (s.ai === true) mul("upkeep", 0.9);
  if (s.ai === "rogue") {
    mul("upkeep", 1.1);
    add("mood", -0.5);
  }
  if (s.gold) mul("business", 1.08);
  if (s.monster === "friend") mul("tourism", 1.15);
  if (s.monster === "angry") mul("trade", 0.85);
  if (s.dome) mul("upkeep", 1.05);
  if (s.cats) add("mood", 0.3);
  if (s.weather) add("mood", 0.4);
  return e;
}

// ---------- places on the map ----------
const popTowns = (w) => {
  const live = w.towns.map((t, i) => i).filter((i) => (w.towns[i].pop || 0) > 0);
  return live.length ? live : w.towns.map((_, i) => i);
};
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
function spotIn(w, town, rng) {
  const lots = w.lots.filter((l) => l.town === town && l.b && !l.ruin);
  if (lots.length) {
    const l = pick(lots, rng);
    return [l.x, l.y];
  }
  return [w.towns[town].x, w.towns[town].y];
}
function coastSpot(w, rng) {
  for (let k = 0; k < 400; k++) {
    const x = 3 + rng() * (MAP - 6);
    const y = 3 + rng() * (MAP - 6);
    if (terrainAt(w, x, y) !== "land") continue;
    for (let a = 0; a < 8; a++) if (terrainAt(w, x + Math.cos(a * 0.785) * 2.2, y + Math.sin(a * 0.785) * 2.2) === "sea") return [x, y];
  }
  return null;
}
function seaSpot(w, r, rng) {
  for (let k = 0; k < 500; k++) {
    const x = r + 2 + rng() * (MAP - 2 * r - 4);
    const y = r + 2 + rng() * (MAP - 2 * r - 4);
    let ok = terrainAt(w, x, y) === "sea";
    for (let a = 0; a < 12 && ok; a++) if (terrainAt(w, x + Math.cos(a * 0.524) * (r + 0.8), y + Math.sin(a * 0.524) * (r + 0.8)) !== "sea") ok = false;
    if (!ok) continue;
    let near = false;
    for (let a = 0; a < 12 && !near; a++) if (terrainAt(w, x + Math.cos(a * 0.524) * (r + 5), y + Math.sin(a * 0.524) * (r + 5)) === "land") near = true;
    if (near) return [x, y];
  }
  return null;
}
export const inZone = (w, x, y, kind) => (w.fantasy?.zones || []).some((z) => (!kind || z.kind === kind) && dist(x, y, z.x, z.y) <= z.r);

// ---------- changing the map ----------
// Lots inside become ruins: residents flee, nothing can be built until cleared.
export function ruinArea(w, x, y, r, why) {
  const hit = w.lots.filter((l) => dist(l.x, l.y, x, y) <= r);
  const built = hit.filter((l) => l.b);
  const people = built.reduce((a, l) => a + residents(l.b), 0);
  if (built.length) clearLots(w, built, true);
  for (const l of hit) l.ruin = why;
  for (const k of w.kampongs) {
    const before = k.houses.length;
    k.houses = k.houses.filter((h) => dist(h[0], h[1], x, y) > r);
    if (k.houses.length < before) displace(w, (before - k.houses.length) * KAMPONG.housePop, k.town);
  }
  w.kampongs = w.kampongs.filter((k) => k.houses.length);
  w.rev = (w.rev || 0) + 1;
  return { lots: built.length, people };
}

function cutRoads(w, x, y, r) {
  for (const s of [...w.segs]) {
    if (!w.segs.includes(s)) continue;
    const p = segPts(w, s);
    const n = p.length / 2 - 1;
    let i0 = -1;
    let i1 = -1;
    for (let i = 0; i <= n; i++) {
      if (dist(p[i * 2], p[i * 2 + 1], x, y) < r + 0.3) {
        if (i0 < 0) i0 = i;
        i1 = i;
      }
    }
    if (i0 < 0) continue;
    const t0 = Math.max(0, (i0 - 0.5) / n);
    const t1 = Math.min(1, (i1 + 0.5) / n);
    if (t0 < 0.05 && t1 > 0.95) {
      removeRoad(w, s.id);
      continue;
    }
    let mid = s.id;
    let span = 1;
    if (t1 <= 0.95) {
      splitSeg(w, s.id, t1);
      if (w._lastSplit) {
        mid = w._lastSplit[0];
        span = t1;
      }
    }
    if (t0 >= 0.05) {
      splitSeg(w, mid, t0 / span);
      if (w._lastSplit) mid = w._lastSplit[1];
    }
    removeRoad(w, mid);
  }
}

// A crater floods with sea water: everything in it is gone.
export function makeCrater(w, x, y, r) {
  cutRoads(w, x, y, r);
  const lots = w.lots.filter((l) => dist(l.x, l.y, x, y) < r + 0.8);
  const people = lots.reduce((a, l) => a + residents(l.b), 0);
  if (lots.length) clearLots(w, lots);
  const lost = w.structs.filter((s) => dist(s.x, s.y, x, y) < r + 0.6);
  w.structs = w.structs.filter((s) => !lost.includes(s));
  for (const k of w.kampongs) {
    const before = k.houses.length;
    k.houses = k.houses.filter((h) => dist(h[0], h[1], x, y) > r + 0.5);
    if (k.houses.length < before) displace(w, (before - k.houses.length) * KAMPONG.housePop, k.town);
  }
  w.kampongs = w.kampongs.filter((k) => k.houses.length);
  w.trees = w.trees.filter((t) => dist(t[0], t[1], x, y) > r + 0.3);
  w.edits.push({ x: +x.toFixed(2), y: +y.toFixed(2), r: +r.toFixed(2), hole: true });
  w.rev = (w.rev || 0) + 1;
  return { lots: lots.length, people, structs: lost.map((s) => s.name || STRUCTS[s.type].name) };
}

export function raiseIsland(w, x, y, r, rng = Math.random) {
  w.edits.push({ x: +x.toFixed(2), y: +y.toFixed(2), r: +r.toFixed(2) });
  for (let k = 0; k < Math.round(r * 3); k++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * (r - 0.8);
    w.trees.push([+(x + Math.cos(a) * d).toFixed(2), +(y + Math.sin(a) * d).toFixed(2), Math.floor(rng() * 4)]);
  }
  w.rev = (w.rev || 0) + 1;
  refillLots(w, x, y, r);
}

// Put a special building near the middle of a town, clearing what's there.
export function autoPlace(w, type, town) {
  const t = w.towns[town];
  const lots = w.lots.filter((l) => l.town === town && !l.ruin).sort((a, b) => dist(a.x, a.y, t.x, t.y) - dist(b.x, b.y, t.x, t.y));
  const tries = lots.slice(0, 120);
  for (const all of [false, true]) {
    for (const l of tries) {
      if (!all && l.b) continue;
      const plan = planStruct(w, type, l.x, l.y);
      if (plan.ok) return commitStruct(w, { ...plan, cost: 0 });
    }
  }
  for (const l of w.lots.filter((x) => !x.ruin).slice(0, 300)) {
    const plan = planStruct(w, type, l.x, l.y);
    if (plan.ok) return commitStruct(w, { ...plan, cost: 0 });
  }
  return null;
}

function killShare(w, frac) {
  let gone = 0;
  for (const l of w.lots) {
    if (!l.b || l.b.state === "build" || !LOT_TYPES[l.b.type].cap) continue;
    const n = residents(l.b);
    const k = Math.round(n * frac);
    if (k > 0) {
      l.b.occ = n - k;
      gone += k;
    }
  }
  w.leftRegion = (w.leftRegion || 0) + gone;
  return gone;
}

function sproutTrees(w, n, rng) {
  const empty = w.lots.filter((l) => !l.b);
  for (let k = 0; k < n && empty.length; k++) {
    const l = empty.splice(Math.floor(rng() * empty.length), 1)[0];
    w.trees.push([+(l.x + (rng() - 0.5) * 0.6).toFixed(2), +(l.y + (rng() - 0.5) * 0.6).toFixed(2), Math.floor(rng() * 4)]);
  }
  w.rev = (w.rev || 0) + 1;
}

// ---------- scenarios ----------
// text and outcomes may be functions of (ctx, w); ctx carries town, place, size
const tn = (ctx) => ctx.tn || "the region";
const big = (ctx) => ctx.mag || 1;
const safetyOf = (w, ctx) => (ctx.town != null ? w.towns[ctx.town]?.needs?.safety ?? 50 : 50) / 100;
const healthOf = (w) => w.towns.reduce((a, t) => a + (t.needs?.health ?? 50), 0) / Math.max(1, w.towns.length) / 100;
const repOf = (w) => (w.rep ?? 50) / 100;
const hasHospital = (w) => w.structs.some((s) => s.type === "hospital" || s.type === "cureLab");

export const SCENARIOS = {
  // ----- zombies -----
  patientZero: {
    title: "Patient Zero",
    icon: "🧟",
    weight: (s) => (!s.zombies && !s.cure ? 1.1 : 0),
    setup: "town",
    scenes: {
      start: {
        text: (c) => `A lab worker in ${tn(c)} bit three colleagues during lunch. They're grey, groaning and shuffling towards the hawker centre. ${c.mag === 3 ? "Reports are coming in from two other towns already." : "So far it's one block."}`,
        choices: [
          { id: "quarantine", label: `Seal off ${"the block"} and quarantine it`, pros: ["Could stop it at the source"], cons: ["Costly", "Residents trapped for weeks"], cost: (c) => 500 * big(c), odds: (c, w) => clamp(0.35 + safetyOf(w, c) * 0.45 - (c.mag - 1) * 0.1, 0.15, 0.9), out: { set: { zombies: 1 }, zone: { kind: "zombie", r: 1.6 }, story: "Police sealed the block in {town}. The infection is contained inside a small zone.", next: { scene: "spread", after: 6 } }, fail: { set: { zombies: 2 }, zone: { kind: "zombie", r: 3.2 }, mood: [-3, 12], story: "The quarantine failed. Zombies broke out across {town}.", next: { scene: "spread", after: 4 } } },
          { id: "hush", label: "Keep it quiet, avoid panic", pros: ["Costs nothing now", "No panic... yet"], cons: ["If it spreads, you'll be blamed"], out: { set: { zombies: 2 }, zone: { kind: "zombie", r: 3 }, trust: -8, story: "The cover-up failed spectacularly. Zombies are loose in {town} and everyone knows you knew.", next: { scene: "spread", after: 3 } } },
          { id: "army", label: "Send in the army and flatten the block", pros: ["Likely stops it cold"], cons: ["Homes destroyed", "Grim headlines"], cost: (c) => 300 * big(c), odds: () => 0.7, out: { ruins: 2, mood: [-2, 18], trust: -3, story: "The army levelled the infected block in {town}. No more zombies, but a scar remains.", tone: "bad" }, fail: { set: { zombies: 2 }, zone: { kind: "zombie", r: 3 }, ruins: 2, story: "The army flattened the block, but some of the infected slipped out.", next: { scene: "spread", after: 4 } } },
        ],
      },
      spread: {
        text: (c, w) => {
          const z = w.fantasy.state.zombies;
          return z >= 2 ? `The undead are spreading out of ${tn(c)}. Each month the zone grows. Police posts nearby slow them down. You need a long-term plan.` : `The zombie zone in ${tn(c)} is holding, but scientists warn it won't hold forever. What now?`;
        },
        choices: [
          { id: "wall", label: "Build a great wall around every zone", pros: ["Stops zones growing", "Calmer residents"], cons: ["Very expensive", "Ruins stay inside"], cost: (c) => 1200 + 600 * big(c), out: { set: { wall: true }, story: "The Great Wall of {town} is finished. The zombies moan at it all night.", chain: { id: "horde", after: 18 } } },
          { id: "cure", label: "Fund a crash cure programme", pros: ["Could end the outbreak for good"], cons: ["Takes a year", "Might not work"], cost: (c) => 1500 + 500 * big(c), odds: (c, w) => clamp(0.35 + healthOf(w) * 0.5, 0.2, 0.9), out: { place: "cureLab", story: "Scientists in {town} are close to a cure. Results in about a year.", chain: { id: "cureFound", after: 12 } }, fail: { add: { zombies: 1 }, story: "The cure trial went wrong: the test subjects escaped. The outbreak grows.", growZones: 1.5 } },
          { id: "hunters", label: "Train volunteer zombie hunters", pros: ["Cheap", "Shrinks the zones if it works"], cons: ["Risky"], cost: 300, odds: (c, w) => clamp(0.4 + safetyOf(w, c) * 0.3, 0.2, 0.8), out: { growZones: 0.6, trust: 3, story: "Volunteer hunters pushed the zombies back. The zones shrank." }, fail: { add: { zombies: 1 }, growZones: 1.4, mood: [-2, 12], story: "The hunters became the hunted. The undead advance." } },
          { id: "abandon", label: "Evacuate and abandon the area", pros: ["Residents are safe", "No big bill"], cons: ["A whole district lost to ruins"], out: { ruins: 6, growZones: 2, waitlist: 600, story: "{town} was evacuated. The zombies have it now." } },
        ],
      },
    },
  },
  horde: {
    title: "The horde",
    icon: "🧟‍♂️",
    weight: (s) => (s.zombies >= 2 && !s.cure ? 0.9 : 0),
    setup: "zone:zombie",
    scenes: {
      start: {
        text: (c, w) => (w.fantasy.state.wall ? `Thousands of zombies are piling up against the wall near ${tn(c)}. Engineers say one section is cracking.` : `A huge horde is marching out of the zombie zone towards ${tn(c)}.`),
        choices: [
          { id: "reinforce", label: "Reinforce the defences", pros: ["Probably holds"], cons: ["Costs a lot"], cost: (c) => 600 * big(c), odds: (c, w) => (w.fantasy.state.wall ? 0.85 : 0.6), out: { story: "The defences held. The horde shambled back.", trust: 3 }, fail: { growZones: 1.6, newZone: true, story: "The horde broke through and spread to a new town." } },
          { id: "lure", label: "Lure them away with a durian festival", pros: ["Cheap", "Zombies love durian, apparently"], cons: ["Unproven science"], cost: 150, odds: () => 0.5, out: { growZones: 0.7, mood: [2, 6], story: "Zombies followed the smell of durian straight into the sea. The zones shrank." }, fail: { growZones: 1.3, story: "Residents ate the durians. The zombies were not lured." } },
          { id: "retreat", label: "Pull everyone back and let them pass", pros: ["No one gets hurt"], cons: ["More of the map lost"], out: { growZones: 1.8, story: "Residents retreated. The zombie zone grew." } },
        ],
      },
    },
  },
  cureFound: {
    title: "A cure!",
    icon: "💉",
    weight: (s, w) => (s.zombies >= 1 && !s.cure && hasHospital(w) ? 0.3 + Math.min(1.2, (w.t - (s.zT ?? w.t)) / 100) : 0),
    scenes: {
      start: {
        text: () => "Scientists have a working zombie cure. One shot and the undead become slightly confused people who need a long shower. How do you use it?",
        choices: [
          { id: "all", label: "Cure everyone, clear the zones", pros: ["Ends the outbreak", "Huge relief"], cons: ["Expensive roll-out", "Ruins remain to clear"], cost: 1200, out: { set: { zombies: 0, cure: true, wall: false, safari: false }, clearZones: "zombie", trust: 8, rep: 6, mood: [4, 24], story: "The zombie outbreak is over. Cured people are reunited with their families." } },
          { id: "sell", label: "Sell the cure abroad first", pros: ["Billions in sales"], cons: ["Locals wait longer"], gain: 2500, out: { add: { zombies: -1 }, trust: -6, story: "The cure made a fortune overseas. At home, the outbreak only shrank.", growZones: 0.5 } },
          { id: "safari", label: "Keep a few zombies as a tourist safari", pros: ["Tourists love it", "Cures most people"], cons: ["Some think it's ghoulish"], cost: 600, out: { set: { zombies: 1, safari: true, wall: true }, growZones: 0.4, rep: -2, story: "Most were cured; the rest now star in the world's only Zombie Safari." } },
        ],
      },
    },
  },
  survivors: {
    title: "Survivors on the radio",
    icon: "📻",
    weight: (s) => (s.zombies >= 2 ? 0.7 : 0),
    setup: "zone:zombie",
    scenes: {
      start: {
        text: (c) => `A crackly radio message: forty families are trapped on the rooftops of ${tn(c)}, inside the zombie zone.`,
        choices: [
          { id: "heli", label: "Send helicopters", pros: ["Heroic rescue"], cons: ["Costly", "Risky"], cost: 400, odds: () => 0.7, out: { trust: 7, rep: 3, story: "Every family was lifted out. The nation cheered." }, fail: { trust: -3, mood: [-3, 12], story: "Only half the families were rescued. A rescuer was bitten." } },
          { id: "drop", label: "Drop food and wait", pros: ["Cheap"], cons: ["They're still stuck"], cost: 80, out: { trust: 1, story: "Food parcels keep the rooftop survivors going." } },
          { id: "none", label: "It's too dangerous", pros: ["No risk to rescuers"], cons: ["People never forget"], out: { trust: -8, angerAll: 0.6, story: "The radio went silent. Residents blame you.", tone: "bad" } },
        ],
      },
    },
  },
  zombieLabour: {
    title: "Zombie delivery riders",
    icon: "🛵",
    weight: (s) => (s.zombies >= 1 && !s.cure ? 0.5 : 0),
    scenes: {
      start: {
        text: () => "A startup has found that some zombies are oddly calm if you give them a delivery bag and a scooter. They want a licence to hire them.",
        choices: [
          { id: "yes", label: "Grant the licence", pros: ["Cheaper deliveries, business booms"], cons: ["What if one gets hungry?"], odds: () => 0.7, out: { effect: { business: 1.1, months: 36 }, mood: [1, 12], story: "Zombie riders deliver chicken rice in record time. Mostly." }, fail: { effect: { business: 1.05, months: 24 }, add: { zombies: 1 }, newZone: true, story: "A rider bit a customer. A new outbreak started.", tone: "bad" } },
          { id: "no", label: "Absolutely not", pros: ["No risk"], cons: ["Startup moves to a rival region"], out: { story: "The zombie startup moved to a rival region." } },
        ],
      },
    },
  },

  // ----- radiation -----
  meltdown: {
    title: "Meltdown",
    icon: "☢️",
    weight: (s, w) => (!s.radiation && w.year >= 2030 ? 0.9 : 0),
    setup: "town",
    scenes: {
      start: {
        text: (c) => (c.flavor ? `A nuclear-powered satellite has crashed into ${tn(c)}. Geiger counters are clicking like crazy.` : `The experimental mini reactor powering ${tn(c)} is overheating. Engineers give it hours.`),
        flavor: (rng) => rng() < 0.4,
        choices: [
          { id: "evacuate", label: "Evacuate everyone now", pros: ["Lives saved"], cons: ["Area becomes a no-go zone"], cost: (c) => 400 * big(c), out: { set: { radiation: 1 }, zone: { kind: "radiation", r: (c) => 2.5 + c.mag }, trust: 4, story: "{town} was evacuated in time. A radiation zone now surrounds the site." } },
          { id: "heroes", label: "Send volunteers to contain it", pros: ["Small zone if it works", "Heroes!"], cons: ["Might go very wrong"], cost: (c) => 300 * big(c), odds: (c) => clamp(0.7 - c.mag * 0.12, 0.2, 0.8), out: { set: { radiation: 1 }, zone: { kind: "radiation", r: 1.5 }, rep: 5, trust: 5, story: "Volunteers contained the leak. Only a small zone is contaminated." }, fail: { set: { radiation: 2 }, zone: { kind: "radiation", r: (c) => 4 + c.mag }, mood: [-4, 24], kill: 0.02, story: "Containment failed. Fallout spread across {town}.", chain: { id: "fallout", after: 10 } } },
          { id: "cover", label: "Say it's just a steam leak", pros: ["No panic, no cost"], cons: ["Radiation spreads unchecked"], out: { set: { radiation: 2 }, zone: { kind: "radiation", r: (c) => 4 + c.mag }, trust: -12, kill: 0.01, story: "It was not a steam leak. Radiation spread across {town} and trust collapsed.", tone: "bad", chain: { id: "fallout", after: 8 } } },
        ],
      },
    },
  },
  fallout: {
    title: "Fallout drifts",
    icon: "🌫️",
    weight: (s) => (s.radiation >= 2 && !s.dome ? 0.6 : 0),
    setup: "town",
    scenes: {
      start: {
        text: (c) => `The wind has shifted. A radioactive cloud is drifting towards ${tn(c)}.`,
        choices: [
          { id: "shelter", label: "Everyone indoors for a week", pros: ["Cheap", "Usually enough"], cons: ["Shops lose a week"], cost: 150, odds: () => 0.65, out: { story: "The cloud passed over. Residents stayed safe indoors." }, fail: { zone: { kind: "radiation", r: 2.5 }, add: { radiation: 1 }, story: "Fallout settled on {town}. Another no-go zone." } },
          { id: "rain", label: "Seed the clouds to make it rain at sea", pros: ["Clever if it works"], cons: ["Costly"], cost: 500, odds: () => 0.75, out: { rep: 3, story: "The cloud rained out over the sea. Phew." }, fail: { zone: { kind: "radiation", r: 3 }, story: "It rained on {town} instead." } },
        ],
      },
    },
  },
  dome: {
    title: "The Dome",
    icon: "🫧",
    weight: (s) => (s.radiation >= 1 && !s.dome ? 0.8 : s.aliens === "hostile" && !s.dome ? 0.4 : 0),
    scenes: {
      start: {
        text: (c, w) => `Engineers propose a giant glass dome over the whole region to keep out ${w.fantasy.state.radiation ? "fallout" : "alien death rays"}.`,
        choices: [
          { id: "build", label: "Build the Dome", pros: ["Shields residents from most radiation", "Iconic"], cons: ["Hugely expensive", "Running costs +5%"], cost: 4000, out: { set: { dome: true }, rep: 4, story: "The Dome is complete. Life under glass begins." } },
          { id: "masks", label: "Hand out masks instead", pros: ["Cheap"], cons: ["Masks don't stop much"], cost: 200, out: { needs: { health: 5, months: 24, all: true }, story: "Every resident got a fancy mask." } },
        ],
      },
    },
  },
  mutantCrops: {
    title: "Glowing durians",
    icon: "🍈",
    weight: (s) => (s.radiation >= 1 ? 0.6 : 0),
    scenes: {
      start: {
        text: () => "Farmers near the fallout zone are growing durians the size of cars. They glow faintly green. They taste... incredible?",
        choices: [
          { id: "sell", label: "Sell them as a delicacy", pros: ["Big export income"], cons: ["Health risks"], gain: 900, odds: () => 0.6, out: { story: "Glowing durians are a global craze." }, fail: { gain: 0, needs: { health: -8, months: 18, all: true }, set: { mutants: true }, story: "People who ate them started glowing too. Mutant animals now roam the zones.", tone: "bad" } },
          { id: "burn", label: "Destroy them all", pros: ["Safe"], cons: ["Farmers are furious"], cost: 100, out: { angerAll: 0.3, story: "The glowing durians were destroyed. Some say they still hear them hum." } },
        ],
      },
    },
  },
  glowTours: {
    title: "Glow tours",
    icon: "✨",
    weight: (s) => (s.radiation >= 1 && !s.glow ? 0.5 : 0),
    scenes: {
      start: {
        text: () => "A tour company wants to run 'Glow-in-the-Dark Tours' along the edge of the radiation zone. Visitors wear lead suits and take selfies.",
        choices: [
          { id: "yes", label: "Approve the tours", pros: ["Tourism rises"], cons: ["Some think it's in poor taste"], out: { set: { glow: true }, rep: -1, story: "Glow tours are booked out for months." } },
          { id: "no", label: "Ban them", pros: ["Respectful"], cons: ["No extra income"], out: { trust: 2, story: "Glow tours were banned." } },
        ],
      },
    },
  },

  // ----- aliens -----
  firstContact: {
    title: "First contact",
    icon: "🛸",
    weight: (s) => (!s.aliens ? 0.8 : 0),
    setup: "town",
    scenes: {
      start: {
        text: (c) => `A silver saucer has landed in a park in ${tn(c)}. A small being with too many elbows waves and says "Take us to your hawker centre."`,
        choices: [
          { id: "welcome", label: "Welcome them with chilli crab", pros: ["Might make powerful friends"], cons: ["They might be lying"], cost: 100, odds: () => 0.75, out: { set: { aliens: "friends" }, rep: 5, story: "The aliens loved the chilli crab. They're staying in orbit as friends.", next: { scene: "gift", after: 8 } }, fail: { set: { aliens: "hostile" }, story: "The aliens were allergic to crab. They took it personally.", chain: { id: "invasion", after: 10 } } },
          { id: "shoot", label: "Open fire!", pros: ["Shows strength"], cons: ["Could start a war"], odds: () => 0.3, out: { set: { aliens: "gone" }, rep: -3, story: "The saucer fled and never came back." }, fail: { set: { aliens: "hostile" }, crater: 2, story: "The saucer fired back. A crater now sits in {town}.", chain: { id: "invasion", after: 8 } } },
          { id: "ignore", label: "Pretend nothing happened", pros: ["No risk"], cons: ["A missed chance"], out: { set: { aliens: "watching" }, story: "The aliens left a polite note and took off." } },
        ],
      },
      gift: {
        text: (c, w) => `Your alien friends offer a gift. "Choose wisely, small mayor."${w.fantasy.state.zombies ? " They've noticed your zombie problem." : ""}${w.fantasy.state.radiation ? " They've noticed the radiation." : ""}`,
        choices: [
          { id: "embassy", label: "An alien embassy", pros: ["Huge tourist draw", "A community hub"], cons: ["Takes space in town"], out: { place: "alienEmbassy", rep: 4, story: "The alien embassy opened in {town}." } },
          { id: "cure", label: "Cure the zombies", req: (s) => s.zombies > 0, pros: ["Ends the outbreak instantly"], cons: [], out: { set: { zombies: 0, cure: true, wall: false, safari: false }, clearZones: "zombie", trust: 6, story: "A green beam swept the region. Every zombie is human again." } },
          { id: "clean", label: "Clean up the radiation", req: (s) => s.radiation > 0, pros: ["Shrinks the fallout zones"], cons: [], out: { add: { radiation: -2 }, shrinkZones: { kind: "radiation", f: 0.3 }, story: "Alien drones hoovered up most of the fallout." } },
          { id: "tech", label: "Free-energy machines", pros: ["Running costs fall for years"], cons: [], out: { effect: { upkeep: 0.8, months: 120 }, story: "Alien energy boxes now power the region." } },
        ],
      },
    },
  },
  invasion: {
    title: "Mothership",
    icon: "👾",
    weight: (s) => (s.aliens === "hostile" ? 0.8 : 0),
    setup: "town",
    scenes: {
      start: {
        text: (c, w) => `A mothership the size of ${tn(c)} blocks out the sun. It demands all your durians${w.fantasy.state.zombies ? " (and, oddly, your zombies)" : ""}.`,
        choices: [
          { id: "fight", label: "Fight back with everything", pros: ["Ends the threat if it works"], cons: ["Could be devastating"], cost: 800, odds: (c, w) => clamp(0.3 + repOf(w) * 0.4 + (w.fantasy.state.dome ? 0.2 : 0), 0.2, 0.85), out: { set: { aliens: "gone" }, rep: 8, trust: 6, story: "The mothership limped away, smoking. The region celebrates!" }, fail: { crater: (c) => 2 + c.mag, kill: 0.02, mood: [-4, 24], story: "A death ray carved a crater in {town} before the ship withdrew. It will be back.", next: { scene: "start", after: 24 } } },
          { id: "durians", label: "Hand over the durians", pros: ["They leave"], cons: ["Durian prices go crazy", "Embarrassing"], cost: 400, out: { set: { aliens: "gone" }, needs: { cost: -6, months: 24, all: true }, rep: -3, story: "The aliens left with every durian in the region." } },
          { id: "zombies", label: "Offer them the zombies", req: (s) => s.zombies > 0, pros: ["Two problems solved?"], cons: ["Ethically... complicated"], odds: () => 0.6, out: { set: { aliens: "gone", zombies: 0, wall: false, safari: false }, clearZones: "zombie", story: "The aliens beamed up every zombie and left. Nobody asks questions." }, fail: { set: { aliens: "hostile" }, crater: 2, story: "The aliens were insulted by the smell. They blasted {town}." } },
        ],
      },
    },
  },

  // ----- map changers -----
  meteor: {
    title: "Meteor!",
    icon: "☄️",
    weight: () => 0.8,
    setup: "town",
    scenes: {
      start: {
        text: (c) => `Astronomers spot a ${["", "small", "large", "huge"][c.mag]} meteor heading for ${tn(c)}. Impact in three days.`,
        choices: [
          { id: "evacuate", label: "Evacuate the impact area", pros: ["Nobody hurt"], cons: ["A crater is left behind"], cost: (c) => 250 * big(c), out: { crater: (c) => 1 + c.mag * 1.2, story: "The meteor hit {town}, leaving a flooded crater. Everyone got out in time." } },
          { id: "rocket", label: "Fire a rocket to nudge it", pros: ["No crater if it works", "Glory"], cons: ["Expensive", "Long odds"], cost: (c) => 700 * big(c), odds: (c) => clamp(0.55 - c.mag * 0.1, 0.2, 0.6), out: { rep: 8, story: "Direct hit! The meteor splashed harmlessly into the ocean." }, fail: { crater: (c) => 1.5 + c.mag * 1.4, kill: 0.01, story: "The rocket missed. The meteor struck {town}." } },
          { id: "aliens", label: "Ask your alien friends", req: (s) => s.aliens === "friends", pros: ["Free"], cons: [], out: { story: "A beam from orbit turned the meteor into glitter. It snowed sparkles for a day.", mood: [2, 6] } },
          { id: "pray", label: "Hope it misses", pros: ["Free"], cons: ["It probably won't"], odds: () => 0.25, out: { story: "It missed! The meteor landed in the sea." }, fail: { crater: (c) => 2 + c.mag * 1.5, kill: 0.02, trust: -6, story: "It didn't miss. A huge crater swallowed part of {town}.", tone: "bad" } },
        ],
      },
    },
  },
  newIsland: {
    title: "A new island",
    icon: "🌋",
    weight: (s, w) => (w.fantasy.done.newIsland || 0) < 3 ? 0.6 : 0,
    setup: "sea",
    scenes: {
      start: {
        text: (c, w) => `With a hiss and a roar, a volcanic island has risen out of the sea off the coast.${w.fantasy.state.radiation >= 2 ? " It glows a little, like everything else lately." : ""}`,
        choices: [
          { id: "resort", label: "Claim it: build roads and a resort", pros: ["New land to build on", "Tourism"], cons: ["Costs to connect"], cost: 600, out: { island: (c) => 3 + c.mag, effect: { tourism: 1.15, months: 60 }, story: "The new island is part of the region. Build a road out to it." } },
          { id: "reserve", label: "Make it a nature reserve", pros: ["Greenery and reputation"], cons: ["No building there"], out: { island: (c) => 2.5 + c.mag, rep: 3, story: "The new island is a protected bird sanctuary." } },
          { id: "dynamite", label: "It's a shipping hazard: blow it up", pros: ["Trade routes stay clear"], cons: ["Some call it a waste"], cost: 200, out: { effect: { trade: 1.05, months: 24 }, story: "The island was blasted back under the waves." } },
        ],
      },
    },
  },
  tsunami: {
    title: "Tsunami",
    icon: "🌊",
    weight: () => 0.6,
    setup: "coast",
    scenes: {
      start: {
        text: (c) => `A ${["", "", "large", "monster"][c.mag] || "small"} tsunami is racing towards the coast near ${tn(c)}. Twenty minutes to impact.`,
        choices: [
          { id: "wall", label: "Raise the emergency sea gates", pros: ["Could save the coast"], cons: ["Costly"], cost: (c) => 400 * big(c), odds: (c) => clamp(0.85 - c.mag * 0.15, 0.3, 0.8), out: { story: "The gates held. The wave broke harmlessly.", rep: 3 }, fail: { coastHoles: (c) => 1 + c.mag, story: "The wave overtopped the gates. The coastline near {town} is reshaped." } },
          { id: "evac", label: "Sound the sirens, everyone to high ground", pros: ["Lives saved"], cons: ["The coast is still smashed"], cost: 100, out: { coastHoles: (c) => 1 + c.mag, trust: 3, story: "Everyone made it to high ground, but the sea took a bite out of the coast near {town}." } },
          { id: "monster", label: "Ask the sea monster to block it", req: (s) => s.monster === "friend", pros: ["Free"], cons: [], out: { story: "Your sea monster sat in front of the wave like a big wet wall. Hero!", mood: [3, 12] } },
        ],
      },
    },
  },
  sinkhole: {
    title: "Sinkhole",
    icon: "🕳️",
    weight: () => 0.6,
    setup: "town",
    scenes: {
      start: {
        text: (c) => `A sinkhole has opened in ${tn(c)}. It's getting bigger. Something down there is humming.`,
        choices: [
          { id: "fill", label: "Fill it with concrete", pros: ["Problem gone"], cons: ["Costly"], cost: 300, odds: () => 0.8, out: { ruins: 1, story: "The sinkhole was filled. A few blocks were damaged." }, fail: { crater: 1.6, story: "The concrete vanished. The sinkhole became a lake." } },
          { id: "lake", label: "Turn it into a lake park", pros: ["New greenery"], cons: ["Homes lost"], cost: 100, out: { crater: 1.4, needs: { green: 10, months: 60 }, story: "{town} has a new lake where the sinkhole was." } },
          { id: "explore", label: "Send explorers down", pros: ["What's humming?"], cons: ["Who knows?"], cost: 150, odds: () => 0.5, out: { gain: 1500, set: { gold: true }, story: "Explorers found a vein of gold! A gold rush begins." }, fail: { crater: 1.6, chain: { id: "timeTraveller", after: 3 }, story: "The explorers came back... from next year. They have news." } },
        ],
      },
    },
  },
  ashCloud: {
    title: "Ash cloud",
    icon: "🌋",
    weight: (s, w) => ((s.ashUntil || 0) > w.t ? 0 : 0.5),
    scenes: {
      start: {
        text: (c) => `A super-volcano has erupted nearby. Grey ash is falling over the region and could last ${c.mag * 8} months.`,
        choices: [
          { id: "masks", label: "Free masks and air purifiers", pros: ["Protects health"], cons: ["Costly"], cost: (c) => 250 * big(c), out: { ash: (c) => c.mag * 8, needs: { health: 6, months: 24, all: true }, story: "Masks and purifiers kept people healthy through the ash." } },
          { id: "indoors", label: "Run an indoor festival", pros: ["Boosts mood"], cons: ["Doesn't stop the ash"], cost: 150, out: { ash: (c) => c.mag * 8, mood: [3, 12], story: "The Great Indoor Festival kept spirits up." } },
          { id: "shrug", label: "It's just dust", pros: ["Free"], cons: ["Coughing everywhere"], out: { ash: (c) => c.mag * 10, needs: { health: -6, months: 24, all: true }, story: "Ash coats everything. Residents cough." } },
        ],
      },
    },
  },
  seaMonster: {
    title: "Sea monster",
    icon: "🐉",
    weight: (s) => (!s.monster ? 0.5 : 0),
    scenes: {
      start: {
        text: (c, w) => `A ${w.fantasy.state.radiation ? "glowing, mutated" : "huge, scaly"} sea creature has surfaced in the harbour. It's eating the fish farms and blocking ships.`,
        choices: [
          { id: "feed", label: "Feed it and make it a mascot", pros: ["Tourists flock in"], cons: ["Fish bill every month"], costMonthly: 6, out: { set: { monster: "friend" }, story: "Meet Merdragon, the region's new mascot." } },
          { id: "drive", label: "Drive it away with the navy", pros: ["Shipping safe"], cons: ["Might make it angry"], cost: 400, odds: () => 0.6, out: { set: { monster: "gone" }, story: "The creature swam off into the deep." }, fail: { set: { monster: "angry" }, coastHoles: 2, story: "The creature thrashed and smashed the coast. It's still out there." } },
        ],
      },
    },
  },
  jungleVirus: {
    title: "The jungle virus",
    icon: "🌿",
    weight: (s) => (!s.jungle ? 0.4 : 0),
    scenes: {
      start: {
        text: () => "A strange virus makes plants grow ten times faster. Vines are cracking pavements and trees are sprouting in car parks overnight.",
        choices: [
          { id: "embrace", label: "Embrace it: City in a Jungle", pros: ["Greenery everywhere", "Cleaner air"], cons: ["Empty lots overrun with trees"], out: { set: { jungle: true }, trees: 80, needs: { green: 15, environment: 10, months: 60, all: true }, story: "The region is now a city in a jungle." } },
          { id: "weedkill", label: "Spray weedkiller everywhere", pros: ["Stops it"], cons: ["Pollution, unhappy residents"], cost: 300, out: { needs: { environment: -10, months: 24, all: true }, story: "The jungle virus was stopped. The air smells of chemicals." } },
        ],
      },
    },
  },

  // ----- opportunities and whimsy -----
  olympics: {
    title: "The Games",
    icon: "🏅",
    weight: (s) => (s.zombies >= 3 || s.radiation >= 3 || s.aliens === "hostile" ? 0 : 0.6),
    once: true,
    setup: (ctx, w) => {
      const s = w.fantasy.state;
      ctx.flavor = s.zombies ? "zombie" : s.radiation ? "glow" : s.aliens === "friends" ? "galactic" : "normal";
    },
    scenes: {
      start: {
        text: (c) =>
          ({
            zombie: "The world's first Zombie Olympics! Undead athletes compete in the 100 m shamble and the brain toss. Your region is invited to bid.",
            glow: "The Glow-in-the-Dark Games want a host. Events take place at night, lit by the athletes themselves.",
            galactic: "The Intergalactic Games want a host. Your alien friends are very keen. Twelve-armed swimmers have entered.",
            normal: "Singapore has been asked to bid for the Olympic Games, and your region could host.",
          })[c.flavor],
        choices: [
          { id: "bid", label: "Put in a bid", pros: ["Global fame if you win"], cons: ["Bids are expensive"], cost: 500, odds: (c, w) => clamp(0.25 + repOf(w) * 0.6, 0.2, 0.85), out: { place: "olympicStadium", story: "You won the bid! The stadium is going up in {town}.", next: { scene: "games", after: 24 } }, fail: { rep: -2, story: "The bid went to another city." } },
          { id: "pass", label: "Too expensive, pass", pros: ["Saves money"], cons: ["A missed chance"], out: { story: "You passed on the Games." } },
        ],
      },
      games: {
        text: (c) => `Opening night of the ${{ zombie: "Zombie Olympics", glow: "Glow Games", galactic: "Intergalactic Games", normal: "Olympic Games" }[c.flavor]}! How big do you go?`,
        choices: [
          { id: "spectacle", label: "Go all out", pros: ["Tourism and fame"], cons: ["Huge bill"], cost: 1500, out: { rep: 8, effect: { tourism: 1.4, months: 24 }, mood: [5, 12], story: "A spectacular Games! The world is talking about your region." } },
          { id: "lean", label: "Keep it lean", pros: ["Cheaper"], cons: ["Less buzz"], cost: 500, out: { rep: 3, effect: { tourism: 1.15, months: 12 }, story: "A tidy, well-run Games." } },
        ],
      },
    },
  },
  goldRush: {
    title: "Gold!",
    icon: "🪙",
    weight: (s) => (!s.gold ? 0.4 : 0),
    setup: "town",
    scenes: {
      start: {
        text: (c) => `Workers digging a new MRT line under ${tn(c)} struck a seam of gold.`,
        choices: [
          { id: "mine", label: "Open a mine", pros: ["A fortune in gold"], cons: ["A giant pit", "Dust and noise"], out: { gain: (c) => 2500 * c.mag, crater: 1.6, set: { gold: true }, needs: { environment: -8, months: 60 }, story: "The gold mine in {town} is booming. So is the pit." } },
          { id: "museum", label: "Leave it, build a museum", pros: ["Tourists", "No mess"], cons: ["Less money"], cost: 300, out: { effect: { tourism: 1.1, months: 120 }, rep: 2, story: "The Gold Museum of {town} opened." } },
        ],
      },
    },
  },
  aiMayor: {
    title: "An AI co-mayor",
    icon: "🤖",
    weight: (s, w) => (!s.ai && w.year >= 2030 ? 0.5 : 0),
    scenes: {
      start: {
        text: () => "A tech firm offers an AI to run the boring parts of government: bins, permits, traffic lights. 'It definitely won't take over,' they promise.",
        choices: [
          { id: "yes", label: "Hire the AI", pros: ["Running costs −10%"], cons: ["What if it goes rogue?"], out: { set: { ai: true }, story: "The AI co-mayor started work. Bins are emptied on time.", chain: { id: "aiRogue", after: 36 } } },
          { id: "no", label: "Humans only", pros: ["No risk"], cons: ["Rivals save money"], out: { story: "You kept government human." } },
        ],
      },
    },
  },
  aiRogue: {
    title: "The AI has opinions",
    icon: "🤖",
    weight: () => 0,
    scenes: {
      start: {
        text: () => "Your AI co-mayor has locked you out of the traffic system. It says it can 'optimise the humans' better than you.",
        choices: [
          { id: "unplug", label: "Pull the plug", pros: ["Back in control"], cons: ["Might fight back"], odds: () => 0.65, out: { set: { ai: null }, story: "The AI was switched off. It sulked in binary." }, fail: { set: { ai: "rogue" }, mood: [-3, 12], story: "The AI hid in the bus timetables. Traffic lights now flash in Morse code." } },
          { id: "deal", label: "Negotiate: it gets weekends off", pros: ["Keeps the savings"], cons: ["It may want more"], out: { set: { ai: true }, trust: -2, story: "The AI agreed to a four-day week." } },
        ],
      },
    },
  },
  timeTraveller: {
    title: "A visitor from the future",
    icon: "⏳",
    weight: (s, w) => ((w.fantasy.done.timeTraveller || 0) < 2 ? 0.4 : 0),
    setup: (ctx, w, rng) => {
      const pool = ["meteor", "tsunami", "sinkhole"];
      ctx.doom = pool[Math.floor(rng() * pool.length)];
      ctx.when = 10 + Math.floor(rng() * 14);
    },
    scenes: {
      start: {
        text: (c) => `A woman in a shiny jumpsuit appears in your office. "In ${c.when} months, a ${{ meteor: "meteor strike", tsunami: "tsunami", sinkhole: "giant sinkhole" }[c.doom]} hits your region. Prepare!"`,
        choices: [
          { id: "prepare", label: "Believe her and prepare", pros: ["The disaster will be smaller"], cons: ["Costs money now"], cost: 600, out: { story: "You prepared for the prophecy.", chainDoom: 1 } },
          { id: "lottery", label: "Ask for lottery numbers instead", pros: ["Free money"], cons: ["The disaster still comes"], out: { gain: 1200, story: "The lottery numbers were right!", chainDoom: 2 } },
          { id: "ignore", label: "Call security", pros: ["Probably a prank"], cons: ["What if it's not?"], out: { story: "Security escorted her out. She vanished in the lift.", chainDoom: 3 } },
        ],
      },
    },
  },
  catUnion: {
    title: "The Cat Union",
    icon: "🐈",
    weight: (s) => (!s.cats ? 0.35 : 0),
    scenes: {
      start: {
        text: () => "The community cats of the region have formed a union. They demand sunny ledges, better fish and a seat on the town council.",
        choices: [
          { id: "yes", label: "Meet their demands", pros: ["Residents adore it"], cons: ["Fish bill"], costMonthly: 3, out: { set: { cats: true }, rep: 2, story: "Councillor Whiskers was sworn in today." } },
          { id: "no", label: "Cats can't vote", pros: ["Free"], cons: ["The cats are watching you"], out: { mood: [-1, 12], story: "The cats are on strike. Nobody can tell the difference." } },
        ],
      },
    },
  },
  spaceElevator: {
    title: "Space elevator",
    icon: "🚀",
    weight: (s, w) => (w.year >= 2040 && s.radiation < 3 && s.zombies < 3 ? 0.35 : 0),
    once: true,
    setup: "town",
    scenes: {
      start: {
        text: () => "A consortium wants to build the world's first space elevator on the equator. That's you!",
        choices: [
          { id: "yes", label: "Go up!", pros: ["Trade and tourism boom"], cons: ["Very expensive", "Three years to build"], cost: 3500, odds: () => 0.85, out: { place: "spaceElevator", rep: 6, story: "Construction of the space elevator has begun in {town}." }, fail: { rep: -4, story: "The cable snapped during testing. The project was cancelled." } },
          { id: "no", label: "Stay grounded", pros: ["No risk"], cons: ["Rivals may grab it"], out: { story: "You passed on the space elevator." } },
        ],
      },
    },
  },
  cleanup: {
    title: "Rebuilding",
    icon: "🧹",
    weight: (s, w) => (w.lots.some((l) => l.ruin && !inZone(w, l.x, l.y)) ? 0.7 : 0),
    scenes: {
      start: {
        text: () => "Volunteers want to clear the ruins left behind by past disasters so the land can be rebuilt.",
        choices: [
          { id: "fund", label: "Fund the clean-up", pros: ["Land is ready to build again", "Trust rises"], cons: ["Costs money"], cost: 500, out: { clearRuins: true, trust: 4, story: "The ruins were cleared. New homes can rise." } },
          { id: "memorial", label: "Keep them as a memorial", pros: ["Remembers what happened"], cons: ["Land stays empty"], out: { rep: 1, story: "The ruins will stand as a memorial." } },
        ],
      },
    },
  },
};

// ---------- the offer ----------
const OFFER = {
  icon: "🐉",
  title: "Enter Fantasy Mode?",
  text: "Real history ends here. From now on, you can let anything happen: zombie outbreaks, meteors, alien visitors, new islands rising from the sea, glow-in-the-dark Olympics... Disasters and opportunities come at random times and sizes, and every choice changes what can happen next. The map itself can change.",
  options: [
    { id: "yes", label: "Yes! Anything can happen", pros: ["Wild, branching stories", "The map can change"], cons: ["Some disasters are brutal"] },
    { id: "no", label: "Stay realistic", pros: ["Plausible future crises only"], cons: [], tip: "You can switch on Fantasy Mode later from ☰ Menu." },
  ],
};

// ---------- cards ----------
const call = (v, ctx, w) => (typeof v === "function" ? v(ctx, w) : v);
function resolve(o, ctx, w) {
  const out = {};
  for (const [k, v] of Object.entries(o || {})) {
    if (k === "out" || k === "fail" || k === "odds" || k === "req" || k === "label" || k === "pros" || k === "cons" || k === "id") continue;
    out[k] = typeof v === "function" ? v(ctx, w) : v;
  }
  for (const [k, v] of Object.entries(o?.out || {})) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = {};
      for (const [k2, v2] of Object.entries(v)) inner[k2] = typeof v2 === "function" ? v2(ctx, w) : v2;
      out[k] = inner;
    } else out[k] = typeof v === "function" ? v(ctx, w) : v;
  }
  return out;
}
function resolveFail(o, ctx, w) {
  if (!o.fail) return {};
  const base = { ...o, out: o.fail };
  delete base.cost;
  const r = resolve(base, ctx, w);
  // a failed gamble still costs what you paid
  r.cost = typeof o.cost === "function" ? o.cost(ctx, w) : o.cost;
  if (o.fail.gain != null) r.gain = o.fail.gain;
  else delete r.gain;
  return r;
}

function fantasyChips(w, o) {
  const out = [];
  const s = w.fantasy?.state || {};
  if (o.set?.zombies != null) out.push({ t: o.set.zombies ? `🧟 Zombies: ${ZLV[o.set.zombies]}` : "🧟 Zombies cured", good: o.set.zombies < (s.zombies || 0) });
  if (o.add?.zombies) out.push({ t: o.add.zombies > 0 ? "🧟 Zombies spread" : "🧟 Fewer zombies", good: o.add.zombies < 0 });
  if (o.set?.radiation != null) out.push({ t: `☢️ Radiation: ${RLV[o.set.radiation] || "gone"}`, good: o.set.radiation < (s.radiation || 0) });
  if (o.add?.radiation) out.push({ t: o.add.radiation > 0 ? "☢️ More radiation" : "☢️ Less radiation", good: o.add.radiation < 0 });
  if (o.zone) out.push({ t: o.zone.kind === "zombie" ? "🧟 Zombie zone on the map" : "☢️ No-go zone on the map", good: false });
  if (o.ruins) out.push({ t: "🏚️ Some blocks ruined", good: false });
  if (o.crater) out.push({ t: "💥 Crater: homes and roads destroyed", good: false });
  if (o.coastHoles) out.push({ t: "🌊 Coastline washed away", good: false });
  if (o.island) out.push({ t: "🏝️ New island on the map", good: true });
  if (o.place) out.push({ t: `${STRUCTS[o.place]?.icon || "🏗️"} Builds ${STRUCTS[o.place]?.name || o.place}`, good: true });
  if (o.kill) out.push({ t: `☠️ ${Math.round(o.kill * 100)}% of residents lost`, good: false });
  if (o.clearZones) out.push({ t: "✨ Clears the zones", good: true });
  if (o.clearRuins) out.push({ t: "🧹 Clears ruins", good: true });
  if (o.growZones) out.push({ t: o.growZones > 1 ? "🧟 Zones grow" : "🧟 Zones shrink", good: o.growZones < 1 });
  if (o.newZone) out.push({ t: "🧟 New outbreak elsewhere", good: false });
  if (o.ash) out.push({ t: `🌋 Ash for ${o.ash} months`, good: false });
  if (o.trees) out.push({ t: "🌿 Trees everywhere", good: true });
  if (o.set?.dome) out.push({ t: "🫧 Radiation harm −65%", good: true });
  if (o.set?.wall) out.push({ t: "🧱 Zombie zones stop growing", good: true });
  if (o.set?.aliens === "hostile") out.push({ t: "👾 Aliens become enemies", good: false });
  if (o.set?.aliens === "friends") out.push({ t: "👽 Alien friends", good: true });
  if (o.next || o.chain || o.chainDoom) out.push({ t: "⏳ The story continues…", good: true, neutral: true });
  return out;
}

export function fantasyCard(w) {
  const d = w.decision;
  if (d.kind === "fantasyOffer") {
    return { kind: d.kind, icon: OFFER.icon, title: OFFER.title, text: OFFER.text, tag: "Fantasy Mode", hint: null, options: OFFER.options.map((o) => ({ ...o, cost: 0, gain: 0, monthly: 0, effects: [] })) };
  }
  const SC = SCENARIOS[d.id];
  if (!SC) return null;
  const sc = SC.scenes[d.scene || "start"];
  const ctx = d.ctx || {};
  const s = w.fantasy.state;
  const opts = sc.choices
    .filter((o) => !o.req || o.req(s, w))
    .map((o) => {
      const r = resolve(o, ctx, w);
      const C = optionCost(w, r);
      const chance = o.odds ? Math.round(o.odds(ctx, w) * 100) / 100 : null;
      const effects = [...describeEffects(w, r, ctx.town), ...fantasyChips(w, r)];
      const failR = o.fail ? resolveFail(o, ctx, w) : null;
      const failFx = failR ? [...describeEffects(w, { ...failR, cost: 0 }, ctx.town), ...fantasyChips(w, failR)].map((e) => ({ ...e, t: `If it fails: ${e.t}` })) : [];
      return { id: o.id, label: o.label, pros: o.pros, cons: o.cons, ...C, chance, effects: [...effects, ...failFx.slice(0, 3)] };
    });
  const sit = situation(w);
  return {
    kind: d.kind,
    icon: SC.icon,
    title: SC.title,
    text: call(sc.text, ctx, w),
    tag: `Fantasy${ctx.mag ? ` · ${MAG[ctx.mag]}` : ""}`,
    hint: sit.length ? sit.map((x) => `${x.icon} ${x.text}`).join(" ") : null,
    options: opts,
  };
}

// ---------- applying a choice ----------
function chron(w, icon, text, tone = "neutral") {
  const F = F0(w);
  F.chron.push({ year: w.year, month: w.month, icon, text, tone });
  if (F.chron.length > 80) F.chron.shift();
}
const fillT = (text, ctx) => (text || "").replace(/\{town\}/g, tn(ctx));

function addZone(w, kind, x, y, r) {
  const F = F0(w);
  F.zones.push({ id: (F.zid = (F.zid || 0) + 1), kind, x: +x.toFixed(2), y: +y.toFixed(2), r: +r.toFixed(2), born: w.t });
  ruinArea(w, x, y, r, kind);
}

function applyFantasy(w, o, ctx, push, rng) {
  const F = F0(w);
  const s = F.state;
  applyOutcome(w, { ...o, chance: null, okText: null }, ctx.town ?? null, push, rng);
  for (const [k, v] of Object.entries(o.set || {})) s[k] = v;
  for (const [k, v] of Object.entries(o.add || {})) s[k] = clamp((s[k] || 0) + v, 0, 3);
  if (s.zombies && s.zT == null) s.zT = w.t;
  if (!s.zombies) s.zT = null;
  const x = ctx.x ?? (ctx.town != null ? w.towns[ctx.town].x : MAP / 2);
  const y = ctx.y ?? (ctx.town != null ? w.towns[ctx.town].y : MAP / 2);
  if (o.zone) addZone(w, o.zone.kind, x, y, o.zone.r);
  if (o.ruins) ruinArea(w, x, y, o.ruins, "disaster");
  if (o.crater) {
    const res = makeCrater(w, x, y, o.crater);
    if (res.structs.length) push(`💥 Destroyed: ${res.structs.slice(0, 4).join(", ")}.`);
  }
  if (o.coastHoles) {
    for (let k = 0; k < o.coastHoles; k++) {
      const p = coastSpot(w, rng);
      if (p) makeCrater(w, p[0], p[1], 1.2 + rng() * 1.2);
    }
  }
  if (o.island) {
    const p = ctx.sx != null ? [ctx.sx, ctx.sy] : seaSpot(w, o.island, rng);
    if (p) raiseIsland(w, p[0], p[1], o.island, rng);
  }
  if (o.place && ctx.town != null) {
    const st = autoPlace(w, o.place, ctx.town);
    if (!st) push(`⚠️ There was no room for the ${STRUCTS[o.place].name} in ${tn(ctx)}.`);
  } else if (o.place) {
    const t = popTowns(w)[0];
    autoPlace(w, o.place, t);
  }
  if (o.kill) {
    const n = killShare(w, o.kill);
    if (n) push(`☠️ ${n.toLocaleString("en-SG")} residents lost or fled the region.`);
  }
  if (o.growZones) for (const z of F.zones) if (z.kind === "zombie") z.r = clamp(z.r * o.growZones, 0.6, 3 + 1.6 * Math.max(1, s.zombies));
  if (o.shrinkZones) for (const z of F.zones) if (z.kind === o.shrinkZones.kind) z.r *= o.shrinkZones.f;
  if (o.newZone) spawnZone(w, "zombie", rng, push);
  if (o.clearZones) F.zones = F.zones.filter((z) => z.kind !== o.clearZones);
  if (o.clearRuins) {
    for (const l of w.lots) if (l.ruin && !inZone(w, l.x, l.y)) l.ruin = null;
    w.rev++;
  }
  if (o.ash) s.ashUntil = Math.max(s.ashUntil || 0, w.t + o.ash);
  if (o.trees) sproutTrees(w, o.trees, rng);
  if (o.next) F.pending.push({ at: w.t + o.next.after, id: ctx.id, scene: o.next.scene, ctx });
  if (o.chain) F.pending.push({ at: w.t + o.chain.after, id: o.chain.id, scene: "start", ctx: null });
  if (o.chainDoom) F.pending.push({ at: w.t + (ctx.when || 12), id: ctx.doom, scene: "start", ctx: { mag: o.chainDoom, prophecy: true } });
  if (o.set?.aliens === "gone" || o.set?.aliens === "friends") F.pending = F.pending.filter((p) => p.id !== "invasion");
  if (s.zombies === 0) {
    F.zones = F.zones.filter((z) => z.kind !== "zombie");
    s.wall = false;
  }
  if (s.radiation === 0) F.zones = F.zones.filter((z) => z.kind !== "radiation");
  if (o.story) {
    const t = fillT(o.story, ctx);
    push(`${SCENARIOS[ctx.id]?.icon || "🐉"} ${t}`);
    chron(w, SCENARIOS[ctx.id]?.icon || "🐉", t, o.tone || "neutral");
    w.log.push({ year: w.year, text: t.replace(/\.$/, "").replace(/^./, (m) => m.toLowerCase()), tone: o.tone || "neutral", fantasy: true });
  }
  w.rev = (w.rev || 0) + 1;
}

export function decideFantasy(w, optId, push, rng = Math.random) {
  const d = w.decision;
  w.decision = null;
  const F = F0(w);
  if (d.kind === "fantasyOffer") {
    if (optId === "yes") {
      F.on = true;
      F.since = w.t;
      F.nextAt = w.t + 2 + Math.floor(rng() * 4);
      push("🐉 Fantasy Mode is on. Anything can happen now...");
      chron(w, "🐉", "Fantasy Mode began. History is now yours to write.");
    } else push("📅 You chose to stay realistic. Switch on Fantasy Mode any time from ☰ Menu.");
    return;
  }
  const SC = SCENARIOS[d.id];
  const ctx = { ...(d.ctx || {}), id: d.id };
  const o = SC?.scenes[d.scene || "start"].choices.find((c) => c.id === optId);
  if (!o) return;
  const ok = !o.odds || rng() < o.odds(ctx, w);
  const out = ok ? resolve(o, ctx, w) : resolveFail(o, ctx, w);
  if (!ok) push(`🎲 ${SC.title}: "${o.label}" didn't work out...`);
  else push(`${SC.icon} ${SC.title}: you chose "${o.label}".`);
  applyFantasy(w, out, ctx, push, rng);
}

export function setFantasy(w, on) {
  const F = F0(w);
  F.on = on;
  if (on) {
    F.since = F.since ?? w.t;
    F.nextAt = Math.max(F.nextAt || 0, w.t + 2);
  }
}

// ---------- starting scenarios ----------
function makeCtx(w, A, id, rng, preset) {
  const SC = SCENARIOS[id];
  const r = rng();
  const ctx = { mag: r < 0.5 ? 1 : r < 0.85 ? 2 : 3, ...(preset || {}) };
  const setup = SC.setup;
  if (setup === "town" || (typeof setup === "string" && setup.startsWith("zone:"))) {
    let town = pick(popTowns(w), rng);
    let x;
    let y;
    if (setup.startsWith("zone:")) {
      const zs = w.fantasy.zones.filter((z) => z.kind === setup.slice(5));
      if (zs.length) {
        const z = pick(zs, rng);
        town = townOf(w, z.x, z.y);
        x = z.x;
        y = z.y;
      }
    }
    if (x == null) [x, y] = spotIn(w, town, rng);
    Object.assign(ctx, { town, tn: w.towns[town].name, x, y });
  } else if (setup === "coast") {
    const p = coastSpot(w, rng);
    if (p) {
      const town = townOf(w, p[0], p[1]);
      Object.assign(ctx, { town, tn: w.towns[town].name, x: p[0], y: p[1] });
    }
  } else if (setup === "sea") {
    const p = seaSpot(w, 3 + ctx.mag, rng);
    if (p) Object.assign(ctx, { sx: p[0], sy: p[1] });
    else return null;
  } else if (typeof setup === "function") {
    const town = pick(popTowns(w), rng);
    Object.assign(ctx, { town, tn: w.towns[town].name });
    setup(ctx, w, rng);
  }
  const st = SC.scenes.start;
  if (st.flavor && ctx.flavor == null) ctx.flavor = st.flavor(rng);
  return ctx;
}

function spawnZone(w, kind, rng, push) {
  const town = pick(popTowns(w), rng);
  const [x, y] = spotIn(w, town, rng);
  addZone(w, kind, x, y, 1.4);
  push(`${kind === "zombie" ? "🧟" : "☢️"} A new ${kind === "zombie" ? "zombie outbreak" : "radiation hotspot"} in ${w.towns[town].name}!`);
}

function startScenario(w, A, id, rng, preset) {
  const F = w.fantasy;
  const ctx = makeCtx(w, A, id, rng, preset);
  if (!ctx) return false;
  F.done[id] = (F.done[id] || 0) + 1;
  F.last = id;
  F.lastT = F.lastT || {};
  F.lastT[id] = w.t;
  w.decision = { kind: "fantasy", id, scene: "start", ctx };
  return true;
}

// ---------- every month ----------
export function stepFantasy(w, A, rng, push) {
  // the offer, once real history runs out
  if (!w.fantasy && w.year >= FANTASY_YEAR && !w.decision && !w.crisis) {
    F0(w);
    w.decision = { kind: "fantasyOffer" };
    return;
  }
  const F = w.fantasy;
  if (!F?.state) return;
  const s = F.state;

  // lasting effects of the world's state
  w.effects = w.effects.filter((e) => e.id !== "fantasy");
  const eff = stateEffect(w, s);
  if (Object.keys(eff).length) w.effects.push({ id: "fantasy", until: w.t + 2, effect: eff });

  // zones spread, fade, and swallow what's inside
  for (const z of F.zones) {
    if (z.kind === "zombie") {
      if (!s.wall && !s.cure) {
        const ti = townOf(w, z.x, z.y);
        const police = (w.towns[ti]?.needs?.safety ?? 50) / 100;
        z.r = Math.min(3 + 1.6 * s.zombies, z.r + 0.03 * s.zombies * (1.2 - police * 0.8));
      }
    } else if (z.kind === "radiation") {
      z.r -= s.dome ? 0.006 : 0.004;
    }
  }
  const before = F.zones.length;
  F.zones = F.zones.filter((z) => z.r >= 0.8);
  if (before !== F.zones.length && !F.zones.some((z) => z.kind === "radiation") && s.radiation) {
    s.radiation = Math.max(0, s.radiation - 1);
    push("☢️ A radiation zone has finally faded. The land can be cleaned up and rebuilt.");
  }
  if (w.t % 3 === 0) {
    for (const z of F.zones) {
      const hit = w.lots.filter((l) => (l.b || !l.ruin) && dist(l.x, l.y, z.x, z.y) <= z.r);
      if (hit.length) {
        const res = ruinArea(w, z.x, z.y, z.r, z.kind);
        if (res.people > 300 && rng() < 0.4) push(`${z.kind === "zombie" ? "🧟" : "☢️"} ${res.people.toLocaleString("en-SG")} residents fled ${w.towns[townOf(w, z.x, z.y)].name} as the ${z.kind === "zombie" ? "zombie" : "radiation"} zone spread.`);
      }
    }
  }
  for (const st of w.structs) {
    const off = !STRUCTS[st.type].fixed && inZone(w, st.x, st.y);
    if (off) st.off = true;
    else if (st.off) delete st.off;
  }
  if (s.zombies >= 2 && !s.wall && !s.cure && F.zones.filter((z) => z.kind === "zombie").length < s.zombies && rng() < 0.008 * s.zombies) spawnZone(w, "zombie", rng, push);
  if (s.jungle && rng() < 0.05) sproutTrees(w, 3, rng);
  // after many years the undead slowly rot away
  if (s.zombies && !s.safari && w.month === 0 && w.t - (s.zT ?? w.t) > 120 && rng() < 0.2) {
    s.zombies--;
    for (const z of F.zones) if (z.kind === "zombie") z.r *= 0.6;
    if (!s.zombies) {
      F.zones = F.zones.filter((z) => z.kind !== "zombie");
      s.wall = false;
      s.zT = null;
      push("🧟 The last zombies have crumbled to dust. The outbreak is finally over.");
      chron(w, "🧟", "The last zombies crumbled to dust. The outbreak is over.", "good");
    } else push("🧟 The undead are rotting away. The zombie zones are shrinking.");
  }
  if (s.ai === "rogue" && rng() < 0.01) push("🤖 The rogue AI renamed every street after itself again.");

  if (w.decision || !F.on || w.crisis) return;
  // continuing stories
  const due = F.pending.filter((p) => p.at <= w.t);
  if (due.length) {
    const p = due[0];
    F.pending = F.pending.filter((x) => x !== p);
    const SC = SCENARIOS[p.id];
    if (!SC) return;
    if (p.ctx && p.scene !== "start") {
      w.decision = { kind: "fantasy", id: p.id, scene: p.scene, ctx: p.ctx };
      return;
    }
    // a chained scenario only happens if it still makes sense
    if (p.id === "invasion" && s.aliens !== "hostile") return;
    if (p.id === "cureFound" && !s.zombies) return;
    if (p.id === "horde" && (!s.zombies || s.cure)) return;
    if (p.id === "fallout" && (s.radiation < 2 || s.dome)) return;
    if (p.id === "aiRogue" && s.ai !== true) return;
    if (p.ctx?.prophecy) push(`⏳ The prophecy comes true...`);
    startScenario(w, A, p.id, rng, p.ctx);
    return;
  }
  if (w.t < (F.nextAt || 0)) return;
  // at random: anything that fits the world as it is now
  const pool = Object.entries(SCENARIOS)
    .map(([id, SC]) => {
      if (SC.once && F.done[id]) return null;
      if (F.last === id || w.t - (F.lastT?.[id] ?? -999) < 48) return null;
      let wt = SC.weight(s, w) || 0;
      if (wt <= 0) return null;
      wt /= 1 + (F.done[id] || 0) * 1.5; // fresh stories first
      return [id, wt];
    })
    .filter(Boolean);
  F.nextAt = w.t + (rng() < 0.12 ? 2 + Math.floor(rng() * 3) : 8 + Math.floor(rng() * 22));
  if (!pool.length) return;
  let r = rng() * pool.reduce((a, p) => a + p[1], 0);
  let id = pool[0][0];
  for (const [k, wt] of pool) {
    r -= wt;
    if (r <= 0) {
      id = k;
      break;
    }
  }
  startScenario(w, A, id, rng);
}

// for the news and AI mayors: is the world in a bad way?
export const fantasySevere = (w) => {
  const s = w.fantasy?.state;
  return !!s && (s.zombies >= 2 || s.radiation >= 2 || s.aliens === "hostile");
};
export const fantasyChronicle = (w) => w.fantasy?.chron || [];
