// The title screen: a game-style main menu over a view of a planned city,
// with New game (region → mode → difficulty), save slots, the history book
// across all saves, and settings.
import React, { useMemo, useState } from "react";
import { HelpPanel, Panel, Toggle } from "./panels.jsx";
import { HistoryPanel } from "./panels2.jsx";
import { HISTORY } from "./history.js";
import { REGIONS, REGION_ORDER } from "./regions.js";
import { DIFFICULTY } from "./defs.js";
import { MODES, fmtNum } from "./sim.js";
import { newWorld, loadWorld, loadCheckpoint, checkpointInfo, savedCampaigns, deleteCampaign } from "./world.js";
import bgDesk from "./assets/menu-bg.webp";
import bgPhone from "./assets/menu-bg-phone.webp";

// standalone builds (itch.io) have no other pages to link to
const STANDALONE = typeof __STANDALONE__ !== "undefined" && __STANDALONE__;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HISTORY_TOTAL = Object.keys(HISTORY).length;

// How hard each region is to start in, and what it's about.
const REGION_INFO = {
  east: { stars: 2, tags: ["Kampongs", "Coast", "Airport"] },
  west: { stars: 2, tags: ["Industry", "Pollution", "Islands"] },
  central: { stars: 3, tags: ["Heritage", "Little land", "Downtown"] },
  south: { stars: 2, tags: ["Tourism", "Port", "Resort"] },
  north: { stars: 1, tags: ["Trade", "Causeway", "Mangroves"] },
  bukit: { stars: 3, tags: ["Nature", "Schools", "Pushback"] },
};
const STAR_WORD = ["", "A gentle start", "Balanced", "A hard start"];
const stars = (n) => "★".repeat(n) + "☆".repeat(3 - n);

function ago(ts) {
  if (!ts) return null;
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "Saved just now";
  if (m < 60) return `Saved ${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `Saved ${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "Saved yesterday" : `Saved ${d} days ago`;
}

// Everything uncovered in the history book, across every saved region.
function historyAcrossSaves(campaigns) {
  const byKey = new Map();
  for (const c of campaigns) {
    const w = loadWorld(c.region);
    for (const h of w?.historyLog || []) {
      const had = byKey.get(h.key);
      const shown = h.revealed || w.gameOver;
      if (!had || (shown && !had.revealed)) byKey.set(h.key, { ...h, revealed: shown ? h.revealed || w.t : null });
    }
  }
  return [...byKey.values()].sort((a, b) => a.year - b.year);
}

function GameButton({ icon, title, sub, badge, primary, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`menu-btn ${primary ? "menu-btn-primary" : ""}`}>
      <span className="menu-btn-ic" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block">{title}</span>
        {sub && <span className="menu-btn-sub block">{sub}</span>}
      </span>
      {badge && <span className="menu-badge">{badge}</span>}
    </button>
  );
}

function Logo({ center }) {
  return (
    <div className={`flex items-center gap-3 ${center ? "flex-col text-center" : ""}`}>
      <div className="city-bob text-5xl leading-none" aria-hidden="true">
        🦁
      </div>
      <div>
        <h1 className="city-title-text text-3xl font-bold leading-none text-white">Lion City Mayor</h1>
        <p className="mt-1 text-sm font-semibold text-[var(--ink)]">Singapore, 1965 onwards</p>
      </div>
    </div>
  );
}

function TopBar({ title, onBack, step }) {
  return (
    <header className="menu-top">
      <button onClick={onBack} className="menu-back">
        ← Back
      </button>
      <h2 className="city-title-text text-2xl font-bold text-white sm:text-3xl">{title}</h2>
      {step && (
        <ol className="ml-auto hidden gap-2 sm:flex" aria-label="Steps">
          {["Region", "Mode", "Difficulty"].map((s, i) => (
            <li key={s} className={`menu-step ${i + 1 === step ? "menu-step-on" : i + 1 < step ? "menu-step-done" : ""}`} aria-current={i + 1 === step ? "step" : undefined}>
              {i + 1 < step ? "✓" : i + 1} {s}
            </li>
          ))}
        </ol>
      )}
    </header>
  );
}

