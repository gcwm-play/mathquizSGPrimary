import React, { useCallback, useEffect, useRef, useState } from "react";
import GameCanvas, { zoomAt } from "./GameCanvas.jsx";
import { BudgetPanel, StatsPanel, NewsPanel, HelpPanel, MenuPanel, Panel } from "./panels.jsx";
import { TOOL_GROUPS, ALL_TOOLS, DIFFICULTY } from "./defs.js";
import { newWorld, stepMonth, analyze, applyTool, undoAction, previewTool, describeTile, dateLabel, fmtMoney, fmtNum, isUnlocked, saveWorld, loadWorld, saveInfo, nextGoal, checkGoals } from "./sim.js";
import { OVERLAYS } from "./render.js";

const SPEEDS = [
  { ms: 0, icon: "❚❚", label: "Paused" },
  { ms: 3000, icon: "1×", label: "Slow" },
  { ms: 1500, icon: "2×", label: "Normal" },
  { ms: 600, icon: "3×", label: "Fast" },
];

const SETTINGS_KEY = "lion-city-settings";
function readSettings() {
  let reduce = false;
  try {
    reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    // matchMedia unavailable
  }
  const base = { large: false, confirm: true, motion: !reduce };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return base;
  }
}

function useSettings() {
  const [settings, setSettingsState] = useState(readSettings);
  const setSettings = (s) => {
    setSettingsState(s);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      // storage blocked: settings last for this visit only
    }
  };
  useEffect(() => {
    document.documentElement.classList.toggle("city-large", !!settings.large);
  }, [settings.large]);
  return [settings, setSettings];
}

export default function CityApp() {
  const [screen, setScreen] = useState("title");
  const [settings, setSettings] = useSettings();
  const worldRef = useRef(null);
  const [run, setRun] = useState(0);
  const start = (w) => {
    worldRef.current = w;
    setRun((r) => r + 1);
    setScreen("game");
  };
  return (
    <div className="city-app fixed inset-0 overflow-hidden">
      {screen === "title" ? (
        <Title onStart={start} />
      ) : (
        <Game key={run} initial={worldRef.current} settings={settings} setSettings={setSettings} onQuit={() => setScreen("title")} onRestart={start} />
      )}
    </div>
  );
}

