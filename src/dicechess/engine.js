// Dice Chess rules engine. Pure functions: a state is never mutated.
// Board: 64 squares, index = row * 8 + col, row 0 is Black's back rank.
// A piece is { id, type, side, value, bonus }: value is its die face, bonus is
// power a knight borrowed from friends it jumped over. Its power is value + bonus.

export const NAMES = { P: "Pawn", N: "Knight", B: "Bishop", R: "Rook", Q: "Queen", K: "King" };
export const GLYPHS = { P: "♟", N: "♞", B: "♝", R: "♜", Q: "♛", K: "♚" };
export const DIE_SIZES = [4, 6, 8, 10, 12, 20];
export const GROWTHS = ["0", "+1", "+2", "+3", "x2"];

export const DEFAULT_RULES = {
  dice: { P: 4, N: 6, B: 8, R: 12, Q: 20, K: 20 },
  growth: { P: "+1", N: "+1", B: "+1", R: "x2", Q: "+2", K: "0" }, // what one move does to the die
  kingEvery: 1, // the King gains +1 every this many of its side's turns (0 = never)
  rookFragile: true, // rooks are walls: any enemy can capture one, whatever the numbers
  knightBorrow: true, // knights add the power of friends they jump over until they next move
  startValue: 1,
  compare: "after", // "after": this move's growth counts in the fight; "before": it doesn't
  ties: "blocked", // "blocked" | "attacker" (attacker wins) | "both" (both dice removed)
  overflow: "cap", // "cap": stays at max face | "wrap": goes back to 1
  captureBonus: "noGrowth", // "noGrowth" (a capture doesn't grow the die) | "none" (grows as a normal move) | "plusOne" (normal growth and an extra +1) | "reset" (attacker drops to 1)
  pawnDouble: true, // pawns may move two squares on their first move
  promotion: "keep", // pawn reaching the far rank becomes a Queen: "keep" value | "reset" to 1
  drawPlies: 100, // draw after this many moves in a row with no capture
};

const GROWTH_TEXT = { "0": "doesn't change", "+1": "+1", "+2": "+2", "+3": "+3", x2: "doubles" };

// Plain-English description of a rules object, for the rules panel and copying.
export function describeRules(r) {
  const dice = Object.keys(NAMES).map((t) => `${NAMES[t]} D${r.dice[t]}`).join(", ");
  const growth = Object.keys(NAMES).map((t) => `${NAMES[t]} ${GROWTH_TEXT[r.growth[t]]}`).join(", ");
  return [
    `Board and movement as in chess (no check, castling or en passant). Capture the enemy King to win.`,
    `Dice: ${dice}. Every die starts showing ${r.startValue}.`,
    `Each move, the moving piece's die changes: ${growth}.` +
      (r.overflow === "cap" ? " A die stops at its highest face." : " Past its highest face a die wraps back to 1."),
    r.kingEvery
      ? `The King gains +1 every ${r.kingEvery === 1 ? "turn" : r.kingEvery + " turns"} his side takes, whether he moves or not.`
      : "The King only grows when he moves.",
    r.captureBonus === "noGrowth"
      ? "A piece can capture an enemy only if its number is higher. A capture doesn't count as a move for growth: the attacker fights with its current number and its die stays the same."
      : `A piece can capture an enemy only if its number is higher` +
        (r.compare === "after" ? " after this move's change." : " before this move's change."),
    r.rookFragile && "Rooks are walls: any enemy piece can capture a rook, whatever the numbers.",
    r.knightBorrow &&
      "Knights borrow power: friendly pieces on the knight's L-shaped path add their numbers to the knight's until its next move. " +
        "It takes whichever L route passes the most friendly power. Borrowed power counts in a capture on the same jump, then is lost.",
    r.ties === "blocked"
      ? "Equal numbers: the capture is not allowed."
      : r.ties === "attacker"
        ? "Equal numbers: the attacker wins."
        : "Equal numbers: both dice are removed.",
    {
      noGrowth: null,
      none: "A capture counts as a normal move for growth.",
      plusOne: "A capture counts as a normal move for growth, plus an extra +1.",
      reset: "After capturing, the attacker's die resets to 1.",
    }[r.captureBonus],
    (r.pawnDouble ? "Pawns may move two squares on their first move. " : "Pawns move one square at a time. ") +
      `A pawn reaching the far side becomes a Queen (D${r.dice.Q}) and ` +
      (r.promotion === "keep" ? "keeps its number." : "resets to 1."),
    `If nobody captures for ${r.drawPlies} moves the game is a draw. A player with no legal move loses.`,
  ].filter(Boolean);
}

const BACK = ["R", "N", "B", "Q", "K", "B", "N", "R"];

