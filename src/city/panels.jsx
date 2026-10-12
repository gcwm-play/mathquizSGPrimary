import React from "react";
import { DEPTS, NEEDS } from "./defs.js";
import { monthlyBudget, REV_LABELS, EXP_LABELS, fmtMoney, fmtNum, drawReserves, GOALS, IMPORTED_WATER } from "./sim.js";

export function Panel({ title, onClose, children, wide }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/55 p-2" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`city-pop flex max-h-full w-full ${wide ? "max-w-3xl" : "max-w-xl"} flex-col overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl`}>
        <div className="flex items-center justify-between bg-gradient-to-r from-red-600 to-rose-500 px-4 py-2 text-white">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-white/20 text-lg font-bold hover:bg-white/30" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="city-scroll overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, suffix = "%", onChange, hint }) {
  return (
    <label className="block py-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums font-bold text-rose-600">
          {value}
          {suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="city-range w-full" />
      {hint && <div className="text-[11px] leading-tight text-slate-500">{hint}</div>}
    </label>
  );
}

const total = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);

export function BudgetPanel({ world: w, analysis: A, onChange, onClose, toast }) {
  const est = A ? monthlyBudget(w, A) : { rev: {}, exp: {} };
  const ly = w.lastYear;
  const estNet = total(est.rev) - total(est.exp);
  const set = (fn) => {
    fn();
    onChange();
  };
  const row = (label, a, b, neg) => (
    <tr key={label} className="border-b border-slate-100">
      <td className="py-1 pr-2">{label}</td>
      <td className={`py-1 text-right tabular-nums ${neg ? "text-rose-600" : "text-emerald-700"}`}>{a == null ? "–" : fmtMoney(a)}</td>
      <td className={`py-1 text-right tabular-nums ${neg ? "text-rose-600" : "text-emerald-700"}`}>{b == null ? "–" : fmtMoney(b)}</td>
    </tr>
  );
  return (
    <Panel title="💰 Budget sheet" onClose={onClose} wide>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="mb-2 grid grid-cols-3 gap-2 text-center">
            <Stat label="Treasury" value={fmtMoney(w.cash)} tone={w.cash < 0 ? "bad" : "ok"} />
            <Stat label="Monthly net" value={(estNet >= 0 ? "+" : "") + fmtMoney(estNet)} tone={estNet < 0 ? "bad" : "ok"} />
            <Stat label="Past reserves 🔒" value={fmtMoney(w.reserves)} />
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-1">Revenue</th>
                <th className="py-1 text-right">This month (est.)</th>
                <th className="py-1 text-right">Last year</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(REV_LABELS).map(([k, label]) => row(label, est.rev[k] ?? 0, ly ? ly.rev[k] ?? 0 : null, false))}
              <tr className="font-bold">
                <td className="py-1">Total revenue</td>
                <td className="py-1 text-right tabular-nums">{fmtMoney(total(est.rev))}</td>
                <td className="py-1 text-right tabular-nums">{ly ? fmtMoney(total(ly.rev)) : "–"}</td>
              </tr>
            </tbody>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="pt-3">Expenses</th>
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              {Object.entries(EXP_LABELS).map(([k, label]) => row(label, k === "construction" ? null : est.exp[k] ?? 0, ly ? ly.exp[k] ?? 0 : null, true))}
              <tr className="font-bold">
                <td className="py-1">Total expenses</td>
                <td className="py-1 text-right tabular-nums">{fmtMoney(total(est.exp))}</td>
                <td className="py-1 text-right tabular-nums">{ly ? fmtMoney(total(ly.exp)) : "–"}</td>
              </tr>
              {ly && (
                <tr className="font-bold">
                  <td className="py-1">Last year surplus</td>
                  <td />
                  <td className={`py-1 text-right tabular-nums ${total(ly.rev) - total(ly.exp) < 0 ? "text-rose-600" : "text-emerald-700"}`}>{fmtMoney(total(ly.rev) - total(ly.exp))}</td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            HDB flats are sold below cost, so housing runs a deficit. Private housing and offices earn money through land sales. "Last year" includes new construction you paid for.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-slate-700">Taxes</h3>
          <Slider label="🏠 Property tax" value={w.taxes.property} min={0} max={20} onChange={(v) => set(() => (w.taxes.property = v))} hint="Private homes pay a higher rate than HDB flats. Above 8% residents feel the pinch." />
          <Slider label="🏢 Corporate tax" value={w.taxes.corporate} min={5} max={30} onChange={(v) => set(() => (w.taxes.corporate = v))} hint="Singapore's real rate is 17%." />
          <Slider label="🛒 GST" value={w.taxes.gst} min={0} max={15} onChange={(v) => set(() => (w.taxes.gst = v))} hint="A tax on spending. Singapore started GST at 3% in 1994; it is 9% today. Every point above 3% raises cost of living." />
          <h3 className="mt-3 font-bold text-slate-700">Housing</h3>
          <Slider label="🔑 HDB housing grant" value={w.hdbGrant} min={0} max={100} step={5} onChange={(v) => set(() => (w.hdbGrant = v))} hint="Bigger grants make flats affordable and fill HDB estates faster, but deepen the HDB deficit." />
          <h3 className="mt-3 font-bold text-slate-700">Department funding</h3>
          {Object.entries(DEPTS).map(([k, d]) => (
            <Slider key={k} label={`${d.icon} ${d.name}`} value={w.funding[k]} min={0} max={120} step={5} onChange={(v) => set(() => (w.funding[k] = v))} />
          ))}
          <p className="text-[11px] leading-tight text-slate-500">Less funding saves money but shrinks how well amenities cover their area.</p>
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">
            <div className="font-bold">🏛️ Past reserves</div>
            <p className="text-[12px] leading-snug text-slate-600">
              Singapore's reserves are locked away for emergencies. Half of their investment returns (NIRC) can be spent each year. Drawing on the reserves themselves needs the President's approval: only when the treasury is nearly empty, once per 5-year term.
            </p>
            <button
              disabled={w.sandbox}
              onClick={() => {
                const r = drawReserves(w);
                toast(r.ok ? `🏛️ Approved! ${fmtMoney(r.amt)} added to the treasury.` : r.msg);
                onChange();
              }}
              className="mt-2 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
            >
              Ask to draw 20% ({fmtMoney(w.reserves * 0.2)})
            </button>
            {w.reserveDrawn && <div className="mt-1 text-[11px] text-slate-500">Already drawn this term.</div>}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`rounded-xl px-2 py-1.5 ${tone === "bad" ? "bg-rose-50 text-rose-700" : "bg-slate-50"}`}>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Bar({ value, max = 100, color }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1e-6, max)) * 100));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

