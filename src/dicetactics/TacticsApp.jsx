import { useEffect, useMemo, useRef, useState } from "react";
import Token from "./Token.jsx";
import {
  W,
  H,
  UNITS,
  SIDE_NAME,
  ORDERS_PER_TURN,
  QUIET_TURNS,
  MOVE_TEXT,
  EFFECT_TEXT,
  initialState,
  unitOptions,
  canReplenish,
  replenishOptions,
  planAfter,
  checkPlan,
  REPLENISH_EVERY,
  MOUNTED_MAX,
  orderProblem,
  resolve,
  describeRules,
  movePattern,
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
  bothKings: "both Kings fell in the same step",
  quiet: `${QUIET_TURNS} turns with nobody falling, decided by power taken`,
};
const ORDER_WORD = { move: "moves to", zap: "zaps", boost: "boosts", shoot: "shoots at", dismount: "drops its rider on" };

// One line describing an order, e.g. "Cavalry b1 moves to c3 (picks up Militia)".
function orderText(o, board) {
  if (o.kind === "deploy") return `New Militia on ${sqName(o.to)}`;
  const u = board[o.from];
  const name = u ? UNITS[u.type].name : "Unit";
  const t = o.kind === "zap" || o.kind === "boost" ? board[o.to] : null;
  let s = `${name} ${sqName(o.from)} ${ORDER_WORD[o.kind]} ${t ? `${UNITS[t.type].name} ` : ""}${sqName(o.to)}`;
  if (o.pickup !== undefined && board[o.pickup]) s += ` (picks up ${UNITS[board[o.pickup].type].name})`;
  if (o.kind === "zap" || o.kind === "boost") s += ` (${o.kind === "zap" ? "−" : "+"}${o.amount})`;
  return s;
}
const NTH = ["1st", "2nd"];
const MOVE_MS = 550; // how long units take to slide
const RESULT_MS = 950; // how long fights and falls show before the next step

const noOrders = () => ({ blue: [], red: [] });

// Animation frames for a resolved turn: for each step, units sliding to their
// targets, then the result (with fallen units fading out and fight bursts).
function buildFrames(next) {
  const frames = [];
  next.steps.forEach((step, i) => {
    const units = [];
    step.before.forEach((u, sq) => {
      if (!u) return;
      const m = step.moved.find((x) => x.id === u.id);
      units.push({ u, sq: m ? m.to : sq });
    });
    frames.push({ units, step, label: `Step ${i + 1}: ${step.orders.length ? "units act" : "no orders"}`, ms: MOVE_MS, showOrders: true });
    const after = [];
    step.after.forEach((u, sq) => u && after.push({ u, sq }));
    for (const r of step.removed) after.push({ u: r.unit, sq: r.sq, falling: true });
    const bursts = step.events.filter((e) => ["fight", "shot", "zap", "boost", "cancel"].includes(e.kind)).map((e) => ({ sq: e.sq, kind: e.kind }));
    frames.push({ units: after, step, bursts, label: `Step ${i + 1}: results`, ms: RESULT_MS });
  });
  return frames;
}

