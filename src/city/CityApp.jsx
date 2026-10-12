import React, { useCallback, useEffect, useRef, useState } from "react";
import GameCanvas, { zoomBy } from "./GameCanvas.jsx";
import { BudgetPanel, StatsPanel, NewsPanel, HelpPanel, MenuPanel, Panel } from "./panels.jsx";
import { TOOL_GROUPS, ALL_TOOLS, DIFFICULTY } from "./defs.js";
import { newWorld, stepMonth, analyze, applyTool, describeTile, dateLabel, fmtMoney, fmtNum, isUnlocked, saveWorld, loadWorld, hasSave } from "./sim.js";
import { OVERLAYS } from "./render.js";

const SPEEDS = [
  { id: 0, icon: "❚❚", ms: 0, label: "Pause" },
  { id: 1, icon: "▶", ms: 3000, label: "Slow" },
  { id: 2, icon: "▶▶", ms: 1500, label: "Normal" },
  { id: 3, icon: "▶▶▶", ms: 600, label: "Fast" },
];

export default function CityApp() {
  const [screen, setScreen] = useState("title");
  const worldRef = useRef(null);

  const start = (w) => {
    worldRef.current = w;
    setScreen("game");
  };

  return (
    <div className="city-app fixed inset-0 overflow-hidden bg-sky-800 text-slate-900">
      {screen === "title" ? <Title onStart={start} /> : <Game key={worldRef.current.seed + ":" + worldRef.current.t} initial={worldRef.current} onQuit={() => setScreen("title")} onRestart={start} />}
      <RotatePrompt />
    </div>
  );
}

function RotatePrompt() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="city-rotate absolute inset-0 z-50 flex-col items-center justify-center gap-4 bg-sky-900 p-6 text-center text-white">
      <div className="city-rotate-icon text-7xl">📱</div>
      <div className="text-2xl font-bold">Turn your phone sideways</div>
      <p className="max-w-xs text-white/80">Lion City Planner is made for landscape. Rotate your phone (and turn off rotation lock) to plan your city.</p>
      <button onClick={() => setDismissed(true)} className="rounded-full bg-white/15 px-4 py-2 text-sm">
        Play in portrait anyway
      </button>
    </div>
  );
}