const NEED_TIPS = {
  housing: "Zone more HDB next to roads. Bigger HDB grants speed things up.",
  jobs: "Zone commercial and industrial land.",
  cost: "Lower GST and property tax, keep private housing under ~30%, raise HDB grants.",
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

const needColor = (v) => (v >= 70 ? "#16a34a" : v >= 45 ? "#f59e0b" : "#dc2626");

export function StatsPanel({ world: w, onClose }) {
  const s = w.stats;
  const needs = Object.entries(NEEDS).map(([k, n]) => ({ k, ...n, v: w.needs[k] ?? 50 })).sort((a, b) => a.v - b.v);
  const ws = s.waterSources || {};
  return (
    <Panel title="📊 City report" onClose={onClose} wide>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="flex items-center gap-3">
            <div className="text-4xl font-bold" style={{ color: needColor(w.approval) }}>
              {Math.round(w.approval)}%
            </div>
            <div className="text-sm leading-tight text-slate-600">
              Approval rating. Ministerial reviews happen every 5 years (1970, 1975…). Fall below 30% and you're out!
            </div>
          </div>
          <h3 className="mt-3 font-bold text-slate-700">What residents think</h3>
          <div className="space-y-1.5">
            {needs.map((n) => (
              <div key={n.k}>
                <div className="flex justify-between text-[13px]">
                  <span>
                    {n.icon} {n.name}
                  </span>
                  <span className="font-bold tabular-nums">{Math.round(n.v)}</span>
                </div>
                <Bar value={n.v} color={needColor(n.v)} />
                {n.v < 55 && <div className="text-[11px] leading-tight text-slate-500">💡 {NEED_TIPS[n.k]}</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 text-[13px]">
          <div>
            <h3 className="font-bold text-slate-700">People</h3>
            <Row k="👥 Residents" v={fmtNum(s.pop || 0)} />
            <Row k="🏢 In HDB flats" v={`${fmtNum(s.hdbPop || 0)} (${s.pop ? Math.round((s.hdbPop / s.pop) * 100) : 0}%)`} />
            <Row k="🏡 In private housing" v={fmtNum(s.ptePop || 0)} />
            <Row k="⏳ Waiting for a home" v={fmtNum(w.waitlist)} />
            <Row k="💼 Jobs" v={`${fmtNum(s.jobs || 0)} (${fmtNum(s.comJobs || 0)} comm · ${fmtNum(s.indJobs || 0)} ind)`} />
            <Row k="📉 Unemployment" v={`${Math.round((s.unemployment || 0) * 100)}%`} />
          </div>
          <div>
            <h3 className="font-bold text-slate-700">⚡ Power</h3>
            <Row k="Supply / demand" v={`${Math.round(s.powerSupply || 0)} / ${Math.round(s.powerDemand || 0)}`} />
            <Bar value={s.powerSupply || 0} max={Math.max(s.powerSupply || 1, s.powerDemand || 1)} color={(s.powerSupply || 0) >= (s.powerDemand || 0) ? "#16a34a" : "#dc2626"} />
          </div>
          <div>
            <h3 className="font-bold text-slate-700">💧 Water: the Four National Taps</h3>
            <Row k="1. Local catchment (reservoirs)" v={Math.round(ws.catchment || 0)} />
            <Row k={`2. Imported from Johor${w.year >= 2061 ? " (ended 2061)" : " (until 2061)"}`} v={Math.round(ws.imported ?? IMPORTED_WATER)} />
            <Row k="3. NEWater" v={Math.round(ws.newater || 0)} />
            <Row k="4. Desalinated water" v={Math.round(ws.desal || 0)} />
            <Row k="Supply / demand" v={`${Math.round(s.waterSupply || 0)} / ${Math.round(s.waterDemand || 0)}`} />
            <Bar value={s.waterSupply || 0} max={Math.max(s.waterSupply || 1, s.waterDemand || 1)} color={(s.waterSupply || 0) >= (s.waterDemand || 0) ? "#0ea5e9" : "#dc2626"} />
          </div>
          <div>
            <h3 className="font-bold text-slate-700">🎯 Goals</h3>
            {GOALS.map((g) => (
              <div key={g.id} className={w.goalsDone[g.id] ? "text-emerald-700" : "text-slate-600"}>
                {w.goalsDone[g.id] ? "✅" : "⬜"} {g.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-2 border-b border-slate-100 py-0.5">
      <span>{k}</span>
      <span className="font-semibold tabular-nums">{v}</span>
    </div>
  );
}

export function NewsPanel({ world, onClose }) {
  return (
    <Panel title="📰 The Straits Planner" onClose={onClose}>
      {world.news.length === 0 && <p className="text-slate-500">No news yet.</p>}
      <ul className="space-y-2">
        {world.news.map((n, i) => (
          <li key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <div className="text-[11px] font-bold text-rose-600">{n.date}</div>
            {n.text}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function HelpPanel({ onClose }) {
  return (
    <Panel title="❓ How to plan Singapore" onClose={onClose} wide>
      <div className="space-y-3 text-sm leading-snug">
        <p>
          You are the chief planner of a newly independent island in <b>1965</b>. Thousands of people live in crowded kampongs and are <b>waiting for a home</b>. Plan estates, jobs, transport and amenities, and balance the budget.
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          <Tip t="1. Roads first" d="Every zone and amenity needs a road within 2 tiles. Drag with 🛣️ Road to draw." />
          <Tip t="2. Zone land" d="🏢 HDB for most people, 🏡 private housing for land-sale income, 🏬 commercial & 🏭 industrial for jobs. Drag a rectangle." />
          <Tip t="3. Power & water" d="Build a ⚡ gas power station, and 🚰 waterworks near the reservoirs in the middle of the island. Imported water ends in 2061!" />
          <Tip t="4. Amenities" d="Hawker centres, schools, polyclinics, police and fire stations make estates desirable so blocks grow taller." />
          <Tip t="5. Watch demand" d="The R / C / I bars show what's needed. R = people waiting for homes, C = shops & offices, I = factories." />
          <Tip t="6. Balance the budget" d="Open 💰 to set taxes, HDB grants and department funding. Watch your approval in 📊." />
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <b>Controls</b>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>Pick a tool on the left, then tap or drag on the map to build.</li>
            <li>Two fingers: move the map and pinch to zoom. With 👆 Inspect, one finger moves the map and a tap shows details.</li>
            <li>On a computer: right-drag to move, mouse wheel to zoom.</li>
            <li>🗺️ Map layers show land value, pollution and amenity coverage.</li>
          </ul>
        </div>
        <p className="text-[12px] text-slate-500">
          This is a game, not a real planning model. URA, HDB, JTC and the other agencies named here are real Singapore government bodies; the numbers in the game are simplified for fun.
        </p>
      </div>
    </Panel>
  );
}

function Tip({ t, d }) {
  return (
    <div className="rounded-xl border border-slate-200 p-2">
      <div className="font-bold">{t}</div>
      <div className="text-[13px] text-slate-600">{d}</div>
    </div>
  );
}

export function MenuPanel({ world, onClose, onSave, onNew, onHelp, onQuit, saved }) {
  return (
    <Panel title="☰ Menu" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <MenuBtn onClick={onSave} icon="💾" label={saved ? "Saved!" : "Save city"} />
        <MenuBtn onClick={onHelp} icon="❓" label="How to play" />
        <MenuBtn onClick={onNew} icon="🆕" label="New city" />
        <MenuBtn onClick={onQuit} icon="🏠" label="Title screen" />
      </div>
      <p className="mt-3 text-[12px] text-slate-500">
        {world.name} · {world.sandbox ? "Sandbox mode (unlimited money, everything unlocked)" : `${world.difficulty[0].toUpperCase()}${world.difficulty.slice(1)} difficulty`}. The game saves itself on this device every month and after every build, so you can close the page and pick up where you left off.
      </p>
    </Panel>
  );
}

function MenuBtn({ onClick, icon, label }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-3 text-left font-semibold hover:bg-slate-200">
      <span className="text-2xl">{icon}</span>
      {label}
    </button>
  );
}
