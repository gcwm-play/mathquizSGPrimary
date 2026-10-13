// Panels for finances, decisions, crises, objectives and the mayors' league.
import React, { useRef, useState } from "react";
import { Panel } from "../city/panels.jsx";
import { fmtMoney, fmtNum, projectFinance, REV_LABELS, EXP_LABELS, tToDate, wearRate, dateLabel, sentosaState } from "./sim.js";
import { STRUCTS, PURPOSES, MALL_NAMES, ALL_TOOLS as ALL_TOOLS_REF } from "./defs.js";
import { setPurpose } from "./world.js";
import { CRISES, getDecision } from "./events.js";
import { objectiveProgress } from "./objectives.js";
import { STYLES } from "./rivals.js";
import { METRICS, mayorScore, grade } from "./society.js";
import { LineChart, bucket } from "./charts.jsx";

const IN = "#2a78d6";
const OUT = "#eb6834";
const CASH = "#5b5fc7";

const tYear = (w, t) => w.year + Math.floor((w.month + t - w.t) / 12);
const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);

function Bar({ value, max = 100, c, mark }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1e-6, max)) * 100));
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--soft)]">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
      {mark != null && <div className="absolute inset-y-0 w-0.5 bg-[var(--ink)]" style={{ left: `${mark}%` }} />}
    </div>
  );
}
function Stat({ label, value, sub, tone }) {
  return (
    <div className={`rounded-2xl border-2 border-[var(--ink)]/10 px-2 py-1.5 ${tone === "bad" ? "bg-[var(--bad-bg)] text-[var(--bad)]" : "bg-[var(--soft)]"}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-base font-bold tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-[11px] leading-tight opacity-75">{sub}</div>}
    </div>
  );
}
function Slider({ id, label, value, min, max, step = 1, suffix = "%", onChange, hint }) {
  return (
    <div className="py-1">
      <label htmlFor={id} className="flex items-center justify-between text-[15px]">
        <span className="font-semibold">{label}</span>
        <span className="font-bold tabular-nums text-[var(--brand)]">
          {value}
          {suffix}
        </span>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="city-range w-full" />
      {hint && <div className="text-[13px] leading-snug text-[var(--muted)]">{hint}</div>}
    </div>
  );
}

// ---------------- finances ----------------
export function FinancePanel({ world: w, analysis: A, onChange, onClose }) {
  const [scope, setScope] = useState("region");
  const [table, setTable] = useState(false);
  const base = useRef(null);
  if (!base.current && A) base.current = projectFinance(w, A);
  const P = A ? projectFinance(w, A) : null;
  const ti = scope === "region" ? null : Number(scope);
  const set = (fn) => {
    fn();
    onChange();
  };
  if (!P) return null;

  const hist = w.fin.slice(-120);
  // regular income and running costs; one-off projects and sales show in the treasury
  const pick = (f, k) => {
    if (ti == null) return k === "r" ? f.rr ?? f.r : k === "e" ? f.re ?? f.e : f.c;
    if (k === "c") return 0;
    return (k === "r" ? f.trr ?? f.tr : f.tre ?? f.te)?.[ti] ?? 0;
  };
  const proj = ti == null ? P.region : P.towns[ti];
  const baseProj = ti == null ? base.current.region : base.current.towns[ti];
  const H = (k) => bucket(hist.map((f) => ({ t: f.t, v: pick(f, k) })));
  const J = (arr, k) => bucket(arr.map((f) => ({ t: f.t, v: f[k] })));
  const changed = Math.abs(sum(proj.map((p) => p.r - p.e)) - sum(baseProj.map((p) => p.r - p.e))) > Math.max(5, Math.abs(sum(baseProj.map((p) => p.r))) * 0.003);
  const series = [
    { name: "Income", color: IN, hist: H("r"), proj: J(proj, "r") },
    { name: "Running costs", color: OUT, hist: H("e"), proj: J(proj, "e") },
  ];
  if (changed) {
    series.push({ name: "in (before)", color: IN, ghost: true, proj: J(baseProj, "r") });
    series.push({ name: "out (before)", color: OUT, ghost: true, proj: J(baseProj, "e") });
  }
  const cashSeries = [{ name: "Treasury", color: CASH, hist: hist.map((f) => ({ t: f.t, v: f.c })), proj: J(proj, "c") }];
  if (changed) cashSeries.push({ name: "before", color: CASH, ghost: true, proj: J(baseProj, "c") });
  const allT = [...hist.map((f) => f.t), ...proj.map((p) => p.t)];
  const t0 = allT[0] ?? w.t;
  const t1 = allT[allT.length - 1] ?? w.t;
  const span = (t1 - t0) / 12;
  const every = span > 12 ? 4 : span > 6 ? 2 : 1;
  const ticksX = [];
  for (let t = t0; t <= t1; t++) {
    const m = (w.month + t - w.t) % 12;
    if ((m + 12) % 12 === 0 && tYear(w, t) % every === 0) ticksX.push(t);
  }
  const marks = [w.election.next, w.election.next + 72].map((t) => ({ t, icon: "🗳️" }));
  const fmtX = (t, long) => (long ? tToDate(w, t) : String(tYear(w, t)));
  const fmtY = (v) => fmtMoney(v).replace(".00", "");

  const B = ti == null ? P.budget : P.budget.towns[ti];
  const net = sum(B.rev) - sum(B.exp);
  const end = proj[proj.length - 1];
  const yearAhead = proj.slice(0, 12);
  const nextYearNet = yearAhead.reduce((a, p) => a + p.r - p.e, 0);
  const term = w.term;
  const perRes = P.budget.rev.grant - (term?.block || 0);
  const town = ti != null ? w.towns[ti] : null;
  const rows = (obj, labels) =>
    Object.entries(labels)
      .map(([k, l]) => [l, obj[k] || 0])
      .filter(([, v]) => Math.abs(v) > 0.5)
      .sort((a, b) => b[1] - a[1]);
  const revRows = rows(B.rev, REV_LABELS);
  const expRows = rows(B.exp, EXP_LABELS);
  const maxRow = Math.max(1, ...revRows.map((r) => r[1]), ...expRows.map((r) => r[1]));

  const tabs = [["region", "🏙️ Region"], ...w.towns.map((t, i) => [String(i), t.name])];
  return (
    <Panel title="💰 Finances" onClose={onClose} tabs={tabs} tab={scope} setTab={setScope}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ti == null ? (
          <>
            <Stat label="Treasury" value={fmtMoney(w.cash)} tone={w.cash < 0 ? "bad" : null} />
            <Stat label="This month" value={(net >= 0 ? "+" : "") + fmtMoney(net)} sub="incl. one-off projects" tone={net < 0 ? "bad" : null} />
            <Stat label="Next 12 months" value={(nextYearNet >= 0 ? "+" : "") + fmtMoney(nextYearNet)} sub="projected" tone={nextYearNet < 0 ? "bad" : null} />
            <Stat label={`Treasury in ${tYear(w, end.t)}`} value={fmtMoney(end.c)} sub="if nothing changes" tone={end.c < 0 ? "bad" : null} />
          </>
        ) : (
          <>
            <Stat label="Residents" value={fmtNum(town.pop || 0)} sub={`${fmtNum(town.vacant || 0)} empty homes`} />
            <Stat label="This month" value={(net >= 0 ? "+" : "") + fmtMoney(net)} sub="town's money in − out" tone={net < 0 ? "bad" : null} />
            <Stat label="Next 12 months" value={(nextYearNet >= 0 ? "+" : "") + fmtMoney(nextYearNet)} sub="projected" tone={nextYearNet < 0 ? "bad" : null} />
            <Stat label="Happiness" value={`${Math.round(town.approval)}%`} sub={`Housing ${Math.round(town.needs?.housing ?? 0)} · Cost ${Math.round(town.needs?.cost ?? 0)}`} />
          </>
        )}
      </div>

      <div className="mt-3 rounded-2xl border-2 border-[var(--ink)]/10 p-2">
        <LineChart
          title={`${ti == null ? "Region" : town.name}: regular income vs running costs, per month`}
          series={series}
          nowT={w.t}
          fmtY={fmtY}
          fmtX={fmtX}
          ticksX={ticksX}
          marks={marks}
          height={180}
        />
        {ti == null && (
          <div className="mt-2">
            <LineChart title="Treasury (money in the bank)" series={cashSeries} nowT={w.t} fmtY={fmtY} fmtX={fmtX} ticksX={ticksX} marks={marks} height={130} />
          </div>
        )}
        <div className="mt-1 flex items-center justify-between gap-2 text-[12px] text-[var(--muted)]">
          <span>Solid = what happened (3-month average). Dashed = projection with today's settings. One-off projects and land &amp; flat sales show in the treasury{ti == null ? " line" : ""}. Drag across a chart for values.</span>
          <button onClick={() => setTable(!table)} className="city-btn shrink-0 rounded-full bg-[var(--soft)] px-2 py-1 font-bold text-[var(--ink)]">
            {table ? "Hide table" : "Table"}
          </button>
        </div>
        {table && (
          <div className="mt-1 max-h-40 overflow-y-auto text-[12px]">
            <table className="w-full tabular-nums">
              <thead>
                <tr className="text-left text-[var(--muted)]">
                  <th>Year</th>
                  <th>In / month</th>
                  <th>Out / month</th>
                  {ti == null && <th>Treasury</th>}
                </tr>
              </thead>
              <tbody>
                {yearRows(w, hist, proj, pick).map((r) => (
                  <tr key={r.year} className={r.proj ? "text-[var(--muted)]" : ""}>
                    <td>
                      {r.year}
                      {r.proj ? "*" : ""}
                    </td>
                    <td>{fmtMoney(r.r)}</td>
                    <td>{fmtMoney(r.e)}</td>
                    {ti == null && <td>{fmtMoney(r.c)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[var(--muted)]">* projected</div>
          </div>
        )}
      </div>

      <h3 className="mb-1 mt-3 font-bold">🎚️ {ti == null ? "Region-wide choices" : `${town.name}'s town council`}</h3>
      <p className="text-[13px] text-[var(--muted)]">Move a slider and the dashed projection updates; the faint dotted line shows where you were heading before.</p>
      {ti == null ? (
        <>
          <Slider id="f-tax" label="🏠 Property tax" value={w.taxes.property} min={0} max={20} onChange={(v) => set(() => (w.taxes.property = v))} hint={`More money, but above 8% residents feel the pinch.${w.taxes.property > 12 ? " ⚠️ Cost of living complaints rising." : ""}`} />
          <Slider id="f-fund" label="🛠️ Services funding" value={w.funding} min={40} max={120} step={5} onChange={(v) => set(() => (w.funding = v))} hint="Less funding saves money but clinics, schools and police reach fewer homes." />
          <Slider id="f-grant" label="🔑 HDB grant" value={w.hdbGrant} min={0} max={100} step={5} onChange={(v) => set(() => (w.hdbGrant = v))} hint="Bigger grants make flats cheaper for families but bring in less from flat sales." />
        </>
      ) : (
        <>
          <Slider
            id="f-maint"
            label="🧽 Estate maintenance"
            value={town.maint ?? 100}
            min={40}
            max={150}
            step={10}
            onChange={(v) => set(() => (town.maint = v))}
            hint={`Blocks wear out at ${wearRate(town.maint ?? 100).toFixed(1)}× normal speed. ${(town.maint ?? 100) < 100 ? "Cheaper, but peeling paint and broken lifts upset residents." : (town.maint ?? 100) > 100 ? "Spotless estates: residents are happier and blocks last longer." : "Standard upkeep."}`}
          />
          <Slider
            id="f-scc"
            label="🧹 S&CC charges"
            value={town.scc ?? 100}
            min={50}
            max={200}
            step={10}
            onChange={(v) => set(() => (town.scc = v))}
            hint={`About $${Math.round(19 * ((town.scc ?? 100) / 100))} per household a month. Higher charges pay for maintenance but raise the cost of living.`}
          />
          <button
            onClick={() =>
              set(() => {
                for (const t of w.towns) {
                  t.maint = town.maint ?? 100;
                  t.scc = town.scc ?? 100;
                }
              })
            }
            className="city-btn mt-1 rounded-full bg-[var(--soft)] px-3 py-1.5 text-[13px] font-bold"
          >
            Use these settings in every town
          </button>
        </>
      )}

      {ti == null && term && (
        <div className="mt-3 rounded-2xl bg-[var(--soft)] p-2.5 text-[14px] leading-snug">
          <div className="font-bold">🏛️ This term's budget</div>
          The central government pays a fixed block grant of <b>{fmtMoney(term.block)}</b> a month until the {tYear(w, term.end)} election ({fmtMoney(term.block * term.months)} for the term), plus about <b>{fmtMoney(perRes)}</b> a month for your current residents. It's reset after each election based on how many people you house.
          {w.policy?.monthlyItems?.length > 0 && <div className="mt-1 text-[13px] text-[var(--muted)]">Ongoing schemes: {w.policy.monthlyItems.map((m) => `${m.text} (${m.v > 0 ? "−" : "+"}${fmtMoney(Math.abs(m.v))}/mo)`).join(", ")}</div>}
        </div>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 flex items-center gap-1.5 font-bold">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: IN }} />
            Money in this month
          </h3>
          {revRows.map(([l, v]) => (
            <div key={l} className="py-0.5 text-[14px]">
              <div className="flex justify-between">
                <span>{l}</span>
                <b className="tabular-nums">{fmtMoney(v)}</b>
              </div>
              <Bar value={v} max={maxRow} c={IN} />
            </div>
          ))}
        </div>
        <div>
          <h3 className="mb-1 flex items-center gap-1.5 font-bold">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: OUT }} />
            Money out this month
          </h3>
          {expRows.map(([l, v]) => (
            <div key={l} className="py-0.5 text-[14px]">
              <div className="flex justify-between">
                <span>{l}</span>
                <b className="tabular-nums">{fmtMoney(v)}</b>
              </div>
              <Bar value={v} max={maxRow} c={OUT} />
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[12px] text-[var(--muted)]">Money is in today's Singapore dollars, scaled to a game-sized region. Projections are estimates: crises, decisions and your building will change them.</p>
    </Panel>
  );
}

function yearRows(w, hist, proj, pick) {
  const by = new Map();
  const add = (t, r, e, c, isProj) => {
    const y = tYear(w, t);
    const o = by.get(y) || { year: y, r: 0, e: 0, c: 0, n: 0, proj: isProj };
    o.r += r;
    o.e += e;
    o.c = c;
    o.n++;
    o.proj = o.proj || isProj;
    by.set(y, o);
  };
  for (const f of hist) add(f.t, pick(f, "r"), pick(f, "e"), f.c, false);
  for (const p of proj) add(p.t, p.r, p.e, p.c ?? 0, true);
  return [...by.values()].map((o) => ({ ...o, r: o.r / o.n, e: o.e / o.n }));
}

// ---------------- decisions ----------------
export function DecisionPanel({ world: w, onPick }) {
  const card = getDecision(w);
  if (!card) return null;
  const crisis = card.kind !== "dilemma";
  return (
    <Panel title={`${card.icon} ${card.tag}`} onClose={() => {}} closable={false}>
      <div className={`rounded-2xl p-3 ${crisis ? "bg-[var(--bad-bg)]" : "bg-[var(--soft)]"}`}>
        <div className="flex items-start gap-3">
          <span className="text-5xl leading-none">{card.icon}</span>
          <div className="min-w-0">
            <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--brand)]">
              {crisis ? "⚠️ " : "🤔 "}
              {card.tag} · {dateLabel(w)}
            </div>
            <div className="text-xl font-bold leading-tight">{card.title}</div>
            <p className="mt-1 text-[15px] leading-snug">{card.text}</p>
            {card.hint && <p className="mt-1 text-[13px] font-semibold text-[var(--muted)]">💡 {card.hint}</p>}
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {card.options.map((o) => {
          const poor = o.cost > 0 && o.cost > w.cash && !w.sandbox;
          return (
            <button key={o.id} disabled={poor} onClick={() => onPick(o.id)} className="city-btn flex flex-col rounded-2xl border-2 border-[var(--ink)]/15 bg-[var(--card)] p-2.5 text-left disabled:opacity-50">
              <span className="font-bold leading-tight">{o.label}</span>
              <span className="mt-1 flex flex-wrap gap-1 text-[12px] font-bold tabular-nums">
                {o.cost > 0 && <span className="rounded-full bg-[var(--bad-bg)] px-2 py-0.5 text-[var(--bad)]">−{fmtMoney(o.cost)}</span>}
                {o.gain > 0 && <span className="rounded-full px-2 py-0.5 text-[var(--good)]" style={{ background: "rgba(47,191,113,0.15)" }}>+{fmtMoney(o.gain)}</span>}
                {o.monthly > 0 && <span className="rounded-full bg-[var(--bad-bg)] px-2 py-0.5 text-[var(--bad)]">−{fmtMoney(o.monthly)}/month</span>}
                {o.monthly < 0 && <span className="rounded-full px-2 py-0.5 text-[var(--good)]" style={{ background: "rgba(47,191,113,0.15)" }}>+{fmtMoney(-o.monthly)}/month</span>}
                {o.chance != null && <span className="rounded-full bg-[var(--soft)] px-2 py-0.5">🎲 {Math.round(o.chance * 100)}% chance</span>}
              </span>
              {o.effects?.length > 0 && (
                <span className="mt-1 flex flex-wrap gap-1 text-[11.5px] font-semibold leading-tight">
                  {o.effects.map((e, i) => (
                    <span key={i} className="rounded-md border px-1.5 py-0.5" style={{ borderColor: e.good ? "rgba(47,191,113,0.5)" : "rgba(255,90,90,0.45)", color: e.good ? "var(--good)" : "var(--bad)" }}>
                      {e.t}
                    </span>
                  ))}
                </span>
              )}
              <ul className="mt-1 space-y-0.5 text-[13px] leading-snug">
                {(o.pros || []).map((p) => (
                  <li key={p}>
                    <span aria-hidden="true">✅</span> {p}
                  </li>
                ))}
                {(o.cons || []).map((p) => (
                  <li key={p} className="text-[var(--muted)]">
                    <span aria-hidden="true">⚠️</span> {p}
                  </li>
                ))}
              </ul>
              {poor && <span className="mt-1 text-[12px] font-bold text-[var(--bad)]">Not enough money</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-[var(--muted)]">The clock is paused until you decide. Choices can have consequences years later.</p>
    </Panel>
  );
}

// ---------------- crisis ----------------
const EFFECT_TEXT = {
  business: "Business tax",
  tourism: "Tourism income",
  trade: "Trade income",
  land: "Land & flat sales",
  jobs: "Jobs available",
  health: "Healthcare",
  upkeep: "Running costs",
  growth: "New families",
};
export function CrisisPanel({ world: w, onClose }) {
  const cr = w.crisis;
  if (!cr) return null;
  const C = CRISES[cr.id];
  const eff = w.effects.find((e) => e.id === "crisis")?.effect || {};
  const choice = C.choices.find((c) => c.id === cr.choice);
  const left = Math.max(0, cr.until - w.t);
  return (
    <Panel title={`${C.icon} ${C.name}`} onClose={onClose}>
      <p className="text-[15px] leading-snug">{C.text}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Stat label="Time left" value={`${left} month${left === 1 ? "" : "s"}`} sub={`ends about ${tToDate(w, cr.until)}`} />
        <Stat label="Severity" value={cr.scale > 1 ? "Severe" : cr.scale > 0.6 ? "Serious" : "Contained"} sub={`${Math.round((cr.scale || cr.sev) * 100)}% of full impact`} tone={cr.scale > 1 ? "bad" : null} />
      </div>
      <h3 className="mb-1 mt-3 font-bold">🛡️ How ready your region is</h3>
      <div className="text-[14px]">
        <div className="flex justify-between">
          <span>{C.mitigate.label}</span>
          <b>{Math.round((cr.mit || 0) * 100)}%</b>
        </div>
        <Bar value={(cr.mit || 0) * 100} c={(cr.mit || 0) > 0.6 ? "var(--good)" : (cr.mit || 0) > 0.3 ? "var(--warn)" : "var(--bad)"} />
        <p className="mt-1 text-[13px] text-[var(--muted)]">💡 {C.hint} Building now still helps: readiness is checked every month.</p>
      </div>
      <h3 className="mb-1 mt-3 font-bold">📉 Impact right now</h3>
      <ul className="space-y-0.5 text-[14px]">
        {Object.entries(eff)
          .filter(([k]) => EFFECT_TEXT[k])
          .map(([k, v]) => (
            <li key={k}>
              {EFFECT_TEXT[k]}: <b className={(k === "upkeep" ? v > 1 : v < 1) ? "text-[var(--bad)]" : "text-[var(--good)]"}>{v >= 1 ? "+" : "−"}{Math.abs(Math.round((v - 1) * 100))}%</b>
            </li>
          ))}
        {eff.mood < 0 && <li>Mood: residents are anxious ({Math.round(eff.mood)} support)</li>}
      </ul>
      {choice && (
        <p className="mt-3 rounded-2xl bg-[var(--soft)] p-2 text-[14px]">
          Your response: <b>{choice.label}</b>
        </p>
      )}
    </Panel>
  );
}

// ---------------- objectives ----------------
export function ObjectiveRow({ world: w, analysis: A, o }) {
  const P = A ? objectiveProgress(w, A, o) : null;
  const fmt = (v) => (P?.money ? fmtMoney(v) : P?.pct ? `${v}%` : P?.dec ? v : P?.gap ? (v >= 0 ? `+${v}` : `${v}`) : fmtNum(v));
  let pct = 0;
  if (P) {
    if (P.gap) pct = P.cur >= 0 ? 100 : Math.max(0, 100 + P.cur * 5);
    else if (P.lower) pct = P.cur <= P.target ? 100 : Math.max(0, 100 - ((P.cur - P.target) / Math.max(1, P.cur)) * 100);
    else pct = Math.min(100, (P.cur / Math.max(1e-6, P.target)) * 100);
  }
  const left = o.deadline - w.t;
  return (
    <li className="rounded-2xl border-2 border-[var(--ink)]/10 p-2">
      <div className="font-bold leading-tight">{o.text}</div>
      <div className="mt-0.5 text-[13px] leading-snug text-[var(--muted)]">{o.hint}</div>
      {P && (
        <div className="mt-1 text-[13px]">
          <div className="flex justify-between tabular-nums">
            <span>
              Now: <b>{fmt(P.cur)}</b>
              {!P.gap && (
                <>
                  {" "}
                  · Target: <b>{fmt(P.target)}</b>
                </>
              )}
              {P.gap && " vs rival"}
            </span>
            <span className={left < 12 ? "font-bold text-[var(--bad)]" : ""}>⏳ {left > 0 ? `${Math.floor(left / 12) ? `${Math.floor(left / 12)}y ` : ""}${left % 12}m` : "due"}</span>
          </div>
          <Bar value={pct} c="var(--good)" />
        </div>
      )}
      <div className="mt-1 text-[12px] font-semibold text-[var(--muted)]">
        Reward: +{fmtMoney(o.reward?.cash || 0)} grant · +trust · +reputation
      </div>
    </li>
  );
}

// ---------------- mayors league ----------------
export function myMetrics(w) {
  const y = w.yearly[w.yearly.length - 1];
  return y || { happy: Math.round(w.approval), housing: 50, health: 50, fert: 50, finance: 50, rep: Math.round(w.rep ?? 50) };
}
export function standings(w) {
  const me = myMetrics(w);
  const rows = [{ you: true, name: w.name, mayor: "You", m: me, score: mayorScore(me), pop: w.stats.pop, life: w.stats.life, tfr: w.stats.tfr }];
  for (const r of w.rivals || []) rows.push({ name: r.regionName, mayor: r.mayor, style: STYLES[r.style], m: r.m, score: mayorScore(r.m), pop: r.pop, life: r.life, tfr: r.tfr, notes: r.notes });
  rows.sort((a, b) => b.score - a.score);
  return rows;
}
export function myRank(w) {
  return standings(w).findIndex((r) => r.you) + 1;
}

function LeagueTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] tabular-nums">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--muted)]">
            <th className="py-1 pr-1">#</th>
            <th className="pr-1">Mayor</th>
            <th className="pr-1">Score</th>
            {METRICS.map((M) => (
              <th key={M.k} className="px-0.5 text-center" title={M.name}>
                <span aria-label={M.name}>{M.icon}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.mayor} className={r.you ? "bg-[var(--warn-bg)] font-bold" : ""}>
              <td className="py-1 pr-1">{i + 1}</td>
              <td className="pr-1 leading-tight">
                {r.you ? "⭐ You" : r.mayor}
                <span className="block text-[11px] font-normal text-[var(--muted)]">{r.name}</span>
              </td>
              <td className="pr-1">
                {r.score} <span className="text-[11px] text-[var(--muted)]">{grade(r.score).g}</span>
              </td>
              {METRICS.map((M) => (
                <td key={M.k} className="px-0.5 text-center" style={{ color: (r.m[M.k] ?? 50) >= 60 ? "var(--good)" : (r.m[M.k] ?? 50) < 42 ? "var(--bad)" : undefined }}>
                  {Math.round(r.m[M.k] ?? 50)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-1 text-[11px] text-[var(--muted)]">{METRICS.map((M) => `${M.icon} ${M.name}`).join(" · ")}. 50 = national average for the era.</div>
    </div>
  );
}

export function RivalsPanel({ world: w, onClose, onReport }) {
  const rows = standings(w);
  return (
    <Panel title="📊 Mayors' league" onClose={onClose}>
      <p className="text-[14px] leading-snug text-[var(--muted)]">AI mayors run Singapore's other regions. Every ten years you get a report card comparing you with them: not just money, but happiness, housing, health, births and reputation.</p>
      <div className="mt-2">
        <LeagueTable rows={rows} />
      </div>
      <h3 className="mb-1 mt-3 font-bold">The other mayors</h3>
      <div className="grid gap-2 sm:grid-cols-3">
        {(w.rivals || []).map((r) => (
          <div key={r.region} className="rounded-2xl border-2 border-[var(--ink)]/10 p-2 text-[13px]">
            <div className="font-bold leading-tight">{r.mayor}</div>
            <div className="text-[12px] text-[var(--muted)]">
              {r.regionName} · {STYLES[r.style].name}
            </div>
            <div className="text-[12px] italic text-[var(--muted)]">{STYLES[r.style].blurb}</div>
            <ul className="mt-1 space-y-0.5">
              {r.notes.slice(-2).map((n, i) => (
                <li key={i}>
                  {n.innov ? "✨" : n.tone === "good" ? "👍" : n.tone === "bad" ? "👎" : "•"} {n.year}: {n.text}
                </li>
              ))}
              {!r.notes.length && <li className="text-[var(--muted)]">Nothing notable yet.</li>}
            </ul>
          </div>
        ))}
      </div>
      {w.reports?.length > 0 && (
        <>
          <h3 className="mb-1 mt-3 font-bold">📜 Decade report cards</h3>
          <div className="flex flex-wrap gap-2">
            {w.reports.map((r, i) => (
              <button key={i} onClick={() => onReport(i)} className="city-btn rounded-full bg-[var(--soft)] px-3 py-1.5 text-[13px] font-bold">
                {r.from}–{r.to}: #{r.rank} · {r.grade.g}
              </button>
            ))}
          </div>
        </>
      )}
      {!w.reports?.length && <p className="mt-3 text-[13px] text-[var(--muted)]">Your first report card arrives in January 1975.</p>}
    </Panel>
  );
}

export function ReportPanel({ world: w, index, onClose }) {
  const r = w.reports[index];
  if (!r) return null;
  return (
    <Panel title={`📜 Report card ${r.from}–${r.to}`} onClose={onClose}>
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--soft)] p-3">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-[var(--card)] ring-2 ring-[var(--brand)]">
          <span className="text-3xl font-bold leading-none">{r.grade.g}</span>
          <span className="text-[11px] font-bold">{r.you.score}/100</span>
        </div>
        <div className="min-w-0">
          <div className="text-lg font-bold leading-tight">{r.headline}</div>
          <div className="text-[13px] text-[var(--muted)]">
            {r.grade.text} decade · ranked #{r.rank} of {r.of}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <LeagueTable rows={r.rows} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 font-bold">📌 Your decade</h3>
          <ul className="space-y-0.5 text-[14px] leading-snug">
            {r.facts.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
            {r.good.map((f, i) => (
              <li key={`g${i}`}>👍 You {f}.</li>
            ))}
            {r.bad.map((f, i) => (
              <li key={`b${i}`} className="text-[var(--bad)]">
                👎 You {f}.
              </li>
            ))}
          </ul>
          {(r.strengths.length > 0 || r.weaknesses.length > 0) && (
            <div className="mt-2 text-[13px]">
              {r.strengths.length > 0 && <div>💪 Ahead on: {r.strengths.join(", ")}</div>}
              {r.weaknesses.length > 0 && <div className="text-[var(--bad)]">🔻 Behind on: {r.weaknesses.join(", ")}</div>}
            </div>
          )}
        </div>
        <div>
          <h3 className="mb-1 font-bold">🗞️ Meanwhile, the other mayors…</h3>
          <ul className="space-y-1.5 text-[13px] leading-snug">
            {r.rows
              .filter((x) => !x.you)
              .map((x) => (
                <li key={x.mayor}>
                  <b>{x.mayor}</b> <span className="text-[var(--muted)]">({x.name}, {x.style})</span>
                  {x.notes?.length ? (
                    <ul className="ml-1">
                      {x.notes.slice(-3).map((n, i) => (
                        <li key={i}>
                          {n.innov ? "✨ Innovative:" : n.tone === "good" ? "👍" : n.tone === "bad" ? "👎" : "•"} {n.text}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[var(--muted)]"> kept things ticking over.</span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      </div>
      <button onClick={onClose} className="city-btn city-sticker mt-4 w-full rounded-2xl bg-[var(--brand)] py-2 font-bold text-white">
        Back to work
      </button>
    </Panel>
  );
}

export function FinalReport({ final, onReports }) {
  if (!final) return null;
  return (
    <div className="mt-3 rounded-2xl bg-[var(--soft)] p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-[var(--card)] ring-2 ring-[var(--brand)]">
          <span className="text-3xl font-bold leading-none">{final.grade.g}</span>
          <span className="text-[11px] font-bold">{final.avg}/100</span>
        </div>
        <div>
          <div className="text-lg font-bold leading-tight">“{final.title}”</div>
          <div className="text-[13px] text-[var(--muted)]">
            {final.decades} decade report{final.decades === 1 ? "" : "s"} · best mayor in Singapore {final.firsts} time{final.firsts === 1 ? "" : "s"}
          </div>
        </div>
      </div>
      {final.best && (
        <p className="mt-2 text-[14px]">
          🌟 Best decade: {final.best.from}–{final.best.to} ({final.best.you.score}). {final.worst && final.worst !== final.best ? `Toughest: ${final.worst.from}–${final.worst.to} (${final.worst.you.score}).` : ""}
        </p>
      )}
      {onReports && (
        <button onClick={onReports} className="city-btn mt-2 rounded-full bg-[var(--card)] px-3 py-1.5 text-[13px] font-bold">
          📊 See every report card
        </button>
      )}
    </div>
  );
}

// ---------------- relocation impact ----------------
export function ImpactBox({ impact, town, gain, months }) {
  if (!impact && !gain) return null;
  const level = impact ? (impact.anger < 0.6 ? ["Low", "var(--good)"] : impact.anger < 1.6 ? ["Medium", "var(--warn)"] : ["High", "var(--bad)"]) : null;
  return (
    <div className="mt-2 rounded-xl bg-[var(--soft)] p-2 text-[13px] leading-snug">
      {impact && (
        <>
          <div className="font-bold">🚚 Where {fmtNum(impact.n)} residents would go</div>
          <ul className="mt-0.5 space-y-0.5 tabular-nums">
            <li>🏠 {fmtNum(impact.same)} into empty homes in {town} {impact.sameFree < impact.n ? <span className="text-[var(--muted)]">(only {fmtNum(impact.sameFree)} empty)</span> : null}</li>
            {impact.other > 0 && <li>🏘️ {fmtNum(impact.other)} to empty homes in other towns</li>}
            {impact.queue > 0 && (
              <li className="text-[var(--bad)]">
                ⏳ {fmtNum(impact.queue)} join the housing queue (→ {fmtNum(impact.queueAfter)} waiting)
              </li>
            )}
            {impact.leave > 0 && <li className="text-[var(--bad)]">✈️ {fmtNum(impact.leave)} give up and leave the region</li>}
          </ul>
          <div className="mt-0.5">
            Public anger: <b style={{ color: level[1] }}>{level[0]}</b>
            {impact.queue > 0 ? " · Tip: finish new flats nearby first so everyone can be rehoused." : " · Everyone can be rehoused."}
          </div>
        </>
      )}
      {gain > 0 && (
        <div className={impact ? "mt-1" : ""}>
          🏗️ +{fmtNum(gain)} more homes once rebuilt ({months} months)
        </div>
      )}
    </div>
  );
}


// ---------------- Sentosa ----------------
const SENTOSA_PARTS = ["cableCar", "sentosaBeach", "underwaterWorld", "sentosaBridge", "sentosaExpress", "resortsWorld"];
export function SentosaPanel({ world: w, analysis: A, onChange, onClose }) {
  const S0 = w.sentosa;
  if (!S0) return null;
  const st = sentosaState(w, A);
  const set = (fn) => {
    fn();
    onChange();
  };
  const ti = w.towns.findIndex((t) => t.purpose === "resort");
  const town = w.towns[ti];
  const income = (S0.last?.tickets || 0) + (S0.last?.spending || 0);
  const cost = (S0.last?.upkeep || 0) + S0.marketing;
  const built = new Set(w.structs.map((s) => s.type));
  return (
    <Panel title="🏝️ Sentosa Development Corporation" onClose={onClose}>
      <p className="text-[14px] leading-snug text-[var(--muted)]">Sentosa is run for visitors, not residents. No HDB flats or factories: hotels, beaches and attractions bring people, and getting there matters. Visitors pay entry and spend money; crowds and high prices put them off.</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Visitors / month" value={fmtNum(S0.visitors)} />
        <Stat label="Visitor happiness" value={`${Math.round(S0.sat)}%`} tone={S0.sat < 45 ? "bad" : null} sub={st.crowd > 1.1 ? "Overcrowded! Add hotels or attractions" : st.crowd < 0.5 ? "Plenty of room" : "Busy"} />
        <Stat label="Island income" value={fmtMoney(income)} sub="per month" />
        <Stat label="Island costs" value={fmtMoney(cost)} sub={`net ${income - cost >= 0 ? "+" : ""}${fmtMoney(income - cost)}`} tone={income - cost < 0 ? "bad" : null} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
        {[
          ["🚡 Getting there", st.link / 1.25],
          ["🎢 Attractions", Math.min(1, (st.appeal - 0.35) / 3)],
        ].map(([l, v]) => (
          <div key={l}>
            <div className="flex justify-between">
              <span>{l}</span>
              <b>{Math.round(v * 100)}%</b>
            </div>
            <Bar value={v * 100} c={v > 0.6 ? "var(--good)" : v > 0.3 ? "var(--warn)" : "var(--bad)"} />
          </div>
        ))}
        <div>
          <div className="flex justify-between">
            <span>🏨 Crowding</span>
            <b>{Math.round(st.crowd * 100)}% full</b>
          </div>
          <Bar value={Math.min(100, st.crowd * 66)} c={st.crowd < 0.85 ? "var(--good)" : st.crowd < 1.1 ? "var(--warn)" : "var(--bad)"} mark={66} />
        </div>
      </div>
      <h3 className="mb-1 mt-3 font-bold">🎚️ Your choices</h3>
      <Slider id="s-fee" label="🎟️ Entry fee" value={S0.fee} min={0} max={30} suffix="" onChange={(v) => set(() => (S0.fee = v))} hint={`$${S0.fee} per visitor. Higher fees earn more per head but fewer people come${S0.fee > 10 ? ", and visitors grumble about the price" : ""}.`} />
      <Slider id="s-mk" label="📣 Marketing" value={S0.marketing} min={0} max={120} step={5} suffix="K" onChange={(v) => set(() => (S0.marketing = v))} hint="Overseas ads and events. Up to +45% visitors, with diminishing returns." />
      {town && <Slider id="s-maint" label="🧹 Island upkeep" value={town.maint ?? 100} min={40} max={150} step={10} onChange={(v) => set(() => (town.maint = v))} hint="Clean beaches and well-kept paths keep visitors happy." />}
      <h3 className="mb-1 mt-3 font-bold">🗺️ Attractions & links</h3>
      <ul className="grid gap-1 text-[14px] sm:grid-cols-2">
        {SENTOSA_PARTS.map((k) => {
          const S = STRUCTS[k];
          const has = built.has(k);
          return (
            <li key={k} className={has ? "text-[var(--good)]" : w.year < S.year ? "text-[var(--muted)]" : ""}>
              {has ? "✅" : w.year < S.year ? "🔒" : "⬜"} {S.icon} {S.name} {!has && (w.year < S.year ? `· from ${S.year}` : `· ${fmtMoney(S.cost)} in 🌟 Landmarks`)}
            </li>
          );
        })}
        <li>
          🏨 {st.hotels} hotel & shop lots · 🏡 {st.homes} resort homes <span className="text-[var(--muted)]">(zone Commercial / Private on the island)</span>
        </li>
      </ul>
    </Panel>
  );
}

// ---------------- town purposes ----------------
export function PurposePicker({ world: w, index, cost, onPick }) {
  const t = w.towns[index];
  const cur = PURPOSES[t.purpose] || PURPOSES.mixed;
  const [open, setOpen] = useState(false);
  if (cur.fixed)
    return (
      <div className="mt-2 rounded-xl bg-[var(--soft)] px-2.5 py-1.5 text-[13px]">
        {cur.icon} <b>{cur.name}</b> · {cur.desc}
      </div>
    );
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="city-btn w-full rounded-xl bg-[var(--soft)] px-2.5 py-1.5 text-left text-[13px]">
        {cur.icon} Planned as: <b>{cur.name}</b> <span className="text-[var(--muted)]">· change ▾</span>
      </button>
      {open && (
        <div className="mt-1 grid gap-1 sm:grid-cols-2">
          {Object.entries(PURPOSES)
            .filter(([, P]) => !P.fixed)
            .map(([k, P]) => (
              <button
                key={k}
                disabled={k === t.purpose}
                onClick={() => {
                  setOpen(false);
                  onPick(k);
                }}
                className={`city-btn rounded-xl border-2 p-2 text-left text-[12.5px] leading-snug ${k === t.purpose ? "border-[var(--brand)]" : "border-[var(--ink)]/10"}`}
              >
                <b>
                  {P.icon} {P.name}
                </b>
                <span className="block text-[var(--muted)]">{P.desc}</span>
              </button>
            ))}
          <div className="text-[12px] text-[var(--muted)] sm:col-span-2">{cost ? `Re-planning costs ${fmtMoney(cost)} and upsets residents a little.` : "Free to change for now."} Existing buildings stay; new growth follows the plan.</div>
        </div>
      )}
    </div>
  );
}


// ---------------- the first thing a new mayor does ----------------
export function PlanPanel({ world: w, onDone, onChange, toast }) {
  return (
    <Panel title="📐 Plan your towns" onClose={onDone}>
      <p className="text-[15px] leading-snug">
        Before you start, decide what each town in {w.name} is for. It sets what grows there and what residents expect: a CBD won't ask for wet markets, an industrial town cares more about jobs than parks. We've suggested a plan; change any of them. You can re-plan later in 🏘️ Towns (free for the first 3 years).
      </p>
      <div className="mt-3 space-y-2">
        {w.towns.map((t, i) => (
          <div key={t.name} className="rounded-2xl border-2 border-[var(--ink)]/10 p-2">
            <div className="font-bold">{t.name}</div>
            {PURPOSES[t.purpose]?.fixed ? (
              <div className="text-[13px]">
                {PURPOSES[t.purpose].icon} <b>{PURPOSES[t.purpose].name}</b> · {PURPOSES[t.purpose].desc}
              </div>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1.5" role="radiogroup" aria-label={`${t.name} purpose`}>
                {Object.entries(PURPOSES)
                  .filter(([, P]) => !P.fixed)
                  .map(([k, P]) => (
                    <button
                      key={k}
                      role="radio"
                      aria-checked={t.purpose === k}
                      title={P.desc}
                      onClick={() => {
                        const r = setPurpose(w, i, k);
                        if (!r.ok) toast(r.msg);
                        onChange();
                      }}
                      className={`city-btn rounded-full px-3 py-1.5 text-[13px] font-bold ${t.purpose === k ? "bg-[var(--brand)] text-white" : "bg-[var(--soft)]"}`}
                    >
                      {P.icon} {P.name}
                    </button>
                  ))}
              </div>
            )}
            {!PURPOSES[t.purpose]?.fixed && <div className="mt-1 text-[12px] text-[var(--muted)]">{PURPOSES[t.purpose]?.desc}</div>}
          </div>
        ))}
      </div>
      <button onClick={onDone} className="city-btn city-sticker mt-3 w-full rounded-2xl bg-[var(--brand)] py-2.5 text-lg font-bold text-white">
        Start as mayor
      </button>
    </Panel>
  );
}

// ---------------- landmark & mall projects ----------------
const COVER_NAME = { food: "food", school: "primary schooling", school2: "secondary schooling", school3: "higher education", health: "healthcare", safety: "policing", fire: "fire cover", community: "community", green: "greenery", transport: "transport", mrt: "MRT" };
function benefits(S) {
  const out = [];
  if (S.tourism) out.push(`📸 Tourism +${fmtMoney(S.tourism * 0.5)}/month (grows with your population)`);
  if (S.jobs) out.push(`💼 ${fmtNum(S.jobs)} jobs`);
  if (S.trade) out.push(`⚓ Trade +${fmtMoney(S.trade * 0.4)}/month`);
  if (S.cover) out.push(`🗺️ ${COVER_NAME[S.cover] || S.cover} for homes within ${S.r * 50} m`);
  if (S.alsoCover) out.push(`🗺️ ${COVER_NAME[S.alsoCover]} too`);
  if (S.sentosaAppeal) out.push("🏝️ Draws visitors to Sentosa");
  if (S.sentosaLink) out.push("🚡 Easier to reach Sentosa");
  if (S.poll) out.push(`🏭 Pollution nearby (${S.poll})`);
  return out;
}

export function ProjectPanel({ world: w, toolId, onChoose, onClose }) {
  const T = ALL_TOOLS_REF[toolId];
  const isMall = T?.group === "mall";
  const variants = isMall ? Object.entries(STRUCTS).filter(([, S]) => S.group === T.group) : [[T.struct, STRUCTS[T.struct]]];
  const [type, setType] = useState(() => {
    const ok = variants.filter(([, S]) => w.year >= S.year);
    return (ok[0] || variants[0])[0];
  });
  const S = STRUCTS[type];
  const town = w.towns.reduce((a, t) => ((t.pop || 0) > (a.pop || 0) ? t : a), w.towns[0]);
  const ideas = isMall ? MALL_NAMES[w.region] || [] : [S.name, `${town.name} ${S.name.replace(/^Singapore /, "")}`];
  const [name, setName] = useState(ideas[0] || S.name);
  const first = !isMall && (w.lmBuilt || []).find((x) => x.type === type);
  const mine = !isMall && w.structs.some((s) => s.type === type);
  const locked = w.year < S.year;
  const inDebt = w.cash < 0 && !w.sandbox;
  const debt = S.cost > w.cash && !w.sandbox && !inDebt;
  return (
    <Panel title={`${S.icon} ${isMall ? "New shopping mall" : S.name}`} onClose={onClose}>
      {isMall && (
        <>
          <h3 className="mb-1 font-bold">1. What kind of mall?</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {variants.map(([k, V]) => {
              const lock = w.year < V.year;
              return (
                <button key={k} disabled={lock} onClick={() => setType(k)} aria-pressed={type === k} className={`city-btn flex flex-col rounded-2xl border-2 p-2.5 text-left disabled:opacity-50 ${type === k ? "border-[var(--brand)] bg-[var(--bad-bg)]" : "border-[var(--ink)]/10 bg-[var(--card)]"}`}>
                  <span className="font-bold leading-tight">
                    {V.icon} {V.kind}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1 text-[12px] font-bold tabular-nums">
                    <span className="rounded-full bg-[var(--bad-bg)] px-2 py-0.5 text-[var(--bad)]">{fmtMoney(V.cost)}</span>
                    <span className="rounded-full bg-[var(--soft)] px-2 py-0.5">⏳ {V.build} months</span>
                    <span className="rounded-full bg-[var(--soft)] px-2 py-0.5">🛠️ {fmtMoney(V.upkeep)}/mo</span>
                  </span>
                  <ul className="mt-1 space-y-0.5 text-[12.5px] leading-snug">
                    {V.pros.map((p) => (
                      <li key={p}>✅ {p}</li>
                    ))}
                    {V.cons.map((p) => (
                      <li key={p} className="text-[var(--muted)]">
                        ⚠️ {p}
                      </li>
                    ))}
                  </ul>
                  {lock && <span className="mt-1 text-[12px] font-bold">🔒 From {V.year}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
      {!isMall && (
        <div className="rounded-2xl bg-[var(--soft)] p-3 text-[14px] leading-snug">
          <div>{S.tip}</div>
          <div className="mt-1 flex flex-wrap gap-1 text-[12px] font-bold tabular-nums">
            <span className="rounded-full bg-[var(--bad-bg)] px-2 py-0.5 text-[var(--bad)]">{fmtMoney(S.cost)}</span>
            <span className="rounded-full bg-[var(--card)] px-2 py-0.5">⏳ {S.build || 0} months to build</span>
            {S.upkeep ? <span className="rounded-full bg-[var(--card)] px-2 py-0.5">🛠️ {fmtMoney(S.upkeep)}/mo upkeep</span> : null}
          </div>
          <ul className="mt-1 space-y-0.5">
            {benefits(S).map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      {!isMall && (
        <div className="mt-2 rounded-2xl p-2.5 text-[14px] leading-snug" style={{ background: first && first.by !== "you" ? "var(--warn-bg)" : "rgba(47,191,113,0.14)" }}>
          {mine
            ? "🏛️ You already have one. A second won't add much prestige."
            : first && first.by !== "you"
              ? `🪞 ${first.by} already opened one in ${first.region} (${first.year}). Yours would look like a copycat: about 40% fewer tourists, reputation −4 and some grumbling.`
              : "🥇 No one in Singapore has built this yet. Be first for +4 reputation and full tourism."}
        </div>
      )}
      <h3 className="mb-1 mt-3 font-bold">{isMall ? "2. " : ""}Name it</h3>
      <div className="flex flex-wrap gap-1.5">
        {ideas.map((n) => (
          <button key={n} onClick={() => setName(n)} className={`city-btn rounded-full px-3 py-1.5 text-[13px] font-bold ${name === n ? "bg-[var(--brand)] text-white" : "bg-[var(--soft)]"}`}>
            {n}
          </button>
        ))}
      </div>
      <label className="mt-2 block text-[13px] font-semibold" htmlFor="proj-name">
        Or type your own
      </label>
      <input id="proj-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-[var(--ink)]/15 bg-[var(--card)] px-3 py-2 text-[15px]" />
      {debt && !locked && (
        <p className="mt-2 rounded-xl bg-[var(--bad-bg)] p-2 text-[13px] font-semibold text-[var(--bad)]">
          💸 This costs {fmtMoney(S.cost)} and you have {fmtMoney(w.cash)}. You can still go ahead, but you'll be in debt: you'll pay interest and can't zone or build services until your balance is positive again.
        </p>
      )}
      {inDebt && (
        <p className="mt-2 rounded-xl bg-[var(--bad-bg)] p-2 text-[13px] font-semibold text-[var(--bad)]">
          🚫 You're already in debt ({fmtMoney(w.cash)}). Get your balance back above zero before starting another big project.
        </p>
      )}
      <button disabled={locked || inDebt || !name.trim()} onClick={() => onChoose(type, name.trim())} className="city-btn city-sticker mt-3 w-full rounded-2xl bg-[var(--brand)] py-2.5 text-lg font-bold text-white disabled:bg-[var(--muted)]">
        {locked ? `🔒 Available from ${S.year}` : `📍 Choose a spot for ${name.trim() || "it"}`}
      </button>
    </Panel>
  );
}
