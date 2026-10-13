import React, { useState } from "react";
import { DEPTS, NEEDS, diffOf } from "./defs.js";
import { monthlyBudget, REV_LABELS, EXP_LABELS, fmtMoney, fmtNum, drawReserves, GOALS, IMPORTED_WATER } from "./sim.js";

// A sheet: centred card on big screens, full screen on small phones.
export function Panel({ title, onClose, children, tabs, tab, setTab, closable = true }) {
  return (
    <div className="city-backdrop absolute inset-0 z-40 flex items-center justify-center" onPointerDown={(e) => closable && e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={title} className="city-sheet city-pop flex flex-col overflow-hidden bg-[var(--card)] text-[var(--ink)] shadow-2xl">
        <div className="flex shrink-0 items-center gap-2 border-b-2 border-[var(--ink)]/10 px-3 py-2">
          <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{title}</h2>
          {closable && (
            <button onClick={onClose} className="city-btn h-10 w-10 shrink-0 rounded-full bg-[var(--soft)] text-lg font-bold" aria-label="Close">
              ✕
            </button>
          )}
        </div>
        {tabs && (
          <div className="city-noscrollbar flex shrink-0 gap-1 overflow-x-auto px-3 pt-2" role="tablist">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`city-btn shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold ${tab === id ? "bg-[var(--brand)] text-white" : "bg-[var(--soft)]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="city-scroll min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  );
}

function Slider({ id, label, value, min, max, step = 1, suffix = "%", onChange, hint }) {
  return (
    <div className="py-1.5">
      <label htmlFor={id} className="flex items-center justify-between text-[15px]">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums font-bold text-[var(--brand)]">
          {value}
          {suffix}
        </span>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="city-range w-full" />
      {hint && <div className="text-[13px] leading-snug text-[var(--muted)]">{hint}</div>}
    </div>
  );
}

const total = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);

function Stat({ label, value, tone }) {
  return (
    <div className={`rounded-2xl border-2 border-[var(--ink)]/10 px-3 py-2 ${tone === "bad" ? "bg-[var(--bad-bg)] text-[var(--bad)]" : tone === "good" ? "bg-[var(--good-bg)] text-[var(--good)]" : "bg-[var(--soft)]"}`}>
      <div className="text-[12px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

export function BudgetPanel({ world: w, analysis: A, onChange, onClose, toast }) {
  const [tab, setTab] = useState("summary");
  const est = A ? monthlyBudget(w, A) : { rev: {}, exp: {} };
  const ly = w.lastYear;
  const estNet = total(est.rev) - total(est.exp);
  const set = (fn) => {
    fn();
    onChange();
  };
  const bars = (obj, labels, color) => {
    const rows = Object.entries(labels)
      .map(([k, label]) => [label, obj[k] || 0])
      .filter(([, v]) => v > 0.5)
      .sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...rows.map((r) => r[1]));
    return rows.length ? (
      rows.map(([label, v]) => (
        <div key={label} className="py-0.5">
          <div className="flex justify-between text-[14px]">
            <span>{label}</span>
            <span className="font-bold tabular-nums">{fmtMoney(v)}</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--soft)]">
            <div className="h-2 rounded-full" style={{ width: `${(v / max) * 100}%`, background: color }} />
          </div>
        </div>
      ))
    ) : (
      <div className="text-sm text-[var(--muted)]">Nothing yet.</div>
    )
  };
  return (
    <Panel
      title="💰 Budget"
      onClose={onClose}
      tab={tab}
      setTab={setTab}
      tabs={[
        ["summary", "Summary"],
        ["taxes", "Taxes & housing"],
        ["spending", "Spending"],
        ["sheet", "Full sheet"],
      ]}
    >
      {tab === "summary" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Treasury" value={w.sandbox ? "Unlimited" : fmtMoney(w.cash)} tone={w.cash < 0 ? "bad" : null} />
            <Stat label="Each month" value={(estNet >= 0 ? "+" : "") + fmtMoney(estNet)} tone={estNet < 0 ? "bad" : "good"} />
            <Stat label="Reserves 🔒" value={fmtMoney(w.reserves)} />
          </div>
          <p className="text-[14px] leading-snug text-[var(--muted)]">
            {estNet >= 0
              ? "You're earning more than you spend. Good time to build!"
              : "You're spending more than you earn. Try raising taxes a little, trimming department funding, or zoning private housing and offices, which bring in land sales."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <h3 className="mb-1 font-bold">Money in (this month)</h3>
              {bars(est.rev, REV_LABELS, "#2fbf71")}
            </div>
            <div>
              <h3 className="mb-1 font-bold">Money out (this month)</h3>
              {bars(est.exp, EXP_LABELS, "#ff6b6b")}
            </div>
          </div>
        </div>
      )}
      {tab === "taxes" && (
        <div>
          <Slider id="tax-property" label="🏠 Property tax" value={w.taxes.property} min={0} max={20} onChange={(v) => set(() => (w.taxes.property = v))} hint="Private homes pay more than HDB flats. Above 8% residents feel the pinch." />
          <Slider id="tax-corporate" label="🏢 Corporate tax" value={w.taxes.corporate} min={5} max={30} onChange={(v) => set(() => (w.taxes.corporate = v))} hint="Singapore's real rate is 17%." />
          <Slider id="tax-gst" label="🛒 GST" value={w.taxes.gst} min={0} max={15} onChange={(v) => set(() => (w.taxes.gst = v))} hint="A tax on spending. Singapore started GST at 3% in 1994; it is 9% today. Every point above 3% raises the cost of living." />
          <Slider id="hdb-grant" label="🔑 HDB housing grant" value={w.hdbGrant} min={0} max={100} step={5} onChange={(v) => set(() => (w.hdbGrant = v))} hint="Bigger grants make flats affordable and fill HDB estates faster, but cost more." />
        </div>
      )}
      {tab === "spending" && (
        <div>
          {Object.entries(DEPTS).map(([k, d]) => (
            <Slider key={k} id={`fund-${k}`} label={`${d.icon} ${d.name}`} value={w.funding[k]} min={0} max={120} step={5} onChange={(v) => set(() => (w.funding[k] = v))} />
          ))}
          <p className="text-[13px] leading-snug text-[var(--muted)]">Less funding saves money but shrinks how far each service reaches.</p>
          <div className="mt-3 rounded-2xl border-2 border-[var(--ink)]/10 bg-[var(--warn-bg)] p-3">
            <div className="font-bold">🏛️ Past reserves</div>
            <p className="text-[13px] leading-snug">
              Singapore's reserves are locked away for emergencies. Drawing on them needs the President's approval: only when the treasury is nearly empty (below $5M), once every 5 years.
            </p>
            <button
              disabled={w.sandbox}
              onClick={() => {
                const r = drawReserves(w);
                toast(r.ok ? `🏛️ Approved! ${fmtMoney(r.amt)} added to the treasury.` : r.msg);
                onChange();
              }}
              className="city-btn mt-2 rounded-full bg-[var(--warn)] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              Ask to draw 20% ({fmtMoney(w.reserves * 0.2)})
            </button>
          </div>
        </div>
      )}
      {tab === "sheet" && (
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wide text-[var(--muted)]">
                <th className="py-1">Revenue</th>
                <th className="py-1 text-right">This month</th>
                <th className="py-1 text-right">Last year</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(REV_LABELS).map(([k, label]) => (
                <Row3 key={k} label={label} a={est.rev[k] ?? 0} b={ly ? ly.rev[k] ?? 0 : null} />
              ))}
              <Row3 label="Total revenue" a={total(est.rev)} b={ly ? total(ly.rev) : null} bold />
              <tr>
                <td className="pt-3 text-[12px] font-bold uppercase tracking-wide text-[var(--muted)]">Expenses</td>
              </tr>
              {Object.entries(EXP_LABELS).map(([k, label]) => (
                <Row3 key={k} label={label} a={k === "construction" ? null : est.exp[k] ?? 0} b={ly ? ly.exp[k] ?? 0 : null} neg />
              ))}
              <Row3 label="Total expenses" a={total(est.exp)} b={ly ? total(ly.exp) : null} bold neg />
            </tbody>
          </table>
          <p className="mt-2 text-[13px] text-[var(--muted)]">HDB flats are sold below cost, so housing runs a deficit. "Last year" includes new construction.</p>
        </div>
      )}
    </Panel>
  );
}

function Row3({ label, a, b, neg, bold }) {
  const cls = `py-1 text-right tabular-nums ${neg ? "text-[var(--bad)]" : "text-[var(--good)]"}`;
  return (
    <tr className={`border-b border-[var(--ink)]/10 ${bold ? "font-bold" : ""}`}>
      <td className="py-1 pr-2">{label}</td>
      <td className={cls}>{a == null ? "–" : fmtMoney(a)}</td>
      <td className={cls}>{b == null ? "–" : fmtMoney(b)}</td>
    </tr>
  );
}

function Bar({ value, max = 100, color }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1e-6, max)) * 100));
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--soft)]">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

const NEED_TIPS = {
  housing: "Zone more HDB next to roads. Bigger HDB grants help too.",
  jobs: "Zone commercial and industrial land.",
  cost: "Lower GST and property tax, keep private housing under about 30%, raise HDB grants.",
  food: "Build hawker centres near homes.",
  school: "Build primary schools near homes.",
  health: "Build polyclinics, or a hospital for a big area.",
  safety: "Build police posts and fire stations.",
  transport: "Bus interchanges, then MRT lines (from 1987).",
  green: "Parks and trees near homes.",
  community: "Community clubs bring neighbours together.",
  utilities: "Build more power stations and water supply.",
  environment: "Keep factories and power stations away from homes; parks soak up pollution.",
};

const needColor = (v) => (v >= 70 ? "#2fbf71" : v >= 45 ? "#ffb020" : "#ff5a5a");

export function StatsPanel({ world: w, onClose, initialTab = "happy" }) {
  const [tab, setTab] = useState(initialTab);
  const s = w.stats;
  const needs = Object.entries(NEEDS)
    .map(([k, n]) => ({ k, ...n, v: w.needs[k] ?? 50 }))
    .sort((a, b) => a.v - b.v);
  const ws = s.waterSources || {};
  const minA = diffOf(w).reviewMin;
  const review = w.sandbox || !minA ? "There's no game over on this setting." : `There's a review every 5 years: below ${minA}% and you're out.`;
  return (
    <Panel
      title="📊 City report"
      onClose={onClose}
      tab={tab}
      setTab={setTab}
      tabs={[
        ["happy", "Happiness"],
        ["people", "People & jobs"],
        ["utilities", "Power & water"],
        ["goals", "Goals"],
      ]}
    >
      {tab === "happy" && (
        <div>
          <div className="flex items-center gap-3">
            <div className="text-4xl font-bold" style={{ color: needColor(w.approval) }}>
              {Math.round(w.approval)}%
            </div>
            <div className="text-[14px] leading-snug text-[var(--muted)]">Approval rating. {review}</div>
          </div>
          <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {needs.map((n) => (
              <div key={n.k}>
                <div className="flex justify-between text-[15px]">
                  <span>
                    {n.icon} {n.name}
                  </span>
                  <span className="font-bold tabular-nums">{Math.round(n.v)}</span>
                </div>
                <Bar value={n.v} color={needColor(n.v)} />
                {n.v < 55 && <div className="text-[13px] leading-snug text-[var(--muted)]">💡 {NEED_TIPS[n.k]}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "people" && (
        <div className="text-[15px]">
          <Row k="👥 Residents" v={fmtNum(s.pop || 0)} />
          <Row k="🏢 In HDB flats" v={`${fmtNum(s.hdbPop || 0)} (${s.pop ? Math.round((s.hdbPop / s.pop) * 100) : 0}%)`} />
          <Row k="🏡 In private housing" v={fmtNum(s.ptePop || 0)} />
          <Row k="⏳ Waiting for a home" v={fmtNum(w.waitlist)} />
          <Row k="💼 Jobs" v={fmtNum(s.jobs || 0)} />
          <Row k="🏬 Shops & offices" v={fmtNum(s.comJobs || 0)} />
          <Row k="🏭 Factories" v={fmtNum(s.indJobs || 0)} />
          <Row k="📉 Unemployment" v={`${Math.round((s.unemployment || 0) * 100)}%`} />
        </div>
      )}
      {tab === "utilities" && (
        <div className="space-y-4 text-[15px]">
          <div>
            <h3 className="font-bold">⚡ Power</h3>
            <Row k="Supply / demand" v={`${Math.round(s.powerSupply || 0)} / ${Math.round(s.powerDemand || 0)}`} />
            <Bar value={s.powerSupply || 0} max={Math.max(s.powerSupply || 1, s.powerDemand || 1)} color={(s.powerSupply || 0) >= (s.powerDemand || 0) ? "#2fbf71" : "#ff5a5a"} />
          </div>
          <div>
            <h3 className="font-bold">💧 Water: the Four National Taps</h3>
            <Row k="1. Local catchment" v={Math.round(ws.catchment || 0)} />
            <Row k={`2. Imported${w.year >= 2061 ? " (ended 2061)" : " (until 2061)"}`} v={Math.round(ws.imported ?? IMPORTED_WATER)} />
            <Row k="3. NEWater" v={Math.round(ws.newater || 0)} />
            <Row k="4. Desalination" v={Math.round(ws.desal || 0)} />
            <Row k="Supply / demand" v={`${Math.round(s.waterSupply || 0)} / ${Math.round(s.waterDemand || 0)}`} />
            <Bar value={s.waterSupply || 0} max={Math.max(s.waterSupply || 1, s.waterDemand || 1)} color={(s.waterSupply || 0) >= (s.waterDemand || 0) ? "#3fa9ff" : "#ff5a5a"} />
          </div>
        </div>
      )}
      {tab === "goals" && (
        <ul className="space-y-1.5 text-[15px]">
          {GOALS.map((g) => (
            <li key={g.id} className={w.goalsDone[g.id] ? "text-[var(--good)]" : ""}>
              {w.goalsDone[g.id] ? "✅" : "⬜"} {g.text}
              {!w.goalsDone[g.id] && <div className="pl-7 text-[13px] leading-snug text-[var(--muted)]">{g.hint}</div>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-2 border-b border-[var(--ink)]/10 py-1">
      <span>{k}</span>
      <span className="font-semibold tabular-nums">{v}</span>
    </div>
  );
}

export function NewsPanel({ world, onClose }) {
  return (
    <Panel title="📰 The Straits Planner" onClose={onClose}>
      {world.news.length === 0 && <p className="text-[var(--muted)]">No news yet.</p>}
      <ul className="space-y-2">
        {world.news.map((n, i) => (
          <li key={i} className="rounded-2xl bg-[var(--soft)] px-3 py-2 text-[15px]">
            <div className="text-[12px] font-bold text-[var(--brand)]">{n.date}</div>
            {n.text}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function HelpPanel({ onClose }) {
  return (
    <Panel title="❓ How to play" onClose={onClose}>
      <div className="space-y-3 text-[15px] leading-snug">
        <p>
          It's <b>1965</b> and you're the chief planner of a brand-new nation. People are <b>waiting for homes</b>. Build estates, jobs and services, and keep the budget healthy. You start with a small town to grow from.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Tip t="👆 Move around" d="Drag with one finger to move the map. Pinch with two fingers to zoom." />
          <Tip t="🛠️ Build" d="Pick a tool from the bar at the bottom, tap the map, then press ✓ Build. For roads and zones, tap a start and an end." />
          <Tip t="↶ Made a mistake?" d="Press Undo to take back your last build and get the money back." />
          <Tip t="🎯 Follow the goals" d="The card at the top tells you what to do next and how." />
          <Tip t="🏘️ Zones grow by themselves" d="HDB, shops and factories appear on zoned land that has a road within 3 tiles, power and water." />
          <Tip t="🔍 Why isn't it growing?" d="Pick 👆 Look and tap a block. It tells you exactly what's missing." />
          <Tip t="📊 Keep people happy" d="Tap your approval % to see what residents want most." />
          <Tip t="🟩 R C I bars" d="Green R: people want homes. Blue C: shops & offices. Yellow I: factories." />
        </div>
        <p className="text-[13px] text-[var(--muted)]">
          This is a game, not a real planning model. URA, HDB, JTC and the other agencies named are real Singapore government bodies; the numbers are simplified for fun.
        </p>
      </div>
    </Panel>
  );
}

function Tip({ t, d }) {
  return (
    <div className="rounded-2xl border-2 border-[var(--ink)]/10 p-2.5">
      <div className="font-bold">{t}</div>
      <div className="text-[14px] text-[var(--muted)]">{d}</div>
    </div>
  );
}

function Toggle({ id, label, hint, checked, onChange }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[var(--soft)] p-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--brand)]" />
      <span>
        <span className="block font-bold">{label}</span>
        <span className="block text-[13px] leading-snug text-[var(--muted)]">{hint}</span>
      </span>
    </label>
  );
}

export function MenuPanel({ world, settings, setSettings, onClose, onSave, onHelp, onQuit, saved }) {
  const set = (k, v) => setSettings({ ...settings, [k]: v });
  return (
    <Panel title="☰ Menu" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <MenuBtn onClick={onSave} icon="💾" label={saved ? "Saved!" : "Save now"} />
        <MenuBtn onClick={onHelp} icon="❓" label="How to play" />
        <MenuBtn onClick={onQuit} icon="🏠" label="Title screen" />
      </div>
      <h3 className="mb-2 mt-4 font-bold">Settings</h3>
      <div className="space-y-2">
        <Toggle id="set-large" label="Bigger text and buttons" hint="Makes everything easier to read and tap." checked={settings.large} onChange={(v) => set("large", v)} />
        <Toggle id="set-confirm" label="Ask before building" hint="Shows a ✓ Build button so a stray tap never costs money." checked={settings.confirm} onChange={(v) => set("confirm", v)} />
        <Toggle id="set-motion" label="Moving cars, boats and clouds" hint="Turn off to save battery or reduce motion." checked={settings.motion} onChange={(v) => set("motion", v)} />
      </div>
      <p className="mt-3 text-[13px] text-[var(--muted)]">
        {world.name} · {world.sandbox ? "Sandbox (unlimited money, everything unlocked)" : `${world.difficulty[0].toUpperCase()}${world.difficulty.slice(1)}`}. Your city saves itself on this device every month and after every build.
      </p>
    </Panel>
  );
}

function MenuBtn({ onClick, icon, label }) {
  return (
    <button onClick={onClick} className="city-btn flex items-center gap-2 rounded-2xl bg-[var(--soft)] px-3 py-3 text-left font-bold">
      <span className="text-2xl">{icon}</span>
      {label}
    </button>
  );
}
