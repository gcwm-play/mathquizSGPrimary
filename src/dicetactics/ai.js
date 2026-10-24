// Dice Grid Tactics computer player. Turns are simultaneous, so instead of
// looking ahead move by move it scores each possible order (assuming the enemy
// mostly stays put, which is usual: only 2 of their units act each turn), then
// tries the best orders in pairs.
import { H, UNITS, power, unitOptions, resolve, reachSet, other, orderProblem, rowOf } from "./engine.js";

export const LEVELS = {
  easy: { label: "Easy", noise: 3, keep: 6 },
  normal: { label: "Normal", noise: 0.25, keep: 12 },
};

const unitValue = (u) => UNITS[u.type].worth + 0.4 * power(u) + 0.03 * (UNITS[u.type].die - u.value);

// Score for `side`: material, plus danger from enemies that could reach a unit next turn.
export function evaluate(state, side) {
  if (state.winner) return state.winner === side ? 1000 : state.winner === "draw" ? 0 : -1000;
  const { board } = state;
  const strongest = { blue: new Map(), red: new Map() }; // square -> strongest power that could arrive there
  board.forEach((u, sq) => {
    if (!u) return;
    const p = power(u);
    const m = strongest[u.side];
    for (const t of reachSet(board, sq)) if ((m.get(t) ?? 0) < p) m.set(t, p);
  });
  let score = 0;
  board.forEach((u, sq) => {
    if (!u) return;
    const mine = u.side === side;
    const adv = u.side === "blue" ? H - 1 - rowOf(sq) : rowOf(sq);
    let v = unitValue(u) + (u.type === "K" ? -0.1 * adv : 0.04 * adv);
    const threat = strongest[other(u.side)].get(sq) ?? 0;
    const beaten = u.type === "S" ? threat > 0 : threat > power(u);
    const tied = u.type !== "S" && threat === power(u);
    if (u.type === "K") v -= beaten ? (mine ? 40 : 12) : tied ? (mine ? 15 : 4) : 0;
    else if (beaten || tied) v -= (mine ? 0.55 : 0.3) * unitValue(u) * (tied ? 0.6 : 1);
    score += mine ? v : -v;
  });
  return score;
}

// Every order worth considering for `side`.
function candidates(state, side) {
  const out = [];
  state.board.forEach((u, sq) => {
    if (!u || u.side !== side) return;
    const o = unitOptions(state, sq);
    out.push(...o.moves, ...o.zaps, ...o.boosts);
    // Archers mostly aim where enemies stand now.
    out.push(...o.shots.filter((s) => state.board[s.to] && state.board[s.to].side !== side));
  });
  return out;
}

// Returns up to 2 orders for `side`.
export function chooseOrders(state, side, level = "normal") {
  const { noise, keep } = LEVELS[level];
  const opp = other(side);
  const score = (orders) => evaluate(resolve(state, { [side]: orders, [opp]: [] }), side) + (Math.random() - 0.5) * 2 * noise;
  const singles = candidates(state, side).map((o) => ({ orders: [o], s: score([o]) }));
  singles.sort((a, b) => b.s - a.s);
  const best = singles.slice(0, keep);
  let pick = { orders: [], s: score([]) };
  for (const x of best) if (x.s > pick.s) pick = x;
  for (let i = 0; i < best.length; i++) {
    for (let j = i + 1; j < best.length; j++) {
      const a = best[i].orders[0];
      const b = best[j].orders[0];
      if (a.unit === b.unit || orderProblem(state, [a], b)) continue;
      const s = score([a, b]);
      if (s > pick.s) pick = { orders: [a, b], s };
    }
  }
  return pick.orders;
}
