// Dice Grid Tactics rules engine. Pure functions: a state is never mutated.
// Board: W × H squares, index = row * W + col. Row 0 is Red's back row (top),
// row H-1 is Blue's back row (bottom).
// A unit is { id, type, side, value, bonus, boost }: value is its die face,
// bonus is a cavalry charge (friends ridden through, kept until it next acts),
// boost is militia support (kept until it next acts). Power = value + bonus + boost.

export const W = 8;
export const H = 10;
export const SIDES = ["blue", "red"];
export const SIDE_NAME = { blue: "Blue", red: "Red" };
export const other = (side) => (side === "blue" ? "red" : "blue");

export const UNITS = {
  M: { name: "Militia", die: 4, move: 1, growth: "+1", worth: 1 },
  C: { name: "Cavalry", die: 6, move: 4, growth: "=1", worth: 3 },
  A: { name: "Archer", die: 8, move: 2, growth: "+1", worth: 3 },
  S: { name: "Siege Tower", die: 12, move: 2, growth: "x2", worth: 4 },
  H: { name: "Champion", die: 20, move: 3, growth: "+1", worth: 8 },
  K: { name: "King", die: 10, move: 1, growth: "0", worth: 0 },
};

export const ORDERS_PER_TURN = 2;
export const QUIET_TURNS = 30; // turns in a row with nobody falling before power taken decides

const BACK = ["S", "C", "A", "H", "K", "A", "C", "S"];
const STEPS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

export const power = (u) => u.value + (u.bonus || 0) + (u.boost || 0);
export const rowOf = (sq) => Math.floor(sq / W);
export const colOf = (sq) => sq % W;
export const sqName = (sq) => "abcdefgh"[colOf(sq)] + (H - rowOf(sq));
const onBoard = (r, c) => r >= 0 && r < H && c >= 0 && c < W;
const dist = (a, b) => Math.max(Math.abs(rowOf(a) - rowOf(b)), Math.abs(colOf(a) - colOf(b)));

export function describeRules() {
  const u = (t) => `${UNITS[t].name} (D${UNITS[t].die}, moves ${UNITS[t].move})`;
  return [
    `Board: ${W} wide × ${H} long. Each side has a back row, an empty moat row, then a row of Militia.`,
    `Units: ${["M", "C", "A", "S", "H", "K"].map(u).join(", ")}. Every die starts at 1.`,
    "Each turn both players secretly give up to 2 orders, to 2 different units. Then the orders are revealed and happen at the same time.",
    "Moving: step in any of the 8 directions, up to the unit's move. You can pass through your own units but not enemies, and you can't end on your own unit.",
    "Order of events: 1) Militia zaps and boosts, 2) everyone moves, 3) archer shots land, 4) dice grow.",
    "Fights: a unit ending on the same square as an enemy fights it, and so do two enemies that swap squares. Higher power wins and stays; on a tie both fall. A Siege Tower that didn't move loses any fight.",
    "Growth after moving without a fight: Militia +1, Archer +1, Champion +1, Siege Tower doubles, Cavalry resets to 1. A die stops at its top face. Winning a fight doesn't grow the die. The King gains +1 every turn.",
    "Cavalry charge: friends the Cavalry rides through add their power to it until it next acts (so it counts in this turn's fight).",
    "Militia actions (instead of moving): zap an enemy next to it whose power is higher than the militia's, lowering it by the militia's power (never below 1), or boost a friend next to it by the militia's power until that friend next acts (even past its die's limit). The militia's die halves (minimum 1), and its side can't use militia actions on its next turn.",
    "Archers (instead of moving) shoot at a square exactly 2 away. After everyone has moved, an enemy on that square falls if the archer's power is higher (a Siege Tower always falls). Enemies can dodge by moving away, and an archer attacked and beaten during the move doesn't get its shot off.",
    "A Militia reaching the enemy's back row becomes a Champion and keeps its number.",
    `Win by defeating the enemy King. If both Kings fall in the same turn it's a draw. If ${QUIET_TURNS} turns pass with nobody falling, the side that has taken more power wins.`,
  ];
}

export function initialState() {
  const board = Array(W * H).fill(null);
  let id = 0;
  const put = (r, c, type, side) => {
    board[r * W + c] = { id: id++, type, side, value: 1, bonus: 0, boost: 0 };
  };
  for (let c = 0; c < W; c++) {
    put(0, c, BACK[c], "red");
    put(2, c, "M", "red");
    put(H - 3, c, "M", "blue");
    put(H - 1, c, BACK[c], "blue");
  }
  return {
    board,
    turn: 1,
    winner: null,
    endReason: null,
    quiet: 0,
    taken: { blue: 0, red: 0 },
    rest: { blue: false, red: false },
    lastOrders: null,
    events: [],
  };
}

