// Dice Chess rules engine. Pure functions: a state is never mutated.
// Board: 64 squares, index = row * 8 + col, row 0 is Black's back rank.

export const NAMES = { P: "Pawn", N: "Knight", B: "Bishop", R: "Rook", Q: "Queen", K: "King" };
export const GLYPHS = { P: "♟", N: "♞", B: "♝", R: "♜", Q: "♛", K: "♚" };
export const DIE_SIZES = [4, 6, 8, 10, 12, 20];

export const DEFAULT_RULES = {
  dice: { P: 4, N: 6, B: 8, R: 12, Q: 20, K: 20 },
  startValue: 1,
  compare: "after", // "after": the +1 from moving counts in the fight; "before": it doesn't
  ties: "blocked", // "blocked" | "attacker" (attacker wins) | "both" (both dice removed)
  overflow: "cap", // "cap": stays at max face | "wrap": goes back to 1
  captureBonus: "none", // "none" | "plusOne" (extra +1) | "reset" (attacker drops to 1)
  pawnDouble: true, // pawns may move two squares on their first move
  promotion: "keep", // pawn reaching the far rank becomes a Queen: "keep" value | "reset" to 1
  drawPlies: 100, // draw after this many moves in a row with no capture
};

// Plain-English description of a rules object, for the rules panel and copying.
export function describeRules(r) {
  const dice = Object.keys(NAMES).map((t) => `${NAMES[t]} D${r.dice[t]}`).join(", ");
  return [
    `Board and movement as in chess (no check, castling or en passant). Capture the enemy King to win.`,
    `Dice: ${dice}. Every die starts showing ${r.startValue}.`,
    `Each time a piece moves, its die goes up by 1` +
      (r.overflow === "cap" ? " (it stops at its highest face)." : " (past its highest face it wraps back to 1)."),
    `A piece can capture an enemy only if its number is higher` +
      (r.compare === "after" ? " after adding this move's +1." : " before this move's +1 is added."),
    r.ties === "blocked"
      ? "Equal numbers: the capture is not allowed."
      : r.ties === "attacker"
        ? "Equal numbers: the attacker wins."
        : "Equal numbers: both dice are removed.",
    r.captureBonus === "none"
      ? "Capturing gives no bonus."
      : r.captureBonus === "plusOne"
        ? "Capturing gives an extra +1."
        : "After capturing, the attacker's die resets to 1.",
    (r.pawnDouble ? "Pawns may move two squares on their first move. " : "Pawns move one square at a time. ") +
      `A pawn reaching the far side becomes a Queen (D${r.dice.Q}) and ` +
      (r.promotion === "keep" ? "keeps its number." : "resets to 1."),
    `If nobody captures for ${r.drawPlies} moves the game is a draw. A player with no legal move loses.`,
  ];
}

const BACK = ["R", "N", "B", "Q", "K", "B", "N", "R"];

export function initialState(rules) {
  const board = Array(64).fill(null);
  let id = 0;
  const put = (sq, type, side) => {
    board[sq] = { id: id++, type, side, value: rules.startValue };
  };
  for (let c = 0; c < 8; c++) {
    put(c, BACK[c], "b");
    put(8 + c, "P", "b");
    put(48 + c, "P", "w");
    put(56 + c, BACK[c], "w");
  }
  return { board, turn: "w", winner: null, endReason: null, plies: 0, quietPlies: 0, last: null };
}

export const other = (side) => (side === "w" ? "b" : "w");
export const sqName = (sq) => "abcdefgh"[sq % 8] + (8 - Math.floor(sq / 8));
export const maxFace = (piece, rules) => rules.dice[piece.type];

export function bump(piece, rules, by = 1) {
  const max = maxFace(piece, rules);
  let v = piece.value + by;
  if (v > max) v = rules.overflow === "cap" ? max : ((v - 1) % max) + 1;
  return v;
}

// The number a piece fights with when it attacks this move.
export function attackValue(piece, rules) {
  return rules.compare === "after" ? bump(piece, rules) : piece.value;
}

// "win" | "both" | null (capture not allowed)
export function captureOutcome(attacker, defender, rules) {
  const a = attackValue(attacker, rules);
  if (a > defender.value) return "win";
  if (a === defender.value) {
    if (rules.ties === "attacker") return "win";
    if (rules.ties === "both") return "both";
  }
  return null;
}

const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const ROOK = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const BISHOP = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

