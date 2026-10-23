import { useEffect, useMemo, useRef, useState } from "react";
import Die from "./Die.jsx";
import {
  DEFAULT_RULES,
  DIE_SIZES,
  NAMES,
  GLYPHS,
  initialState,
  pieceMoves,
  legalMoves,
  applyMove,
  moveText,
  describeRules,
  grow,
  power,
  kingGrowthIn,
  GROWTHS,
  sqName,
} from "./engine.js";
import { LEVELS, chooseMove, isWinScore } from "./ai.js";

const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: settings just won't persist
  }
};

const loadRules = () => {
  const r = load("dicechess.rules.v3", null);
  return r
    ? { ...DEFAULT_RULES, ...r, dice: { ...DEFAULT_RULES.dice, ...r.dice }, growth: { ...DEFAULT_RULES.growth, ...r.growth } }
    : DEFAULT_RULES;
};

const SIDE = { w: "White", b: "Black" };
const END = {
  king: "captured the King",
  stuck: "left the other side with no legal move",
  quiet: "no capture for too long",
};

export default function DiceChessApp() {
  const [rules, setRules] = useState(loadRules);
  const [draft, setDraft] = useState(rules);
  const [history, setHistory] = useState(() => [initialState(rules)]);
  const [mode, setMode] = useState(() => load("dicechess.mode", "ai")); // ai | hotseat | watch
  const [humanSide, setHumanSide] = useState(() => load("dicechess.side", "w"));
  const [level, setLevel] = useState(() => load("dicechess.level", "medium"));
  const [selected, setSelected] = useState(null);
  const [inspect, setInspect] = useState(null);
  const [hint, setHint] = useState("");
  const [aiInfo, setAiInfo] = useState(null);
  const [tab, setTab] = useState("game");
  const [notes, setNotes] = useState(() => load("dicechess.notes", ""));
  const [paused, setPaused] = useState(false);

  const state = history[history.length - 1];
  const flipped = mode === "ai" && humanSide === "b";
  const aiTurn = !state.winner && (mode === "watch" || (mode === "ai" && state.turn !== humanSide));

  useEffect(() => save("dicechess.mode", mode), [mode]);
  useEffect(() => save("dicechess.side", humanSide), [humanSide]);
  useEffect(() => save("dicechess.level", level), [level]);
  useEffect(() => save("dicechess.notes", notes), [notes]);

  // Computer moves.
  useEffect(() => {
    if (!aiTurn || (mode === "watch" && paused)) return;
    const t = setTimeout(
      () => {
        const r = chooseMove(state, rules, level);
        if (!r) return;
        setAiInfo({ ...r, side: state.turn });
        setHistory((h) => [...h, applyMove(state, r.move, rules)]);
      },
      mode === "watch" ? 500 : 350,
    );
    return () => clearTimeout(t);
  }, [state, aiTurn, mode, paused, rules, level]);

  const newGame = (r = rules) => {
    setHistory([initialState(r)]);
    setSelected(null);
    setInspect(null);
    setHint("");
    setAiInfo(null);
  };

  const undo = () => {
    setSelected(null);
    setHint("");
    setHistory((h) => {
      if (h.length < 2) return h;
      let n = h.length - 1;
      // In a game against the computer, go back to your own previous turn.
      if (mode === "ai") while (n > 0 && h[n - 1].turn !== humanSide) n--;
      return h.slice(0, Math.max(1, n));
    });
  };

  const movesFromSelected = useMemo(
    () => (selected === null ? [] : pieceMoves(state, selected, rules)),
    [selected, state, rules],
  );

  const clickSquare = (sq) => {
    const p = state.board[sq];
    if (p) setInspect(sq);
    if (state.winner || aiTurn) return;
    const m = movesFromSelected.find((m) => m.to === sq);
    if (m && !m.blocked) {
      setHistory((h) => [...h, applyMove(state, m, rules)]);
      setSelected(null);
      setHint("");
      return;
    }
    if (m && m.blocked) {
      const a = state.board[selected];
      setHint(
        `Your ${NAMES[a.type]} would fight with ${m.attack}` +
          (m.borrow ? ` (including ${m.borrow} borrowed from friends it jumps over)` : "") +
          `, which doesn't beat the ${NAMES[p.type]}'s ${power(p)}.`,
      );
      return;
    }
    if (p && p.side === state.turn) {
      setSelected(sq === selected ? null : sq);
      setHint("");
    } else setSelected(null);
  };

  const status = state.winner
    ? state.winner === "draw"
      ? `Draw: ${END.quiet}.`
      : `${SIDE[state.winner]} wins: ${END[state.endReason]}.`
    : aiTurn
      ? `${SIDE[state.turn]} (computer) is thinking…`
      : `${SIDE[state.turn]} to move.`;

  const captured = { w: [], b: [] };
  for (const s of history) if (s.last) for (const p of s.last.removed) captured[p.side].push(p);

  const rows = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const last = state.last;

  return (
    <div className="dc-app min-h-screen bg-[#f3efe6] text-[#1f2333]">
      <header className="mx-auto max-w-6xl px-4 pt-4 pb-2 flex flex-wrap items-end gap-x-4 gap-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold">🎲 Dice Chess</h1>
        <p className="text-sm text-[#5b5f73]">Prototype — chess moves, dice fights. Rules are a draft: change them in the Rules tab.</p>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-10 grid gap-5 lg:grid-cols-[minmax(0,600px)_1fr]">
        <section>
          <Tray pieces={captured[flipped ? "w" : "b"]} rules={rules} label={`Taken from ${flipped ? "White" : "Black"}`} />
          <div className="dc-board-wrap">
            <div className="dc-board" role="grid" aria-label="Dice chess board">
              {rows.map((r) =>
                cols.map((c) => {
                  const sq = r * 8 + c;
                  const p = state.board[sq];
                  const m = movesFromSelected.find((m) => m.to === sq);
                  const dark = (r + c) % 2 === 1;
                  const cls = [
                    "dc-sq",
                    dark ? "dc-dark" : "dc-light",
                    sq === selected && "dc-selected",
                    last && (sq === last.from || sq === last.to) && "dc-last",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <button key={sq} className={cls} onClick={() => clickSquare(sq)} aria-label={sqName(sq) + (p ? ` ${SIDE[p.side]} ${NAMES[p.type]} ${power(p)}` : "")}>
                      {c === (flipped ? 7 : 0) && <span className="dc-coord dc-rank">{8 - r}</span>}
                      {r === (flipped ? 0 : 7) && <span className="dc-coord dc-file">{"abcdefgh"[c]}</span>}
                      {p && <Die piece={p} faces={rules.dice[p.type]} />}
                      {m && !m.capture && <span className="dc-dot" />}
                      {m && !m.blocked && m.borrow > 0 && <span className="dc-borrow">+{m.borrow}</span>}
                      {m && m.capture && !m.blocked && <span className={`dc-ring ${m.outcome === "both" ? "dc-ring-tie" : ""}`} />}
                      {m && m.blocked && <span className="dc-block">✕</span>}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
          <Tray pieces={captured[flipped ? "b" : "w"]} rules={rules} label={`Taken from ${flipped ? "Black" : "White"}`} />
          <p className={`mt-2 font-semibold ${state.winner ? "text-lg text-[#b5179e]" : ""}`}>{status}</p>
          {hint && <p className="mt-1 text-sm text-[#b23a48]">{hint}</p>}
          <Legend rules={rules} />
        </section>

        <section className="min-w-0">
          <nav className="flex flex-wrap gap-1 mb-3">
            {[
              ["game", "Game"],
              ["rules", "Rules"],
              ["log", "Move log"],
              ["test", "Balance test"],
              ["notes", "Notes"],
            ].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} className={`dc-tab ${tab === k ? "dc-tab-on" : ""}`}>
                {label}
              </button>
            ))}
          </nav>

          {tab === "game" && (
            <div className="space-y-4">
              <Card title="Play">
                <Row label="Mode">
                  <Seg value={mode} onChange={(v) => { setMode(v); setPaused(false); }} options={[["ai", "vs Computer"], ["hotseat", "2 players"], ["watch", "Computer vs Computer"]]} />
                </Row>
                {mode === "ai" && (
                  <Row label="You play">
                    <Seg value={humanSide} onChange={(v) => { setHumanSide(v); newGame(); }} options={[["w", "White (first)"], ["b", "Black"]]} />
                  </Row>
                )}
                {mode !== "hotseat" && (
                  <Row label="Computer">
                    <Seg value={level} onChange={setLevel} options={Object.entries(LEVELS).map(([k, l]) => [k, l.label])} />
                  </Row>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button className="dc-btn dc-btn-main" onClick={() => newGame()}>New game</button>
                  <button className="dc-btn" onClick={undo} disabled={history.length < 2}>Undo</button>
                  {mode === "watch" && (
                    <button className="dc-btn" onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</button>
                  )}
                </div>
              </Card>

              <Card title="Piece info">
                {inspect !== null && state.board[inspect] ? (
                  <PieceInfo piece={state.board[inspect]} sq={inspect} rules={rules} state={state} />
                ) : (
                  <p className="text-sm text-[#5b5f73]">Tap any piece to see its die, its number and what it can beat.</p>
                )}
              </Card>

              {aiInfo && (
                <Card title={`Computer's last thought (${SIDE[aiInfo.side]})`}>
                  <p className="text-sm">
                    Looked at {aiInfo.nodes.toLocaleString()} positions. Best options it saw:
                  </p>
                  <ol className="text-sm list-decimal pl-5 mt-1">
                    {aiInfo.top.map((t, i) => (
                      <li key={i}>
                        {aiInfo.move === t.move ? "▶ " : ""}
                        {sqName(t.move.from)}→{sqName(t.move.to)}{" "}
                        <span className="text-[#5b5f73]">
                          {isWinScore(t.score) ? (t.score > 0 ? "(sees a forced win)" : "(sees a forced loss)") : `(score ${t.score.toFixed(1)})`}
                        </span>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}
            </div>
          )}

          {tab === "rules" && (
            <RulesPanel draft={draft} setDraft={setDraft} rules={rules}
              apply={() => { setRules(draft); save("dicechess.rules.v3", draft); newGame(draft); }}
              reset={() => setDraft(DEFAULT_RULES)} />
          )}

          {tab === "log" && <MoveLog history={history} />}

          {tab === "test" && <BalanceTest rules={rules} />}

          {tab === "notes" && <Notes notes={notes} setNotes={setNotes} rules={rules} />}
        </section>
      </main>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl bg-white/80 shadow-sm border border-[#e3dccb] p-4">
      <h2 className="font-bold mb-2">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-2">
      <span className="text-sm w-24 shrink-0 text-[#5b5f73]">{label}</span>
      {children}
    </div>
  );
}

function Seg({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(([v, label]) => (
        <button key={String(v)} onClick={() => onChange(v)} className={`dc-seg ${value === v ? "dc-seg-on" : ""}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Tray({ pieces, rules, label }) {
  return (
    <div className="dc-tray" aria-label={label} title={label}>
      {pieces.map((p) => (
        <span key={p.id} className="w-6 h-6 inline-block">
          <Die piece={p} faces={rules.dice[p.type]} />
        </span>
      ))}
    </div>
  );
}

function Legend({ rules }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5b5f73]">
      <span><span className="dc-key dc-key-dot" /> move</span>
      <span><span className="dc-key dc-key-ring" /> can capture</span>
      {rules.ties === "both" && <span><span className="dc-key dc-key-tie" /> tie: both removed</span>}
      <span><span className="text-[#b23a48] font-bold">✕</span> too weak to capture</span>
      {rules.knightBorrow && <span><span className="dc-borrow dc-borrow-key">+3</span> knight borrows power</span>}
      <span><span className="dc-key dc-key-full" /> die at its top face{rules.overflow === "wrap" ? " (next move wraps to 1)" : ""}</span>
    </div>
  );
}

const GROWTH_WORDS = { "0": "doesn't change", "+1": "goes up by 1", "+2": "goes up by 2", "+3": "goes up by 3", x2: "doubles" };

function PieceInfo({ piece, sq, rules, state }) {
  const faces = rules.dice[piece.type];
  const next = grow(piece, rules);
  const attack = rules.captureBonus === "noGrowth" ? piece.value : rules.compare === "after" ? next : power(piece);
  const most = rules.ties === "blocked" ? attack - 1 : attack;
  const kingIn = piece.type === "K" ? kingGrowthIn(state, piece.side, rules) : null;
  return (
    <div className="flex gap-3 items-center">
      <span className="w-16 h-16 shrink-0"><Die piece={piece} faces={faces} /></span>
      <div className="text-sm space-y-0.5">
        <p className="font-semibold">{SIDE[piece.side]} {NAMES[piece.type]} on {sqName(sq)}</p>
        <p>
          D{faces} showing <b>{piece.value}</b>
          {piece.bonus > 0 && <> + <b className="text-[#7b2cbf]">{piece.bonus}</b> borrowed = power <b>{power(piece)}</b></>}.
        </p>
        <p>
          Each move its die {GROWTH_WORDS[rules.growth[piece.type]]}: next <b>{next}</b>
          {rules.overflow === "wrap" && next < piece.value ? " (wraps around!)" : ""}.
          {kingIn !== null && <> It also gains +1 by itself in <b>{kingIn}</b> {kingIn === 1 ? "turn" : "turns"}.</>}
        </p>
        <p>
          It attacks with <b>{attack}</b>
          {piece.type === "N" && rules.knightBorrow ? " plus the power of friends it jumps over" : ""}, so it can capture enemies with{" "}
          <b>{most} or less</b>{rules.rookFragile ? " (and any rook)" : ""}.
        </p>
        {piece.type === "R" && rules.rookFragile && <p className="text-[#b23a48]">Rooks are walls: any enemy piece can capture it.</p>}
      </div>
    </div>
  );
}

function RulesPanel({ draft, setDraft, rules, apply, reset }) {
  const set = (k, v) => setDraft({ ...draft, [k]: v });
  const changed = JSON.stringify(draft) !== JSON.stringify(rules);
  return (
    <div className="space-y-4">
      <Card title="Current rules">
        <ul className="text-sm list-disc pl-5 space-y-1">
          {describeRules(rules).map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </Card>
      <Card title="Change the rules">
        <p className="text-sm text-[#5b5f73] mb-3">Try a variation, then press Apply. Applying starts a new game.</p>
        <p className="text-sm text-[#5b5f73] mb-1">Each piece's die, and what one move does to it:</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
          {Object.keys(NAMES).map((t) => (
            <label key={t} className="text-sm">
              <span className="block text-[#5b5f73]">{GLYPHS[t]} {NAMES[t]}</span>
              <select className="dc-select" aria-label={`${NAMES[t]} die`} value={draft.dice[t]} onChange={(e) => setDraft({ ...draft, dice: { ...draft.dice, [t]: +e.target.value } })}>
                {DIE_SIZES.map((d) => <option key={d} value={d}>D{d}</option>)}
              </select>
              <select className="dc-select mt-1" aria-label={`${NAMES[t]} growth per move`} value={draft.growth[t]} onChange={(e) => setDraft({ ...draft, growth: { ...draft.growth, [t]: e.target.value } })}>
                {GROWTHS.map((g) => <option key={g} value={g}>{g === "x2" ? "×2" : g === "0" ? "+0" : g}</option>)}
              </select>
            </label>
          ))}
        </div>
        <Row label="King grows">
          <Seg value={draft.kingEvery} onChange={(v) => set("kingEvery", v)} options={[[0, "Only by moving"], [1, "+1 every turn"], [2, "+1 every 2 turns"], [3, "+1 every 3 turns"]]} />
        </Row>
        <Row label="Rooks">
          <Seg value={draft.rookFragile} onChange={(v) => set("rookFragile", v)} options={[[true, "Walls: anything can take them"], [false, "Normal"]]} />
        </Row>
        <Row label="Knights">
          <Seg value={draft.knightBorrow} onChange={(v) => set("knightBorrow", v)} options={[[true, "Borrow power of friends jumped"], [false, "No borrowing"]]} />
        </Row>
        <Row label="Start at">
          <Seg value={draft.startValue} onChange={(v) => set("startValue", v)} options={[[1, "1"], [2, "2"], [3, "3"]]} />
        </Row>
        {draft.captureBonus !== "noGrowth" && (
          <Row label="Fight with">
            <Seg value={draft.compare} onChange={(v) => set("compare", v)} options={[["after", "Number after this move"], ["before", "Number before moving"]]} />
          </Row>
        )}
        <Row label="Equal numbers">
          <Seg value={draft.ties} onChange={(v) => set("ties", v)} options={[["blocked", "Can't capture"], ["attacker", "Attacker wins"], ["both", "Both removed"]]} />
        </Row>
        <Row label="At top face">
          <Seg value={draft.overflow} onChange={(v) => set("overflow", v)} options={[["cap", "Stays at max"], ["wrap", "Wraps to 1"]]} />
        </Row>
        <Row label="After capture">
          <Seg value={draft.captureBonus} onChange={(v) => set("captureBonus", v)} options={[["noGrowth", "No growth from a capture"], ["none", "Grows as normal"], ["plusOne", "Grows, plus extra +1"], ["reset", "Reset to 1"]]} />
        </Row>
        <Row label="Pawn first move">
          <Seg value={draft.pawnDouble} onChange={(v) => set("pawnDouble", v)} options={[[true, "1 or 2 squares"], [false, "1 square"]]} />
        </Row>
        <Row label="Promotion">
          <Seg value={draft.promotion} onChange={(v) => set("promotion", v)} options={[["keep", "Queen, keeps number"], ["reset", "Queen, back to 1"]]} />
        </Row>
        <Row label="Draw after">
          <Seg value={draft.drawPlies} onChange={(v) => set("drawPlies", v)} options={[[50, "50"], [100, "100"], [200, "200"]]} />
          <span className="text-sm text-[#5b5f73]">moves with no capture</span>
        </Row>
        <div className="flex gap-2 pt-2">
          <button className="dc-btn dc-btn-main" onClick={apply} disabled={!changed}>Apply &amp; new game</button>
          <button className="dc-btn" onClick={reset}>Default rules</button>
        </div>
      </Card>
    </div>
  );
}

function MoveLog({ history }) {
  const moves = history.slice(1).map((s) => moveText(s.last));
  const pairs = [];
  for (let i = 0; i < moves.length; i += 2) pairs.push([moves[i], moves[i + 1]]);
  return (
    <Card title={`Move log (${moves.length} moves)`}>
      {pairs.length === 0 ? (
        <p className="text-sm text-[#5b5f73]">No moves yet.</p>
      ) : (
        <ol className="text-sm font-mono space-y-0.5 max-h-[60vh] overflow-y-auto">
          {pairs.map(([w, b], i) => (
            <li key={i} className="grid grid-cols-[2.5rem_1fr_1fr] gap-2">
              <span className="text-[#5b5f73]">{i + 1}.</span>
              <span>{w}</span>
              <span>{b || ""}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

// Plays computer-vs-computer games in small batches so the page stays responsive.
function BalanceTest({ rules }) {
  const [games, setGames] = useState(20);
  const [lvl, setLvl] = useState("easy");
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const stop = useRef(false);

  useEffect(() => () => { stop.current = true; }, []);

  const run = () => {
    stop.current = false;
    setRunning(true);
    const acc = { played: 0, w: 0, b: 0, draw: 0, plies: 0, captures: 0, ends: { king: 0, stuck: 0, quiet: 0 }, firstCapture: 0 };
    const playOne = () => {
      let s = initialState(rules);
      let caps = 0;
      let first = null;
      while (!s.winner && s.plies < 1000) {
        const r = chooseMove(s, rules, lvl);
        if (!r) break;
        s = applyMove(s, r.move, rules);
        if (s.last.removed.length) {
          caps += s.last.removed.length;
          if (first === null) first = s.plies;
        }
      }
      acc.played++;
      acc[s.winner || "draw"]++;
      acc.ends[s.endReason || "quiet"]++;
      acc.plies += s.plies;
      acc.captures += caps;
      acc.firstCapture += first ?? s.plies;
    };
    const step = () => {
      if (stop.current) return setRunning(false);
      playOne();
      setResult({ ...acc, ends: { ...acc.ends } });
      if (acc.played < games) setTimeout(step, 0);
      else setRunning(false);
    };
    setTimeout(step, 0);
  };

  const pct = (n) => (result ? Math.round((100 * n) / result.played) : 0);
  return (
    <div className="space-y-4">
      <Card title="Balance test">
        <p className="text-sm text-[#5b5f73] mb-3">
          Let the computer play itself many times with the current rules. Useful for spotting rules that make games too short, too long, or unfair to one side.
        </p>
        <Row label="Games">
          <Seg value={games} onChange={setGames} options={[[10, "10"], [20, "20"], [50, "50"], [100, "100"]]} />
        </Row>
        <Row label="Both sides">
          <Seg value={lvl} onChange={setLvl} options={[["easy", "Easy (fast)"], ["medium", "Medium"], ["hard", "Hard (slow)"]]} />
        </Row>
        <div className="flex gap-2 pt-1">
          <button className="dc-btn dc-btn-main" onClick={run} disabled={running}>{running ? "Running…" : "Run"}</button>
          {running && <button className="dc-btn" onClick={() => { stop.current = true; }}>Stop</button>}
        </div>
      </Card>
      {result && (
        <Card title={`Results (${result.played} games)`}>
          <div className="dc-bar mb-2" aria-hidden="true">
            <span style={{ width: `${pct(result.w)}%`, background: "#fdf6e3" }} />
            <span style={{ width: `${pct(result.draw)}%`, background: "#a7a9b8" }} />
            <span style={{ width: `${pct(result.b)}%`, background: "#2b2d42" }} />
          </div>
          <ul className="text-sm space-y-1">
            <li>White wins: <b>{result.w}</b> ({pct(result.w)}%) · Black wins: <b>{result.b}</b> ({pct(result.b)}%) · Draws: <b>{result.draw}</b></li>
            <li>Average game: <b>{Math.round(result.plies / result.played)}</b> moves, <b>{(result.captures / result.played).toFixed(1)}</b> pieces taken</li>
            <li>First capture on average at move <b>{Math.round(result.firstCapture / result.played)}</b></li>
            <li>Endings: King captured {result.ends.king}, no legal move {result.ends.stuck}, too long without a capture {result.ends.quiet}</li>
          </ul>
        </Card>
      )}
    </div>
  );
}

function Notes({ notes, setNotes, rules }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = `DICE CHESS RULES\n- ${describeRules(rules).join("\n- ")}\n\nNOTES\n${notes}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked: nothing to do
    }
  };
  return (
    <Card title="Rule ideas & notes">
      <p className="text-sm text-[#5b5f73] mb-2">Jot down what felt fun or broken while playing. Saved on this device.</p>
      <textarea
        className="w-full min-h-[240px] rounded-lg border border-[#d6cfbd] p-3 text-sm bg-white"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={"e.g. Kings die too easily at 1 — maybe kings start at 3?\nKnights feel strong because they jump…"}
      />
      <button className="dc-btn mt-2" onClick={copy}>{copied ? "Copied!" : "Copy rules + notes"}</button>
    </Card>
  );
}