export function initialState(rules) {
  const board = Array(64).fill(null);
  let id = 0;
  const put = (sq, type, side) => {
    board[sq] = { id: id++, type, side, value: rules.startValue, bonus: 0 };
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
export const power = (piece) => piece.value + (piece.bonus || 0);

// Keep a raw number on the die's faces.
function onDie(v, piece, rules) {
  const max = maxFace(piece, rules);
  if (v <= max) return v;
  return rules.overflow === "cap" ? max : ((v - 1) % max) + 1;
}

// The die face after one move by this piece.
export function grow(piece, rules) {
  const g = rules.growth[piece.type];
  if (g === "0") return piece.value;
  return onDie(g === "x2" ? piece.value * 2 : piece.value + Number(g), piece, rules);
}

// Moves the side has made so far, given the ply count.
const turnsTaken = (plies, side) => (side === "w" ? Math.ceil(plies / 2) : Math.floor(plies / 2));

// Turns until the King's next free +1 (null if kings don't grow by themselves).
export function kingGrowthIn(state, side, rules) {
  if (!rules.kingEvery) return null;
  return rules.kingEvery - (turnsTaken(state.plies, side) % rules.kingEvery);
}

// "win" | "both" | null (capture not allowed)
export function captureOutcome(attack, defender, rules) {
  if (rules.rookFragile && defender.type === "R") return "win";
  const d = power(defender);
  if (attack > d) return "win";
  if (attack === d) {
    if (rules.ties === "attacker") return "win";
    if (rules.ties === "both") return "both";
  }
  return null;
}

const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const ROOK = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const BISHOP = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

// The two L routes for a knight jump, as the squares passed over (not the landing square).
function knightRoutes(r0, c0, dr, dc) {
  const sq = (r, c) => r * 8 + c;
  if (Math.abs(dr) === 2)
    return [
      [sq(r0 + dr / 2, c0), sq(r0 + dr, c0)], // two straight, then across
      [sq(r0, c0 + dc), sq(r0 + dr / 2, c0 + dc)], // across, then two straight
    ];
  return [
    [sq(r0, c0 + dc / 2), sq(r0, c0 + dc)],
    [sq(r0 + dr, c0), sq(r0 + dr, c0 + dc / 2)],
  ];
}

// Every square the piece on `from` reaches by chess geometry, whether or not
// the dice allow a capture there: [{ to, capture, route?, borrow? }].
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
    case "N":
      for (const [dr, dc] of KNIGHT) {
        if (!on(r0 + dr, c0 + dc)) continue;
        const to = (r0 + dr) * 8 + c0 + dc;
        const t = board[to];
        if (t && t.side === p.side) continue;
        let best = { route: [], borrow: 0 };
        if (rules.knightBorrow) {
          for (const route of knightRoutes(r0, c0, dr, dc)) {
            const friends = route.filter((s) => board[s] && board[s].side === p.side);
            const borrow = friends.reduce((sum, s) => sum + power(board[s]), 0);
            if (borrow > best.borrow) best = { route: friends, borrow };
          }
        }
        out.push({ to, capture: !!t, ...best });
      }
      break;
    case "B": step(BISHOP, true); break;
    case "R": step(ROOK, true); break;
    case "Q": step([...ROOK, ...BISHOP], true); break;
    case "K": step(KING, false); break;
  }
  return out;
}

// Moves for one piece, including enemy pieces it reaches but is too weak to
// capture (marked blocked: true) so the board can show why. `attack` is the
// number the piece would fight with on that move.
export function pieceMoves(state, from, rules) {
  const p = state.board[from];
  return reach(state.board, from, rules).map((m) => {
    const borrow = m.borrow || 0;
    const attack =
      m.capture && rules.captureBonus === "noGrowth"
        ? p.value + borrow
        : rules.compare === "after"
          ? grow(p, rules) + borrow
          : power(p);
    const move = { from, to: m.to, capture: m.capture, borrow, route: m.route || [], attack, outcome: null };
    if (!m.capture) return move;
    const outcome = captureOutcome(attack, state.board[m.to], rules);
    return { ...move, outcome, blocked: !outcome };
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
  const removed = [];
  let moved = { ...piece, value: grow(piece, rules), bonus: move.borrow || 0 };
  board[move.from] = null;

  if (target) {
    removed.push(target);
    moved.bonus = 0; // borrowed power is spent on the capture
    if (move.outcome === "both") {
      removed.push(piece);
      moved = null;
      board[move.to] = null;
    } else if (rules.captureBonus === "noGrowth") moved.value = piece.value;
    else if (rules.captureBonus === "plusOne") moved.value = onDie(moved.value + 1, moved, rules);
    else if (rules.captureBonus === "reset") moved.value = 1;
  }

  let promoted = false;
  if (moved && moved.type === "P" && (Math.floor(move.to / 8) === 0 || Math.floor(move.to / 8) === 7)) {
    moved = { ...moved, type: "Q", value: rules.promotion === "keep" ? moved.value : 1 };
    promoted = true;
  }
  if (moved) board[move.to] = moved;

  // The mover's King grows by itself every few turns.
  let kingGrew = false;
  if (rules.kingEvery && (turnsTaken(state.plies, state.turn) + 1) % rules.kingEvery === 0) {
    const ks = board.findIndex((p) => p && p.side === state.turn && p.type === "K");
    if (ks >= 0) {
      const k = board[ks];
      const value = onDie(k.value + 1, k, rules);
      if (value !== k.value) {
        board[ks] = { ...k, value };
        kingGrew = true;
      }
    }
  }

  const next = {
    board,
    turn: other(state.turn),
    winner: null,
    endReason: null,
    plies: state.plies + 1,
    quietPlies: removed.length ? 0 : state.quietPlies + 1,
    last: { ...move, piece, target, value: moved ? power(moved) : null, removed, promoted, kingGrew },
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

// Short log line for a move, e.g. "♜ a1→a4 (2)" or "♞ b1×c3 +4 (6 beats 2)".
export function moveText(last) {
  const { piece, target, from, to, value, attack, outcome, promoted, borrow, kingGrew } = last;
  let s = `${GLYPHS[piece.type]} ${sqName(from)}${target ? "×" : "→"}${sqName(to)}`;
  if (borrow) s += ` +${borrow}`;
  if (target) {
    const d = power(target);
    s += ` ${GLYPHS[target.type]}`;
    s +=
      outcome === "both"
        ? ` (${attack} ties ${d}: both out)`
        : attack > d
          ? ` (${attack} beats ${d})`
          : attack === d
            ? ` (${attack} ties ${d}: attacker wins)`
            : ` (${attack} topples the wall ${d})`;
  } else s += ` (${value})`;
  if (promoted) s += " =♛";
  if (kingGrew) s += " · ♚+1";
  return s;
}
