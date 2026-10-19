import React, { useCallback, useEffect, useRef, useState } from "react";
import MapView, { zoomAt, lookAt } from "./MapView.jsx";
import { TownsPanel, ElectionPanel, RenewSheet, NewsPanel, GoalsPanel, HelpPanel, MenuPanel, Panel, yearsMonths } from "./panels.jsx";
import { FinancePanel, DecisionPanel, CrisisPanel, ReportPanel, RivalsPanel, FinalReport, myRank, SentosaPanel, PlanPanel, ProjectPanel, ElectionReport, ChroniclePanel, ProgrammesPanel, HistoryPanel } from "./panels2.jsx";
import { situation, setFantasy } from "./fantasy.js";
import { decide, CRISES } from "./events.js";
import { REGIONS, REGION_ORDER } from "./regions.js";
import { DIFFICULTY, ALL_TOOLS, STRUCTS, ROAD_TYPES, toolGroups } from "./defs.js";
import {
  saveCheckpoint, loadCheckpoint, checkpointInfo, savePrevote, loadPrevote, prevoteInfo,
  newWorld, planRoad, commitRoad, snapPoint, planStruct, commitStruct, removeRoad, nearestSeg, segPts, paintZone, plantTrees,
  bulldozeSelect, bulldozeCost, bulldozeCommit, reclaimOk, reclaimCommit, renewOptions, applyRenew, snapshot, restore, saveWorld, loadWorld, savedCampaigns, deleteCampaign, clearPreview,
} from "./world.js";
import { stepMonth, analyze, dateLabel, fmtMoney, fmtNum, isUnlocked, nextGoal, checkGoals, describe, inSeason, monthsToElection, tToDate, ensureWorld, MODES, debtLimit, electionAnalysis, toolInfo, estimateStruct, refurbish, advice, demandByTown } from "./sim.js";
import { OVERLAYS, ZONE_TINT } from "./render.js";

// standalone builds (itch.io) have no other pages to link to
const STANDALONE = typeof __STANDALONE__ !== "undefined" && __STANDALONE__;
import { inQuad, dist } from "./geom.js";

