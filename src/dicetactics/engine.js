// Dice Grid Tactics rules engine. Pure functions: a state is never mutated.
// Board: W × H squares, index = row * W + col. Row 0 is Red's back row (top),
// row H-1 is Blue's back row (bottom).
// A unit is { id, type, side, value, bonus, boost }: value is its die face,
// bonus is a cavalry charge (friends jumped over, kept until it next acts),
// boost is militia support (kept until it next acts). Power = value + bonus + boost.

export const W = 8;
export const H = 10;
export const SIDE_NAME = { blue: "Blue", red: "Red" };
export const other = (side) => (side === "blue" ? "red" : "blue");

export const UNITS = {
  M: { name: "Militia", die: 4, growth: "+1", worth: 1, chess: "Pawn" },
  C: { name: "Cavalry", die: 6, growth: "=1", worth: 3, chess: "Knight" },
  A: { name: "Archer", die: 8, growth: "+1", worth: 3, chess: "Bishop" },
  S: { name: "Siege Tower", die: 12, growth: "x2", worth: 4, chess: "Rook" },
  H: { name: "Champion", die: 20, growth: "+1", worth: 8, chess: "Queen" },
  K: { name: "King", die: 10, growth: "0", worth: 0, chess: "King" },
};

export const ORDERS_PER_TURN = 2;
export const QUIET_TURNS = 30; // turns in a row with nobody falling before power taken decides

const BACK = ["S", "C", "A", "H", "K", "A", "C", "S"];
const KING_STEPS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const KNIGHT_JUMPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

export const power = (u) => u.value + (u.bonus || 0) + (u.boost || 0);
export const rowOf = (sq) => Math.floor(sq / W);
export const colOf = (sq) => sq % W;
export const sqName = (sq) => "abcdefgh"[colOf(sq)] + (H - rowOf(sq));
const onBoard = (r, c) => r >= 0 && r < H && c >= 0 && c < W;
const at = (r, c) => r * W + c;
const dist = (a, b) => Math.max(Math.abs(rowOf(a) - rowOf(b)), Math.abs(colOf(a) - colOf(b)));
const forward = (side) => (side === "blue" ? -1 : 1);
const militiaStartRow = (side) => (side === "blue" ? H - 3 : 2);

// How each unit moves, in words (also shown on the unit card).
export const MOVE_TEXT = {
  M: "1 square forward (2 from its starting row), only onto an empty square. It never steps onto an enemy.",
  C: "Jumps in an L shape (2 then 1), over anything.",
  A: "Slides any distance diagonally.",
  S: "Slides any distance straight (up, down, left or right).",
  H: "Slides any distance straight or diagonally.",
  K: "1 square in any direction.",
};

export const EFFECT_TEXT = {
  M: [
    "Instead of moving: zap an enemy diagonally in front of it from where it stands (the enemy loses the militia's power, never below 1), or boost a friend next to it (+its power until that friend acts).",
    "After a zap or boost its die halves, and your militia rest next turn.",
    "Grows +1 per move. Becomes a Champion on the far side.",
  ],
  C: ["Charge: friends on its L route add their power until it next acts.", "Its die resets to 1 each move.", "Only one Cavalry can be ordered each turn."],
  A: ["Instead of moving: shoot a square exactly 2 away. An enemy there when the shot lands falls if the archer is stronger.", "Grows +1 per move."],
  S: ["Doubles each move.", "If it doesn't move, any attacker beats it."],
  H: ["Grows +1 per move, up to 20."],
  K: ["Gains +1 every turn, up to 10.", "Lose the King and you lose the game."],
};

