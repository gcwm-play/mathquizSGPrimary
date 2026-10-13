import React, { useCallback, useEffect, useRef, useState } from "react";
import MapView, { zoomAt, lookAt } from "./MapView.jsx";
import { TownsPanel, ElectionPanel, RenewSheet, NewsPanel, GoalsPanel, HelpPanel, MenuPanel, Panel, yearsMonths } from "./panels.jsx";
import { FinancePanel, DecisionPanel, CrisisPanel, ReportPanel, RivalsPanel, FinalReport, myRank } from "./panels2.jsx";
import { decide, CRISES } from "./events.js";
import { REGIONS, REGION_ORDER } from "./regions.js";
import { DIFFICULTY, ALL_TOOLS, STRUCTS, ROAD_TYPES, toolGroups } from "./defs.js";
import {
  saveCheckpoint, loadCheckpoint, checkpointInfo,
  newWorld, planRoad, commitRoad, snapPoint, planStruct, commitStruct, removeRoad, nearestSeg, segPts, paintZone, plantTrees,
  bulldozeSelect, bulldozeCost, bulldozeCommit, reclaimOk, reclaimCommit, renewOptions, applyRenew, snapshot, restore, saveWorld, loadWorld, saveInfo, clearPreview,
} from "./world.js";
import { stepMonth, analyze, dateLabel, fmtMoney, fmtNum, isUnlocked, nextGoal, checkGoals, describe, inSeason, monthsToElection, tToDate, ensureWorld, MODES } from "./sim.js";
import { OVERLAYS, ZONE_TINT } from "./render.js";
import { inQuad, dist } from "./geom.js";

const SPEEDS = [
  { ms: 0, icon: "❚❚", label: "Paused" },
  { ms: 3000, icon: "1×", label: "Slow" },
  { ms: 1500, icon: "2×", label: "Normal" },
  { ms: 600, icon: "3×", label: "Fast" },
];
const SETTINGS_KEY = "lion-city-mayor-settings";

function useSettings() {
  const read = () => {
    let reduce = false;
    try {
      reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      // ignore
    }
    const base = { large: false, motion: !reduce };
    try {
      return { ...base, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
    } catch {
      return base;
    }
  };
  const [s, setS] = useState(read);
  const set = (v) => {
    setS(v);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(v));
    } catch {
      // storage blocked
    }
  };
  useEffect(() => {
    document.documentElement.classList.toggle("city-large", !!s.large);
  }, [s.large]);
  return [s, set];
}

export default function MayorApp() {
  const [screen, setScreen] = useState("title");
  const [settings, setSettings] = useSettings();
  const ref = useRef(null);
  const [run, setRun] = useState(0);
  const start = (w) => {
    ref.current = ensureWorld(w);
    setRun((r) => r + 1);
    setScreen("game");
  };
  return (
    <div className="city-app fixed inset-0 overflow-hidden">
      {screen === "title" ? <Title onStart={start} /> : <Game key={run} initial={ref.current} settings={settings} setSettings={setSettings} onQuit={() => setScreen("title")} onRestart={start} />}
    </div>
  );
}