function Title({ onStart }) {
  const [difficulty, setDifficulty] = useState("normal");
  const [sandbox, setSandbox] = useState(false);
  const [starter, setStarter] = useState(true);
  const [name, setName] = useState("Lion City");
  const [help, setHelp] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const saved = saveInfo();
  const make = () => onStart(newWorld({ difficulty, sandbox, starter, name: name.trim() || "Lion City" }));
  return (
    <div className="city-title city-scroll absolute inset-0 overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center gap-4 px-4 py-4 sm:flex-row sm:gap-8">
        <div className="text-center text-white sm:flex-1 sm:text-left">
          <div className="city-bob inline-block text-6xl">🦁</div>
          <h1 className="city-title-text text-4xl font-bold leading-none sm:text-5xl">Lion City Planner</h1>
          <p className="mx-auto mt-2 max-w-sm text-[15px] font-medium text-white/95 sm:mx-0">
            It's 1965 and Singapore is brand new. Build HDB estates, MRT lines and hawker centres, keep everyone happy, and balance the budget.
          </p>
        </div>
        <div className="city-card w-full max-w-sm space-y-2.5 p-4">
          {saved && (
            <button
              onClick={() => {
                const w = loadWorld();
                if (w) onStart(w);
              }}
              className="city-btn city-sticker w-full rounded-2xl bg-[var(--good)] py-2.5 text-lg font-bold text-white"
            >
              ▶ Continue {saved.name}
              <span className="block text-[13px] font-semibold text-white/90">
                {saved.date} · {fmtNum(saved.pop)} residents
              </span>
            </button>
          )}
          <label htmlFor="city-name" className="block text-sm font-bold">
            City name
            <input id="city-name" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-[var(--ink)]/20 bg-white px-3 py-2 text-base" />
          </label>
          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Difficulty">
            {Object.entries(DIFFICULTY).map(([k, d]) => (
              <button key={k} role="radio" aria-checked={difficulty === k} onClick={() => setDifficulty(k)} className={`city-btn rounded-xl px-1 py-1.5 text-center ${difficulty === k ? "bg-[var(--brand)] text-white" : "bg-[var(--soft)]"}`}>
                <span className="block text-[15px] font-bold">{d.label}</span>
                <span className="block text-[11px] leading-tight opacity-85">{d.desc}</span>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={starter} onChange={(e) => setStarter(e.target.checked)} className="h-5 w-5 accent-[var(--brand)]" />
            Start with a small town
          </label>
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} className="h-5 w-5 accent-[var(--brand)]" />
            Sandbox: unlimited money, every era unlocked
          </label>
          {confirmNew ? (
            <div className="rounded-2xl bg-[var(--bad-bg)] p-2 text-center text-sm">
              <div className="font-bold text-[var(--bad)]">This replaces your saved city, {saved.name}.</div>
              <div className="mt-1.5 flex gap-1.5">
                <button onClick={() => setConfirmNew(false)} className="city-btn flex-1 rounded-xl bg-white py-2 font-bold">
                  Keep it
                </button>
                <button onClick={make} className="city-btn flex-1 rounded-xl bg-[var(--brand)] py-2 font-bold text-white">
                  Start new
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => (saved ? setConfirmNew(true) : make())} className="city-btn city-sticker w-full rounded-2xl bg-[var(--brand)] py-2.5 text-lg font-bold text-white">
              🆕 New city
            </button>
          )}
          <button onClick={() => setHelp(true)} className="city-btn w-full rounded-2xl bg-[var(--soft)] py-2 font-bold">
            ❓ How to play
          </button>
          <a href="mayor.html" className="city-btn block w-full rounded-2xl bg-[var(--good-bg)] py-2 text-center font-bold text-[var(--good)]">
            🏙️ New: be mayor of one region (Lion City Mayor)
          </a>
        </div>
      </div>
      {help && <HelpPanel onClose={() => setHelp(false)} />}
    </div>
  );
}

const stepHint = (tool, pending) => {
  if (!tool) return "";
  if (tool.mode === "inspect") return "Tap anything to see what it needs";
  if (tool.mode === "place") return "Tap the map to place it";
  if (pending && pending.toolId === tool.id && pending.stage === "end") return "Press ✓ Build, or tap to start again";
  const started = pending && pending.toolId === tool.id;
  if (tool.mode === "line") return started ? "Now tap where it ends" : "Tap where it starts";
  return started ? "Now tap the opposite corner" : "Tap one corner of the area";
};

function Game({ initial, settings, setSettings, onQuit, onRestart }) {
  const worldRef = useRef(initial);
  const analysisRef = useRef(null);
  const camRef = useRef({ x: 0, y: 0, zoom: 0 });
  const dirtyRef = useRef(true);
  const previewRef = useRef(null);
  const startRef = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const undoRef = useRef([]);
  const pendingRef = useRef(null);
  const [, setVersion] = useState(0);
  const [tool, setTool] = useState("inspect");
  const [tray, setTray] = useState(null);
  const [speed, setSpeed] = useState(2);
  const [panel, setPanel] = useState(initial.t === 0 ? { id: "help" } : null);
  const [overlay, setOverlay] = useState("none");
  const [inspect, setInspect] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPendingState] = useState(null);
  const [goalOpen, setGoalOpen] = useState(true);
  const toastTimer = useRef(null);
  const w = worldRef.current;

  const refresh = useCallback(() => {
    analysisRef.current = analyze(worldRef.current);
    const p = pendingRef.current;
    previewRef.current = p ? previewTool(worldRef.current, p.toolId, p.a, p.b) : null;
    dirtyRef.current = true;
    setVersion((v) => v + 1);
  }, []);

  const setPending = useCallback(
    (p) => {
      pendingRef.current = p;
      setPendingState(p);
      const tl = p && ALL_TOOLS[p.toolId];
      startRef.current = p && tl.mode !== "place" && p.stage === "start" ? p.a : null;
      refresh();
    },
    [refresh]
  );

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2800);
  }, []);

  useEffect(() => {
    refresh();
    saveWorld(worldRef.current);
  }, [refresh]);

  // Simulation clock (paused while a sheet is open)
  const paused = speed === 0 || !!panel || !!w.gameOver;
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const world = worldRef.current;
      const before = world.news[0];
      stepMonth(world);
      if (world.news[0] && world.news[0] !== before) toast(world.news[0].text);
      saveWorld(world);
      refresh();
    }, SPEEDS[speed].ms);
    return () => clearInterval(id);
  }, [paused, speed, toast, refresh]);

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && saveWorld(worldRef.current);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  const build = useCallback(
    (toolId, a, b) => {
      const world = worldRef.current;
      const r = applyTool(world, toolId, a, b);
      if (!r.ok) {
        toast(`🚫 ${r.msg}`);
        refresh();
        return false;
      }
      undoRef.current.push(r.undo);
      if (undoRef.current.length > 30) undoRef.current.shift();
      checkGoals(world);
      saveWorld(world);
      if (r.cost > 0) toast(`${ALL_TOOLS[toolId].icon} Built for ${fmtMoney(r.cost)}`);
      return true;
    },
    [toast, refresh]
  );

  const confirmPending = () => {
    const p = pendingRef.current;
    if (!p) return;
    if (build(p.toolId, p.a, p.b)) {
      // roads and track carry on from where the last piece ended
      if (ALL_TOOLS[p.toolId].mode === "line") setPending({ toolId: p.toolId, a: p.b, b: p.b, stage: "start" });
      else setPending(null);
    }
  };

  const onTap = useCallback(
    (toolId, g) => {
      const t = ALL_TOOLS[toolId];
      const cur = pendingRef.current;
      let p;
      if (t.mode === "place") p = { toolId, a: g, b: g, stage: "end" };
      else if (!cur || cur.toolId !== toolId || cur.stage === "end") p = { toolId, a: g, b: g, stage: "start" };
      else p = { ...cur, b: g, stage: "end" };
      if (!settings.confirm && p.stage === "end") {
        if (build(p.toolId, p.a, p.b)) setPending(t.mode === "line" ? { toolId, a: p.b, b: p.b, stage: "start" } : null);
      } else setPending(p);
    },
    [settings.confirm, build, setPending]
  );

  const onMouseBuild = useCallback(
    (toolId, a, b) => {
      build(toolId, a, b);
      previewRef.current = null;
      refresh();
    },
    [build, refresh]
  );

  const onInspect = useCallback((g) => {
    setInspect(describeTile(worldRef.current, analysisRef.current, g.x, g.y));
    dirtyRef.current = true;
  }, []);

  const undo = () => {
    const u = undoRef.current.pop();
    if (!u) return;
    undoAction(worldRef.current, u);
    saveWorld(worldRef.current);
    toast(`↶ Undid ${ALL_TOOLS[u.toolId]?.name || "build"}, refunded ${fmtMoney(u.cost)}`);
    setPending(null);
  };

  const pickTool = (id) => {
    setTool(id);
    setTray(null);
    setInspect(null);
    setPending(null);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (panel && !w.gameOver) setPanel(null);
      else if (pendingRef.current) setPending(null);
      else if (tray) setTray(null);
      else if (tool !== "inspect") pickTool("inspect");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const A = analysisRef.current;
  const cur = ALL_TOOLS[tool];
  const preview = previewRef.current;
  const goal = nextGoal(w);
  const showConfirm = pending && (pending.stage === "end" || (preview && preview.ok));
  const zoomBtn = (f) => {
    const s = sizeRef.current;
    zoomAt(camRef.current, s.width / 2, s.height / 2, f, s.width, s.height);
    dirtyRef.current = true;
  };
  const ap = Math.round(w.approval);
  const face = ap >= 70 ? "😄" : ap >= 50 ? "🙂" : ap >= 35 ? "😐" : "😟";

  return (
    <div className="absolute inset-0">
      <GameCanvas
        worldRef={worldRef}
        analysisRef={analysisRef}
        camRef={camRef}
        dirtyRef={dirtyRef}
        previewRef={previewRef}
        startRef={startRef}
        sizeRef={sizeRef}
        tool={tool}
        overlay={overlay}
        motion={settings.motion}
        selected={inspect ? { x: inspect.x, y: inspect.y } : null}
        onTap={onTap}
        onMouseBuild={onMouseBuild}
        onInspect={onInspect}
        onTouchStart={() => tray && setTray(null)}
      />

      {/* Top HUD */}
      <div className="city-hud-top pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col items-start gap-2">
          <div className="pointer-events-auto flex min-w-0 max-w-full items-center gap-1.5">
            <button onClick={() => setPanel({ id: "menu" })} aria-label="Menu" className="city-btn city-sticker flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--card)] text-xl">
              ☰
            </button>
            <div className="city-sticker city-noscrollbar flex min-w-0 items-stretch overflow-x-auto rounded-full bg-[var(--card)] text-[14px] font-bold tabular-nums">
              <span className="hidden items-center whitespace-nowrap px-3 md:flex">📅 {dateLabel(w)}</span>
              <HudSeg onClick={() => setPanel({ id: "budget" })} label={`Budget: ${fmtMoney(w.cash)}`} bad={w.cash < 0}>
                💰 {w.sandbox ? "∞" : fmtMoney(w.cash)}
              </HudSeg>
              <HudSeg onClick={() => setPanel({ id: "stats", tab: "people" })} label={`Population: ${fmtNum(w.stats.pop || 0)}`}>
                👥 {fmtNum(w.stats.pop || 0)}
              </HudSeg>
              <HudSeg onClick={() => setPanel({ id: "stats", tab: "happy" })} label={`Approval: ${ap}%`} bad={ap < 35}>
                {face} {ap}%
              </HudSeg>
            </div>
          </div>
          {inspect ? (
            <Inspector info={inspect} onClose={() => setInspect(null)} />
          ) : goal && goalOpen && !tray && tool === "inspect" ? (
            <div className="city-card city-pop city-goal pointer-events-auto p-2.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--brand)]">🎯 Next goal · {dateLabel(w)}</div>
                  <div className="font-bold leading-tight">{goal.text}</div>
                  <div className="city-clamp mt-0.5 text-[13px] leading-snug text-[var(--muted)]">{goal.hint}</div>
                </div>
                <button onClick={() => setGoalOpen(false)} aria-label="Hide goal" className="city-btn h-8 w-8 shrink-0 rounded-full bg-[var(--soft)] text-sm font-bold">
                  ✕
                </button>
              </div>
            </div>
          ) : goal && tool === "inspect" ? (
            <button onClick={() => setGoalOpen(true)} className="city-btn city-sticker pointer-events-auto rounded-full bg-[var(--card)] px-3 py-1.5 text-[13px] font-bold">
              🎯 Goal
            </button>
          ) : null}
          <RotateTip />
        </div>
        <div className="pointer-events-none ml-auto flex shrink-0 flex-col items-end gap-2">
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              onClick={() => setSpeed(speed === 0 ? 2 : 0)}
              aria-label={speed === 0 ? "Play" : "Pause"}
              className={`city-btn city-sticker flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold ${speed === 0 ? "bg-[var(--warn)] text-white" : "bg-[var(--card)]"}`}
            >
              {speed === 0 ? "▶" : "❚❚"}
            </button>
            <button
              onClick={() => setSpeed(speed === 0 ? 1 : (speed % 3) + 1)}
              aria-label={`Speed: ${SPEEDS[speed].label}. Tap to change`}
              className="city-btn city-sticker flex h-11 min-w-[2.75rem] items-center justify-center rounded-full bg-[var(--card)] px-2 text-[15px] font-bold"
            >
              {speed === 0 ? "1×" : SPEEDS[speed].icon}
            </button>
            <button onClick={() => setPanel({ id: "layers" })} aria-label="Map layers" className={`city-btn city-sticker flex h-11 w-11 items-center justify-center rounded-full text-xl ${overlay !== "none" ? "bg-[var(--brand)]" : "bg-[var(--card)]"}`}>
              🗺️
            </button>
            <button onClick={() => setPanel({ id: "news" })} aria-label="News" className="city-btn city-sticker hidden h-11 w-11 items-center justify-center rounded-full bg-[var(--card)] text-xl sm:flex">
              📰
            </button>
          </div>
          <RCI demand={w.demand} />
          <div className="city-zoom pointer-events-auto flex-col gap-1.5">
            <button onClick={() => zoomBtn(1.25)} aria-label="Zoom in" className="city-btn city-sticker flex h-10 w-10 items-center justify-center rounded-full bg-[var(--card)] text-xl font-bold">
              ＋
            </button>
            <button onClick={() => zoomBtn(0.8)} aria-label="Zoom out" className="city-btn city-sticker flex h-10 w-10 items-center justify-center rounded-full bg-[var(--card)] text-xl font-bold">
              －
            </button>
          </div>
        </div>
      </div>

      {overlay !== "none" && (
        <div className="city-sticker absolute bottom-[4.75rem] left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--card)] py-1 pl-3 pr-1 text-[13px] font-bold">
          {OVERLAYS[overlay].icon} {OVERLAYS[overlay].name}: <span className="text-[var(--bad)]">poor</span>→<span className="text-[var(--good)]">good</span>
          <button onClick={() => setOverlay("none")} aria-label="Hide map layer" className="city-btn h-7 w-7 rounded-full bg-[var(--soft)]">
            ✕
          </button>
        </div>
      )}

      {toastMsg && (
        <div role="status" className="city-pop pointer-events-none absolute left-1/2 top-[3.75rem] z-30 w-max max-w-[min(26rem,70vw)] -translate-x-1/2 rounded-2xl bg-[var(--ink)] px-3 py-2 text-center text-[14px] font-semibold text-white shadow-lg">
          {toastMsg}
        </div>
      )}

      {/* Bottom: tool status, confirm, dock */}
      <div className="city-hud-bottom pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2">
        {tray && <Tray world={w} group={TOOL_GROUPS.find((g) => g.id === tray)} tool={tool} onPick={pickTool} />}
        {!tray && cur && cur.mode !== "inspect" && (
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 px-2">
            {undoRef.current.length > 0 && !showConfirm && (
              <button onClick={undo} className="city-btn city-sticker shrink-0 rounded-full bg-[var(--card)] px-3 py-2 text-[14px] font-bold">
                ↶ Undo
              </button>
            )}
            <div className="city-sticker flex min-w-0 max-w-full shrink-0 items-center gap-2 overflow-hidden rounded-full bg-[var(--card)] py-1 pl-3 pr-1">
              <span className="text-xl">{cur.icon}</span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[14px] font-bold">
                  {cur.name}
                  {cur.cost ? ` · ${fmtMoney(cur.cost)}${cur.mode === "place" ? "" : "/tile"}` : ""}
                </span>
                <span className="block truncate text-[12px] text-[var(--muted)]">{stepHint(cur, pending)}</span>
              </span>
              <button onClick={() => pickTool("inspect")} aria-label="Stop building" className="city-btn h-9 w-9 shrink-0 rounded-full bg-[var(--soft)] font-bold">
                ✕
              </button>
            </div>
            {showConfirm && (
              <>
                <button onClick={() => setPending(null)} className="city-btn city-sticker shrink-0 rounded-full bg-[var(--card)] px-4 py-2 text-[15px] font-bold">
                  Cancel
                </button>
                <button
                  onClick={confirmPending}
                  disabled={!preview?.ok}
                  className="city-btn city-sticker max-w-full shrink-0 rounded-full bg-[var(--good)] px-4 py-2 text-[15px] font-bold text-white disabled:bg-[var(--muted)]"
                >
                  {preview?.ok ? `✓ Build ${fmtMoney(preview.cost)}` : preview?.msg || "Nothing to build here"}
                </button>
              </>
            )}
          </div>
        )}
        {!tray && cur?.mode === "inspect" && undoRef.current.length > 0 && (
          <button onClick={undo} className="city-btn city-sticker pointer-events-auto rounded-full bg-[var(--card)] px-3 py-2 text-[14px] font-bold">
            ↶ Undo
          </button>
        )}
        <Dock tool={tool} tray={tray} setTray={setTray} onLook={() => pickTool("inspect")} />
      </div>

      {panel?.id === "budget" && <BudgetPanel world={w} analysis={A} onChange={refresh} onClose={() => setPanel(null)} toast={toast} />}
      {panel?.id === "stats" && <StatsPanel world={w} onClose={() => setPanel(null)} initialTab={panel.tab} />}
      {panel?.id === "news" && <NewsPanel world={w} onClose={() => setPanel(null)} />}
      {panel?.id === "help" && <HelpPanel onClose={() => setPanel(null)} />}
      {panel?.id === "layers" && (
        <Panel title="🗺️ Map layers" onClose={() => setPanel(null)}>
          <p className="mb-2 text-[14px] text-[var(--muted)]">Colour the map to see where things are good (green) or poor (red).</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(OVERLAYS).map(([k, o]) => (
              <button
                key={k}
                onClick={() => {
                  setOverlay(k);
                  setPanel(null);
                }}
                className={`city-btn rounded-2xl px-3 py-2.5 text-left font-bold ${overlay === k ? "bg-[var(--brand)] text-white" : "bg-[var(--soft)]"}`}
              >
                {o.icon} {o.name}
              </button>
            ))}
          </div>
        </Panel>
      )}
      {panel?.id === "menu" && (
        <MenuPanel
          world={w}
          settings={settings}
          setSettings={setSettings}
          saved={saved}
          onClose={() => setPanel(null)}
          onSave={() => {
            setSaved(saveWorld(w));
            setTimeout(() => setSaved(false), 1500);
          }}
          onHelp={() => setPanel({ id: "help" })}
          onQuit={() => {
            saveWorld(w);
            onQuit();
          }}
        />
      )}
      {w.gameOver && (
        <Panel title="📋 Ministerial verdict" onClose={() => {}} closable={false}>
          <p className="text-lg">{w.gameOver.text}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {w.name} reached {fmtNum(w.stats.pop)} residents by {dateLabel(w)}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => {
                w.gameOver = null;
                w.sandbox = true;
                w.cash = Math.max(w.cash, 9999999);
                refresh();
              }}
              className="city-btn rounded-2xl bg-[var(--soft)] px-4 py-2 font-bold"
            >
              Keep playing in sandbox
            </button>
            <button onClick={() => onRestart(newWorld({ difficulty: w.difficulty, name: w.name }))} className="city-btn rounded-2xl bg-[var(--brand)] px-4 py-2 font-bold text-white">
              Try a new city
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}

function HudSeg({ children, onClick, label, bad }) {
  return (
    <button onClick={onClick} aria-label={label} className={`city-btn flex items-center whitespace-nowrap border-l-2 border-[var(--ink)]/10 px-3 py-2 first:border-l-0 ${bad ? "bg-[var(--bad-bg)] text-[var(--bad)]" : ""}`}>
      {children}
    </button>
  );
}

function Dock({ tool, tray, setTray, onLook }) {
  const curGroup = TOOL_GROUPS.find((g) => g.tools.some((t) => t.id === tool))?.id;
  return (
    <nav aria-label="Build tools" className="city-sticker city-noscrollbar pointer-events-auto flex max-w-[calc(100%-1rem)] gap-1 overflow-x-auto rounded-full bg-[var(--card)] p-1">
      {TOOL_GROUPS.map((g) => {
        const active = g.id === "inspect" ? tool === "inspect" && !tray : tray === g.id || (!tray && curGroup === g.id);
        return (
          <button
            key={g.id}
            onClick={() => (g.id === "inspect" ? onLook() : setTray(tray === g.id ? null : g.id))}
            aria-expanded={g.id === "inspect" ? undefined : tray === g.id}
            className={`city-btn flex h-12 min-w-[3.5rem] shrink-0 flex-col items-center justify-center rounded-full px-2 leading-none ${active ? "bg-[var(--brand)] text-white" : ""}`}
          >
            <span className="text-xl">{g.id === curGroup && g.id !== "inspect" ? ALL_TOOLS[tool].icon : g.icon}</span>
            <span className="mt-0.5 text-[11px] font-bold">{g.name}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Tray({ world, group, tool, onPick }) {
  return (
    <div className="city-card city-pop city-noscrollbar pointer-events-auto flex max-w-[calc(100%-1rem)] gap-2 overflow-x-auto p-2">
      {group.tools.map((t) => {
        const locked = !isUnlocked(world, t.year);
        const poor = !world.sandbox && t.cost > world.cash;
        return (
          <button
            key={t.id}
            disabled={locked}
            onClick={() => onPick(t.id)}
            className={`city-btn flex w-[7.25rem] shrink-0 flex-col items-center rounded-2xl border-2 px-2 py-2 text-center ${tool === t.id ? "border-[var(--brand)] bg-[var(--bad-bg)]" : "border-[var(--ink)]/10 bg-[var(--soft)]"} ${locked ? "opacity-50" : ""}`}
          >
            <span className="text-3xl leading-none">{t.icon}</span>
            <span className="mt-1 text-[13px] font-bold leading-tight">{t.name}</span>
            <span className={`text-[12px] font-bold tabular-nums ${poor ? "text-[var(--bad)]" : "text-[var(--muted)]"}`}>{locked ? `🔒 ${t.year}` : t.cost != null ? `${fmtMoney(t.cost)}${t.mode === "place" ? "" : "/tile"}` : ""}</span>
          </button>
        );
      })}
    </div>
  );
}

function RCI({ demand }) {
  const bars = [
    { k: "r", label: "R", color: "#2fd06f" },
    { k: "c", label: "C", color: "#4b9bff" },
    { k: "i", label: "I", color: "#ffb020" },
  ];
  return (
    <div
      className="city-sticker pointer-events-auto flex items-end gap-1 rounded-2xl bg-[var(--card)] px-2 py-1"
      title="Demand: R homes, C shops & offices, I factories"
      role="img"
      aria-label={`Demand: homes ${Math.round((demand?.r || 0) * 100)}, shops ${Math.round((demand?.c || 0) * 100)}, factories ${Math.round((demand?.i || 0) * 100)}`}
    >
      {bars.map((b) => {
        const v = Math.max(-1, Math.min(1, demand?.[b.k] || 0));
        return (
          <div key={b.k} className="flex flex-col items-center">
            <div className="relative h-9 w-3 rounded-full bg-[var(--soft)]">
              <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--ink)]/30" />
              <div className="absolute inset-x-0 rounded-full" style={{ background: b.color, height: `${Math.abs(v) * 50}%`, ...(v >= 0 ? { bottom: "50%" } : { top: "50%" }) }} />
            </div>
            <div className="text-[11px] font-bold">{b.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function Inspector({ info, onClose }) {
  return (
    <div className="city-card city-pop city-goal pointer-events-auto p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="font-bold leading-tight">
          <span className="mr-1 text-xl">{info.icon}</span>
          {info.title}
        </div>
        <button onClick={onClose} aria-label="Close details" className="city-btn h-8 w-8 shrink-0 rounded-full bg-[var(--soft)] text-sm font-bold">
          ✕
        </button>
      </div>
      <ul className="mt-1 space-y-0.5 text-[13px] leading-snug text-[var(--muted)]">
        {info.lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

const ROTATE_KEY = "lion-city-rotate-tip";
function RotateTip() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(ROTATE_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  return (
    <div className="city-rotate-tip city-sticker pointer-events-auto items-center gap-2 rounded-full bg-[var(--card)] py-1 pl-3 pr-1 text-[13px] font-bold">
      <span className="city-rotate-icon inline-block">📱</span> Turn sideways for a bigger map
      <button
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(ROTATE_KEY, "1");
          } catch {
            // ignore
          }
        }}
        aria-label="Hide tip"
        className="city-btn h-8 w-8 rounded-full bg-[var(--soft)]"
      >
        ✕
      </button>
    </div>
  );
}