// Squares a unit can move to: Map(dest -> { path, borrow, attack }). Paths step
// through empty squares or friends; the last step may land on an enemy (attack).
// Cavalry takes the path that rides through the most friendly power.
export function reach(board, from) {
  const u = board[from];
  const range = UNITS[u.type].move;
  const best = new Map();
  const visit = (sq, path, borrow, seen) => {
    if (path.length >= range) return;
    const r0 = rowOf(sq);
    const c0 = colOf(sq);
    for (const [dr, dc] of STEPS) {
      const r = r0 + dr;
      const c = c0 + dc;
      if (!onBoard(r, c)) continue;
      const to = r * W + c;
      if (seen.has(to)) continue;
      const t = board[to];
      const nextPath = [...path, to];
      if (t && t.side !== u.side) {
        record(to, nextPath, borrow, true);
        continue; // can't pass through enemies
      }
      if (!t) record(to, nextPath, borrow, false);
      const gain = t && u.type === "C" ? power(t) : 0;
      seen.add(to);
      visit(to, nextPath, borrow + gain, seen);
      seen.delete(to);
    }
  };
  const record = (to, path, borrow, attack) => {
    const b = u.type === "C" ? borrow : 0;
    const old = best.get(to);
    if (!old || b > old.borrow || (b === old.borrow && path.length < old.path.length)) best.set(to, { path, borrow: b, attack });
  };
  visit(from, [], 0, new Set([from]));
  return best;
}

// Squares a unit could reach next turn, ignoring charges (cheap, for the computer player).
export function reachSet(board, from) {
  const u = board[from];
  const range = UNITS[u.type].move;
  const seen = new Map([[from, 0]]);
  const out = new Set();
  let frontier = [from];
  for (let d = 1; d <= range; d++) {
    const next = [];
    for (const sq of frontier) {
      for (const [dr, dc] of STEPS) {
        const r = rowOf(sq) + dr;
        const c = colOf(sq) + dc;
        if (!onBoard(r, c)) continue;
        const to = r * W + c;
        if (seen.has(to)) continue;
        seen.set(to, d);
        const t = board[to];
        if (t && t.side !== u.side) out.add(to);
        else {
          if (!t) out.add(to);
          next.push(to);
        }
      }
    }
    frontier = next;
  }
  return out;
}

const neighbours = (sq) => {
  const out = [];
  for (const [dr, dc] of STEPS) if (onBoard(rowOf(sq) + dr, colOf(sq) + dc)) out.push((rowOf(sq) + dr) * W + colOf(sq) + dc);
  return out;
};

// Everything one unit could be ordered to do this turn.
export function unitOptions(state, sq) {
  const { board } = state;
  const u = board[sq];
  const moves = [...reach(board, sq)].map(([to, m]) => ({ kind: "move", unit: u.id, side: u.side, from: sq, to, path: m.path, borrow: m.borrow, attack: m.attack }));
  const zaps = [];
  const boosts = [];
  if (u.type === "M" && !state.rest[u.side]) {
    for (const n of neighbours(sq)) {
      const t = board[n];
      if (!t) continue;
      if (t.side !== u.side && power(t) > power(u)) zaps.push({ kind: "zap", unit: u.id, side: u.side, from: sq, to: n, target: t.id, amount: power(u) });
      if (t.side === u.side) boosts.push({ kind: "boost", unit: u.id, side: u.side, from: sq, to: n, target: t.id, amount: power(u) });
    }
  }
  const shots = [];
  if (u.type === "A") {
    for (let to = 0; to < W * H; to++) if (dist(sq, to) === 2) shots.push({ kind: "shoot", unit: u.id, side: u.side, from: sq, to, amount: power(u) });
  }
  return { moves, zaps, boosts, shots };
}

// Can this order join the side's other orders? Returns a reason, or null if fine.
export function orderProblem(state, orders, order) {
  const others = orders.filter((o) => o.unit !== order.unit);
  if (others.length >= ORDERS_PER_TURN) return `You can give ${ORDERS_PER_TURN} orders a turn.`;
  if (order.kind === "move" && others.some((o) => o.kind === "move" && o.to === order.to)) return "Another of your units is already moving there.";
  return null;
}

