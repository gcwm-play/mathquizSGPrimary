// Dice Grid computer player: negamax with alpha-beta and a short capture search.
import { legalMoves, applyMove, maxFace, power } from "./engine.js";

export const LEVELS = {
  easy: { label: "Easy", depth: 1, noise: 2.5 },
  medium: { label: "Medium", depth: 2, noise: 0.4 },
  hard: { label: "Hard", depth: 3, noise: 0.05, ms: 1500 },
  expert: { label: "Expert", depth: 4, noise: 0, ms: 2500 },
};

const WORTH = { P: 1, N: 3, B: 3.2, R: 5, Q: 9, K: 0 };
const WIN = 100000;
const TIMEOUT = Symbol("timeout");

// Score from the point of view of the side to move.
function evaluate(state, rules) {
  let score = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (!p) continue;
    const r = Math.floor(sq / 8);
    const c = sq % 8;
    // A die's number is its fighting strength; room left to grow is future strength.
    let s = WORTH[p.type] + 0.45 * power(p) + 0.04 * (maxFace(p, rules) - p.value);
    if (p.type !== "K") s += 0.08 * (3.5 - Math.abs(3.5 - c)) + 0.05 * (3.5 - Math.abs(3.5 - r));
    else s += 0.1 * (p.side === "w" ? r : 7 - r); // kings prefer to stay home
    if (p.type === "P") s += 0.06 * (p.side === "w" ? 6 - r : r - 1);
    score += p.side === state.turn ? s : -s;
  }
  return score;
}

function ordered(moves, state) {
  const w = (m) => (m.capture ? 10 + (state.board[m.to].type === "K" ? 1000 : WORTH[state.board[m.to].type]) : 0);
  return moves.sort((a, b) => w(b) - w(a));
}

function terminal(state, ply) {
  if (!state.winner) return null;
  if (state.winner === "draw") return 0;
  // Faster wins and slower losses score better.
  return state.winner === state.turn ? WIN - ply : -WIN + ply;
}

function quiesce(state, rules, alpha, beta, ply, qdepth, stats) {
  stats.nodes++;
  const t = terminal(state, ply);
  if (t !== null) return t;
  const stand = evaluate(state, rules);
  if (qdepth === 0 || stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  for (const m of ordered(legalMoves(state, rules).filter((m) => m.capture), state)) {
    const v = -quiesce(applyMove(state, m, rules), rules, -beta, -alpha, ply + 1, qdepth - 1, stats);
    if (v >= beta) return v;
    if (v > alpha) alpha = v;
  }
  return alpha;
}

function negamax(state, rules, depth, alpha, beta, ply, stats) {
  const t = terminal(state, ply);
  if (t !== null) return t;
  if (depth === 0) return quiesce(state, rules, alpha, beta, ply, 3, stats);
  stats.nodes++;
  if (stats.deadline && (stats.nodes & 255) === 0 && Date.now() > stats.deadline) throw TIMEOUT;
  let best = -Infinity;
  let moves = legalMoves(state, rules);
  // Pawn zaps and boosts multiply the options; only look at them near the top of the search.
  if (ply >= 2) moves = moves.filter((m) => !m.action);
  for (const m of ordered(moves, state)) {
    const v = -negamax(applyMove(state, m, rules), rules, depth - 1, -beta, -alpha, ply + 1, stats);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

// Scores every first move at one search depth. A move that can't come within
// the level's random noise of the best so far is cut off early (its score is
// then only an upper bound), since it could never be picked.
function searchRoot(state, rules, moves, depth, noise, stats) {
  let best = -Infinity;
  return moves.map((m) => {
    const next = applyMove(state, m, rules);
    const score = -negamax(next, rules, depth - 1, -Infinity, -(best - 2 * noise - 0.001), 1, stats);
    if (score > best) best = score;
    return { move: m, score };
  });
}

// Returns { move, score, nodes, top } where top lists the best few candidate moves.
// Searches one level deeper at a time; on Hard and Expert, if the thinking time
// runs out mid-search, it plays the best move from the last finished depth.
export function chooseMove(state, rules, level = "medium") {
  const { depth, noise, ms } = LEVELS[level];
  const stats = { nodes: 0, deadline: null };
  let moves = ordered(legalMoves(state, rules), state);
  if (!moves.length) return null;
  let scored = null;
  for (let d = 1; d <= depth; d++) {
    stats.deadline = ms && d > 1 ? stats.deadline ?? Date.now() + ms : null;
    try {
      scored = searchRoot(state, rules, moves, d, noise, stats);
    } catch (e) {
      if (e !== TIMEOUT) throw e;
      break;
    }
    // Try the best moves first next time round: better cut-offs.
    moves = [...scored].sort((a, b) => b.score - a.score).map((x) => x.move);
    if (scored.some((x) => x.score > WIN / 2)) break; // found a forced win
  }
  for (const x of scored) x.pick = x.score + (Math.abs(x.score) > WIN / 2 ? 0 : (Math.random() - 0.5) * 2 * noise);
  scored.sort((a, b) => b.pick - a.pick);
  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, 3);
  return { move: scored[0].move, score: scored[0].score, nodes: stats.nodes, top };
}

export const isWinScore = (s) => Math.abs(s) > WIN / 2;