const SPEEDS = [
  { ms: 0, icon: "❚❚", label: "Paused" },
  { ms: 3000, icon: "1×", label: "Slow" },
  { ms: 1500, icon: "2×", label: "Normal" },
  { ms: 600, icon: "3×", label: "Fast" },
];
const SETTINGS_KEY = "lion-city-mayor-settings";
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// last spot estimate, so moving the camera doesn't recompute it
const estCache = { key: null, v: null };

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
  const [askDelete, setAskDelete] = useState(null);
  const [, bump] = useState(0);
  const campaigns = savedCampaigns();
  const saved = campaigns.find((c) => c.region === region) || null;
  const make = () => onStart(newWorld({ region, difficulty, mode }));
  return (
    <div className="city-title city-scroll absolute inset-0 overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center gap-3 px-4 py-4 landscape:flex-row landscape:gap-5 lg:gap-6">
        <div className="text-center text-white landscape:w-60 landscape:shrink-0 landscape:text-left lg:w-72">
          <div className="city-bob inline-block text-5xl">🦁</div>
          <h1 className="city-title-text text-4xl font-bold leading-none landscape:text-3xl lg:text-4xl">Lion City Mayor</h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] font-medium text-white/95 lg:mx-0">1965. A new nation, short of homes, jobs and land. Plan one region of Singapore through a century of growth, crises and elections.</p>
          <p className="mx-auto mt-1 max-w-md text-[12px] text-white/80 lg:mx-0">The mayor here is a fictional role combining planning, housing and town-council powers. Singapore's real mayors lead Community Development Councils.</p>
          {!STANDALONE && <a href="city.html" className="mt-2 inline-block text-[13px] font-semibold text-white underline">Play the classic island-wide grid game instead</a>}
        </div>
        <div className="city-card w-full max-w-xl space-y-2.5 p-3">
          {campaigns.length > 0 && (
            <div>
              <div className="mb-1 text-sm font-bold">Your campaigns</div>
              <div className="space-y-1.5">
                {campaigns.map((c, k) => {
                  const chk = checkpointInfo(c.region);
                  return (
                    <div key={c.region} className="flex items-stretch gap-1.5">
                      <button
                        onClick={() => {
                          const w = loadWorld(c.region);
                          if (w) onStart(w);
                        }}
                        className={`city-btn city-sticker min-w-0 flex-1 rounded-2xl px-3 py-1.5 text-left font-bold ${k === 0 ? "bg-[var(--good)] text-white" : "bg-[var(--soft)]"}`}
                      >
                        <span className="block truncate text-[15px]">
                          ▶ {REGIONS[c.region]?.icon} {c.name}
                        </span>
                        <span className={`block text-[12px] font-semibold ${k === 0 ? "text-white/90" : "text-[var(--muted)]"}`}>
                          {MONTH_NAMES[c.month]} {c.year} · {fmtNum(c.pop)} residents · {MODES[c.mode]?.name || "Campaign"}
                          {c.over ? " · game over" : ""}
                        </span>
                      </button>
                      {chk && (
                        <button
                          onClick={() => {
                            const w = loadCheckpoint(c.region);
                            if (w) onStart(w);
                          }}
                          title={`Go back to just after the ${chk.year} election`}
                          aria-label={`Go back to just after the ${chk.year} election`}
                          className="city-btn shrink-0 rounded-2xl bg-[var(--soft)] px-2.5 text-[12px] font-bold leading-tight"
                        >
                          ↩<span className="block">{chk.year}</span>
                        </button>
                      )}
                      {askDelete === c.region ? (
                        <button
                          onClick={() => {
                            deleteCampaign(c.region);
                            setAskDelete(null);
                            bump((v) => v + 1);
                          }}
                          className="city-btn shrink-0 rounded-2xl bg-[var(--bad)] px-2.5 text-[12px] font-bold text-white"
                        >
                          Delete?
                        </button>
                      ) : (
                        <button onClick={() => setAskDelete(c.region)} aria-label={`Delete ${c.name} campaign`} className="city-btn shrink-0 rounded-2xl bg-[var(--soft)] px-2.5 text-[15px]">
                          🗑
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 text-[12px] text-[var(--muted)]">Each region keeps its own campaign, so you can jump between them. ↩ goes back to just after that region's last election win.</div>
            </div>
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
                    {campaigns.some((c) => c.region === id) && <span className="ml-auto shrink-0 rounded-full bg-[var(--good)] px-1.5 text-[10px] font-bold text-white">saved</span>}
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
              <div className="font-bold text-[var(--bad)]">This replaces your {saved?.name} campaign ({saved?.year}). Your other regions are kept.</div>
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
                🆕 {saved ? "Restart" : "Become mayor of"} {REGIONS[region].short}
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
  const projRef = useRef(null); // chosen landmark type and name
  const [, setV] = useState(0);
  const [tool, setTool] = useState("look");
  const [tray, setTray] = useState(null);
  const [speed, setSpeed] = useState(1);
  const lastSpeed = useRef(1); // ▶ resumes at the speed you were using
  const [panel, setPanel] = useState(initial.decision ? { id: "decision" } : initial.t === 0 && !initial.planned ? { id: "plan" } : null);
  const [overlay, setOverlay] = useState("none");
  const [inspect, setInspect] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [infoOpen, setInfoOpen] = useState(true);
  const [saved, setSaved] = useState(false);
  const [goalOpen, setGoalOpen] = useState(true);
  const toastT = useRef(null);
  const w = worldRef.current;
  const groups = toolGroups(w.region, w);
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
    toastT.current = setTimeout(() => setToastMsg(null), 3200);
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
      // a year before polling day, keep a save so a lost election can be replayed
      if (world.t === world.election.next - 12) savePrevote(world);
      // news is for reading later: the 📰 button counts it, no pop-up

      if (world.election.justHeld) {
        // only keep a checkpoint you'd want to go back to
        if (!world.gameOver) saveCheckpoint(world);
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
    const bigProject = p.kind === "struct" && STRUCTS[p.type].landmark;
    if (!world.sandbox && cost > 0 && world.cash < 0) {
      toast("🚫 You're in debt: roads, zoning, services and landmarks are frozen until your balance is positive again.");
      return;
    }
    if (!world.sandbox && cost > world.cash) {
      if (!bigProject) {
        toast(`🚫 Insufficient funds: ${fmtMoney(cost)} required.`);
        return;
      }
      if (world.cash - cost < -debtLimit(world) * 0.8) {
        toast(`🏦 That exceeds your borrowing limit (about ${fmtMoney(debtLimit(world) * 0.8)}). Build up reserves first.`);
        return;
      }
      if (!p.debtOk) {
        setPanel({ id: "debt", cost });
        return;
      }
    }
    if (p.kind === "road" && p.plan?.ok) {
      remember(ALL_TOOLS[`road:${p.type}`].name);
      commitRoad(world, p.plan);
      toast(p.plan.underground ? `🚧 Tunnelling started for ${fmtMoney(p.plan.cost)}: trains run in 12–24 months` : `${ALL_TOOLS[`road:${p.type}`].icon} Built for ${fmtMoney(p.plan.cost)}`);
      pendingRef.current = { kind: "road", type: p.type, stage: "start", a: { x: p.plan.sb.x, y: p.plan.sb.y } };
    } else if (p.kind === "struct" && p.plan?.ok) {
      remember(STRUCTS[p.type].name);
      const name = projRef.current?.type === p.type ? projRef.current.name : null;
      const st = commitStruct(world, p.plan, { name });
      const nm = st.name || STRUCTS[p.type].name;
      toast(st.state === "build" ? `🏗️ Work starts on ${nm}: opens ${tToDate(world, st.until)} (${fmtMoney(p.plan.cost)})` : `${STRUCTS[p.type].icon} ${nm} built for ${fmtMoney(p.plan.cost)}`);
      pendingRef.current = null;
      if (STRUCTS[p.type].landmark) {
        projRef.current = null;
        pickTool("look");
      }
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
        if (n && ROAD_TYPES[n.seg.type].fixed) toast("🚂 That's the railway: it isn't yours to remove.");
        else if (n) setPending({ kind: "unroad", seg: n.seg.id });
        else toast("Tap right on a road to remove it.");
        return;
      }
      if (tool === "renew") {
        const hit = hitTest(world, pt.x, pt.y);
        if (hit && (hit.kind === "kampong" || (hit.kind === "lot" && hit.l.b))) {
          const info = describe(world, analysisRef.current, hit);
          setPanel({ id: "renew", hit, info });
        } else if (hit?.kind === "struct") {
          const info = describe(world, analysisRef.current, hit);
          setInspect(info ? { ...info, hit } : null);
        } else toast("Tap an existing block, shophouse, kampong or service.");
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
      if (phase === "start" && world.cash < 0 && !world.sandbox && (tool.startsWith("zone:") || tool === "trees" || tool === "reclaim")) {
        toast("🚫 You're in debt: zoning and building are frozen until your balance is positive again.");
        strokeRef.current = null;
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
        if (res.blocked && !s.blockedShown) {
          s.blockedShown = true;
          toast(`🚫 ${res.blocked}. Change its purpose in 🏘️ Towns.`);
        }
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

  const pickTool = (id, direct) => {
    const T0 = ALL_TOOLS[id];
    setInfoOpen(true);
    // landmarks and malls start with a project screen: name, kind, cost
    if (!direct && (T0?.mode === "project" || T0?.landmark)) {
      setTray(null);
      setPanel({ id: "project", tool: id });
      return;
    }
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
  const tip = advice(w, A);
  const ap = Math.round(w.approval);
  const unread = w.news.filter((n) => n.t >= (w.newsSeen ?? 0)).length;
  const recentFin = (w.fin || []).slice(-6);
  // regular income minus running costs plus land/flat sales, averaged
  const netMo = recentFin.length ? recentFin.reduce((a, f) => a + f.r - f.e, 0) / recentFin.length : 0;
  const ago = w.history[w.history.length - 7];
  const apDelta = ago ? ap - ago.approval : 0;
  const face = ap >= 65 ? "😄" : ap >= 50 ? "🙂" : ap >= 38 ? "😐" : "😟";
  const season = inSeason(w);
  const months = monthsToElection(w);
  const brushMode = T?.mode === "brush";
  const zoomBtn = (f) => {
    const s = sizeRef.current;
    zoomAt(camRef.current, s.width / 2, s.height / 2, f, s.width, s.height);
    dirtyRef.current = true;
  };

  // what the selected tool does, or what this building would do right here
  let info = null;
  if (T && T.mode !== "look") {
    if (p?.kind === "struct" && p.plan?.ok) {
      const key = `${w.rev}:${p.type}:${p.plan.x.toFixed(2)}:${p.plan.y.toFixed(2)}`;
      if (estCache.key !== key) {
        estCache.key = key;
        estCache.v = estimateStruct(w, { ...p.plan, type: p.type });
      }
      if (estCache.v) info = { title: `${STRUCTS[p.type].icon} Here in ${estCache.v.town}`, items: estCache.v.items, note: "Ranges: each building turns out 75–125% as effective." };
    } else {
      const ti = toolInfo(w, T.struct ? { ...T, struct: p?.type || T.struct } : T);
      if (ti && (ti.tip || ti.items.length)) info = { title: `${T.icon} ${T.name}`, tip: ti.tip, items: ti.items, note: ti.note };
    }
  }
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
      note = ok ? [p.plan.town != null ? `📍 In ${w.towns[p.plan.town].name}` : null, movedNote(w, p.plan.lots || []) || p.plan.msg].filter(Boolean).join(" · ") : null;
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
  // ways to carry on after losing an election
  const lostActions = () => {
    const pre = prevoteInfo(w.region);
    const chk = checkpointInfo(w.region);
    const btn = "city-btn city-sticker rounded-2xl px-3 py-2.5 text-left font-bold";
    return [
      pre && pre.name === w.name && pre.seed === w.seed && pre.year <= w.year && (
        <button key="pre" onClick={() => { const nw = loadPrevote(w.region); if (nw) onRestart(nw); }} className={`${btn} bg-[var(--brand)] text-white`}>
          ↩ Replay the year before the vote
          <span className="block text-[12px] font-semibold opacity-90">From {MONTH_NAMES[pre.month]} {pre.year}: fix what the report card says</span>
        </button>
      ),
      chk && chk.year < w.election.last.year && (
        <button key="chk" onClick={() => { const nw = loadCheckpoint(w.region); if (nw) onRestart(nw); }} className={`${btn} bg-[var(--soft)]`}>
          ↩ Go back to just after the {chk.year} election
          <span className="block text-[12px] font-semibold text-[var(--muted)]">Replay the whole term</span>
        </button>
      ),
      <button
        key="sand"
        onClick={() => {
          w.gameOver = null;
          w.mode = "sandbox";
          w.endYear = null;
          w.cash = Math.max(w.cash, 20000);
          setPanel(null);
          refresh();
        }}
        className={`${btn} bg-[var(--soft)]`}
      >
        🏖️ Keep playing in Sandbox
        <span className="block text-[12px] font-semibold text-[var(--muted)]">Stay on as mayor; you can't be voted out</span>
      </button>,
      <button key="new" onClick={() => onRestart(newWorld({ region: w.region, difficulty: w.difficulty, mode: w.mode === "sandbox" ? "campaign" : w.mode }))} className={`${btn} bg-[var(--soft)]`}>
        🆕 Start a new game
        <span className="block text-[12px] font-semibold text-[var(--muted)]">Same region, from 1965</span>
      </button>,
    ].filter(Boolean);
  };
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
        paused={paused}
        selected={inspect?.hit ? { q: inspect.hit.q, x: inspect.hit.x, y: inspect.hit.y, r: inspect.hit.r, cover: inspect.hit.kind === "struct" && STRUCTS[inspect.hit.s.type].r && STRUCTS[inspect.hit.s.type].cover ? { x: inspect.hit.s.x, y: inspect.hit.s.y, r: STRUCTS[inspect.hit.s.type].r, kind: STRUCTS[inspect.hit.s.type].cover } : null } : null}
        onTap={onTap}
        onBrush={onBrush}
        onHandle={onHandle}
        onTouchStart={() => tray && setTray(null)}
      />

      <div className="city-hud-top pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 landscape:flex-nowrap max-[480px]:flex-nowrap">
        <div className="flex min-w-0 flex-col items-start gap-2 landscape:flex-1 max-[480px]:flex-1">
          <div className="pointer-events-auto flex min-w-0 max-w-full items-center gap-1.5">
            <button onClick={() => setPanel({ id: "menu" })} aria-label="Menu" className="city-btn city-sticker flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--card)] text-xl">
              ☰
            </button>
            <div className="city-sticker city-noscrollbar flex min-w-0 items-stretch overflow-x-auto rounded-full bg-[var(--card)] text-[14px] font-bold tabular-nums">
              <span className="hidden items-center whitespace-nowrap px-3 md:flex">📅 {dateLabel(w)}</span>
              <Seg onClick={() => setPanel({ id: "finance" })} label={`Finances ${fmtMoney(w.cash)}, ${netMo >= 0 ? "gaining" : "losing"} ${fmtMoney(Math.abs(netMo))} a month`} bad={w.cash < 0}>
                💰 {fmtMoney(w.cash)}
                {w.fin?.length > 2 && <span className={`ml-1 text-[11px] max-[480px]:hidden ${netMo >= 0 ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>{netMo >= 0 ? "▲" : "▼"}{fmtMoney(Math.abs(netMo))}/mo</span>}
              </Seg>
              <Seg onClick={() => setPanel({ id: "towns" })} label={`Population ${fmtNum(w.stats.pop || 0)}`}>
                👥 {fmtNum(w.stats.pop || 0)}
              </Seg>
              <Seg onClick={() => setPanel({ id: "towns" })} label={`Happiness ${ap}%${apDelta ? `, ${apDelta > 0 ? "up" : "down"} ${Math.abs(apDelta)} in 6 months` : ""}`} bad={ap < 40}>
                {face} {ap}%
                {apDelta !== 0 && <span className={`ml-1 text-[11px] ${apDelta > 0 ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>{apDelta > 0 ? "▲" : "▼"}{Math.abs(apDelta)}</span>}
              </Seg>
            </div>
          </div>
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1.5">
            <span className="city-sticker whitespace-nowrap rounded-full bg-[var(--card)] px-3 py-1.5 text-[13px] font-bold tabular-nums md:hidden">📅 {dateLabel(w)}</span>
            <button
              onClick={() => setPanel({ id: "election" })}
              className={`city-btn city-sticker whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-bold ${season ? "city-pulse bg-[var(--brand)] text-white" : "bg-[var(--card)]"}`}
            >
              🗳️ {season ? `Election season · polls ${tToDate(w, w.election.next)}` : (
                <>
                  <span className="hidden lg:inline">Next election </span>
                  {`${tToDate(w, w.election.next).split(" ")[1]} · ${yearsMonths(months)}`}
                </>
              )}
            </button>
            <button onClick={() => setPanel({ id: "rivals" })} aria-label="Regional rankings" className="city-btn city-sticker whitespace-nowrap rounded-full bg-[var(--card)] px-3 py-1.5 text-[13px] font-bold">
              📊 {w.yearly?.length ? `#${myRank(w)} of ${(w.rivals?.length || 0) + 1}` : "Rankings"}
            </button>
            {w.sentosa && (
              <button onClick={() => setPanel({ id: "sentosa" })} className="city-btn city-sticker whitespace-nowrap rounded-full bg-[var(--card)] px-3 py-1.5 text-[13px] font-bold">
                🏝️ {w.year < 1972 ? "Blakang Mati" : `Sentosa ${fmtNum(w.sentosa.visitors)}/mo`}
              </button>
            )}
            {w.fantasy?.state && (w.fantasy.on || situation(w).length > 0) && (
              <button onClick={() => setPanel({ id: "chronicle" })} aria-label="Fantasy chronicle" className="city-btn city-sticker whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-bold text-white" style={{ background: "#7048e8" }}>
                🐉 {situation(w).length > 1 ? situation(w).slice(0, 4).map((x) => x.icon).join("") : situation(w).length ? situation(w)[0].icon + " " + situation(w)[0].short : "Fantasy"}
              </button>
            )}
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
              {inspect.refurb && (
                <button
                  onClick={() => {
                    const s0 = inspect.hit?.s;
                    if (!s0) return;
                    if (w.cash < 0 && !w.sandbox) return toast("🚫 You're in debt: refurbishing is frozen until your balance is positive again.");
                    const c = refurbish(w, s0);
                    toast(`🔧 Refurbished for ${fmtMoney(c)}: working at full strength again`);
                    setInspect(null);
                    afterChange();
                  }}
                  className="city-btn mt-2 rounded-full bg-[var(--brand)] px-3 py-1.5 text-[13px] font-bold text-white"
                >
                  🔧 Refurbish · {fmtMoney(inspect.refurb.cost)}
                </button>
              )}
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
                  {tip && (
                    <div className="mt-1 rounded-lg px-2 py-1 text-[12.5px] font-semibold leading-snug" style={{ background: "rgba(255,90,95,0.12)", color: "var(--ink)" }}>
                      {tip.icon} {tip.text}
                    </div>
                  )}
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
          <div className="pointer-events-auto flex items-center gap-1.5 max-[480px]:flex-col">
            <button
              onClick={() => {
                if (speed === 0) setSpeed(lastSpeed.current || 1);
                else {
                  lastSpeed.current = speed;
                  setSpeed(0);
                }
              }} aria-label={speed === 0 ? "Play" : "Pause"} className={`city-btn city-sticker flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold ${speed === 0 ? "bg-[var(--warn)] text-white" : "bg-[var(--card)]"}`}>
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
            <button onClick={() => setPanel({ id: "news" })} aria-label={`News${unread ? `, ${unread} new` : ""}`} className="city-btn city-sticker relative flex h-11 w-11 items-center justify-center rounded-full bg-[var(--card)] text-xl">
              {unread > 0 && (
                <span key={unread} className="city-badge-pop absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--brand)] px-1 text-[11px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
              📰
            </button>
          </div>
          <Demand demand={w.demand} onClick={() => setPanel({ id: "demand" })} />
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
        <button
          role="status"
          onClick={() => {
            setToastMsg(null);
            setPanel({ id: "news" });
          }}
          className="city-clamp absolute left-1/2 top-[3.75rem] z-30 w-max max-w-[min(22rem,72vw)] -translate-x-1/2 rounded-full px-3 py-1 text-center text-[12.5px] font-semibold leading-snug text-white shadow-lg"
          style={{ background: "rgba(47,43,74,0.94)" }}
        >
          {toastMsg}
        </button>
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
        {!tray && info && infoOpen && (
          <div className="city-card pointer-events-auto relative mx-2 max-h-[34vh] w-[min(34rem,calc(100%-1rem))] overflow-y-auto px-3 py-2 text-[12.5px] leading-snug">
            <button onClick={() => setInfoOpen(false)} aria-label="Hide building info" className="city-btn absolute right-1.5 top-1.5 h-7 w-7 rounded-full bg-[var(--soft)] text-[12px] font-bold">
              ✕
            </button>
            <div className="pr-8 text-[13.5px] font-bold">{info.title}</div>
            {info.tip && <div className="text-[var(--muted)]">{info.tip}</div>}
            {info.items.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {info.items.map((e, i) => (
                  <span key={i} className="rounded-md border px-1.5 py-0.5 font-semibold" style={{ borderColor: e.good ? "rgba(47,191,113,0.5)" : "rgba(255,90,90,0.45)", color: e.good ? "var(--good)" : "var(--bad)" }}>
                    {e.t}
                  </span>
                ))}
              </div>
            )}
            {info.note && <div className="mt-1 text-[11.5px] text-[var(--muted)]">{info.note}</div>}
          </div>
        )}
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
                {info && !infoOpen && (
                  <button onClick={() => setInfoOpen(true)} aria-label="What does this do?" className="city-btn h-9 w-9 shrink-0 rounded-full bg-[var(--soft)] font-bold">
                    ⓘ
                  </button>
                )}
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
                className={`city-btn flex h-12 min-w-[3.5rem] shrink-0 flex-col items-center justify-center rounded-full px-2 leading-none max-[420px]:min-w-[2.9rem] max-[420px]:px-1 ${active ? "bg-[var(--brand)] text-white" : ""}`}
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
          onChange={afterChange}
          toast={toast}
          onClose={() => setPanel(null)}
          onShow={(t) => {
            lookAt(camRef, sizeRef, t.x, t.y);
            setOverlay("towns");
            setPanel(null);
          }}
        />
      )}
      {panel?.id === "election" && <ElectionPanel world={w} onClose={() => setPanel(null)} onChange={afterChange} toast={toast} onReport={(i) => setPanel({ id: "vote", index: i })} />}
      {panel?.id === "result" && w.election.last && (
        <Panel title={`🗳️ ${w.election.last.year} election results`} onClose={() => setPanel(null)} closable={!w.gameOver}>
          <div className="text-center">
            <div className="text-5xl">{w.election.last.won ? "🏆" : "😬"}</div>
            <div className="text-2xl font-bold">{w.election.last.share}% voted for you</div>
            <div className="text-[var(--muted)]">{w.election.last.won ? `You remain mayor for another 6 years.` : w.gameOver ? "You lost the election." : "You lost, but on Easy you stay on. Residents want change."}</div>
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
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => setPanel({ id: "vote" })} className={`city-btn city-sticker flex-1 rounded-2xl py-2 font-bold ${w.gameOver ? "bg-[var(--brand)] text-white" : "bg-[var(--soft)]"}`}>
              📋 {w.election.last.won ? "Why did they vote for me?" : "Why did I lose? See the report card"}
            </button>
            {!w.gameOver && (
              <button onClick={() => setPanel(null)} className="city-btn city-sticker flex-1 rounded-2xl bg-[var(--brand)] py-2 font-bold text-white">
                Back to work
              </button>
            )}
          </div>
        </Panel>
      )}
      {panel?.id === "vote" && (
        <ElectionReport
          world={w}
          rec={panel.index != null ? w.election.history[panel.index] : w.election.last && { ...w.election.last, analysis: w.election.last.analysis || electionAnalysis(w, A) }}
          onClose={() => setPanel(null)}
          actions={w.gameOver && panel.index == null ? lostActions() : null}
        />
      )}
      {panel?.id === "finance" && <FinancePanel world={w} analysis={A} onChange={afterChange} onClose={() => setPanel(null)} onProgrammes={() => setPanel({ id: "programmes" })} />}
      {panel?.id === "programmes" && (
        <ProgrammesPanel
          world={w}
          analysis={A}
          onChange={afterChange}
          onClose={() => setPanel(null)}
          push={(t) => {
            w.news.unshift({ t: w.t, date: dateLabel(w), text: t });
            toast(t);
          }}
        />
      )}
      {panel?.id === "project" && (
        <ProjectPanel
          world={w}
          toolId={panel.tool}
          onClose={() => setPanel(null)}
          onChoose={(type, name) => {
            projRef.current = { type, name };
            setPanel(null);
            pickTool(`s:${type}`, true);
            toast(`📍 Tap beside a road to place ${name}`);
          }}
        />
      )}
      {panel?.id === "debt" && (
        <Panel title="💸 Go into debt?" onClose={() => setPanel(null)}>
          <p className="text-[15px] leading-snug">
            This costs <b>{fmtMoney(panel.cost)}</b> but you only have <b>{fmtMoney(w.cash)}</b>. If you go ahead your balance will be <b className="text-[var(--bad)]">{fmtMoney(w.cash - panel.cost)}</b>.
          </p>
          <ul className="mt-2 space-y-1 text-[14px]">
            <li>🏦 You'll pay about {fmtMoney(Math.max(0, panel.cost - w.cash) * 0.006)} a month in interest.</li>
            <li>🚫 Roads, zoning, services and other landmarks are frozen until your balance is positive.</li>
            <li>⚠️ If debt passes {fmtMoney(-debtLimit(w))}, the government replaces you (Normal and Hard).</li>
          </ul>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setPanel(null)} className="city-btn flex-1 rounded-2xl bg-[var(--soft)] py-2 font-bold">
              Not now
            </button>
            <button
              onClick={() => {
                if (pendingRef.current) pendingRef.current.debtOk = true;
                setPanel(null);
                confirm();
              }}
              className="city-btn city-sticker flex-1 rounded-2xl bg-[var(--brand)] py-2 font-bold text-white"
            >
              Borrow and build
            </button>
          </div>
        </Panel>
      )}
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
      {panel?.id === "history" && <HistoryPanel world={w} onClose={() => setPanel(null)} />}
      {panel?.id === "chronicle" && (
        <ChroniclePanel
          world={w}
          onClose={() => setPanel(null)}
          onToggle={() => {
            setFantasy(w, !w.fantasy?.on);
            toast(w.fantasy.on ? "🐉 Fantasy Mode is on. Anything can happen now..." : "📅 No new fantasy stories will start. What already happened stays.");
            afterChange();
          }}
        />
      )}
      {panel?.id === "sentosa" && <SentosaPanel world={w} analysis={A} onChange={afterChange} onClose={() => setPanel(null)} />}
      {panel?.id === "rivals" && <RivalsPanel world={w} onClose={() => setPanel(null)} onReport={(i) => setPanel({ id: "report", index: i })} />}
      {panel?.id === "report" && <ReportPanel world={w} index={panel.index} onClose={() => setPanel(null)} />}
      {panel?.id === "news" && (
        <NewsPanel
          onHelp={() => setPanel({ id: "help" })}
          world={w}
          onClose={() => {
            w.newsSeen = w.t + 1;
            setPanel(null);
          }}
        />
      )}
      {panel?.id === "plan" && (
        <PlanPanel
          world={w}
          toast={toast}
          onDone={() => {
            w.planned = true;
            w.news.unshift({ t: w.t, date: dateLabel(w), text: "👋 Welcome, Mayor. New here? Open 📰 Bulletins at any time and tap 📖 How to play." });
            afterChange();
            setPanel(null);
            toast("👋 New here? 📰 News → 📖 How to play");
          }}
          onChange={afterChange}
        />
      )}
      {panel?.id === "demand" && <DemandPanel world={w} analysis={A} onClose={() => setPanel(null)} />}
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
          onFantasy={w.year >= 2027 ? () => setPanel({ id: "chronicle" }) : null}
          onProgrammes={() => setPanel({ id: "programmes" })}
          onHistory={() => setPanel({ id: "history" })}
          onHelp={() => setPanel({ id: "help" })}
          onQuit={() => {
            save();
            onQuit();
          }}
        />
      )}
      {w.gameOver && panel?.id !== "result" && panel?.id !== "report" && panel?.id !== "vote" && (
        <Panel title="📋 Your time as mayor" onClose={() => {}} closable={false}>
          <p className="text-lg">{w.gameOver.text}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            You housed {fmtNum(w.stats.pop)} people by {dateLabel(w)}.
          </p>
          <FinalReport final={w.gameOver.final} />
          {w.gameOver.reason === "election" && w.election.last && (
            <button onClick={() => setPanel({ id: "vote" })} className="city-btn city-sticker mt-3 w-full rounded-2xl bg-[var(--brand)] py-2 font-bold text-white">
              📋 See why you lost, and how to carry on
            </button>
          )}
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
            <span className={`text-[12px] font-bold tabular-nums ${poor ? "text-[var(--bad)]" : "text-[var(--muted)]"}`}>
              {locked ? `🔒 ${t.year}` : t.cost ? `${t.mode === "project" ? "from " : ""}${fmtMoney(t.cost)}` : ""}
            </span>
            {t.landmark && (world.lmBuilt || []).some((x) => x.type === t.struct && x.by !== "you") && <span className="text-[11px] font-semibold text-[var(--muted)]">🪞 built elsewhere</span>}
            {STRUCTS[t.struct]?.offer && world.offers?.[t.struct] > world.t && <span className="text-[11px] font-semibold text-[var(--good)]">🎓 campus offer · place by {tToDate(world, world.offers[t.struct])}</span>}
          </button>
        );
      })}
    </div>
  );
}

const DEMAND_BARS = [
  { k: "hdb", label: "H", color: "#2fd06f", name: "HDB flats", d: "Families on the housing queue (and families who would move here), minus empty flats and blocks being built." },
  { k: "pte", label: "P", color: "#f45fae", name: "Private homes", d: "Better-off families, especially when there are plenty of jobs." },
  { k: "com", label: "C", color: "#4b9bff", name: "Shops & offices", d: "Grows with population and tourism, and with factory demand your towns' plans turn away." },
  { k: "ind", label: "I", color: "#ffb020", name: "Factories", d: "Grows with population and trade, where towns are planned for industry. Keep it away from homes." },
];

// What a demand value means, in words.
const demandWord = (v) => (v > 0.15 ? { t: "Build more", tone: "more" } : v < -0.15 ? { t: "Too much", tone: "less" } : { t: "About right", tone: "ok" });
const TONE_STYLE = { more: { background: "#e3f8ea", color: "#13753c" }, less: { background: "#fdeedd", color: "#a4500b" }, ok: { background: "var(--soft)", color: "var(--muted)" } };
function DemandChip({ v }) {
  const d = demandWord(v);
  return (
    <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-bold" style={TONE_STYLE[d.tone]}>
      {d.tone === "more" ? "▲ " : d.tone === "less" ? "▼ " : "● "}
      {d.t}
    </span>
  );
}

// A bar that grows right for "build more" and left for "too much already",
// with the "about right" band marked in the middle.
function SideBar({ v, color, labels }) {
  const x = Math.max(-1, Math.min(1, v || 0));
  return (
    <div>
      <div className="relative h-3 w-full rounded-full bg-[var(--soft)]">
        <div className="absolute inset-y-0 rounded-sm bg-[var(--ink)]/10" style={{ left: "42.5%", width: "15%" }} />
        <div className="absolute inset-y-0 rounded-full" style={{ background: x < -0.15 ? "#f0a050" : color, opacity: Math.abs(x) <= 0.15 ? 0.5 : 1, width: `${Math.abs(x) * 50}%`, ...(x >= 0 ? { left: "50%" } : { right: "50%" }) }} />
        <div className="absolute -inset-y-0.5 left-1/2 w-0.5 -translate-x-1/2 rounded bg-[var(--ink)]/50" />
      </div>
      {labels && (
        <div className="mt-0.5 flex justify-between text-[11px] font-semibold text-[var(--muted)]">
          <span>◀ Too much</span>
          <span>About right</span>
          <span>Build more ▶</span>
        </div>
      )}
    </div>
  );
}

function DemandPanel({ world: w, analysis: A, onClose }) {
  const [k, setK] = useState("hdb");
  const B = DEMAND_BARS.find((b) => b.k === k);
  const rows = A ? demandByTown(w, A)[k] : [];
  const v = w.demand?.[k] || 0;
  return (
    <Panel title="📊 What people want built" onClose={onClose}>
      <p className="text-[14px] leading-snug text-[var(--muted)]">The H P C I bars on the map show the whole region: a bar above the middle line means build more, below means there's already too much. Pick a type to see each town.</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {DEMAND_BARS.map((b) => {
          const on = b.k === k;
          const d = demandWord(w.demand?.[b.k] || 0);
          return (
            <button key={b.k} onClick={() => setK(b.k)} aria-pressed={on} className="city-btn rounded-2xl border-2 px-2 py-1.5 text-left" style={on ? { background: b.color, borderColor: b.color, color: "#fff" } : { background: "var(--soft)", borderColor: "transparent" }}>
              <div className="text-[13px] font-bold leading-tight">
                <span className="mr-1 inline-block rounded-md px-1 text-[12px]" style={on ? { background: "rgba(255,255,255,0.3)" } : { background: b.color, color: "#fff" }}>{b.label}</span>
                {b.name}
              </div>
              <div className="mt-0.5 text-[12px] font-semibold" style={on ? {} : { color: TONE_STYLE[d.tone].color }}>
                {d.tone === "more" ? "▲ " : d.tone === "less" ? "▼ " : "● "}
                {d.t}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 rounded-2xl bg-[var(--soft)] p-2.5">
        <div className="flex items-center justify-between gap-2 text-[14px] font-bold">
          <span>{B.name}: whole region</span>
          <DemandChip v={v} />
        </div>
        <div className="mt-1.5">
          <SideBar v={v} color={B.color} labels />
        </div>
        <p className="mt-1 text-[13px] leading-snug text-[var(--muted)]">{B.d}</p>
      </div>
      <div className="mt-2 space-y-2">
        {rows.map((r, i) => (
          <div key={w.towns[i].name} className="rounded-2xl border-2 border-[var(--ink)]/10 p-2.5 text-[14px] leading-snug">
            <div className="flex items-center justify-between gap-2">
              <b>{w.towns[i].name}</b>
              <DemandChip v={r.v} />
            </div>
            <div className="mt-1.5">
              <SideBar v={r.v} color={B.color} labels={i === 0} />
            </div>
            <div className="mt-1">{r.tip}</div>
            <div className="text-[12px] text-[var(--muted)]">{r.why}</div>
            <div className="text-[12px] text-[var(--muted)]">
              Plan: {r.plan} · {r.empty} zoned lots empty · {r.building} being built
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-[var(--muted)]">Families can move to any town, so housing demand is split by where people live now and by each town's plan. Job demand is split by each town's plan.</p>
    </Panel>
  );
}

function Demand({ demand, onClick }) {
  const bars = [
    { k: "hdb", label: "H", color: "#2fd06f", name: "HDB flats" },
    { k: "pte", label: "P", color: "#f45fae", name: "private homes" },
    { k: "com", label: "C", color: "#4b9bff", name: "shops & offices" },
    { k: "ind", label: "I", color: "#ffb020", name: "factories" },
  ];
  return (
    <button onClick={onClick} className="city-btn city-sticker pointer-events-auto flex items-end gap-1 rounded-2xl bg-[var(--card)] px-2 py-1" aria-label={`Demand: ${bars.map((b) => `${b.name} ${Math.round((demand?.[b.k] || 0) * 100)}`).join(", ")}. Tap for details`}>
      {bars.map((b) => {
        const v = Math.max(-1, Math.min(1, demand?.[b.k] || 0));
        return (
          <div key={b.k} className="flex flex-col items-center" title={`Demand for ${b.name}`}>
            <div className="relative h-9 w-3 rounded-full bg-[var(--soft)]">
              <div className="absolute -inset-x-0.5 top-1/2 h-0.5 -translate-y-1/2 rounded bg-[var(--ink)]/50" />
              <div className="absolute inset-x-0 rounded-full" style={{ background: b.color, height: `${Math.abs(v) * 50}%`, ...(v >= 0 ? { bottom: "50%" } : { top: "50%" }) }} />
            </div>
            <div className="text-[11px] font-bold">{b.label}</div>
          </div>
        );
      })}
    </button>
  );
}