export default function TacticsApp() {
  const [history, setHistory] = useState(() => [initialState()]);
  const [mode, setMode] = useState(() => load("dicetactics.mode", "ai")); // ai | hotseat | watch
  const [level, setLevel] = useState(() => load("dicetactics.level", "normal"));
  const [orders, setOrders] = useState(noOrders);
  const [phase, setPhase] = useState("orders"); // orders | pass | reveal | play
  const [side, setSide] = useState("blue"); // who is giving orders now
  const [selected, setSelected] = useState(null); // own unit being given an order
  const [inspect, setInspect] = useState(null); // unit shown on the unit card
  const [action, setAction] = useState("move"); // move | boost | shoot
  const [hint, setHint] = useState("");
  const [tab, setTab] = useState("game");
  const [notes, setNotes] = useState(() => load("dicetactics.notes", ""));
  const [paused, setPaused] = useState(false);
  const [play, setPlay] = useState(null); // { next, frames, i }
  const [deploying, setDeploying] = useState(false); // choosing a square for a replenished militia

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
    setPlay(null);
  };

  const lockIn = () => {
    setSelected(null);
    if (mode === "hotseat" && side === "blue") {
      setPhase("pass");
      return;
    }
    if (mode === "ai") setOrders((o) => ({ ...o, red: chooseOrders(state, "red", level) }));
    setPhase("reveal");
  };

  // Resolve and play the turn back step by step.
  const resolveTurn = () => {
    const next = resolve(state, orders);
    setPlay({ next, frames: buildFrames(next), i: 0 });
    setPhase("play");
  };

  useEffect(() => {
    if (phase !== "play" || !play) return;
    const frame = play.frames[play.i];
    const t = setTimeout(() => {
      if (play.i + 1 < play.frames.length) setPlay({ ...play, i: play.i + 1 });
      else {
        setHistory((h) => [...h, play.next]);
        setPlay(null);
        setOrders(noOrders());
        setSide("blue");
        setPhase("orders");
      }
    }, frame ? frame.ms : 0);
    return () => clearTimeout(t);
  }, [phase, play]);

  // Computer vs computer runs itself.
  useEffect(() => {
    if (mode !== "watch" || over || paused) return;
    if (phase === "orders") {
      const t = setTimeout(() => {
        setOrders({ blue: chooseOrders(state, "blue", level), red: chooseOrders(state, "red", level) });
        setPhase("reveal");
      }, 400);
      return () => clearTimeout(t);
    }
    if (phase === "reveal") {
      const t = setTimeout(resolveTurn, 900);
      return () => clearTimeout(t);
    }
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
  // A new order for the selected unit (or a replenish) becomes the 1st or the 2nd
  // order. A 2nd order is planned on the board as it will be after your 1st.
  const ownIndex = myOrders.findIndex((o) => (deploying ? o.kind === "deploy" : selected !== null && o.from === selected && o.kind !== "deploy"));
  const slot = ownIndex >= 0 ? ownIndex : myOrders.length;
  const planState = useMemo(
    () => (canOrder && slot === 1 && myOrders[0] ? planAfter(state, myOrders[0]) : state),
    [canOrder, slot, myOrders, state],
  );
  const opts = useMemo(
    () => (selected === null || !planState.board[selected] ? null : unitOptions(planState, selected)),
    [selected, planState],
  );
  const shown = deploying
    ? replenishOptions(planState, side)
    : !opts
      ? []
      : {
          boost: opts.boosts,
          shoot: opts.shots,
          ride: opts.moves.filter((m) => m.pickup !== undefined),
          dismount: opts.dismounts,
        }[action] || [...opts.moves.filter((m) => m.pickup === undefined), ...opts.zaps];

  const addOrder = (o) => {
    const problem = orderProblem(state, myOrders, o);
    if (problem) {
      setHint(problem);
      return;
    }
    const list = myOrders.filter((x) => x.unit !== o.unit);
    list.splice(Math.min(slot, list.length), 0, o);
    setPlan(list);
    setSelected(null);
  };
  // Store a new list of orders, dropping any 2nd order that no longer works.
  const setPlan = (list) => {
    const { orders: kept, dropped } = checkPlan(state, list);
    setOrders((all) => ({ ...all, [side]: kept }));
    setHint(dropped.length ? `Removed ${dropped.map((o) => orderText(o, state.board)).join(", ")}: it only worked after your other order.` : "");
  };
  const removeOrder = (unitId) => setPlan(myOrders.filter((o) => o.unit !== unitId));
  const swapOrders = () => setPlan([...myOrders].reverse());
  const clearOrders = () => {
    setOrders((all) => ({ ...all, [side]: [] }));
    setHint("");
  };

  const clickSquare = (sq) => {
    if (phase === "play" || phase === "pass") return;
    const u = state.board[sq];
    const o = shown.find((x) => x.to === sq);
    if (o && canOrder && (selected !== null || deploying)) {
      addOrder(o);
      setDeploying(false);
      return;
    }
    setDeploying(false);
    if (u) setInspect(sq);
    if (canOrder && u && u.side === side) setSelected(sq === selected ? null : sq);
    else setSelected(null);
    if (!u) setInspect(null);
  };

  // What the board shows: an animation frame while playing, otherwise the current state.
  const frame = phase === "play" && play ? play.frames[play.i] : null;
  const units = frame ? frame.units : state.board.map((u, sq) => u && { u, sq }).filter(Boolean);
  const drawn = frame
    ? frame.showOrders
      ? frame.step.orders
      : []
    : phase === "reveal"
      ? [...orders.blue, ...orders.red]
      : phase === "orders" && mode !== "watch"
        ? myOrders
        : [];
  const faded = phase === "orders" && state.lastOrders ? [...state.lastOrders.blue, ...state.lastOrders.red] : [];
  // Units that end up sharing a square mid-animation are nudged apart.
  const seen = new Map();
  const placed = units.map((x) => {
    const n = seen.get(x.sq) || 0;
    seen.set(x.sq, n + 1);
    return { ...x, nudge: n };
  });

  const status = frame
    ? frame.label
    : over
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

  const card = inspect !== null && state.board[inspect] && phase !== "play" ? inspect : null;
  const cardView = card !== null && (
    <UnitCard
      key={card}
      u={state.board[card]}
      sq={card}
      own={canOrder && selected === card}
      opts={selected === card ? opts : null}
      planning={canOrder && selected === card && slot === 1 && !!myOrders[0]}
      existing={myOrders.find((o) => o.from === card && o.kind !== "deploy")}
      onRemove={removeOrder}
      action={action}
      setAction={setAction}
      rest={state.rest[state.board[card].side]}
      onClose={() => { setInspect(null); setSelected(null); }}
    />
  );

  return (
    <div className="dt-app min-h-screen bg-[#efe6d2] text-[#2a2118]">
      <header className="mx-auto max-w-6xl px-4 pt-4 pb-2 flex flex-wrap items-end gap-x-4 gap-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold">⚔️ Dice Grid Tactics</h1>
        <p className="text-sm text-[#6b5b45]">Prototype — both sides give 2 secret orders; 1st orders happen together, then 2nd orders.</p>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-10 grid gap-5 lg:grid-cols-[minmax(0,520px)_1fr]">
        <section>
          <div className="dt-board-wrap">
            <div className="dt-board" role="grid" aria-label="Dice Grid Tactics board">
              {Array.from({ length: W * H }, (_, sq) => {
                const u = state.board[sq];
                const r = rowOf(sq);
                const c = colOf(sq);
                const o = !frame && shown.find((x) => x.to === sq);
                const cls = ["dt-sq", (r + c) % 2 ? "dt-dark" : "dt-light", sq === selected && "dt-selected", sq === card && sq !== selected && "dt-inspected"].filter(Boolean).join(" ");
                return (
                  <button key={sq} className={cls} onClick={() => clickSquare(sq)} aria-label={sqName(sq) + (u ? ` ${SIDE_NAME[u.side]} ${UNITS[u.type].name} ${power(u)}` : "")}>
                    {c === 0 && <span className="dt-coord dt-rank">{H - r}</span>}
                    {r === H - 1 && <span className="dt-coord dt-file">{"abcdefgh"[c]}</span>}
                    {o && <Marker o={o} state={planState} />}
                  </button>
                );
              })}
              <div className="dt-units">
                {placed.map(({ u, sq, falling, nudge }) => (
                  <div
                    key={falling ? `f${u.id}` : u.id}
                    className={`dt-unit ${falling ? "dt-falling" : ""}`}
                    style={{ left: `${(colOf(sq) + nudge * 0.22) * (100 / W)}%`, top: `${(rowOf(sq) - nudge * 0.12) * (100 / H)}%`, transitionDuration: `${MOVE_MS - 50}ms` }}
                  >
                    <Token unit={u} />
                  </div>
                ))}
                {frame?.bursts?.map((b, i) => (
                  <div key={i} className="dt-burst" style={{ left: `${colOf(b.sq) * (100 / W)}%`, top: `${rowOf(b.sq) * (100 / H)}%` }}>
                    {b.kind === "fight" ? "💥" : b.kind === "shot" ? "🎯" : b.kind === "zap" ? "⚡" : b.kind === "boost" ? "✨" : "🚫"}
                  </div>
                ))}
              </div>
              <OrderArrows orders={faded} faded />
              <OrderArrows orders={drawn} numbered={!frame} />
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

          <p className={`mt-2 font-semibold ${over && !frame ? "text-lg text-[#8a2be2]" : ""}`}>{status}</p>
          {hint && <p className="mt-1 text-sm text-[#b23a48]">{hint}</p>}

          {cardView && <div className="lg:hidden">{cardView}</div>}

          {canOrder && (
            <div className="mt-3 space-y-2">
              <OrderList orders={myOrders} state={state} onRemove={removeOrder} onSwap={swapOrders} onClear={clearOrders} />
              {canReplenish(state, side) && !myOrders.some((o) => o.kind === "deploy") && (
                <button className={`dt-seg ${deploying ? "dt-seg-on" : ""}`} onClick={() => { setSelected(null); setInspect(null); setDeploying((d) => !d); }}>
                  ＋ Replenish a Militia ({state.reserve[side]} fallen){deploying ? " — tap a square on your Militia row" : ""}
                </button>
              )}
              {!canReplenish(state, side) && state.reserve?.[side] > 0 && (
                <p className="text-xs text-[#6b5b45]">
                  Fallen Militia: {state.reserve[side]}. You can replenish one on turn {Math.ceil(state.turn / REPLENISH_EVERY) * REPLENISH_EVERY}.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button className="dt-btn dt-btn-main" onClick={lockIn}>
                  Lock in orders ({myOrders.length}/{ORDERS_PER_TURN})
                </button>
                {mode === "ai" && history.length > 1 && <button className="dt-btn" onClick={undoTurn}>Undo last turn</button>}
              </div>
            </div>
          )}

          {(phase === "reveal" || phase === "play") && (
            <div className="mt-2 space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                {["blue", "red"].map((s) => (
                  <div key={s}>
                    <p className="text-sm font-semibold" style={{ color: SIDE_COLOR[s] }}>{SIDE_NAME[s]}'s orders</p>
                    <OrderList orders={orders[s]} state={state} />
                  </div>
                ))}
              </div>
              {phase === "reveal" && mode !== "watch" && <button className="dt-btn dt-btn-main" onClick={resolveTurn}>⚔ Play the turn</button>}
            </div>
          )}

          <Legend />
        </section>

        <section className="min-w-0">
          {cardView && <div className="hidden lg:block mb-3 -mt-3">{cardView}</div>}
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
                    {state.events.map((e, i) => (
                      <li key={i}>
                        <span className="text-[#6b5b45]">{NTH[e.step - 1]}:</span> {e.text}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[#6b5b45]">{history.length > 1 ? "Nothing clashed." : "No turns yet."}</p>
                )}
                <p className="text-xs text-[#6b5b45] mt-2">
                  Power taken: Blue {state.taken.blue}, Red {state.taken.red}. Turns with nobody falling: {state.quiet}/{QUIET_TURNS}.
                </p>
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
  if (o.kind === "deploy") return <span className="dt-badge dt-boost">＋</span>;
  if (o.kind === "dismount") return <><span className="dt-dot" /><span className="dt-badge dt-charge">⬇</span></>;
  if (o.kind === "move") {
    const t = state.board[o.to];
    const me = state.board[o.from];
    const rider = o.pickup !== undefined ? state.board[o.pickup] : null;
    const badge = rider && <span className="dt-badge dt-charge">🐴+{power(rider)}</span>;
    if (!t) return <>{badge}<span className="dt-dot" /></>;
    const mine = rider ? Math.min(MOUNTED_MAX, me.value + power(rider)) + (me.boost || 0) : power(me);
    const theirs = t.type === "S" ? 0 : power(t);
    const cls = mine > theirs ? "dt-ring-win" : mine === theirs ? "dt-ring-tie" : "dt-ring-lose";
    return <><span className={`dt-ring ${cls}`} />{badge}</>;
  }
  if (o.kind === "zap") return <span className="dt-badge dt-zap">⚡−{o.amount}</span>;
  if (o.kind === "boost") return <span className="dt-badge dt-boost">✚+{o.amount}</span>;
  return <span className="dt-aim">◎</span>;
}

// Dashed arrows for orders, in board units (each square 1×1), numbered 1st/2nd.
function OrderArrows({ orders, faded = false, numbered = false }) {
  if (!orders.length) return null;
  const pt = (sq) => [colOf(sq) + 0.5, rowOf(sq) + 0.5];
  const index = { blue: 0, red: 0 };
  return (
    <svg className="dt-arrows" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ opacity: faded ? 0.28 : 0.92 }}>
      <defs>
        {Object.entries(SIDE_COLOR).map(([s, col]) => (
          <marker key={s} id={`dt-head-${s}${faded ? "-f" : ""}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={col} />
          </marker>
        ))}
      </defs>
      {orders.map((o, i) => {
        const n = ++index[o.side];
        if (o.kind === "deploy")
          return (
            <text key={i} x={colOf(o.to) + 0.5} y={rowOf(o.to) + 0.72} textAnchor="middle" fontSize="0.7" fontWeight="700" fill={SIDE_COLOR[o.side]}>
              ＋
            </text>
          );
        const pts = [o.from, ...(o.kind === "move" ? o.path : [o.to])].map(pt);
        const [px, py] = pts[pts.length - 2];
        const [tx, ty] = pts[pts.length - 1];
        const len = Math.hypot(tx - px, ty - py) || 1;
        pts[pts.length - 1] = [tx - ((tx - px) / len) * 0.28, ty - ((ty - py) / len) * 0.28];
        const col = o.kind === "zap" ? "#d62828" : o.kind === "boost" ? "#1b7f6b" : SIDE_COLOR[o.side];
        return (
          <g key={i}>
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
            {numbered && (
              <g>
                <circle cx={pts[0][0] - 0.3} cy={pts[0][1] - 0.3} r="0.2" fill={SIDE_COLOR[o.side]} stroke="#fff" strokeWidth="0.04" />
                <text x={pts[0][0] - 0.3} y={pts[0][1] - 0.22} textAnchor="middle" fontSize="0.26" fontWeight="700" fill="#fff">{n}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function OrderList({ orders, state, onRemove, onSwap, onClear }) {
  if (!orders.length) return <p className="text-sm text-[#6b5b45]">No orders yet. Tap one of your units.</p>;
  return (
    <div className="space-y-1">
      <ol className="text-sm space-y-1">
        {orders.map((o, i) => {
          return (
            <li key={o.unit} className="flex items-center gap-2 flex-wrap">
              <span className="dt-nth" style={{ background: SIDE_COLOR[o.side] }}>{NTH[i]}</span>
              <span>{orderText(o, state.board)}</span>
              {onRemove && (
                <button className="dt-remove" onClick={() => onRemove(o.unit)} aria-label={`Remove ${NTH[i]} order`}>
                  ✕ Remove
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        {onSwap && orders.length === 2 && (
          <button className="dt-seg text-xs" onClick={onSwap}>⇅ Swap 1st and 2nd</button>
        )}
        {onClear && <button className="dt-seg text-xs" onClick={onClear}>Clear orders</button>}
      </div>
    </div>
  );
}

// The card shown when a unit is tapped: its look, numbers, movement and effects.
function UnitCard({ u, sq, own, opts, action, setAction, rest, onClose, planning, existing, onRemove }) {
  const info = UNITS[u.type];
  return (
    <div className="dt-card mt-3 rounded-xl border border-[#dccfae] bg-white/90 shadow-md p-3">
      <div className="flex gap-3 items-start">
        <span className="w-20 h-20 shrink-0"><Token unit={u} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-lg leading-tight">
              <span style={{ color: SIDE_COLOR[u.side] }}>{SIDE_NAME[u.side]}</span> {info.name}
              <span className="block text-xs font-normal text-[#6b5b45]">on {sqName(sq)} · moves like a chess {info.chess}</span>
            </p>
            <button className="text-[#6b5b45] text-lg leading-none px-1" onClick={onClose} aria-label="Close">×</button>
          </div>
          <p className="text-sm mt-1">
            D{info.die} showing <b>{u.value}</b>
            {u.rider && <> + <b className="text-[#7b2cbf]">{power(u.rider)}</b> rider{u.value + power(u.rider) > MOUNTED_MAX ? ` (capped at ${MOUNTED_MAX})` : ""}</>}
            {u.boost > 0 && <> + <b className="text-[#1b7f6b]">{u.boost}</b> boost</>}
            {" "}= power <b>{power(u)}</b>
          </p>
          {u.rider && <p className="text-sm">Carrying a {SIDE_NAME[u.side]} {UNITS[u.rider.type].name} (D{UNITS[u.rider.type].die} showing {u.rider.value}).</p>}
        </div>
      </div>
      <div className="mt-2 grid sm:grid-cols-[auto_1fr] gap-3 items-start">
        <MoveDiagram u={u} />
        <div className="text-sm space-y-1">
          <p><b>Moves:</b> {MOVE_TEXT[u.type]}</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {EFFECT_TEXT[u.type].map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      </div>
      {existing && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm rounded-lg bg-[#fff4dc] px-2 py-1">
          <span>
            Ordered: {ORDER_WORD[existing.kind]} {sqName(existing.to)}
          </span>
          <button className="dt-remove" onClick={() => onRemove(existing.unit)}>✕ Remove this order</button>
        </div>
      )}
      {planning && (
        <p className="mt-2 text-xs text-[#6b5b45]">
          Planning your 2nd order: the board is read as it will be after your 1st order (the enemy's moves are still secret).
        </p>
      )}
      {own && opts && (
        <div className="mt-3 flex flex-wrap gap-2 items-center text-sm">
          <button className={`dt-seg ${action === "move" ? "dt-seg-on" : ""}`} onClick={() => setAction("move")}>
            {u.type === "C" ? "Move alone" : "Move"}{opts.zaps.length ? " / zap" : ""} ({opts.moves.filter((m) => m.pickup === undefined).length + opts.zaps.length})
          </button>
          {opts.moves.some((m) => m.pickup !== undefined) && (
            <button className={`dt-seg ${action === "ride" ? "dt-seg-on" : ""}`} onClick={() => setAction("ride")}>🐴 Pick up a rider</button>
          )}
          {opts.dismounts.length > 0 && (
            <button className={`dt-seg ${action === "dismount" ? "dt-seg-on" : ""}`} onClick={() => setAction("dismount")}>⬇ Dismount rider</button>
          )}
          {opts.boosts.length > 0 && (
            <button className={`dt-seg ${action === "boost" ? "dt-seg-on" : ""}`} onClick={() => setAction("boost")}>✚ Boost a friend (+{opts.boosts[0].amount})</button>
          )}
          {opts.shots.length > 0 && (
            <button className={`dt-seg ${action === "shoot" ? "dt-seg-on" : ""}`} onClick={() => setAction("shoot")}>🏹 Shoot</button>
          )}
          {u.type === "M" && rest && <span className="text-[#6b5b45]">Militia actions are resting this turn.</span>}
          <span className="text-[#6b5b45] w-full">Tap a highlighted square on the board to give the order.</span>
        </div>
      )}
    </div>
  );
}

// A 7×7 picture of where this kind of unit can go, with the unit in the middle.
function MoveDiagram({ u }) {
  const cells = new Map(movePattern(u.type, u.side).map((p) => [`${p.dr},${p.dc}`, p.kind]));
  return (
    <div>
      <div className="dt-diagram" aria-label={`${UNITS[u.type].name} movement`}>
        {Array.from({ length: 49 }, (_, i) => {
          const dr = Math.floor(i / 7) - 3;
          const dc = (i % 7) - 3;
          const kind = cells.get(`${dr},${dc}`);
          const centre = dr === 0 && dc === 0;
          return (
            <span key={i} className={`dt-dcell ${(dr + dc) % 2 ? "dt-dark" : "dt-light"}`}>
              {centre ? <Token unit={u} /> : kind === "move" ? <i className="dt-ddot" /> : kind === "far" ? <i className="dt-ddot dt-dfar">…</i> : kind === "zap" ? <i className="dt-dx">⚡</i> : kind === "shoot" ? <i className="dt-dshoot">◎</i> : kind === "touch" ? <i className="dt-dtouch">✚</i> : null}
            </span>
          );
        })}
      </div>
      <p className="text-[10px] text-[#6b5b45] mt-1 max-w-[168px]">
        ● move{u.type === "M" ? " · ⚡ zap · ✚ boost reach" : ""}{"AHS".includes(u.type) ? " · … keeps sliding" : ""}{u.type === "A" ? " · ◎ shot" : ""}
      </p>
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
      <span><span className="dt-badge dt-charge dt-badge-key">🐴+3</span> pick up a rider</span>
      <span><span className="dt-badge dt-boost dt-badge-key">＋</span> replenish a Militia</span>
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
                  {SIDE_NAME[side]}: {s.lastOrders[side].map((o, i) => `${NTH[i]} ${orderText(o, history[n - 1].board)}`).join("; ") || "no orders"}
                </p>
              ))}
              {s.events.map((e, i) => <p key={i} className="text-[#2a2118]">• {NTH[e.step - 1]}: {e.text}</p>)}
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