export function describeRules() {
  const u = (t) => `${UNITS[t].name} = ${UNITS[t].chess} (D${UNITS[t].die})`;
  return [
    `Board: ${W} wide × ${H} long. Each side has a back row, an empty moat row, then a row of Militia.`,
    `Units move like chess pieces: ${["M", "C", "A", "S", "H", "K"].map(u).join(", ")}. Sliding units are blocked by any unit in the way. Every die starts at 1.`,
    "Each turn both players secretly give up to 2 orders, to 2 different units, and choose which goes 1st and which 2nd. Only one of the orders can be for a Cavalry.",
    "Both 1st orders happen together, then both 2nd orders happen together on the new board. A 2nd order is cancelled if its unit fell, its path is now blocked, or its target moved away.",
    "Inside each step: militia zaps and boosts first, then moves, then archer shots land, then dice grow.",
    "Fights: a unit ending on the same square as an enemy fights it, and so do two enemies that swap squares. Higher power wins and stays; on a tie both fall. A Siege Tower that didn't move loses any fight.",
    "Growth after moving without a fight: Militia +1, Archer +1, Champion +1, Siege Tower doubles, Cavalry resets to 1. A die stops at its top face. Winning a fight doesn't grow the die. Kings gain +1 every turn.",
    "Cavalry charge: friends on the Cavalry's L route add their power to it until it next acts (so it counts in that step's fight).",
    "Militia never step onto enemies. Instead of moving they can zap an enemy on either square diagonally in front of them, from where they stand, lowering its power by the militia's power (never below 1), or boost a friend on any square next to them by the militia's power until that friend next acts (even past its die's limit). The militia's die halves (minimum 1), and its side can't use militia actions on its next turn.",
    "Archers (instead of moving) shoot at a square exactly 2 away. When the shot lands, an enemy on that square falls if the archer's power is higher (a Siege Tower always falls). Enemies can dodge by moving away, and an archer beaten in that step doesn't get its shot off.",
    "A Militia reaching the enemy's back row becomes a Champion and keeps its number.",
    `Win by defeating the enemy King. If both Kings fall in the same step it's a draw. If ${QUIET_TURNS} turns pass with nobody falling, the side that has taken more power wins.`,
  ];
}

export function initialState() {
  const board = Array(W * H).fill(null);
  let id = 0;
  const put = (r, c, type, side) => {
    board[at(r, c)] = { id: id++, type, side, value: 1, bonus: 0, boost: 0 };
  };
  for (let c = 0; c < W; c++) {
    put(0, c, BACK[c], "red");
    put(2, c, "M", "red");
    put(H - 3, c, "M", "blue");
    put(H - 1, c, BACK[c], "blue");
  }
  return { board, turn: 1, winner: null, endReason: null, quiet: 0, taken: { blue: 0, red: 0 }, rest: { blue: false, red: false }, lastOrders: null, events: [], steps: [] };
}

// The two L routes for a knight jump: the squares passed over (not the landing square).
function knightRoutes(r0, c0, dr, dc) {
  if (Math.abs(dr) === 2)
    return [
      [at(r0 + dr / 2, c0), at(r0 + dr, c0)],
      [at(r0, c0 + dc), at(r0 + dr / 2, c0 + dc)],
    ];
  return [
    [at(r0, c0 + dc / 2), at(r0, c0 + dc)],
    [at(r0 + dr, c0), at(r0 + dr, c0 + dc / 2)],
  ];
}

// Squares a unit can move to: Map(dest -> { path, borrow, attack }). `path`
// lists the squares passed through, ending at the destination.
export function reach(board, from) {
  const u = board[from];
  const r0 = rowOf(from);
  const c0 = colOf(from);
  const out = new Map();
  const add = (to, path, borrow = 0) => {
    const t = board[to];
    if (t && t.side === u.side) return;
    out.set(to, { path, borrow, attack: !!t });
  };
  const slide = (dirs, max = Infinity) => {
    for (const [dr, dc] of dirs) {
      const path = [];
      for (let r = r0 + dr, c = c0 + dc, n = 1; onBoard(r, c) && n <= max; r += dr, c += dc, n++) {
        const to = at(r, c);
        path.push(to);
        add(to, [...path]);
        if (board[to]) break;
      }
    }
  };
  switch (u.type) {
    case "M": {
      const f = forward(u.side);
      if (onBoard(r0 + f, c0) && !board[at(r0 + f, c0)]) {
        out.set(at(r0 + f, c0), { path: [at(r0 + f, c0)], borrow: 0, attack: false });
        if (r0 === militiaStartRow(u.side) && onBoard(r0 + 2 * f, c0) && !board[at(r0 + 2 * f, c0)])
          out.set(at(r0 + 2 * f, c0), { path: [at(r0 + f, c0), at(r0 + 2 * f, c0)], borrow: 0, attack: false });
      }
      break; // militia don't step onto enemies: they zap them from where they stand
    }
    case "C":
      for (const [dr, dc] of KNIGHT_JUMPS) {
        if (!onBoard(r0 + dr, c0 + dc)) continue;
        const to = at(r0 + dr, c0 + dc);
        let best = { route: knightRoutes(r0, c0, dr, dc)[0], borrow: 0 };
        for (const route of knightRoutes(r0, c0, dr, dc)) {
          const borrow = route.reduce((s, sq) => s + (board[sq] && board[sq].side === u.side ? power(board[sq]) : 0), 0);
          if (borrow > best.borrow) best = { route, borrow };
        }
        add(to, [...best.route, to], best.borrow);
      }
      break;
    case "A": slide(BISHOP_DIRS); break;
    case "S": slide(ROOK_DIRS); break;
    case "H": slide([...ROOK_DIRS, ...BISHOP_DIRS]); break;
    case "K": slide(KING_STEPS, 1); break;
  }
  return out;
}