function weaken(u, amount) {
  const t = { ...u };
  for (const k of ["boost", "bonus"]) {
    const take = Math.min(t[k] || 0, amount);
    t[k] -= take;
    amount -= take;
  }
  t.value = Math.max(1, t.value - amount);
  return t;
}

function grow(u) {
  const g = UNITS[u.type].growth;
  const max = UNITS[u.type].die;
  if (g === "0") return u.value;
  if (g === "=1") return 1;
  return Math.min(max, g === "x2" ? u.value * 2 : u.value + Number(g));
}

const label = (u) => `${SIDE_NAME[u.side]} ${UNITS[u.type].name}`;

// Resolve both sides' orders: { blue: [...], red: [...] } -> next state, with
// next.events describing what happened (each { text, sq, kind }).
export function resolve(state, ordersBySide) {
  const board = state.board.slice();
  const events = [];
  const all = [...(ordersBySide.blue || []), ...(ordersBySide.red || [])];
  const where = new Map(); // unit id -> square
  board.forEach((u, sq) => u && where.set(u.id, sq));
  const removed = [];
  const fell = (u, sq, why) => {
    removed.push(u);
    events.push({ kind: "fall", sq, text: `${label(u)} falls (${why}).` });
  };

  // 1) Militia zaps and boosts, all measured from the start of the turn.
  const acted = { blue: false, red: false };
  const changes = [];
  for (const o of all) {
    if (o.kind !== "zap" && o.kind !== "boost") continue;
    const m = state.board[o.from];
    const tsq = where.get(o.target);
    if (!m || tsq === undefined) continue;
    acted[m.side] = true;
    changes.push({ o, m, tsq });
  }
  for (const { o, m, tsq } of changes) {
    const t = board[tsq];
    const before = power(t);
    board[tsq] = o.kind === "zap" ? weaken(t, o.amount) : { ...t, boost: (t.boost || 0) + o.amount };
    events.push({
      kind: o.kind,
      sq: tsq,
      text: `${label(m)} ${o.kind === "zap" ? "zaps" : "boosts"} ${label(t)} ${o.kind === "zap" ? "−" : "+"}${o.amount} (${before}→${power(board[tsq])}).`,
    });
  }
  for (const { o } of changes) {
    const m = board[o.from];
    board[o.from] = { ...m, value: Math.max(1, Math.floor(m.value / 2)), bonus: 0, boost: 0 };
  }

  // 2) Movement. Fight power of a mover: its die + this move's charge + boost.
  const movers = all.filter((o) => o.kind === "move" && board[o.from] && board[o.from].id === o.unit);
  const fightPower = (u, mover) => (mover ? u.value + (mover.borrow || 0) + (u.boost || 0) : power(u));
  const fightText = (a, pa, b, pb) => `${label(a)} ${pa} vs ${label(b)} ${pb}`;
  const alive = new Map(movers.map((o) => [o.unit, board[o.from]]));
  const fought = new Set();
  for (const o of movers) board[o.from] = null; // movers leave their squares

  // Two enemies swapping squares meet on the way.
  for (const a of movers) {
    const b = movers.find((x) => x.side !== a.side && x.from === a.to && x.to === a.from);
    if (!b || a.side !== "blue") continue;
    const ua = alive.get(a.unit);
    const ub = alive.get(b.unit);
    const pa = fightPower(ua, a);
    const pb = fightPower(ub, b);
    fought.add(a.unit).add(b.unit);
    events.push({ kind: "fight", sq: a.to, text: `Clash between ${sqName(a.from)} and ${sqName(b.from)}: ${fightText(ua, pa, ub, pb)}.` });
    if (pa <= pb) {
      fell(ua, a.from, pa === pb ? "tie" : "lost the clash");
      alive.delete(a.unit);
    }
    if (pb <= pa) {
      fell(ub, b.from, pa === pb ? "tie" : "lost the clash");
      alive.delete(b.unit);
    }
  }

  // Everyone else arrives. Units from both sides on one square fight: the
  // movers arriving there, plus an enemy that stayed put.
  const arrivals = new Map();
  for (const o of movers) {
    if (!alive.has(o.unit)) continue;
    if (!arrivals.has(o.to)) arrivals.set(o.to, []);
    arrivals.get(o.to).push(o);
  }
  for (const [sq, list] of arrivals) {
    const stay = board[sq];
    const contenders = list.map((o) => ({ u: alive.get(o.unit), o, p: fightPower(alive.get(o.unit), o) }));
    if (stay) contenders.unshift({ u: stay, o: null, p: stay.type === "S" ? 0 : power(stay) });
    for (;;) {
      const a = contenders[0];
      const b = contenders.find((x) => x.u.side !== a.u.side);
      if (!b) break;
      for (const x of [a, b]) if (x.o) fought.add(x.o.unit);
      const wall = (x) => (!x.o && x.u.type === "S" ? " (a Siege Tower that stays put can't defend)" : "");
      events.push({
        kind: "fight",
        sq,
        text: a.o
          ? `Both arrive at ${sqName(sq)}: ${fightText(a.u, a.p, b.u, b.p)}.`
          : `${label(b.u)} ${b.p} attacks ${label(a.u)} ${power(a.u)} at ${sqName(sq)}${wall(a)}.`,
      });
      const out = a.p > b.p ? [b] : b.p > a.p ? [a] : [a, b];
      for (const x of out) {
        fell(x.u, sq, out.length === 2 ? "tie" : "defeated");
        contenders.splice(contenders.indexOf(x), 1);
      }
      if (!contenders.length) break;
    }
    const win = contenders[0];
    if (!win) board[sq] = null;
    else if (win.o) {
      const u = win.u;
      board[sq] = fought.has(win.o.unit) ? { ...u, bonus: 0, boost: 0 } : { ...u, value: grow(u), bonus: win.o.borrow || 0, boost: 0 };
    }
  }

  // Militia reaching the far side become Champions.
  for (const o of movers) {
    const u = board[o.to];
    if (!u || u.id !== o.unit || u.type !== "M") continue;
    if ((u.side === "blue" && rowOf(o.to) === 0) || (u.side === "red" && rowOf(o.to) === H - 1)) {
      board[o.to] = { ...u, type: "H" };
      events.push({ kind: "promote", sq: o.to, text: `${SIDE_NAME[u.side]} Militia reaches the far side and becomes a Champion.` });
    }
  }

  // 3) Archer shots land on whoever is on the square now.
  for (const o of all) {
    if (o.kind !== "shoot") continue;
    const shooter = board[o.from];
    if (!shooter || shooter.id !== o.unit) {
      events.push({ kind: "miss", sq: o.from, text: `${SIDE_NAME[o.side]} Archer was cut down before it could shoot.` });
      continue;
    }
    const amount = power(shooter); // includes a boost given this turn
    board[o.from] = { ...shooter, boost: 0 };
    const t = board[o.to];
    if (!t || t.side === o.side) {
      events.push({ kind: "miss", sq: o.to, text: `${SIDE_NAME[o.side]} Archer's arrow lands on ${sqName(o.to)}: no enemy there.` });
      continue;
    }
    if (t.type === "S" || amount > power(t)) {
      events.push({ kind: "shot", sq: o.to, text: `${SIDE_NAME[o.side]} Archer (${amount}) hits ${label(t)} (${power(t)}).` });
      fell(t, o.to, "shot");
      board[o.to] = null;
    } else {
      events.push({ kind: "miss", sq: o.to, text: `${SIDE_NAME[o.side]} Archer (${amount}) can't beat ${label(t)} (${power(t)}).` });
    }
  }

  // 4) Kings grow every turn.
  for (let sq = 0; sq < W * H; sq++) {
    const u = board[sq];
    if (u && u.type === "K" && u.value < UNITS.K.die) board[sq] = { ...u, value: u.value + 1 };
  }

  const taken = { ...state.taken };
  for (const u of removed) taken[other(u.side)] += power(u);
  const kings = { blue: board.some((u) => u && u.type === "K" && u.side === "blue"), red: board.some((u) => u && u.type === "K" && u.side === "red") };
  const next = {
    board,
    turn: state.turn + 1,
    winner: null,
    endReason: null,
    quiet: removed.length ? 0 : state.quiet + 1,
    taken,
    rest: acted,
    lastOrders: { blue: ordersBySide.blue || [], red: ordersBySide.red || [] },
    events,
  };
  if (!kings.blue && !kings.red) {
    next.winner = "draw";
    next.endReason = "bothKings";
  } else if (!kings.blue || !kings.red) {
    next.winner = kings.blue ? "blue" : "red";
    next.endReason = "king";
  } else if (next.quiet >= QUIET_TURNS) {
    next.winner = taken.blue > taken.red ? "blue" : taken.red > taken.blue ? "red" : "draw";
    next.endReason = "quiet";
  }
  return next;
}