function Title({ onStart }) {
  const [region, setRegion] = useState("east");
  const [difficulty, setDifficulty] = useState("normal");
  const [mode, setMode] = useState("campaign");
  const [help, setHelp] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const saved = saveInfo();
  const check = checkpointInfo();
  const make = () => onStart(newWorld({ region, difficulty, mode }));
  return (
    <div className="city-title city-scroll absolute inset-0 overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center gap-3 px-4 py-4 landscape:flex-row landscape:gap-5 lg:gap-6">
        <div className="text-center text-white landscape:w-60 landscape:shrink-0 landscape:text-left lg:w-72">
          <div className="city-bob inline-block text-5xl">🦁</div>
          <h1 className="city-title-text text-4xl font-bold leading-none landscape:text-3xl lg:text-4xl">Lion City Mayor</h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] font-medium text-white/95 lg:mx-0">Run one region of Singapore from 1965. Draw curving roads, grow kampongs into modern towns, and win an election every 6 years.</p>
          <a href="city.html" className="mt-2 inline-block text-[13px] font-semibold text-white underline">Play the classic island-wide grid game instead</a>
        </div>
        <div className="city-card w-full max-w-xl space-y-2.5 p-3">
          {saved && (
            <button
              onClick={() => {
                const w = loadWorld();
                if (w) onStart(w);
              }}
              className="city-btn city-sticker w-full rounded-2xl bg-[var(--good)] py-2 text-lg font-bold text-white"
            >
              ▶ Continue as mayor of {saved.name}
              <span className="block text-[13px] font-semibold text-white/90">
                {saved.year} · {fmtNum(saved.pop)} residents
              </span>
            </button>
          )}
          {check && (
            <button
              onClick={() => {
                const w = loadCheckpoint();
                if (w) onStart(w);
              }}
              className="city-btn w-full rounded-2xl bg-[var(--soft)] py-2 text-[14px] font-bold"
            >
              ↩ Go back to just after the {check.year} election
              <span className="block text-[12px] font-semibold text-[var(--muted)]">
                {check.name} · {fmtNum(check.pop)} residents
              </span>
            </button>
          )}
          <div className="text-sm font-bold">Choose your region</div>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Region">
            {REGION_ORDER.map((id) => {
              const R = REGIONS[id];
              const on = region === id;
              return (
                <button key={id} role="radio" aria-checked={on} onClick={() => setRegion(id)} className={`city-btn rounded-2xl border-2 p-2 text-left ${on ? "border-[var(--brand)] bg-[var(--bad-bg)]" : "border-[var(--ink)]/10 bg-[var(--soft)]"}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl">{R.icon}</span>
                    <span className="font-bold leading-tight">{R.name}</span>
                  </div>
                  <div className="city-clamp mt-0.5 text-[12px] leading-snug text-[var(--muted)]">{on ? R.blurb : R.tip}</div>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label="Game mode">
            {Object.entries(MODES).map(([k, m]) => (
              <button key={k} role="radio" aria-checked={mode === k} onClick={() => setMode(k)} title={m.desc} className={`city-btn rounded-xl px-1.5 py-1.5 text-left ${mode === k ? "bg-[var(--brand)] text-white" : "bg-[var(--soft)]"}`}>
                <span className="block text-[14px] font-bold leading-tight">
                  {m.icon} {m.name}
                </span>
                <span className="city-clamp block text-[11px] leading-tight opacity-85">{m.desc}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Difficulty">
            {Object.entries(DIFFICULTY).map(([k, d]) => (
              <button key={k} role="radio" aria-checked={difficulty === k} onClick={() => setDifficulty(k)} className={`city-btn rounded-xl px-1 py-1.5 text-center ${difficulty === k ? "bg-[var(--brand)] text-white" : "bg-[var(--soft)]"}`}>
                <span className="block text-[15px] font-bold">{d.label}</span>
                <span className="block text-[11px] leading-tight opacity-85">{d.desc}</span>
              </button>
            ))}
          </div>
          {confirmNew ? (
            <div className="rounded-2xl bg-[var(--bad-bg)] p-2 text-center text-sm">
              <div className="font-bold text-[var(--bad)]">This replaces your saved game ({saved.name}).</div>
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
            <div className="flex gap-2">
              <button onClick={() => (saved ? setConfirmNew(true) : make())} className="city-btn city-sticker flex-1 rounded-2xl bg-[var(--brand)] py-2.5 text-lg font-bold text-white">
                🆕 Become mayor of {REGIONS[region].short}
              </button>
              <button onClick={() => setHelp(true)} aria-label="How to play" className="city-btn city-sticker rounded-2xl bg-[var(--soft)] px-4 text-lg font-bold">
                ❓
              </button>
            </div>
          )}
        </div>
      </div>
      {help && <HelpPanel onClose={() => setHelp(false)} />}
    </div>
  );
}

const BRUSH_R = { "zone:hdb": 1.6, "zone:pte": 1.6, "zone:com": 1.6, "zone:ind": 1.6, "zone:none": 1.6, trees: 1.5, bulldoze: 1.2, reclaim: 1.5 };

// What did the player tap? Tall buildings hide the ground behind them, so we
// also look a little "in front" of the tapped point.
function hitTest(w, x, y) {
  for (let k = 0; k <= 6; k++) {
    const px = x + k * 0.35;
    const py = y + k * 0.35;
    for (const s of w.structs) if (inQuad(s.q, px, py)) return { kind: "struct", s, q: s.q };
    for (const l of w.lots) if (inQuad(l.q, px, py) && (k === 0 || l.b)) return { kind: "lot", l, q: l.q };
    for (const kp of w.kampongs) if (kp.houses.some((h) => dist(h[0], h[1], px, py) < 0.7)) return { kind: "kampong", k: kp, x: kp.x, y: kp.y, r: kp.r };
  }
  const n = nearestSeg(w, x, y, null, 0.9);
  if (n) return { kind: "road", s: n.seg };
  return null;
}

function Game({ initial, settings, setSettings, onQuit, onRestart }) {
  const worldRef = useRef(initial);
  const analysisRef = useRef(null);
  const camRef = useRef({ x: 0, y: 0, zoom: 0 });
  const dirtyRef = useRef(true);
  const previewRef = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const handlesRef = useRef([]);
  const undoRef = useRef([]);
  const pendingRef = useRef(null);
  const strokeRef = useRef(null);
  const [, setV] = useState(0);
  const [tool, setTool] = useState("look");
  const [tray, setTray] = useState(null);
  const [speed, setSpeed] = useState(2);
  const [panel, setPanel] = useState(initial.decision ? { id: "decision" } : initial.t === 0 ? { id: "help" } : null);
  const [overlay, setOverlay] = useState("none");
  const [inspect, setInspect] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [saved, setSaved] = useState(false);
  const [goalOpen, setGoalOpen] = useState(true);
  const toastT = useRef(null);
  const w = worldRef.current;
  const groups = toolGroups(w.region);
  // handy for automated tests and debugging in the console
  if (typeof window !== "undefined") window.__lionMayor = { worldRef, camRef, setPanel };

  const refresh = useCallback(() => {
    analysisRef.current = analyze(worldRef.current);
    if (!worldRef.current.t) worldRef.current.stats.pop = analysisRef.current.pop;
    dirtyRef.current = true;
    setV((v) => v + 1);
  }, []);
  const toast = useCallback((m) => {
    setToastMsg(m);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToastMsg(null), 2800);
  }, []);
  const save = () => saveWorld(worldRef.current);
  const remember = (label) => {
    undoRef.current.push({ json: snapshot(worldRef.current), label });
    if (undoRef.current.length > 12) undoRef.current.shift();
  };
  const afterChange = () => {
    checkGoals(worldRef.current);
    save();
    refresh();
  };

  useEffect(() => {
    refresh();
    save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // clock
  const paused = speed === 0 || !!panel || !!w.gameOver;
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const world = worldRef.current;
      const before = world.news[0];
      stepMonth(world);
      if (world.news[0] && world.news[0] !== before) toast(world.news[0].text);
      if (world.election.justHeld) {
        saveCheckpoint(world);
        setPanel({ id: "result" });
      } else if (world.decision) setPanel({ id: "decision" });
      else if (world.reportReady != null) {
        setPanel({ id: "report", index: world.reportReady });
        world.reportReady = null;
      } else if (inSeason(world) && world.t === world.election.next - 6) setPanel({ id: "election" });
      save();
      replan();
      refresh();
    }, SPEEDS[speed].ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, speed]);

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && save();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  // ---------- pending actions ----------
  const setPending = (p) => {
    pendingRef.current = p;
    replan();
    refresh();
  };
  function replan() {
    const p = pendingRef.current;
    const world = worldRef.current;
    handlesRef.current = [];
    if (!p) {
      if (!strokeRef.current) previewRef.current = null;
      return;
    }
    if (p.kind === "road") {
      const layer = ROAD_TYPES[p.type].rail ? "rail" : "road";
      const sa = snapPoint(world, p.a.x, p.a.y, layer);
      if (p.stage === "start") {
        previewRef.current = { kind: "road", type: p.type, sa, stage: "start" };
        handlesRef.current = [{ id: "a", x: sa.x, y: sa.y }];
        return;
      }
      const sb = snapPoint(world, p.b.x, p.b.y, layer);
      if (p.mAuto) p.m = { x: (sa.x + sb.x) / 2, y: (sa.y + sb.y) / 2 };
      const C = { x: 2 * p.m.x - (sa.x + sb.x) / 2, y: 2 * p.m.y - (sa.y + sb.y) / 2 };
      const plan = planRoad(world, p.type, p.a, p.b, C);
      p.plan = plan;
      previewRef.current = { kind: "road", ...plan, stage: "end", bend: p.m };
      handlesRef.current = [
        { id: "a", x: plan.sa.x, y: plan.sa.y },
        { id: "b", x: plan.sb.x, y: plan.sb.y },
        { id: "m", x: p.m.x, y: p.m.y },
      ];
    } else if (p.kind === "struct") {
      p.plan = planStruct(world, p.type, p.at.x, p.at.y);
      previewRef.current = { kind: "struct", ...p.plan, type: p.type };
    } else if (p.kind === "unroad") {
      const s = world.segs.find((x) => x.id === p.seg);
      if (!s) {
        pendingRef.current = null;
        previewRef.current = null;
        return;
      }
      p.built = world.lots.filter((l) => l.seg === s.id && l.b).length;
      previewRef.current = { kind: "road", type: s.type, pts: segPts(world, s), ok: false, demolish: { lots: world.lots.filter((l) => l.seg === s.id).map((l) => l.id) } };
    } else if (p.kind === "select") {
      p.cost = bulldozeCost(world, p.sel);
      previewRef.current = { kind: "select", sel: p.sel };
    } else if (p.kind === "reclaim") {
      previewRef.current = { kind: "reclaim", circles: p.circles };
    }
  }

  const confirm = () => {
    const p = pendingRef.current;
    const world = worldRef.current;
    if (!p) return;
    const cost = p.kind === "reclaim" ? p.circles.filter((c) => c.ok).length * 120 : p.plan?.cost ?? p.cost ?? 0;
    if (!world.sandbox && cost > world.cash) {
      toast(`🚫 Not enough money: this costs ${fmtMoney(cost)}.`);
      return;
    }
    if (p.kind === "road" && p.plan?.ok) {
      remember(ALL_TOOLS[`road:${p.type}`].name);
      commitRoad(world, p.plan);
      toast(`${ALL_TOOLS[`road:${p.type}`].icon} Built for ${fmtMoney(p.plan.cost)}`);
      pendingRef.current = { kind: "road", type: p.type, stage: "start", a: { x: p.plan.sb.x, y: p.plan.sb.y } };
    } else if (p.kind === "struct" && p.plan?.ok) {
      remember(STRUCTS[p.type].name);
      commitStruct(world, p.plan);
      toast(`${STRUCTS[p.type].icon} ${STRUCTS[p.type].name} built for ${fmtMoney(p.plan.cost)}`);
      pendingRef.current = null;
    } else if (p.kind === "unroad") {
      remember("Remove road");
      removeRoad(world, p.seg);
      pendingRef.current = null;
    } else if (p.kind === "select") {
      remember("Bulldoze");
      const c = bulldozeCommit(world, p.sel);
      toast(`🚜 Cleared for ${fmtMoney(c)}`);
      pendingRef.current = null;
    } else if (p.kind === "reclaim") {
      const ok = p.circles.filter((c) => c.ok);
      if (!ok.length) return;
      remember("Reclaim");
      const c = reclaimCommit(world, ok);
      toast(`🏝️ New land for ${fmtMoney(c)}`);
      pendingRef.current = null;
    } else return;
    replan();
    afterChange();
  };

  const onTap = useCallback(
    (pt) => {
      const world = worldRef.current;
      const T = ALL_TOOLS[tool];
      setTray(null);
      if (!T || T.mode === "look") {
        const hit = hitTest(world, pt.x, pt.y);
        const info = describe(world, analysisRef.current, hit);
        setInspect(info ? { ...info, hit } : null);
        dirtyRef.current = true;
        return;
      }
      if (T.mode === "road") {
        const type = tool.slice(5);
        const p = pendingRef.current;
        if (!p || p.kind !== "road" || p.type !== type || p.stage === "end") setPending({ kind: "road", type, stage: "start", a: pt });
        else setPending({ ...p, stage: "end", b: pt, mAuto: true });
        return;
      }
      if (T.mode === "place") {
        setPending({ kind: "struct", type: T.struct, at: pt });
        return;
      }
      if (tool === "unroad") {
        const n = nearestSeg(world, pt.x, pt.y, null, 1.2);
        if (n) setPending({ kind: "unroad", seg: n.seg.id });
        else toast("Tap right on a road to remove it.");
        return;
      }
      if (tool === "renew") {
        const hit = hitTest(world, pt.x, pt.y);
        if (hit && (hit.kind === "kampong" || (hit.kind === "lot" && hit.l.b))) {
          const info = describe(world, analysisRef.current, hit);
          setPanel({ id: "renew", hit, info });
        } else toast("Tap an existing block, shophouse or kampong.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool]
  );

  const onHandle = useCallback((id, pt) => {
    const p = pendingRef.current;
    if (!p || p.kind !== "road" || !pt) return;
    if (id === "a") p.a = pt;
    if (id === "b") p.b = pt;
    if (id === "m") {
      p.m = pt;
      p.mAuto = false;
    }
    replan();
    dirtyRef.current = true;
    setV((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onBrush = useCallback(
    (phase, pt) => {
      const world = worldRef.current;
      const r = BRUSH_R[tool] || 1.5;
      const color = tool.startsWith("zone:") ? ZONE_TINT[tool.slice(5)] || "#ffffff" : tool === "bulldoze" ? "#ff5a5a" : tool === "reclaim" ? "#ffe9a8" : "#2fbf71";
      const st = strokeRef.current;
      if (phase === "hover") {
        previewRef.current = { ...(previewRef.current || {}), brush: { x: pt.x, y: pt.y, r, color } };
        dirtyRef.current = true;
        return;
      }
      if (phase === "start") {
        const keep = (tool === "bulldoze" && pendingRef.current?.kind === "select") || (tool === "reclaim" && pendingRef.current?.kind === "reclaim");
        strokeRef.current = { snap: snapshot(world), n: 0, cost: 0, skipped: 0, last: null };
        if (!keep && (tool === "bulldoze" || tool === "reclaim")) pendingRef.current = tool === "bulldoze" ? { kind: "select", sel: { lots: new Set(), structs: new Set(), trees: new Set() } } : { kind: "reclaim", circles: [] };
      }
      const s = strokeRef.current;
      if (!s) return;
      if (phase === "cancel") {
        if (s.n && (tool.startsWith("zone:") || tool === "trees")) {
          worldRef.current = restore(s.snap);
          worldRef.current.rev = world.rev + 1;
        }
        strokeRef.current = null;
        replan();
        refresh();
        return;
      }
      if (phase === "end") {
        if (s.n && (tool.startsWith("zone:") || tool === "trees")) {
          undoRef.current.push({ json: s.snap, label: ALL_TOOLS[tool].name });
          toast(tool === "trees" ? `🌴 Planted ${s.n} trees` : `${ALL_TOOLS[tool].icon} Zoned ${s.n} lots${s.cost ? ` for ${fmtMoney(s.cost)}` : ""}`);
          afterChange();
        } else if (s.skipped && tool.startsWith("zone:")) toast("Built lots keep their use. Use 🏗️ Renew to redevelop them.");
        strokeRef.current = null;
        const keepBrush = previewRef.current?.brush;
        replan();
        if (previewRef.current && keepBrush) previewRef.current.brush = keepBrush;
        refresh();
        return;
      }
      if (s.last && dist(s.last.x, s.last.y, pt.x, pt.y) < r * 0.35) return;
      s.last = pt;
      if (tool.startsWith("zone:")) {
        const res = paintZone(world, tool.slice(5), pt.x, pt.y, r);
        s.n += res.n;
        s.cost += res.cost;
        s.skipped += res.skipped;
      } else if (tool === "trees") s.n += plantTrees(world, pt.x, pt.y, r).n;
      else if (tool === "bulldoze") bulldozeSelect(world, pt.x, pt.y, r, pendingRef.current.sel);
      else if (tool === "reclaim") pendingRef.current.circles.push({ x: pt.x, y: pt.y, r, ok: reclaimOk(world, pt.x, pt.y, r) });
      replan();
      previewRef.current = { ...(previewRef.current || {}), brush: { x: pt.x, y: pt.y, r, color } };
      dirtyRef.current = true;
      if (tool.startsWith("zone:") || tool === "trees") world.rev++;
      setV((v) => v + 1);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool]
  );

  const undo = () => {
    const u = undoRef.current.pop();
    if (!u) return;
    const cur = worldRef.current.rev;
    worldRef.current = restore(u.json);
    worldRef.current.rev = cur + 1;
    pendingRef.current = null;
    replan();
    save();
    refresh();
    toast(`↶ Undid ${u.label}`);
  };

  const pickTool = (id) => {
    setTool(id);
    setTray(null);
    setInspect(null);
    pendingRef.current = null;
    strokeRef.current = null;
    replan();
    dirtyRef.current = true;
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (panel && !w.gameOver) setPanel(null);
      else if (pendingRef.current) setPending(null);
      else if (tray) setTray(null);
      else if (tool !== "look") pickTool("look");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const A = analysisRef.current;
  const T = ALL_TOOLS[tool];
  const p = pendingRef.current;
  const goal = nextGoal(w);
  const ap = Math.round(w.approval);
  const face = ap >= 65 ? "😄" : ap >= 50 ? "🙂" : ap >= 38 ? "😐" : "😟";
  const season = inSeason(w);
  const months = monthsToElection(w);
  const brushMode = T?.mode === "brush";
  const zoomBtn = (f) => {
    const s = sizeRef.current;
    zoomAt(camRef.current, s.width / 2, s.height / 2, f, s.width, s.height);
    dirtyRef.current = true;
  };

  let confirmUI = null;
  if (p && !(p.kind === "road" && p.stage === "start")) {
    let ok = true;
    let label = "";
    let note = null;
    if (p.kind === "road") {
      ok = !!p.plan?.ok;
      label = ok ? `✓ Build ${fmtMoney(p.plan.cost)}` : p.plan?.msg || "Can't build";
      note = ok ? p.plan.msg : null;
      if (ok && p.plan.demolish?.lots?.length) note = movedNote(w, p.plan.demolish.lots) || note;
    } else if (p.kind === "struct") {
      ok = !!p.plan?.ok;
      label = ok ? `✓ Build ${fmtMoney(p.plan.cost)}` : p.plan?.msg || "Can't build here";
      note = ok ? movedNote(w, p.plan.lots || []) || p.plan.msg : null;
    } else if (p.kind === "unroad") {
      label = "✓ Remove road";
      const s = w.segs.find((x) => x.id === p.seg);
      note = (s && movedNote(w, w.lots.filter((l) => l.seg === s.id).map((l) => l.id))) || (p.built ? `Demolishes ${p.built} building${p.built > 1 ? "s" : ""}` : null);
    } else if (p.kind === "select") {
      const n = p.sel.lots.size + p.sel.structs.size + p.sel.trees.size;
      ok = n > 0;
      label = ok ? `✓ Clear ${n} · ${fmtMoney(p.cost || 0)}` : "Paint over things to clear";
      note = ok ? movedNote(w, [...p.sel.lots]) : null;
    } else if (p.kind === "reclaim") {
      const n = p.circles.filter((c) => c.ok).length;
      ok = n > 0;
      label = ok ? `✓ Reclaim · ${fmtMoney(n * 120)}` : "Paint over sea next to land";
    }
    confirmUI = (
      <>
        <button onClick={() => setPending(null)} className="city-btn city-sticker shrink-0 rounded-full bg-[var(--card)] px-4 py-2 text-[15px] font-bold">
          Cancel
        </button>
        <button onClick={confirm} disabled={!ok} className="city-btn city-sticker max-w-full shrink-0 rounded-full bg-[var(--good)] px-4 py-2 text-[15px] font-bold text-white disabled:bg-[var(--muted)]">
          {label}
          {note && <span className="block text-[11px] font-semibold opacity-90">{note}</span>}
        </button>
      </>
    );
  }
  const hint = !T || T.mode === "look" ? "" : T.mode === "road" ? (p?.kind === "road" && p.stage === "end" ? "Drag ↔ to curve it, or A / B to move the ends" : p?.kind === "road" ? "Now tap where it ends" : "Tap where the road starts") : T.mode === "brush" ? "Paint with one finger · two fingers move the map" : T.mode === "place" ? "Tap beside a road to place it" : tool === "unroad" ? "Tap a road to remove it" : "Tap an old block or kampong";

  return (
    <div className="absolute inset-0">
      <MapView
        worldRef={worldRef}
        analysisRef={analysisRef}
        camRef={camRef}
        dirtyRef={dirtyRef}
        previewRef={previewRef}
        sizeRef={sizeRef}
        handlesRef={handlesRef}
        tool={tool}
        brush={brushMode}
        overlay={overlay}
        motion={settings.motion}
        selected={inspect?.hit ? { q: inspect.hit.q, x: inspect.hit.x, y: inspect.hit.y, r: inspect.hit.r } : null}
        onTap={onTap}
        onBrush={onBrush}
        onHandle={onHandle}
        onTouchStart={() => tray && setTray(null)}
      />

      <div className="city-hud-top pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col items-start gap-2">
          <div className="pointer-events-auto flex min-w-0 max-w-full items-center gap-1.5">
            <button onClick={() => setPanel({ id: "menu" })} aria-label="Menu" className="city-btn city-sticker flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--card)] text-xl">
              ☰
            </button>
            <div className="city-sticker city-noscrollbar flex min-w-0 items-stretch overflow-x-auto rounded-full bg-[var(--card)] text-[14px] font-bold tabular-nums">
              <span className="hidden items-center whitespace-nowrap px-3 md:flex">📅 {dateLabel(w)}</span>
              <Seg onClick={() => setPanel({ id: "finance" })} label={`Finances ${fmtMoney(w.cash)}`} bad={w.cash < 0}>
                💰 {fmtMoney(w.cash)}
              </Seg>
              <Seg onClick={() => setPanel({ id: "towns" })} label={`Population ${fmtNum(w.stats.pop || 0)}`}>
                👥 {fmtNum(w.stats.pop || 0)}
              </Seg>
              <Seg onClick={() => setPanel({ id: "towns" })} label={`Happiness ${ap}%`} bad={ap < 40}>
                {face} {ap}%
              </Seg>
            </div>
          </div>
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1.5">
            <button
              onClick={() => setPanel({ id: "election" })}
              className={`city-btn city-sticker whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-bold ${season ? "city-pulse bg-[var(--brand)] text-white" : "bg-[var(--card)]"}`}
            >
              🗳️ {season ? `Election season! Vote ${tToDate(w, w.election.next)}` : `Next election ${tToDate(w, w.election.next).split(" ")[1]} · ${yearsMonths(months)}`}
            </button>
            <button onClick={() => setPanel({ id: "rivals" })} aria-label="Mayors' league" className="city-btn city-sticker whitespace-nowrap rounded-full bg-[var(--card)] px-3 py-1.5 text-[13px] font-bold">
              📊 {w.yearly?.length ? `#${myRank(w)} of ${(w.rivals?.length || 0) + 1}` : "League"}
            </button>
            {w.crisis && (
              <button onClick={() => setPanel({ id: "crisis" })} className="city-btn city-sticker whitespace-nowrap rounded-full bg-[var(--bad)] px-3 py-1.5 text-[13px] font-bold text-white">
                {CRISES[w.crisis.id].icon} {CRISES[w.crisis.id].name.split(" ").slice(0, 3).join(" ")} · {Math.max(0, w.crisis.until - w.t)}m
              </button>
            )}
          </div>
          {inspect ? (
            <div className="city-card city-pop city-goal pointer-events-auto p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold leading-tight">
                  <span className="mr-1 text-xl">{inspect.icon}</span>
                  {inspect.title}
                </div>
                <button onClick={() => setInspect(null)} aria-label="Close details" className="city-btn h-8 w-8 shrink-0 rounded-full bg-[var(--soft)] text-sm font-bold">
                  ✕
                </button>
              </div>
              <ul className="mt-1 space-y-0.5 text-[13px] leading-snug text-[var(--muted)]">
                {inspect.lines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
              {inspect.renew && (
                <button onClick={() => setPanel({ id: "renew", hit: inspect.hit, info: inspect })} className="city-btn mt-2 rounded-full bg-[var(--brand)] px-3 py-1.5 text-[13px] font-bold text-white">
                  🏗️ Renew options
                </button>
              )}
            </div>
          ) : goal && goalOpen && !tray && tool === "look" ? (
            <div className="city-card city-pop city-goal pointer-events-auto p-2.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1" onClick={() => goal.deadline && setPanel({ id: "goals" })}>
                  <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--brand)]">
                    🎯 {goal.deadline ? `Objective · ${yearsMonths(Math.max(0, goal.deadline - w.t))} left` : `Next goal · ${dateLabel(w)}`}
                  </div>
                  <div className="font-bold leading-tight">{goal.text}</div>
                  <div className="city-clamp mt-0.5 text-[13px] leading-snug text-[var(--muted)]">{goal.hint}</div>
                </div>
                <button onClick={() => setGoalOpen(false)} aria-label="Hide goal" className="city-btn h-8 w-8 shrink-0 rounded-full bg-[var(--soft)] text-sm font-bold">
                  ✕
                </button>
              </div>
            </div>
          ) : goal && tool === "look" ? (
            <button onClick={() => setGoalOpen(true)} className="city-btn city-sticker pointer-events-auto rounded-full bg-[var(--card)] px-3 py-1.5 text-[13px] font-bold">
              🎯 Goal
            </button>
          ) : null}
        </div>
        <div className="pointer-events-none ml-auto flex shrink-0 flex-col items-end gap-2">
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button onClick={() => setSpeed(speed === 0 ? 2 : 0)} aria-label={speed === 0 ? "Play" : "Pause"} className={`city-btn city-sticker flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold ${speed === 0 ? "bg-[var(--warn)] text-white" : "bg-[var(--card)]"}`}>
              {speed === 0 ? "▶" : "❚❚"}
            </button>
            <button onClick={() => setSpeed(speed === 0 ? 1 : (speed % 3) + 1)} aria-label={`Speed: ${SPEEDS[speed].label}`} className="city-btn city-sticker flex h-11 min-w-[2.75rem] items-center justify-center rounded-full bg-[var(--card)] px-2 text-[15px] font-bold">
              {speed === 0 ? "1×" : SPEEDS[speed].icon}
            </button>
            <button onClick={() => setPanel({ id: "towns" })} aria-label="Towns" className="city-btn city-sticker flex h-11 w-11 items-center justify-center rounded-full bg-[var(--card)] text-xl">
              🏘️
            </button>
            <button onClick={() => (overlay !== "none" ? setOverlay("none") : setPanel({ id: "layers" }))} aria-label={overlay !== "none" ? "Back to normal map" : "Map layers"} title={overlay !== "none" ? "Back to normal map" : "Map layers"} className={`city-btn city-sticker flex h-11 w-11 items-center justify-center rounded-full text-xl ${overlay !== "none" ? "bg-[var(--brand)]" : "bg-[var(--card)]"}`}>
              🗺️
            </button>
            <button onClick={() => setPanel({ id: "news" })} aria-label="News" className="city-btn city-sticker hidden h-11 w-11 items-center justify-center rounded-full bg-[var(--card)] text-xl sm:flex">
              📰
            </button>
          </div>
          <Demand demand={w.demand} />
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

      {toastMsg && (
        <div role="status" className="pointer-events-none absolute left-1/2 top-[3.75rem] z-30 w-max max-w-[min(26rem,70vw)] -translate-x-1/2 rounded-2xl bg-[var(--ink)] px-3 py-2 text-center text-[14px] font-semibold text-white shadow-lg">
          {toastMsg}
        </div>
      )}

      <div className="city-hud-bottom pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2">
        {overlay !== "none" && (
            <div className="city-sticker pointer-events-auto flex max-w-full items-center gap-2 whitespace-nowrap rounded-full bg-[var(--card)] py-1 pl-3 pr-1 text-[13px] font-bold">
              {OVERLAYS[overlay].icon} {OVERLAYS[overlay].name}
              {overlay !== "towns" && (
                <>
                  : <span className="text-[var(--bad)]">poor</span>→<span className="text-[var(--good)]">good</span>
                </>
              )}
              <button onClick={() => setOverlay("none")} aria-label="Hide map layer" className="city-btn h-7 rounded-full bg-[var(--soft)] px-2.5">
                ✕ Normal map
              </button>
            </div>
          )}
        {tray && <Tray world={w} group={groups.find((g) => g.id === tray)} tool={tool} onPick={pickTool} />}
        {!tray && (
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 px-2">
            {undoRef.current.length > 0 && !confirmUI && (
              <button onClick={undo} className="city-btn city-sticker shrink-0 rounded-full bg-[var(--card)] px-3 py-2 text-[14px] font-bold">
                ↶ Undo
              </button>
            )}
            {T && T.mode !== "look" && (
              <div className="city-sticker flex min-w-0 max-w-full shrink-0 items-center gap-2 overflow-hidden rounded-full bg-[var(--card)] py-1 pl-3 pr-1">
                <span className="text-xl">{T.icon}</span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[14px] font-bold">
                    {T.name}
                    {T.cost ? ` · ${fmtMoney(T.cost)}${T.mode === "road" ? "/unit" : T.mode === "brush" ? " each" : ""}` : ""}
                  </span>
                  <span className="block truncate text-[12px] text-[var(--muted)]">{hint}</span>
                </span>
                <button onClick={() => pickTool("look")} aria-label="Stop" className="city-btn h-9 w-9 shrink-0 rounded-full bg-[var(--soft)] font-bold">
                  ✕
                </button>
              </div>
            )}
            {confirmUI}
          </div>
        )}
        <nav aria-label="Tools" className="city-sticker city-noscrollbar pointer-events-auto flex max-w-[calc(100%-1rem)] gap-1 overflow-x-auto rounded-full bg-[var(--card)] p-1">
          {groups.map((g) => {
            const cur = groups.find((gg) => gg.tools.some((t) => t.id === tool))?.id;
            const active = g.id === "look" ? tool === "look" && !tray : tray === g.id || (!tray && cur === g.id);
            return (
              <button
                key={g.id}
                onClick={() => (g.id === "look" ? pickTool("look") : setTray(tray === g.id ? null : g.id))}
                aria-expanded={g.id === "look" ? undefined : tray === g.id}
                className={`city-btn flex h-12 min-w-[3.5rem] shrink-0 flex-col items-center justify-center rounded-full px-2 leading-none ${active ? "bg-[var(--brand)] text-white" : ""}`}
              >
                <span className="text-xl">{g.id === cur && g.id !== "look" ? ALL_TOOLS[tool].icon : g.icon}</span>
                <span className="mt-0.5 text-[11px] font-bold">{g.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {panel?.id === "towns" && (
        <TownsPanel
          world={w}
          onClose={() => setPanel(null)}
          onShow={(t) => {
            lookAt(camRef, sizeRef, t.x, t.y);
            setOverlay("towns");
            setPanel(null);
          }}
        />
      )}
      {panel?.id === "election" && <ElectionPanel world={w} onClose={() => setPanel(null)} onChange={afterChange} toast={toast} />}
      {panel?.id === "result" && w.election.last && (
        <Panel title={`🗳️ ${w.election.last.year} election results`} onClose={() => setPanel(null)} closable={!w.gameOver}>
          <div className="text-center">
            <div className="text-5xl">{w.election.last.won ? "🏆" : "😬"}</div>
            <div className="text-2xl font-bold">{w.election.last.share}% voted for you</div>
            <div className="text-[var(--muted)]">{w.election.last.won ? `You're mayor for another 6 years!` : w.gameOver ? "You lost the election." : "You lost, but on Easy you stay on. Residents want change!"}</div>
          </div>
          <div className="mt-3 space-y-1.5">
            {w.election.last.results.map((r) => (
              <div key={r.name} className="flex items-center gap-2 text-[15px]">
                <span className="w-28 shrink-0 font-semibold">{r.name}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--soft)]">
                  <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.won ? "#2fbf71" : "#ff5a5a" }} />
                </div>
                <b className="w-12 text-right tabular-nums">{r.pct}%</b>
              </div>
            ))}
          </div>
          {!w.gameOver && (
            <button onClick={() => setPanel(null)} className="city-btn city-sticker mt-4 w-full rounded-2xl bg-[var(--brand)] py-2 font-bold text-white">
              Back to work
            </button>
          )}
        </Panel>
      )}
      {panel?.id === "finance" && <FinancePanel world={w} analysis={A} onChange={afterChange} onClose={() => setPanel(null)} />}
      {panel?.id === "decision" && w.decision && (
        <DecisionPanel
          world={w}
          onPick={(id) => {
            decide(w, id, (t) => {
              w.news.unshift({ t: w.t, date: dateLabel(w), text: t });
              toast(t);
            });
            setPanel(null);
            afterChange();
          }}
        />
      )}
      {panel?.id === "crisis" && <CrisisPanel world={w} onClose={() => setPanel(null)} />}
      {panel?.id === "rivals" && <RivalsPanel world={w} onClose={() => setPanel(null)} onReport={(i) => setPanel({ id: "report", index: i })} />}
      {panel?.id === "report" && <ReportPanel world={w} index={panel.index} onClose={() => setPanel(null)} />}
      {panel?.id === "news" && <NewsPanel world={w} onClose={() => setPanel(null)} />}
      {panel?.id === "goals" && <GoalsPanel world={w} analysis={A} onClose={() => setPanel(null)} />}
      {panel?.id === "help" && <HelpPanel onClose={() => setPanel(null)} />}
      {panel?.id === "renew" && (
        <RenewSheet
          world={w}
          target={panel.info}
          options={renewOptions(w, panel.hit)}
          onClose={() => setPanel(null)}
          onPick={(opt) => {
            remember("Renew");
            const r = applyRenew(w, panel.hit, opt);
            if (!r.ok) {
              undoRef.current.pop();
              toast(r.msg);
              return;
            }
            toast(`🏗️ Done: ${fmtMoney(r.cost)} spent`);
            setPanel(null);
            setInspect(null);
            afterChange();
          }}
        />
      )}
      {panel?.id === "layers" && (
        <Panel title="🗺️ Map layers" onClose={() => setPanel(null)}>
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
            setSaved(save());
            setTimeout(() => setSaved(false), 1500);
          }}
          onGoals={() => setPanel({ id: "goals" })}
          onFinance={() => setPanel({ id: "finance" })}
          onRivals={() => setPanel({ id: "rivals" })}
          onHelp={() => setPanel({ id: "help" })}
          onQuit={() => {
            save();
            onQuit();
          }}
        />
      )}
      {w.gameOver && panel?.id !== "result" && panel?.id !== "report" && (
        <Panel title="📋 Your time as mayor" onClose={() => {}} closable={false}>
          <p className="text-lg">{w.gameOver.text}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            You housed {fmtNum(w.stats.pop)} people by {dateLabel(w)}.
          </p>
          <FinalReport final={w.gameOver.final} />
          {w.reports?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {w.reports.map((r, i) => (
                <button key={i} onClick={() => setPanel({ id: "report", index: i })} className="city-btn rounded-full bg-[var(--soft)] px-3 py-1 text-[12px] font-bold">
                  {r.from}s: #{r.rank} · {r.grade.g}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => {
                w.gameOver = null;
                w.mode = "sandbox";
                w.endYear = null;
                w.cash = Math.max(w.cash, 20000);
                refresh();
              }}
              className="city-btn rounded-2xl bg-[var(--soft)] px-4 py-2 font-bold"
            >
              Keep playing in Sandbox
            </button>
            <button onClick={() => onRestart(newWorld({ region: w.region, difficulty: w.difficulty, mode: w.mode === "sandbox" ? "campaign" : w.mode }))} className="city-btn rounded-2xl bg-[var(--brand)] px-4 py-2 font-bold text-white">
              Try again
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}

// "1,200 residents displaced: 800 rehoused, 400 to the queue"
function movedNote(w, lotIds) {
  const P = lotIds?.length ? clearPreview(w, lotIds) : null;
  if (!P) return null;
  const re = P.same + P.other;
  return `🚚 ${fmtNum(P.n)} must move: ${fmtNum(re)} rehoused${P.queue ? `, ${fmtNum(P.queue)} to queue` : ""}${P.leave ? `, ${fmtNum(P.leave)} leave` : ""}`;
}

function Seg({ children, onClick, label, bad }) {
  return (
    <button onClick={onClick} aria-label={label} className={`city-btn flex items-center whitespace-nowrap border-l-2 border-[var(--ink)]/10 px-3 py-2 first:border-l-0 ${bad ? "bg-[var(--bad-bg)] text-[var(--bad)]" : ""}`}>
      {children}
    </button>
  );
}

function Tray({ world, group, tool, onPick }) {
  return (
    <div className="city-card city-pop city-noscrollbar pointer-events-auto flex max-w-[calc(100%-1rem)] gap-2 overflow-x-auto p-2">
      {group.tools.map((t) => {
        const locked = !isUnlocked(world, t.year);
        const poor = t.cost > world.cash;
        return (
          <button
            key={t.id}
            disabled={locked}
            onClick={() => onPick(t.id)}
            className={`city-btn flex w-[7.25rem] shrink-0 flex-col items-center rounded-2xl border-2 px-2 py-2 text-center ${tool === t.id ? "border-[var(--brand)] bg-[var(--bad-bg)]" : "border-[var(--ink)]/10 bg-[var(--soft)]"} ${locked ? "opacity-50" : ""}`}
          >
            <span className="text-3xl leading-none">{t.icon}</span>
            <span className="mt-1 text-[13px] font-bold leading-tight">{t.name}</span>
            <span className={`text-[12px] font-bold tabular-nums ${poor ? "text-[var(--bad)]" : "text-[var(--muted)]"}`}>{locked ? `🔒 ${t.year}` : t.cost ? fmtMoney(t.cost) : ""}</span>
          </button>
        );
      })}
    </div>
  );
}

function Demand({ demand }) {
  const bars = [
    { k: "hdb", label: "H", color: "#2fd06f", name: "HDB flats" },
    { k: "pte", label: "P", color: "#f45fae", name: "private homes" },
    { k: "com", label: "C", color: "#4b9bff", name: "shops & offices" },
    { k: "ind", label: "I", color: "#ffb020", name: "factories" },
  ];
  return (
    <div className="city-sticker pointer-events-auto flex items-end gap-1 rounded-2xl bg-[var(--card)] px-2 py-1" role="img" aria-label={`Demand: ${bars.map((b) => `${b.name} ${Math.round((demand?.[b.k] || 0) * 100)}`).join(", ")}`}>
      {bars.map((b) => {
        const v = Math.max(-1, Math.min(1, demand?.[b.k] || 0));
        return (
          <div key={b.k} className="flex flex-col items-center" title={`Demand for ${b.name}`}>
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