function Title({ onStart }) {
  const [difficulty, setDifficulty] = useState("normal");
  const [sandbox, setSandbox] = useState(false);
  const [name, setName] = useState("Lion City");
  const [help, setHelp] = useState(false);
  const canContinue = hasSave();
  return (
    <div className="city-title absolute inset-0 overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-3 p-4 text-white sm:flex-row sm:gap-8">
        <div className="text-center sm:text-left">
          <div className="text-5xl">🦁🏙️</div>
          <h1 className="text-3xl font-bold drop-shadow sm:text-4xl">Lion City Planner</h1>
          <p className="mt-1 max-w-sm text-white/85">
            It's 1965. Singapore is newly independent, and you are the chief planner. Build homes, roads, MRT lines and hawker centres for a nation, and keep the budget in the black.
          </p>
        </div>
        <div className="w-full max-w-xs space-y-2 rounded-2xl bg-white/95 p-4 text-slate-800 shadow-xl">
          {canContinue && (
            <button
              onClick={() => {
                const w = loadWorld();
                if (w) onStart(w);
              }}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-lg font-bold text-white hover:bg-emerald-700"
            >
              ▶ Continue city
            </button>
          )}
          <label className="block text-sm font-semibold">
            City name
            <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-1" />
          </label>
          <div className="flex gap-1">
            {Object.entries(DIFFICULTY).map(([k, d]) => (
              <button key={k} onClick={() => setDifficulty(k)} className={`flex-1 rounded-lg py-1.5 text-sm font-bold ${difficulty === k ? "bg-rose-600 text-white" : "bg-slate-100"}`}>
                {d.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} />
            Sandbox: unlimited money, all eras unlocked
          </label>
          <button
            onClick={() => {
              if (canContinue && !window.confirm("Start a new city? Your saved city will be replaced when the new one autosaves.")) return;
              onStart(newWorld({ difficulty, sandbox, name: name.trim() || "Lion City" }));
            }}
            className="w-full rounded-xl bg-rose-600 py-2.5 text-lg font-bold text-white hover:bg-rose-700"
          >
            🆕 New city
          </button>
          <button onClick={() => setHelp(true)} className="w-full rounded-xl bg-slate-100 py-2 font-semibold">
            ❓ How to play
          </button>
        </div>
      </div>
      {help && <HelpPanel onClose={() => setHelp(false)} />}
    </div>
  );
}

function Game({ initial, onQuit, onRestart }) {
  const worldRef = useRef(initial);
  const analysisRef = useRef(null);
  const camRef = useRef({ x: 0, y: 0, zoom: 0 });
  const dirtyRef = useRef(true);
  const [, setVersion] = useState(0);
  const [tool, setTool] = useState("inspect");
  const [group, setGroup] = useState(null);
  const [speed, setSpeed] = useState(2);
  const [panel, setPanel] = useState(initial.t === 0 ? "help" : null);
  const [overlay, setOverlay] = useState("none");
  const [inspect, setInspect] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(null);
  const toastTimer = useRef(null);
  const w = worldRef.current;

  const refresh = useCallback(() => {
    analysisRef.current = analyze(worldRef.current);
    dirtyRef.current = true;
    setVersion((v) => v + 1);
  }, []);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Simulation clock (paused while a panel is open)
  const paused = speed === 0 || !!panel || !!w.gameOver;
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const world = worldRef.current;
      const before = world.news.length ? world.news[0] : null;
      stepMonth(world);
      analysisRef.current = analyze(world);
      if (world.news[0] && world.news[0] !== before) toast(world.news[0].text);
      if (world.month % 3 === 0) saveWorld(world);
      dirtyRef.current = true;
      setVersion((v) => v + 1);
    }, SPEEDS[speed].ms);
    return () => clearInterval(id);
  }, [paused, speed, toast]);

  // Save when leaving the page
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && saveWorld(worldRef.current);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  const onApply = useCallback(
    (toolId, a, b) => {
      const r = applyTool(worldRef.current, toolId, a, b);
      if (!r.ok) toast(`🚫 ${r.msg}`);
      else if (r.cost > 0) toast(`${ALL_TOOLS[toolId].icon} Built for ${fmtMoney(r.cost)}`);
      refresh();
    },
    [refresh, toast]
  );

  const onInspect = useCallback((g) => {
    const info = describeTile(worldRef.current, analysisRef.current, g.x, g.y);
    setInspect(info);
    dirtyRef.current = true;
  }, []);

  const pickTool = (id) => {
    setTool(id);
    setGroup(null);
    setInspect(null);
  };

  const A = analysisRef.current;
  const cur = ALL_TOOLS[tool];
  const zoomButtons = (f) => {
    const el = document.querySelector(".city-map");
    const r = el.getBoundingClientRect();
    zoomBy(camRef, dirtyRef, f, r.width, r.height);
  };

  return (
    <div className="absolute inset-0 flex flex-col city-safe">
      <TopBar
        world={w}
        speed={speed}
        setSpeed={setSpeed}
        onPanel={setPanel}
        overlay={overlay}
      />
      <div className="relative flex min-h-0 flex-1">
        <Toolbar tool={tool} group={group} setGroup={setGroup} />
        <div className="city-map relative min-w-0 flex-1">
          <GameCanvas
            worldRef={worldRef}
            analysisRef={analysisRef}
            camRef={camRef}
            dirtyRef={dirtyRef}
            tool={tool}
            overlay={overlay}
            selected={inspect ? { x: inspect.x, y: inspect.y } : null}
            onApply={onApply}
            onInspect={onInspect}
            onPreview={setPreview}
          />

          {group && <Flyout world={w} group={TOOL_GROUPS.find((g) => g.id === group)} tool={tool} onPick={pickTool} onClose={() => setGroup(null)} />}

          {/* current tool chip */}
          <div className="pointer-events-none absolute bottom-2 left-2 max-w-[55%]">
            {preview && preview.cells?.length > 0 ? (
              <div className={`rounded-xl px-3 py-1.5 text-sm font-bold shadow ${preview.ok ? "bg-white/95" : "bg-rose-100/95 text-rose-700"}`}>
                {preview.ok ? `${cur?.icon} ${fmtMoney(preview.cost)}${w.cash < preview.cost && !w.sandbox ? " — not enough money!" : ""}` : `🚫 ${preview.msg || "Can't build here"}`}
                {preview.ok && preview.msg && <div className="text-[11px] font-normal text-slate-500">{preview.msg}</div>}
              </div>
            ) : (
              cur && (
                <div className="rounded-xl bg-white/90 px-3 py-1.5 text-[12px] leading-tight shadow">
                  <span className="font-bold">
                    {cur.icon} {cur.name}
                    {cur.cost ? ` · ${fmtMoney(cur.cost)}${cur.mode === "place" ? "" : "/tile"}` : ""}
                  </span>
                  <div className="text-slate-600">{cur.mode === "inspect" ? cur.tip : `${cur.mode === "line" ? "Drag to draw" : cur.mode === "rect" ? "Drag a rectangle" : "Tap to place"} · two fingers to move the map`}</div>
                </div>
              )
            )}
          </div>

          <RCI demand={w.demand} />

          <div className="absolute bottom-2 right-2 flex flex-col gap-1.5">
            <RoundBtn onClick={() => zoomButtons(1.25)} label="Zoom in">
              ＋
            </RoundBtn>
            <RoundBtn onClick={() => zoomButtons(0.8)} label="Zoom out">
              －
            </RoundBtn>
          </div>

          {overlay !== "none" && (
            <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold shadow">
              {OVERLAYS[overlay].icon} {OVERLAYS[overlay].name}: <span className="text-rose-600">bad</span> → <span className="text-emerald-600">good</span>
              <button onClick={() => setOverlay("none")} className="ml-2 font-bold text-slate-500">
                ✕
              </button>
            </div>
          )}

          {inspect && <Inspector info={inspect} onClose={() => setInspect(null)} />}

          {toastMsg && (
            <div className="city-pop pointer-events-none absolute left-1/2 top-10 z-30 max-w-[80%] -translate-x-1/2 rounded-xl bg-slate-900/90 px-3 py-2 text-center text-sm text-white shadow-lg">
              {toastMsg}
            </div>
          )}
        </div>
      </div>

      {panel === "budget" && <BudgetPanel world={w} analysis={A} onChange={refresh} onClose={() => setPanel(null)} toast={toast} />}
      {panel === "stats" && <StatsPanel world={w} onClose={() => setPanel(null)} />}
      {panel === "news" && <NewsPanel world={w} onClose={() => setPanel(null)} />}
      {panel === "help" && <HelpPanel onClose={() => setPanel(null)} />}
      {panel === "layers" && (
        <Panel title="🗺️ Map layers" onClose={() => setPanel(null)}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(OVERLAYS).map(([k, o]) => (
              <button
                key={k}
                onClick={() => {
                  setOverlay(k);
                  setPanel(null);
                }}
                className={`rounded-xl px-3 py-2 text-left font-semibold ${overlay === k ? "bg-rose-600 text-white" : "bg-slate-100 hover:bg-slate-200"}`}
              >
                {o.icon} {o.name}
              </button>
            ))}
          </div>
        </Panel>
      )}
      {panel === "menu" && (
        <MenuPanel
          world={w}
          saved={saved}
          onClose={() => setPanel(null)}
          onSave={() => {
            setSaved(saveWorld(w));
            setTimeout(() => setSaved(false), 1500);
          }}
          onHelp={() => setPanel("help")}
          onNew={() => {
            saveWorld(w);
            onQuit();
          }}
          onQuit={() => {
            saveWorld(w);
            onQuit();
          }}
        />
      )}
      {w.gameOver && (
        <Panel title="📋 Ministerial verdict" onClose={() => {}}>
          <p className="text-lg">{w.gameOver.text}</p>
          <p className="mt-2 text-sm text-slate-500">
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
              className="rounded-xl bg-slate-100 px-4 py-2 font-semibold"
            >
              Keep playing in sandbox
            </button>
            <button onClick={() => onRestart(newWorld({ difficulty: w.difficulty, name: w.name }))} className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white">
              Try a new city
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}

function TopBar({ world: w, speed, setSpeed, onPanel, overlay }) {
  const ap = Math.round(w.approval);
  const face = ap >= 70 ? "😄" : ap >= 50 ? "🙂" : ap >= 35 ? "😐" : "😠";
  const canFull = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;
  return (
    <div className="z-20 flex h-11 shrink-0 items-center gap-1 overflow-x-auto bg-gradient-to-r from-red-700 via-red-600 to-rose-600 px-1.5 text-white shadow-md city-noscrollbar">
      <HudBtn onClick={() => onPanel("menu")} label="Menu">
        ☰
      </HudBtn>
      <div className="hidden px-1 text-sm font-bold lg:block">{w.name}</div>
      <Chip>📅 {dateLabel(w)}</Chip>
      <Chip onClick={() => onPanel("budget")} tone={w.cash < 0 ? "bad" : null}>
        💰 {w.sandbox ? "∞" : fmtMoney(w.cash)}
      </Chip>
      <Chip onClick={() => onPanel("stats")}>👥 {fmtNum(w.stats.pop || 0)}</Chip>
      <Chip onClick={() => onPanel("stats")} tone={ap < 35 ? "bad" : null}>
        {face} {ap}%
      </Chip>
      <div className="ml-auto flex items-center gap-0.5 rounded-full bg-black/20 p-0.5">
        {SPEEDS.map((s) => (
          <button key={s.id} onClick={() => setSpeed(s.id)} aria-label={s.label} className={`h-8 min-w-[2rem] rounded-full px-1.5 text-[11px] font-bold ${speed === s.id ? "bg-white text-rose-700" : "text-white"}`}>
            {s.icon}
          </button>
        ))}
      </div>
      <HudBtn onClick={() => onPanel("budget")} label="Budget">
        💰
      </HudBtn>
      <HudBtn onClick={() => onPanel("stats")} label="City report">
        📊
      </HudBtn>
      <HudBtn onClick={() => onPanel("layers")} label="Map layers" active={overlay !== "none"}>
        🗺️
      </HudBtn>
      <HudBtn onClick={() => onPanel("news")} label="News">
        📰
      </HudBtn>
      {canFull && (
        <HudBtn
          label="Full screen"
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen?.();
            else
              document.documentElement
                .requestFullscreen?.()
                .then(() => screen.orientation?.lock?.("landscape"))
                .catch(() => {});
          }}
        >
          ⛶
        </HudBtn>
      )}
    </div>
  );
}