// Every square the piece on `from` reaches by chess geometry, whether or not
// the dice allow a capture there: [{ to, capture }].
function reach(board, from, rules) {
  const p = board[from];
  const r0 = Math.floor(from / 8);
  const c0 = from % 8;
  const out = [];
  const on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const step = (dirs, slide) => {
    for (const [dr, dc] of dirs) {
      let r = r0 + dr;
      let c = c0 + dc;
      while (on(r, c)) {
        const t = board[r * 8 + c];
        if (!t) out.push({ to: r * 8 + c, capture: false });
        else {
          if (t.side !== p.side) out.push({ to: r * 8 + c, capture: true });
          break;
        }
        if (!slide) break;
        r += dr;
        c += dc;
      }
    }
  };
  switch (p.type) {
    case "P": {
      const dir = p.side === "w" ? -1 : 1;
      const startRow = p.side === "w" ? 6 : 1;
      if (on(r0 + dir, c0) && !board[(r0 + dir) * 8 + c0]) {
        out.push({ to: (r0 + dir) * 8 + c0, capture: false });
        if (rules.pawnDouble && r0 === startRow && !board[(r0 + 2 * dir) * 8 + c0])
          out.push({ to: (r0 + 2 * dir) * 8 + c0, capture: false });
      }
      for (const dc of [-1, 1]) {
        if (!on(r0 + dir, c0 + dc)) continue;
        const t = board[(r0 + dir) * 8 + c0 + dc];
        if (t && t.side !== p.side) out.push({ to: (r0 + dir) * 8 + c0 + dc, capture: true });
      }
      break;
    }
    case "N": step(KNIGHT, false); break;
    case "B": step(BISHOP, true); break;
    case "R": step(ROOK, true); break;
    case "Q": step([...ROOK, ...BISHOP], true); break;
    case "K": step(KING, false); break;
  }
  return out;
}

// Moves for one piece, including enemy pieces it reaches but is too weak to
// capture (marked blocked: true) so the board can show why.
export function pieceMoves(state, from, rules) {
  return reach(state.board, from, rules).map((m) => {
    if (!m.capture) return { from, to: m.to, capture: false, outcome: null };
    const outcome = captureOutcome(state.board[from], state.board[m.to], rules);
    return { from, to: m.to, capture: true, outcome, blocked: !outcome };
  });
}

export function legalMoves(state, rules, side = state.turn) {
  const moves = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (p && p.side === side) for (const m of pieceMoves(state, sq, rules)) if (!m.blocked) moves.push(m);
  }
  return moves;
}

export function applyMove(state, move, rules) {
  const board = state.board.slice();
  const piece = board[move.from];
  const target = board[move.to];
  const attack = target ? attackValue(piece, rules) : null;
  let value = bump(piece, rules);
  const removed = [];
  let moved = { ...piece, value };
  board[move.from] = null;

  if (target) {
    removed.push(target);
    if (move.outcome === "both") {
      removed.push(piece);
      moved = null;
      board[move.to] = null;
    } else if (rules.captureBonus === "plusOne") moved.value = bump(moved, rules);
    else if (rules.captureBonus === "reset") moved.value = 1;
  }

  let promoted = false;
  if (moved && moved.type === "P" && (Math.floor(move.to / 8) === 0 || Math.floor(move.to / 8) === 7)) {
    moved = { ...moved, type: "Q", value: rules.promotion === "keep" ? moved.value : 1 };
    promoted = true;
  }
  if (moved) board[move.to] = moved;

  const next = {
    board,
    turn: other(state.turn),
    winner: null,
    endReason: null,
    plies: state.plies + 1,
    quietPlies: removed.length ? 0 : state.quietPlies + 1,
    last: { ...move, piece, target, attack, value: moved ? moved.value : null, removed, promoted },
  };

  if (target && target.type === "K") {
    next.winner = state.turn;
    next.endReason = "king";
  } else if (!moved && piece.type === "K") {
    next.winner = other(state.turn);
    next.endReason = "king";
  } else if (next.quietPlies >= rules.drawPlies) {
    next.winner = "draw";
    next.endReason = "quiet";
  } else if (legalMoves(next, rules).length === 0) {
    next.winner = state.turn;
    next.endReason = "stuck";
  }
  return next;
}

// Short log line for a move, e.g. "♜ a1→a4 (3)" or "♞ b1×c3 (4 beats 2)".
export function moveText(last) {
  const { piece, target, from, to, value, attack, outcome, promoted } = last;
  let s = `${GLYPHS[piece.type]} ${sqName(from)}${target ? "×" : "→"}${sqName(to)}`;
  if (target) {
    s += ` ${GLYPHS[target.type]}`;
    s +=
      outcome === "both"
        ? ` (${attack} ties ${target.value}: both out)`
        : attack === target.value
          ? ` (${attack} ties ${target.value}: attacker wins)`
          : ` (${attack} beats ${target.value})`;
  } else s += ` (${value})`;
  if (promoted) s += " =♛";
  return s;
}
