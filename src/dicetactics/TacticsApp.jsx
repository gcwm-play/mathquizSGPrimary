import { useEffect, useMemo, useRef, useState } from "react";
import Token from "./Token.jsx";
import {
  W,
  H,
  UNITS,
  SIDE_NAME,
  ORDERS_PER_TURN,
  QUIET_TURNS,
  initialState,
  unitOptions,
  orderProblem,
  resolve,
  describeRules,
  power,
  sqName,
  rowOf,
  colOf,
} from "./engine.js";
import { LEVELS, chooseOrders } from "./ai.js";

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

const SIDE_COLOR = { blue: "#2563eb", red: "#c2410c" };
const END = {
  king: "defeated the enemy King",
  bothKings: "both Kings fell in the same turn",
  quiet: `${QUIET_TURNS} turns with nobody falling, decided by power taken`,
};
const ORDER_WORD = { move: "moves", zap: "zaps", boost: "boosts", shoot: "shoots at" };

const noOrders = () => ({ blue: [], red: [] });

export default function TacticsApp() {
  const [history, setHistory] = useState(() => [initialState()]);
  const [mode, setMode] = useState(() => load("dicetactics.mode", "ai")); // ai | hotseat | watch
  const [level, setLevel] = useState(() => load("dicetactics.level", "normal"));
  const [orders, setOrders] = useState(noOrders);
  const [phase, setPhase] = useState("orders"); // orders | pass | reveal
  const [side, setSide] = useState("blue"); // who is giving orders now
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState("move"); // move | boost | shoot for the selected unit
  const [inspect, setInspect] = useState(null);
  const [hint, setHint] = useState("");
  const [tab, setTab] = useState("game");
  const [notes, setNotes] = useState(() => load("dicetactics.notes", ""));
  const [paused, setPaused] = useState(false);

  const state = history[history.length - 1];
  const over = !!state.winner;

  useEffect(() => save("dicetactics.mode", mode), [mode]);
  useEffect(() => save("dicetactics.level", level), [level]);
  useEffect(() => save("dicetactics.notes", notes), [notes]);
  useEffect(() => {
    setAction("move");
    setHint("");
  }, [selected]);

  const newGame = () => {
    setHistory([initialState()]);
    setOrders(noOrders());
    setPhase("orders");
    setSide("blue");
    setSelected(null);
    setInspect(null);
    setHint("");
  };

  // Lock in the current side's orders and move on.
  const lockIn = () => {
    setSelected(null);
    if (mode === "hotseat" && side === "blue") {
      setPhase("pass");
      return;
    }
    if (mode === "ai") setOrders((o) => ({ ...o, red: chooseOrders(state, "red", level) }));
    setPhase("reveal");
  };

  const resolveTurn = () => {
    setHistory((h) => [...h, resolve(h[h.length - 1], orders)]);
    setOrders(noOrders());
    setSide("blue");
    setPhase("orders");
  };

  // Computer vs computer runs itself.
  useEffect(() => {
    if (mode !== "watch" || over || paused) return;
    const t = setTimeout(
      () => {
        if (phase === "orders") {
          setOrders({ blue: chooseOrders(state, "blue", level), red: chooseOrders(state, "red", level) });
          setPhase("reveal");
        } else if (phase === "reveal") resolveTurn();
      },
      phase === "orders" ? 500 : 1100,
    );
    return () => clearTimeout(t);
  });

  const undoTurn = () => {
    if (history.length < 2) return;
    setHistory((h) => h.slice(0, -1));
    setOrders(noOrders());
    setPhase("orders");
    setSide("blue");
    setSelected(null);
  };

  const myOrders = orders[side];
  const canOrder = phase === "orders" && !over && mode !== "watch";
  const opts = useMemo(() => (selected === null ? null : unitOptions(state, selected)), [selected, state]);
  const shown = !opts
    ? []
    : action === "boost"
      ? opts.boosts
      : action === "shoot"
        ? opts.shots
        : [...opts.moves, ...opts.zaps];

  const addOrder = (o) => {
    const problem = orderProblem(state, myOrders, o);
    if (problem) {
      setHint(problem);
      return;
    }
    setOrders((all) => ({ ...all, [side]: [...all[side].filter((x) => x.unit !== o.unit), o] }));
    setSelected(null);
  };

  const removeOrder = (unitId) => setOrders((all) => ({ ...all, [side]: all[side].filter((o) => o.unit !== unitId) }));

  const clickSquare = (sq) => {
    const u = state.board[sq];
    if (u) setInspect(sq);
    if (!canOrder) return;
    const o = shown.find((x) => x.to === sq);
    if (o && selected !== null) {
      addOrder(o);
      return;
    }
    if (u && u.side === side) {
      setSelected(sq === selected ? null : sq);
      return;
    }
    setSelected(null);
  };

  // Which orders to draw: your own while ordering, both at the reveal, last turn's otherwise.
  const drawn =
    phase === "reveal"
      ? [...orders.blue, ...orders.red]
      : phase === "orders" && mode !== "watch"
        ? myOrders
        : [];
  const faded = phase === "orders" && state.lastOrders ? [...state.lastOrders.blue, ...state.lastOrders.red] : [];
  const orderedUnits = new Map(drawn.map((o, i) => [o.from, i]));

  const status = over
    ? state.winner === "draw"
      ? `Draw: ${END[state.endReason]}.`
      : `${SIDE_NAME[state.winner]} wins: ${END[state.endReason]}.`
    : phase === "reveal"
      ? `Turn ${state.turn}: orders revealed.`
      : phase === "pass"
        ? "Pass the device to Red."
        : mode === "watch"
          ? `Turn ${state.turn}: the computers are choosing…`
          : `Turn ${state.turn}: ${SIDE_NAME[side]}, give up to ${ORDERS_PER_TURN} orders (${myOrders.length}/${ORDERS_PER_TURN}).`;

  return (
    <div className="dt-app min-h-screen bg-[#efe6d2] text-[#2a2118]">
      <header className="mx-auto max-w-6xl px-4 pt-4 pb-2 flex flex-wrap items-end gap-x-4 gap-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold">⚔️ Dice Grid Tactics</h1>
        <p className="text-sm text-[#6b5b45]">Prototype — both sides give 2 secret orders, then everything happens at once.</p>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-10 grid gap-5 lg:grid-cols-[minmax(0,520px)_1fr]">
        <section>
          <div className="dt-board-wrap">
            <div className="dt-board" role="grid" aria-label="Dice Grid Tactics board">
              {Array.from({ length: W * H }, (_, sq) => {
                const u = state.board[sq];
                const r = rowOf(sq);
                const c = colOf(sq);
                const o = shown.find((x) => x.to === sq);
                const cls = ["dt-sq", (r + c) % 2 ? "dt-dark" : "dt-light", sq === selected && "dt-selected"].filter(Boolean).join(" ");
                return (
                  <button key={sq} className={cls} onClick={() => clickSquare(sq)} aria-label={sqName(sq) + (u ? ` ${SIDE_NAME[u.side]} ${UNITS[u.type].name} ${power(u)}` : "")}>
                    {c === 0 && <span className="dt-coord dt-rank">{H - r}</span>}
                    {r === H - 1 && <span className="dt-coord dt-file">{"abcdefgh"[c]}</span>}
                    {u && <Token unit={u} />}
                    {orderedUnits.has(sq) && phase === "orders" && <span className="dt-order-no">{orderedUnits.get(sq) + 1}</span>}
                    {o && <Marker o={o} state={state} />}
                  </button>
                );
              })}
              <OrderArrows orders={faded} faded />
              <OrderArrows orders={drawn} />
            </div>
            {phase === "pass" && (
              <div className="dt-cover">
                <p className="text-lg font-bold">Blue's orders are locked in.</p>
                <p className="text-sm">Pass the device to Red. No peeking, Blue!</p>
                <button className="dt-btn dt-btn-main mt-3" onClick={() => { setSide("red"); setPhase("orders"); }}>
                  I'm Red: show my board
                </button>
              </div>
            )}
          </div>

          <p className={`mt-2 font-semibold ${over ? "text-lg text-[#8a2be2]" : ""}`}>{status}</p>
          {hint && <p className="mt-1 text-sm text-[#b23a48]">{hint}</p>}

          {canOrder && (
            <div className="mt-2 space-y-2">
              {selected !== null && opts && (
                <div className="flex flex-wrap gap-2 text-sm items-center">
                  <span className="text-[#6b5b45]">{UNITS[state.board[selected].type].name}:</span>
                  <button className={`dt-seg ${action === "move" ? "dt-seg-on" : ""}`} onClick={() => setAction("move")}>
                    Move{opts.zaps.length ? " / zap" : ""}
                  </button>
                  {opts.boosts.length > 0 && (
                    <button className={`dt-seg ${action === "boost" ? "dt-seg-on" : ""}`} onClick={() => setAction("boost")}>
                      ✚ Boost a friend (+{opts.boosts[0].amount})
                    </button>
                  )}
                  {opts.shots.length > 0 && (
                    <button className={`dt-seg ${action === "shoot" ? "dt-seg-on" : ""}`} onClick={() => setAction("shoot")}>
                      🏹 Shoot (2 squares away)
                    </button>
                  )}
                  {state.board[selected].type === "M" && state.rest[side] && (
                    <span className="text-[#6b5b45]">Militia actions are resting this turn.</span>
                  )}
                </div>
              )}
              <OrderList orders={myOrders} state={state} onRemove={removeOrder} />
              <div className="flex flex-wrap gap-2">
                <button className="dt-btn dt-btn-main" onClick={lockIn}>
                  Lock in orders ({myOrders.length}/{ORDERS_PER_TURN})
                </button>
                {mode === "ai" && history.length > 1 && (
                  <button className="dt-btn" onClick={undoTurn}>Undo last turn</button>
                )}
              </div>
            </div>
          )}

          {phase === "reveal" && (
            <div className="mt-2 space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                {["blue", "red"].map((s) => (
                  <div key={s}>
                    <p className="text-sm font-semibold" style={{ color: SIDE_COLOR[s] }}>{SIDE_NAME[s]}'s orders</p>
                    <OrderList orders={orders[s]} state={state} />
                  </div>
                ))}
              </div>
              {mode !== "watch" && (
                <button className="dt-btn dt-btn-main" onClick={resolveTurn}>⚔ Resolve the turn</button>
              )}
            </div>
          )}

          <Legend />
        </section>

        <section className="min-w-0">
          <nav className="flex flex-wrap gap-1 mb-3">
            {[["game", "Game"], ["rules", "Rules"], ["log", "Battle log"], ["test", "Balance test"], ["notes", "Notes"]].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} className={`dt-tab ${tab === k ? "dt-tab-on" : ""}`}>
                {label}
              </button>
            ))}
          </nav>

          {tab === "game" && (
            <div className="space-y-4">
              <Card title="Play">
                <Row label="Mode">
                  <Seg value={mode} onChange={(v) => { setMode(v); setPaused(false); newGame(); }} options={[["ai", "vs Computer"], ["hotseat", "2 players"], ["watch", "Computer vs Computer"]]} />
                </Row>
                {mode !== "hotseat" && (
                  <Row label="Computer">
                    <Seg value={level} onChange={setLevel} options={Object.entries(LEVELS).map(([k, l]) => [k, l.label])} />
                  </Row>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button className="dt-btn dt-btn-main" onClick={newGame}>New game</button>
                  {mode === "watch" && <button className="dt-btn" onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</button>}
                </div>
                {mode === "ai" && <p className="text-sm text-[#6b5b45] mt-2">You are Blue (bottom). The computer picks its orders without seeing yours.</p>}
                {mode === "hotseat" && <p className="text-sm text-[#6b5b45] mt-2">Blue orders first, then passes the device to Red. Both orders are revealed together.</p>}
              </Card>

              <Card title="Last turn">
                {state.events.length ? (
                  <ul className="text-sm space-y-1">
                    {state.events.map((e, i) => <li key={i}>{e.text}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-[#6b5b45]">{history.length > 1 ? "Nothing clashed." : "No turns yet."}</p>
                )}
                <p className="text-xs text-[#6b5b45] mt-2">
                  Power taken: Blue {state.taken.blue}, Red {state.taken.red}. Turns with nobody falling: {state.quiet}/{QUIET_TURNS}.
                </p>
              </Card>

              <Card title="Unit info">
                {inspect !== null && state.board[inspect] ? (
                  <UnitInfo u={state.board[inspect]} sq={inspect} />
                ) : (
                  <p className="text-sm text-[#6b5b45]">Tap any unit to see what it does.</p>
                )}
              </Card>
            </div>
          )}

          {tab === "rules" && (
            <Card title="Rules (draft)">
              <ul className="text-sm list-disc pl-5 space-y-1">
                {describeRules().map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </Card>
          )}

          {tab === "log" && <BattleLog history={history} />}
          {tab === "test" && <BalanceTest />}
          {tab === "notes" && <Notes notes={notes} setNotes={setNotes} />}
        </section>
      </main>
    </div>
  );
}

// What tapping this square would do for the selected unit.
function Marker({ o, state }) {
  if (o.kind === "move") {
    const t = state.board[o.to];
    if (!t) return <>{o.borrow > 0 ? <span className="dt-badge dt-charge">+{o.borrow}</span> : null}<span className="dt-dot" /></>;
    const mine = state.board[o.from].value + o.borrow + (state.board[o.from].boost || 0);
    const theirs = t.type === "S" ? 0 : power(t);
    const cls = mine > theirs ? "dt-ring-win" : mine === theirs ? "dt-ring-tie" : "dt-ring-lose";
    return <><span className={`dt-ring ${cls}`} />{o.borrow > 0 && <span className="dt-badge dt-charge">+{o.borrow}</span>}</>;
  }
  if (o.kind === "zap") return <span className="dt-badge dt-zap">⚡−{o.amount}</span>;
  if (o.kind === "boost") return <span className="dt-badge dt-boost">✚+{o.amount}</span>;
  return <span className="dt-aim">◎</span>;
}

// Dashed arrows for orders, in board units (each square 1×1).
function OrderArrows({ orders, faded = false }) {
  if (!orders.length) return null;
  const at = (sq) => [colOf(sq) + 0.5, rowOf(sq) + 0.5];
  return (
    <svg className="dt-arrows" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ opacity: faded ? 0.3 : 0.9 }}>
      <defs>
        {Object.entries(SIDE_COLOR).map(([s, col]) => (
          <marker key={s} id={`dt-head-${s}${faded ? "-f" : ""}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={col} />
          </marker>
        ))}
      </defs>
      {orders.map((o, i) => {
        const pts = [o.from, ...(o.kind === "move" ? o.path : [o.to])].map(at);
        const [px, py] = pts[pts.length - 2];
        const [tx, ty] = pts[pts.length - 1];
        const len = Math.hypot(tx - px, ty - py) || 1;
        pts[pts.length - 1] = [tx - ((tx - px) / len) * 0.28, ty - ((ty - py) / len) * 0.28];
        const col = o.kind === "zap" ? "#d62828" : o.kind === "boost" ? "#1b7f6b" : SIDE_COLOR[o.side];
        return (
          <g key={i}>
            <circle cx={pts[0][0]} cy={pts[0][1]} r="0.1" fill={SIDE_COLOR[o.side]} />
            <polyline
              points={pts.map(([x, y]) => `${x},${y}`).join(" ")}
              fill="none"
              stroke={col}
              strokeWidth="0.09"
              strokeDasharray={o.kind === "shoot" ? "0.05 0.15" : "0.2 0.14"}
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd={`url(#dt-head-${o.side}${faded ? "-f" : ""})`}
            />
            {o.kind === "shoot" && <text x={tx} y={ty + 0.2} textAnchor="middle" fontSize="0.6" fill={SIDE_COLOR[o.side]}>✕</text>}
          </g>
        );
      })}
    </svg>
  );
}

function OrderList({ orders, state, onRemove }) {
  if (!orders.length) return <p className="text-sm text-[#6b5b45]">No orders.</p>;
  return (
    <ol className="text-sm space-y-1">
      {orders.map((o, i) => {
        const u = state.board[o.from];
        const t = o.kind === "zap" || o.kind === "boost" ? state.board[o.to] : null;
        return (
          <li key={o.unit} className="flex items-center gap-2">
            <span className="font-semibold">{i + 1}.</span>
            <span>
              {UNITS[u.type].name} {sqName(o.from)} {ORDER_WORD[o.kind]} {t ? `${UNITS[t.type].name} ` : ""}
              {sqName(o.to)}
              {o.kind === "move" && o.borrow > 0 ? ` (charge +${o.borrow})` : ""}
              {o.kind === "zap" || o.kind === "boost" ? ` (${o.kind === "zap" ? "−" : "+"}${o.amount})` : ""}
            </span>
            {onRemove && (
              <button className="text-[#b23a48] text-xs underline" onClick={() => onRemove(o.unit)}>
                cancel
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const UNIT_TEXT = {
  M: "Moves 1. Instead of moving it can zap a stronger enemy next to it or boost a friend next to it (then its die halves; its side rests from militia actions next turn). Becomes a Champion on the far side.",
  C: "Moves 4. Charge: friends it rides through add their power until it next acts. Its die resets to 1 when it moves.",
  A: "Moves 2. Instead of moving it can shoot a square exactly 2 away; an enemy there after the move falls if the archer is stronger.",
  S: "Moves 2 and doubles each move. If it stays put, any attacker beats it.",
  H: "Moves 3, +1 per move, up to 20.",
  K: "Moves 1 and gains +1 every turn, up to 10. Lose him and you lose.",
};

function UnitInfo({ u, sq }) {
  const info = UNITS[u.type];
  return (
    <div className="flex gap-3 items-center">
      <span className="w-16 h-16 shrink-0"><Token unit={u} /></span>
      <div className="text-sm space-y-0.5">
        <p className="font-semibold">{SIDE_NAME[u.side]} {info.name} on {sqName(sq)}</p>
        <p>
          D{info.die} showing <b>{u.value}</b>
          {u.bonus > 0 && <> + <b className="text-[#7b2cbf]">{u.bonus}</b> charge</>}
          {u.boost > 0 && <> + <b className="text-[#1b7f6b]">{u.boost}</b> boost</>}
          {(u.bonus > 0 || u.boost > 0) && <> = power <b>{power(u)}</b></>}.
        </p>
        <p>{UNIT_TEXT[u.type]}</p>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6b5b45]">
      <span><span className="dt-key dt-key-dot" /> move</span>
      <span><span className="dt-key dt-key-win" /> attack: you're stronger</span>
      <span><span className="dt-key dt-key-tie" /> tie: both fall</span>
      <span><span className="dt-key dt-key-lose" /> attack: they're stronger</span>
      <span><span className="dt-badge dt-charge dt-badge-key">+3</span> cavalry charge</span>
      <span><span className="dt-badge dt-zap dt-badge-key">⚡−2</span> zap</span>
      <span><span className="dt-badge dt-boost dt-badge-key">✚+2</span> boost</span>
      <span>◎ archer target</span>
    </div>
  );
}

function BattleLog({ history }) {
  const turns = history.slice(1).map((s, i) => ({ n: i + 1, s }));
  return (
    <Card title={`Battle log (${turns.length} turns)`}>
      {!turns.length ? (
        <p className="text-sm text-[#6b5b45]">No turns yet.</p>
      ) : (
        <ol className="text-sm space-y-2 max-h-[60vh] overflow-y-auto">
          {turns.map(({ n, s }) => (
            <li key={n}>
              <p className="font-semibold">Turn {n}</p>
              {["blue", "red"].map((side) => (
                <p key={side} style={{ color: SIDE_COLOR[side] }}>
                  {SIDE_NAME[side]}: {s.lastOrders[side].map((o) => `${UNITS[history[n - 1].board[o.from].type].name} ${sqName(o.from)} ${ORDER_WORD[o.kind]} ${sqName(o.to)}`).join("; ") || "no orders"}
                </p>
              ))}
              {s.events.map((e, i) => <p key={i} className="text-[#2a2118]">• {e.text}</p>)}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

// Computer-vs-computer games in small batches so the page stays responsive.
function BalanceTest() {
  const [games, setGames] = useState(20);
  const [lvl, setLvl] = useState("normal");
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const stop = useRef(false);
  useEffect(() => () => { stop.current = true; }, []);

  const run = () => {
    stop.current = false;
    setRunning(true);
    const acc = { played: 0, blue: 0, red: 0, draw: 0, turns: 0, falls: 0, ends: {} };
    const step = () => {
      if (stop.current) return setRunning(false);
      let s = initialState();
      while (!s.winner && s.turn < 200) {
        s = resolve(s, { blue: chooseOrders(s, "blue", lvl), red: chooseOrders(s, "red", lvl) });
        acc.falls += s.events.filter((e) => e.kind === "fall").length;
      }
      acc.played++;
      acc[s.winner || "draw"]++;
      acc.turns += s.turn - 1;
      acc.ends[s.endReason || "long"] = (acc.ends[s.endReason || "long"] || 0) + 1;
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
        <p className="text-sm text-[#6b5b45] mb-3">The computer plays itself many times with the current rules.</p>
        <Row label="Games">
          <Seg value={games} onChange={setGames} options={[[10, "10"], [20, "20"], [50, "50"]]} />
        </Row>
        <Row label="Both sides">
          <Seg value={lvl} onChange={setLvl} options={Object.entries(LEVELS).map(([k, l]) => [k, l.label])} />
        </Row>
        <div className="flex gap-2 pt-1">
          <button className="dt-btn dt-btn-main" onClick={run} disabled={running}>{running ? "Running…" : "Run"}</button>
          {running && <button className="dt-btn" onClick={() => { stop.current = true; }}>Stop</button>}
        </div>
      </Card>
      {result && (
        <Card title={`Results (${result.played} games)`}>
          <ul className="text-sm space-y-1">
            <li>Blue wins: <b>{result.blue}</b> ({pct(result.blue)}%) · Red wins: <b>{result.red}</b> ({pct(result.red)}%) · Draws: <b>{result.draw}</b></li>
            <li>Average game: <b>{Math.round(result.turns / result.played)}</b> turns, <b>{(result.falls / result.played).toFixed(1)}</b> units fall</li>
            <li>Endings: King defeated {result.ends.king || 0}, both Kings {result.ends.bothKings || 0}, power decided {result.ends.quiet || 0}</li>
          </ul>
        </Card>
      )}
    </div>
  );
}

function Notes({ notes, setNotes }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`DICE GRID TACTICS RULES\n- ${describeRules().join("\n- ")}\n\nNOTES\n${notes}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked: nothing to do
    }
  };
  return (
    <Card title="Rule ideas & notes">
      <p className="text-sm text-[#6b5b45] mb-2">Saved on this device.</p>
      <textarea
        className="w-full min-h-[240px] rounded-lg border border-[#d6c9a8] p-3 text-sm bg-white"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What felt fun? What felt unfair?"
      />
      <button className="dt-btn mt-2" onClick={copy}>{copied ? "Copied!" : "Copy rules + notes"}</button>
    </Card>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl bg-white/75 shadow-sm border border-[#dccfae] p-4">
      <h2 className="font-bold mb-2">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-2">
      <span className="text-sm w-24 shrink-0 text-[#6b5b45]">{label}</span>
      {children}
    </div>
  );
}

function Seg({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(([v, label]) => (
        <button key={String(v)} onClick={() => onChange(v)} className={`dt-seg ${value === v ? "dt-seg-on" : ""}`}>
          {label}
        </button>
      ))}
    </div>
  );
}