function Chip({ children, onClick, tone }) {
  return (
    <button onClick={onClick} className={`shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[13px] font-bold tabular-nums ${tone === "bad" ? "bg-yellow-300 text-red-800" : "bg-black/20"}`}>
      {children}
    </button>
  );
}

function HudBtn({ children, onClick, label, active }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${active ? "bg-white/40" : "bg-white/15 hover:bg-white/25"}`}>
      {children}
    </button>
  );
}

function RoundBtn({ children, onClick, label }) {
  return (
    <button onClick={onClick} aria-label={label} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl font-bold text-slate-700 shadow">
      {children}
    </button>
  );
}

function Toolbar({ tool, group, setGroup }) {
  const curGroup = TOOL_GROUPS.find((g) => g.tools.some((t) => t.id === tool))?.id;
  return (
    <div className="city-noscrollbar z-20 flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto bg-slate-900/90 py-1.5">
      {TOOL_GROUPS.map((g) => (
        <button
          key={g.id}
          onClick={() => setGroup(group === g.id ? null : g.id)}
          className={`flex h-11 w-12 shrink-0 flex-col items-center justify-center rounded-xl leading-none ${group === g.id ? "bg-white text-slate-900" : curGroup === g.id ? "bg-rose-600 text-white" : "bg-slate-700/70 text-white"}`}
        >
          <span className="text-lg">{g.id === curGroup ? ALL_TOOLS[tool].icon : g.icon}</span>
          <span className="mt-0.5 text-[9px] font-semibold">{g.name}</span>
        </button>
      ))}
    </div>
  );
}

function Flyout({ world, group, tool, onPick, onClose }) {
  return (
    <>
      <div className="absolute inset-0 z-20" onPointerDown={onClose} />
      <div className="city-pop city-scroll absolute left-1 top-1 z-30 max-h-[calc(100%-0.5rem)] w-64 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-2xl">
        <div className="px-2 pb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{group.name}</div>
        {group.tools.map((t) => {
          const locked = !isUnlocked(world, t.year);
          return (
            <button
              key={t.id}
              disabled={locked}
              onClick={() => onPick(t.id)}
              className={`flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left ${tool === t.id ? "bg-rose-100" : "hover:bg-slate-100"} ${locked ? "opacity-45" : ""}`}
            >
              <span className="text-2xl leading-none">{t.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="flex justify-between gap-1 text-sm font-bold">
                  <span className="truncate">{t.name}</span>
                  {t.cost != null && <span className="shrink-0 tabular-nums text-rose-600">{fmtMoney(t.cost)}</span>}
                </span>
                <span className="block text-[11px] leading-tight text-slate-500">{locked ? `🔒 Available from ${t.year}` : t.tip}</span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function RCI({ demand }) {
  const bars = [
    { k: "r", label: "R", color: "#22c55e", title: "Homes" },
    { k: "c", label: "C", color: "#3b82f6", title: "Shops & offices" },
    { k: "i", label: "I", color: "#f59e0b", title: "Factories" },
  ];
  return (
    <div className="absolute bottom-2 right-14 flex h-[74px] items-center gap-1 rounded-xl bg-white/90 px-2 py-1 shadow" title="Demand: R homes, C commercial, I industrial">
      {bars.map((b) => {
        const v = Math.max(-1, Math.min(1, demand?.[b.k] || 0));
        return (
          <div key={b.k} className="flex flex-col items-center">
            <div className="relative h-[52px] w-3 rounded bg-slate-200">
              <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-400" />
              <div
                className="absolute left-0 right-0 rounded"
                style={{
                  background: b.color,
                  height: `${Math.abs(v) * 50}%`,
                  ...(v >= 0 ? { bottom: "50%" } : { top: "50%" }),
                }}
              />
            </div>
            <div className="text-[10px] font-bold">{b.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function Inspector({ info, onClose }) {
  return (
    <div className="city-pop absolute bottom-14 left-2 z-20 w-64 rounded-2xl bg-white/95 p-3 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="font-bold leading-tight">
          <span className="mr-1 text-xl">{info.icon}</span>
          {info.title}
        </div>
        <button onClick={onClose} className="text-slate-400" aria-label="Close">
          ✕
        </button>
      </div>
      <ul className="mt-1 space-y-0.5 text-[12px] leading-snug text-slate-600">
        {info.lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  );
}