export default function Menu({ onStart, settings, setSettings }) {
  const [screen, setScreen] = useState("main");
  const [step, setStep] = useState(1);
  const [region, setRegion] = useState("east");
  const [mode, setMode] = useState("campaign");
  const [difficulty, setDifficulty] = useState("normal");
  const [confirmNew, setConfirmNew] = useState(false);
  const [askDelete, setAskDelete] = useState(null);
  const [rev, bump] = useState(0);
  const campaigns = useMemo(() => savedCampaigns(), [rev]);
  const history = useMemo(() => historyAcrossSaves(campaigns), [campaigns]);
  const latest = campaigns[0] || null;
  const news = useMemo(() => (latest ? loadWorld(latest.region)?.news?.find((n) => n.text && !n.text.startsWith("👋")) : null), [latest]);
  const saved = campaigns.find((c) => c.region === region) || null;
  const R = REGIONS[region];
  const info = REGION_INFO[region] || { stars: 2, tags: [] };
  const play = (c) => {
    const w = loadWorld(c.region);
    if (w) onStart(w);
  };
  const make = () => onStart(newWorld({ region, difficulty, mode }));
  const openNew = () => {
    setStep(1);
    setConfirmNew(false);
    setScreen("new");
  };

  return (
    <div className="city-app menu-root absolute inset-0 overflow-hidden">
      <picture className="menu-bg" aria-hidden="true">
        <source media="(max-width: 640px)" srcSet={bgPhone} />
        <img src={bgDesk} alt="" />
      </picture>

      {screen === "main" && (
        <>
          <div className="menu-phone-logo">
            <Logo center />
          </div>
          {news && (
            <div className="menu-news" role="status">
              <b>📰 Latest from {latest.name}</b>
              <span className="city-clamp">
                {news.date}: {news.text}
              </span>
            </div>
          )}
          <nav className="menu-rail" aria-label="Main menu">
            <div className="menu-rail-logo">
              <Logo />
            </div>
            {latest && <GameButton primary icon="▶" title="Continue" sub={`${latest.name} · ${MONTHS[latest.month]} ${latest.year} · ${fmtNum(latest.pop)} people${latest.over ? " · game over" : ""}`} onClick={() => play(latest)} />}
            <GameButton primary={!latest} icon="🆕" title="New game" sub="Pick a region, mode and difficulty" onClick={openNew} />
            {campaigns.length > 0 && <GameButton icon="💾" title="Load game" badge={`${campaigns.length} save${campaigns.length > 1 ? "s" : ""}`} onClick={() => setScreen("load")} />}
            <GameButton icon="📖" title="History book" sub={`${history.filter((h) => h.revealed).length} of ${HISTORY_TOTAL} moments revealed`} onClick={() => setScreen("history")} />
            <GameButton icon="❓" title="How to play" onClick={() => setScreen("help")} />
            <GameButton icon="⚙️" title="Settings" onClick={() => setScreen("settings")} />
            <div className="menu-foot">
              {!STANDALONE ? (
                <span className="flex flex-wrap gap-x-3">
                  <a href="lioncity.html">About the game</a>
                  <a href="city.html">Classic grid game</a>
                </span>
              ) : (
                <span />
              )}
              <span>Fictional mayor, real history</span>
            </div>
          </nav>
        </>
      )}

      {screen === "new" && (
        <div className="menu-screen">
          <TopBar title="New game" step={step} onBack={() => (step > 1 ? setStep(step - 1) : setScreen("main"))} />
          <div className="menu-sheet">
            <div className="menu-choices city-scroll">
              {step === 1 && (
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3" role="radiogroup" aria-label="Region">
                  {REGION_ORDER.map((id) => {
                    const r = REGIONS[id];
                    const ri = REGION_INFO[id] || { stars: 2, tags: [] };
                    const on = region === id;
                    return (
                      <button key={id} role="radio" aria-checked={on} onClick={() => setRegion(id)} className={`menu-card text-left ${on ? "menu-card-on" : ""}`}>
                        <span className="menu-stars" title={STAR_WORD[ri.stars]} aria-label={`Challenge: ${STAR_WORD[ri.stars]}`}>
                          {stars(ri.stars)}
                        </span>
                        {campaigns.some((c) => c.region === id) && <span className="menu-saved">saved</span>}
                        <span className="menu-card-ic" aria-hidden="true">
                          {r.icon}
                        </span>
                        <span className="mt-2 block text-base font-bold leading-tight lg:text-xl">{r.name}</span>
                        <span className="mt-1 hidden text-sm leading-snug text-[var(--muted)] lg:block">{r.tip}</span>
                        <span className="mt-2 hidden flex-wrap gap-1 lg:flex">
                          {ri.tags.map((t) => (
                            <span key={t} className="menu-chip">
                              {t}
                            </span>
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {step === 2 && (
                <div className="grid gap-2 sm:grid-cols-2 lg:gap-3" role="radiogroup" aria-label="Game mode">
                  {Object.entries(MODES).map(([k, m]) => (
                    <button key={k} role="radio" aria-checked={mode === k} onClick={() => setMode(k)} className={`menu-card text-left ${mode === k ? "menu-card-on" : ""}`}>
                      <span className="menu-card-ic" aria-hidden="true">
                        {m.icon}
                      </span>
                      <span className="mt-2 block text-xl font-bold">{m.name}</span>
                      <span className="mt-1 block text-sm leading-snug text-[var(--muted)]">{m.desc}</span>
                    </button>
                  ))}
                </div>
              )}
              {step === 3 && (
                <div className="grid gap-2 sm:grid-cols-3 lg:gap-3" role="radiogroup" aria-label="Difficulty">
                  {Object.entries(DIFFICULTY).map(([k, d]) => (
                    <button key={k} role="radio" aria-checked={difficulty === k} onClick={() => setDifficulty(k)} className={`menu-card text-left ${difficulty === k ? "menu-card-on" : ""}`}>
                      <span className="block text-xl font-bold">{d.label}</span>
                      <span className="mt-1 block text-sm leading-snug text-[var(--muted)]">{d.desc}</span>
                      <span className="mt-2 block text-sm text-[var(--muted)]">
                        Starting budget ${(d.cash / 1000).toFixed(0)}M · {fmtNum(d.waitlist)} families waiting
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <aside className="menu-side">
              <div className="hidden text-6xl leading-none lg:block" aria-hidden="true">
                {step === 1 ? R.icon : step === 2 ? MODES[mode].icon : "🎚️"}
              </div>
              {step === 1 && (
                <>
                  <h3 className="text-lg font-bold lg:text-2xl">{R.name}</h3>
                  <p className="text-sm leading-snug text-[var(--muted)] lg:text-base">{R.blurb}</p>
                  <ul className="hidden space-y-1 text-sm text-[var(--muted)] lg:block">
                    <li>
                      <b className="text-[var(--ink)]">Towns:</b> {R.towns.map((t) => t.name).join(", ")}
                    </li>
                    <li>
                      <b className="text-[var(--ink)]">Challenge:</b> <span className="text-[var(--brand)]">{stars(info.stars)}</span> {STAR_WORD[info.stars]}
                    </li>
                  </ul>
                </>
              )}
              {step === 2 && (
                <>
                  <h3 className="text-lg font-bold lg:text-2xl">{MODES[mode].name}</h3>
                  <p className="text-sm leading-snug text-[var(--muted)] lg:text-base">{MODES[mode].desc}</p>
                </>
              )}
              {step === 3 && (
                <>
                  <h3 className="text-lg font-bold lg:text-2xl">Ready, Mayor?</h3>
                  <p className="text-sm leading-snug text-[var(--muted)] lg:text-base">
                    {R.icon} {R.name} · {MODES[mode].icon} {MODES[mode].name} · {DIFFICULTY[difficulty].label}
                  </p>
                </>
              )}
              <div className="mt-auto">
                {step < 3 ? (
                  <GameButton primary icon="→" title={step === 1 ? "Next: choose a mode" : "Next: choose a difficulty"} onClick={() => setStep(step + 1)} />
                ) : confirmNew ? (
                  <div className="rounded-2xl bg-[var(--bad-bg)] p-3 text-center text-sm">
                    <div className="font-bold text-[var(--bad)]">
                      This replaces your {saved?.name} game ({saved?.year}). Your other regions are kept.
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => setConfirmNew(false)} className="menu-mini flex-1">
                        Keep it
                      </button>
                      <button onClick={make} className="menu-mini menu-mini-primary flex-1">
                        Start new
                      </button>
                    </div>
                  </div>
                ) : (
                  <GameButton primary icon="🦁" title={`Become mayor of ${R.short}`} onClick={() => (saved ? setConfirmNew(true) : make())} />
                )}
              </div>
            </aside>
          </div>
        </div>
      )}

      {screen === "load" && (
        <div className="menu-screen">
          <TopBar title="Load game" onBack={() => setScreen("main")} />
          <div className="menu-slots city-scroll">
            {campaigns.map((c) => {
              const chk = checkpointInfo(c.region);
              const r = REGIONS[c.region];
              return (
                <div key={c.region} className="menu-slot">
                  <div className="menu-slot-thumb" aria-hidden="true">
                    {r?.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold leading-tight sm:text-xl">{c.name}</h3>
                    <p className="text-sm text-[var(--muted)]">
                      {MONTHS[c.month]} {c.year} · {fmtNum(c.pop)} people{c.approval != null ? ` · 🙂 ${c.approval}%` : ""}
                      {c.over ? " · game over" : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="menu-chip">
                        {MODES[c.mode]?.icon} {MODES[c.mode]?.name || "Campaign"}
                      </span>
                      {c.difficulty && <span className="menu-chip">{DIFFICULTY[c.difficulty]?.label}</span>}
                      {ago(c.updated) && <span className="menu-chip">{ago(c.updated)}</span>}
                    </div>
                  </div>
                  <div className="menu-slot-act">
                    {chk && (
                      <button
                        onClick={() => {
                          const w = loadCheckpoint(c.region);
                          if (w) onStart(w);
                        }}
                        className="menu-mini"
                        title={`Go back to just after the ${chk.year} election`}
                      >
                        ↩ {chk.year} election
                      </button>
                    )}
                    {askDelete === c.region ? (
                      <button
                        onClick={() => {
                          deleteCampaign(c.region);
                          setAskDelete(null);
                          bump((v) => v + 1);
                        }}
                        className="menu-mini menu-mini-bad"
                      >
                        Delete?
                      </button>
                    ) : (
                      <button onClick={() => setAskDelete(c.region)} aria-label={`Delete ${c.name} game`} className="menu-mini">
                        🗑
                      </button>
                    )}
                    <button onClick={() => play(c)} className="menu-mini menu-mini-primary">
                      ▶ Play
                    </button>
                  </div>
                </div>
              );
            })}
            {campaigns.length < REGION_ORDER.length && (
              <button onClick={openNew} className="menu-slot menu-slot-empty text-left">
                <div className="menu-slot-thumb" aria-hidden="true">
                  ＋
                </div>
                <div>
                  <h3 className="text-lg font-bold">Start another region</h3>
                  <p className="text-sm text-[var(--muted)]">Each of the six regions keeps its own save, so you can run several at once.</p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {screen === "history" && <HistoryPanel world={{ historyLog: history }} onClose={() => setScreen("main")} />}
      {screen === "help" && <HelpPanel onClose={() => setScreen("main")} />}
      {screen === "settings" && (
        <Panel title="⚙️ Settings" onClose={() => setScreen("main")}>
          <div className="space-y-2">
            <Toggle id="menu-large" label="Bigger text and buttons" hint="Easier to read and tap." checked={settings.large} onChange={(v) => setSettings({ ...settings, large: v })} />
            <Toggle id="menu-motion" label="Moving cars, trains, boats and clouds" hint="Turn off to save battery or reduce motion." checked={settings.motion} onChange={(v) => setSettings({ ...settings, motion: v })} />
          </div>
          <p className="mt-3 text-[13px] text-[var(--muted)]">
            The mayor here is a fictional role combining planning, housing and town council powers. Singapore's real mayors lead Community Development Councils. Your games are saved in this browser only.
          </p>
        </Panel>
      )}
    </div>
  );
}