// Squares a unit threatens (could fight on) next turn — for the computer player.
export function threatSet(board, from) {
  const u = board[from];
  return u.type === "M" ? [] : [...reach(board, from).keys()]; // a militia zap weakens but never captures
}

// The two squares diagonally in front of a militia: where it can zap.
function zapSquares(sq, side) {
  const r = rowOf(sq) + forward(side);
  return [-1, 1].filter((dc) => onBoard(r, colOf(sq) + dc)).map((dc) => at(r, colOf(sq) + dc));
}

const neighbours = (sq) => KING_STEPS.filter(([dr, dc]) => onBoard(rowOf(sq) + dr, colOf(sq) + dc)).map(([dr, dc]) => at(rowOf(sq) + dr, colOf(sq) + dc));

// Everything one unit could be ordered to do.
export function unitOptions(state, sq) {
  const { board } = state;
  const u = board[sq];
  const moves = [...reach(board, sq)].map(([to, m]) => ({ kind: "move", unit: u.id, side: u.side, from: sq, to, path: m.path, borrow: m.borrow, attack: m.attack }));
  const zaps = [];
  const boosts = [];
  if (u.type === "M" && !state.rest[u.side]) {
    for (const n of zapSquares(sq, u.side)) {
      const t = board[n];
      if (t && t.side !== u.side) zaps.push({ kind: "zap", unit: u.id, side: u.side, from: sq, to: n, target: t.id, amount: power(u) });
    }
    for (const n of neighbours(sq)) {
      const t = board[n];
      if (t && t.side === u.side) boosts.push({ kind: "boost", unit: u.id, side: u.side, from: sq, to: n, target: t.id, amount: power(u) });
    }
  }
  const shots = [];
  if (u.type === "A") for (let to = 0; to < W * H; to++) if (dist(sq, to) === 2) shots.push({ kind: "shoot", unit: u.id, side: u.side, from: sq, to, amount: power(u) });
  return { moves, zaps, boosts, shots };
}

// Can this order join the side's other orders? Returns a reason, or null if fine.
export function orderProblem(state, orders, order) {
  const others = orders.filter((o) => o.unit !== order.unit);
  if (others.length >= ORDERS_PER_TURN) return `You can give ${ORDERS_PER_TURN} orders a turn.`;
  if (order.kind === "move" && others.some((o) => o.kind === "move" && o.to === order.to)) return "Another of your units is already moving there.";
  const isCavalry = (o) => state.board[o.from]?.type === "C";
  if (isCavalry(order) && others.some(isCavalry)) return "Only one Cavalry can be given an order each turn.";
  return null;
}

// Re-check an order against the board as it is now (for 2nd orders). Returns
// the refreshed order, or a reason string if it can't happen any more.
export function refreshOrder(state, o) {
  const sq = state.board.findIndex((u) => u && u.id === o.unit);
  if (sq < 0) return "its unit fell";
  const opts = unitOptions(state, sq);
  if (o.kind === "move") return opts.moves.find((m) => m.to === o.to) || "its path is now blocked";
  if (o.kind === "shoot") return opts.shots.find((m) => m.to === o.to) || "the archer can't shoot there now";
  const list = o.kind === "zap" ? opts.zaps : opts.boosts;
  return list.find((m) => m.target === o.target) || (state.rest[o.side] ? "militia are resting" : "its target isn't next to it any more");
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

// One step: each side's order for this step (or none) happens at once.
// Returns { board, events, removed, moved: [{ id, from, to }], acted: { blue, red } }.
function runStep(board0, orders) {
  const board = board0.slice();
  const events = [];
  const removed = [];
  const where = new Map();
  board.forEach((u, sq) => u && where.set(u.id, sq));
  const fell = (u, sq, why) => {
    removed.push({ unit: u, sq });
    events.push({ kind: "fall", sq, text: `${label(u)} falls (${why}).` });
  };

  // Militia zaps and boosts, measured from the start of the step.
  const acted = { blue: false, red: false };
  const actions = orders.filter((o) => (o.kind === "zap" || o.kind === "boost") && board0[o.from] && where.has(o.target));
  for (const o of actions) {
    const tsq = where.get(o.target);
    const t = board[tsq];
    const before = power(t);
    acted[o.side] = true;
    board[tsq] = o.kind === "zap" ? weaken(t, o.amount) : { ...t, boost: (t.boost || 0) + o.amount };
    events.push({
      kind: o.kind,
      sq: tsq,
      text: `${label(board0[o.from])} ${o.kind === "zap" ? "zaps" : "boosts"} ${label(t)} ${o.kind === "zap" ? "−" : "+"}${o.amount} (${before}→${power(board[tsq])}).`,
    });
  }
  for (const o of actions) {
    const m = board[o.from];
    board[o.from] = { ...m, value: Math.max(1, Math.floor(m.value / 2)), bonus: 0, boost: 0 };
  }

  // Movement. A mover fights with its die + this move's charge + boost.
  const movers = orders.filter((o) => o.kind === "move" && board[o.from] && board[o.from].id === o.unit);
  const fightPower = (u, mover) => u.value + (mover.borrow || 0) + (u.boost || 0);
  const fightText = (a, pa, b, pb) => `${label(a)} ${pa} vs ${label(b)} ${pb}`;
  const alive = new Map(movers.map((o) => [o.unit, board[o.from]]));
  const fought = new Set();
  for (const o of movers) board[o.from] = null;

  // Two enemies swapping squares meet on the way.
  if (movers.length === 2 && movers[0].side !== movers[1].side && movers[0].from === movers[1].to && movers[0].to === movers[1].from) {
    const [a, b] = movers;
    const ua = alive.get(a.unit);
    const ub = alive.get(b.unit);
    const pa = fightPower(ua, a);
    const pb = fightPower(ub, b);
    fought.add(a.unit).add(b.unit);
    events.push({ kind: "fight", sq: a.to, text: `Clash between ${sqName(a.from)} and ${sqName(b.from)}: ${fightText(ua, pa, ub, pb)}.` });
    if (pa <= pb) {
      fell(ua, a.to, pa === pb ? "tie" : "lost the clash");
      alive.delete(a.unit);
    }
    if (pb <= pa) {
      fell(ub, b.to, pa === pb ? "tie" : "lost the clash");
      alive.delete(b.unit);
    }
  }

  // Arrivals: units from both sides on one square fight (movers, plus an enemy that stayed put).
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
      const wall = !a.o && a.u.type === "S" ? " (a Siege Tower that stays put can't defend)" : "";
      events.push({
        kind: "fight",
        sq,
        text: a.o ? `Both arrive at ${sqName(sq)}: ${fightText(a.u, a.p, b.u, b.p)}.` : `${label(b.u)} ${b.p} attacks ${label(a.u)} ${power(a.u)} at ${sqName(sq)}${wall}.`,
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
    else if (win.o) board[sq] = fought.has(win.o.unit) ? { ...win.u, bonus: 0, boost: 0 } : { ...win.u, value: grow(win.u), bonus: win.o.borrow || 0, boost: 0 };
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

  // Archer shots land on whoever is on the square now.
  for (const o of orders) {
    if (o.kind !== "shoot") continue;
    const shooter = board[o.from];
    if (!shooter || shooter.id !== o.unit) {
      events.push({ kind: "miss", sq: o.from, text: `${SIDE_NAME[o.side]} Archer was cut down before it could shoot.` });
      continue;
    }
    const amount = power(shooter);
    board[o.from] = { ...shooter, boost: 0 };
    const t = board[o.to];
    if (!t || t.side === o.side) {
      events.push({ kind: "miss", sq: o.to, text: `${SIDE_NAME[o.side]} Archer's arrow lands on ${sqName(o.to)}: no enemy there.` });
    } else if (t.type === "S" || amount > power(t)) {
      events.push({ kind: "shot", sq: o.to, text: `${SIDE_NAME[o.side]} Archer (${amount}) hits ${label(t)} (${power(t)}).` });
      fell(t, o.to, "shot");
      board[o.to] = null;
    } else {
      events.push({ kind: "miss", sq: o.to, text: `${SIDE_NAME[o.side]} Archer (${amount}) can't beat ${label(t)} (${power(t)}).` });
    }
  }

  return { board, events, removed, moved: movers.map((o) => ({ id: o.unit, from: o.from, to: o.to })), acted };
}

const kingsLeft = (board) => ({
  blue: board.some((u) => u && u.type === "K" && u.side === "blue"),
  red: board.some((u) => u && u.type === "K" && u.side === "red"),
});

// Resolve a whole turn. ordersBySide = { blue: [1st, 2nd], red: [1st, 2nd] }.
// The next state carries `steps`: for each step, the board before it, the
// orders that ran, who moved and who fell (used to animate the turn).
export function resolve(state, ordersBySide) {
  let board = state.board;
  const steps = [];
  const events = [];
  const removed = [];
  const acted = { blue: false, red: false };
  let kings = kingsLeft(board);
  for (let i = 0; i < ORDERS_PER_TURN; i++) {
    const run = [];
    const stepEvents = [];
    for (const side of ["blue", "red"]) {
      const o = (ordersBySide[side] || [])[i];
      if (!o) continue;
      const fresh = i === 0 ? o : refreshOrder({ ...state, board }, o);
      if (typeof fresh === "string") stepEvents.push({ kind: "cancel", sq: o.from, text: `${SIDE_NAME[side]}'s 2nd order is cancelled: ${fresh}.` });
      else run.push(fresh);
    }
    const r = runStep(board, run);
    steps.push({ before: board, after: r.board, orders: run, moved: r.moved, removed: r.removed, events: [...stepEvents, ...r.events] });
    events.push(...stepEvents.map((e) => ({ ...e, step: i + 1 })), ...r.events.map((e) => ({ ...e, step: i + 1 })));
    removed.push(...r.removed);
    acted.blue ||= r.acted.blue;
    acted.red ||= r.acted.red;
    board = r.board;
    kings = kingsLeft(board);
    if (!kings.blue || !kings.red) break; // a King fell: the turn stops here
  }

  // Kings grow every turn.
  board = board.map((u) => (u && u.type === "K" && u.value < UNITS.K.die ? { ...u, value: u.value + 1 } : u));

  const taken = { ...state.taken };
  for (const { unit } of removed) taken[other(unit.side)] += power(unit);
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
    steps,
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

// Every square in a small diagram around a unit, for the unit card:
// returns [{ dr, dc, kind }] with kind "move" | "far" | "zap" | "shoot" | "touch" (boost reach).
export function movePattern(type, side) {
  const out = [];
  const f = forward(side);
  const ray = (dirs, n) => dirs.forEach(([dr, dc]) => { for (let k = 1; k <= n; k++) out.push({ dr: dr * k, dc: dc * k, kind: k === n ? "far" : "move" }); });
  switch (type) {
    case "M":
      out.push({ dr: f, dc: 0, kind: "move" }, { dr: 2 * f, dc: 0, kind: "far" }, { dr: f, dc: -1, kind: "zap" }, { dr: f, dc: 1, kind: "zap" });
      for (const [dr, dc] of KING_STEPS) if (!(dr === f && dc === 0) && !(dr === f && Math.abs(dc) === 1)) out.push({ dr, dc, kind: "touch" });
      break;
    case "C": KNIGHT_JUMPS.forEach(([dr, dc]) => out.push({ dr, dc, kind: "move" })); break;
    case "A":
      ray(BISHOP_DIRS, 3);
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) if (Math.max(Math.abs(dr), Math.abs(dc)) === 2 && Math.abs(dr) !== Math.abs(dc)) out.push({ dr, dc, kind: "shoot" });
      break;
    case "S": ray(ROOK_DIRS, 3); break;
    case "H": ray([...ROOK_DIRS, ...BISHOP_DIRS], 3); break;
    case "K": KING_STEPS.forEach(([dr, dc]) => out.push({ dr, dc, kind: "move" })); break;
  }
  return out;
}
