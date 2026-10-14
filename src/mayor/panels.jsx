import React, { useState } from "react";
import { Panel } from "../city/panels.jsx";
import { NEEDS, TERM_YEARS, diffOf } from "./defs.js";
import { fmtMoney, fmtNum, monthlyBudget, REV_LABELS, EXP_LABELS, inSeason, monthsToElection, tToDate, townSupport, makePledge, GOALS, modeOf, pledgeProgress, pledgeCred } from "./sim.js";
import { housingByTown } from "./housing.js";
import { ImpactBox, ObjectiveRow, PurposePicker } from "./panels2.jsx";
import { setPurpose, purposeCost } from "./world.js";

export { Panel };

const color = (v) => (v >= 65 ? "#2fbf71" : v >= 45 ? "#ffb020" : "#ff5a5a");
const face = (v) => (v >= 65 ? "😄" : v >= 50 ? "🙂" : v >= 38 ? "😐" : "😟");

function Bar({ value, max = 100, c, mark }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1e-6, max)) * 100));
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-[var(--soft)]">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c || color(value) }} />
      {mark != null && <div className="absolute inset-y-0 w-0.5 bg-[var(--ink)]" style={{ left: `${mark}%` }} />}
    </div>
  );
}

export const yearsMonths = (m) => {
  const y = Math.floor(m / 12);
  const mm = m % 12;
  return y ? `${y}y ${mm}m` : `${mm} months`;
};

export function TownsPanel({ world: w, onClose, onShow, onChange, toast }) {
  const D = diffOf(w);
  const H = housingByTown(w);
  const vacant = H.reduce((a, h) => a + h.vacant, 0);
  const building = H.reduce((a, h) => a + h.building, 0);
  return (
    <Panel title="🏘️ Your towns" onClose={onClose}>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
        <Stat label="Happiness" value={`${face(w.approval)} ${Math.round(w.approval)}%`} />
        <Stat label="Trust in you" value={`${Math.round(w.trust)}`} />
        <Stat label="Reputation" value={`⭐ ${Math.round(w.rep ?? 50)}`} />
        <Stat label="Housing queue" value={fmtNum(w.waitlist)} tone={w.waitlist > (w.stats.pop || 1) * 0.15 ? "bad" : null} />
        <Stat label="Births/woman" value={w.stats.tfr ? `👶 ${w.stats.tfr.toFixed(2)}` : "—"} />
        <Stat label="Life expect." value={w.stats.life ? `🩺 ${w.stats.life.toFixed(1)}` : "—"} />
      </div>
      <p className="-mt-1 mb-3 text-[13px] leading-snug text-[var(--muted)]">
        👶 Births per woman rise with good homes, a short housing queue, schools and community centres nearby, and happy residents (baby-bonus and childcare decisions help too), on top of Singapore's national trend, which falls over the decades.
        <br />
        🏠 {fmtNum(vacant)} empty homes ready · 🏗️ {fmtNum(building)} homes being built · ⏳ {fmtNum(w.waitlist)} families waiting
        {w.leftRegion ? ` · ✈️ ${fmtNum(w.leftRegion)} have left the region so far` : ""}. Families move into empty homes over a few months; people moved out by demolitions take empty homes first.
      </p>
      <div className="space-y-3">
        {w.towns.map((t, i) => {
          const sup = townSupport(w, i);
          return (
            <div key={t.name} className="rounded-2xl border-2 border-[var(--ink)]/10 p-3">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold leading-tight">{t.name}</div>
                  <div className="text-[13px] text-[var(--muted)]">
                    👥 {fmtNum(t.pop || 0)} residents{t.kpop ? ` · 🛖 ${fmtNum(t.kpop)} in kampongs` : ""}
                    {t.old ? ` · 🏚️ ${t.old} ageing blocks` : ""}
                    <br />
                    🏠 {fmtNum(H[i].occ)}/{fmtNum(H[i].cap)} homes filled{H[i].vacant ? ` · ${fmtNum(H[i].vacant)} empty` : ""}
                    {H[i].building ? ` · ${fmtNum(H[i].building)} being built` : ""}{t.tfr ? ` · 👶 ${t.tfr.toFixed(2)} · 🩺 ${t.life.toFixed(1)}y` : ""}
                    {(t.maint ?? 100) !== 100 || (t.scc ?? 100) !== 100 ? ` · 🧽 ${t.maint ?? 100}% · 🧹 ${t.scc ?? 100}%` : ""}
                  </div>
                </div>
                <button onClick={() => onShow(t)} className="city-btn rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold">
                  📍 Show
                </button>
              </div>
              <PurposePicker
                world={w}
                index={i}
                cost={purposeCost(w)}
                onPick={(k) => {
                  const r = setPurpose(w, i, k);
                  if (!r.ok) toast?.(r.msg);
                  else toast?.(`📐 ${t.name} is now planned as ${k}${r.cost ? ` (${fmtMoney(r.cost)})` : ""}.`);
                  onChange?.();
                }}
              />
              <div className="mt-2 grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <div className="flex justify-between">
                    <span>Happiness</span>
                    <b>{Math.round(t.approval)}%</b>
                  </div>
                  <Bar value={t.approval} />
                </div>
                <div>
                  <div className="flex justify-between">
                    <span>Would vote for you</span>
                    <b>{Math.round(sup)}%</b>
                  </div>
                  <Bar value={sup} c={sup >= 50 ? "#2fbf71" : "#ff5a5a"} mark={50} />
                </div>
              </div>
              <ul className="mt-2 space-y-1">
                {(t.feedback || []).map((f, k) => (
                  <li key={k} className="rounded-xl px-2.5 py-1.5 text-[14px] leading-snug" style={{ background: f.kind ? "rgba(47,191,113,0.14)" : "var(--soft)" }}>
                    <span className="mr-1">{f.kind === "thanks" ? "🙏" : f.kind === "happy" ? "😊" : f.need ? NEEDS[f.need]?.icon : "💬"}</span>“{f.text}”
                    {!f.kind && f.need && (
                      <span className="ml-1 whitespace-nowrap text-[12px] font-semibold text-[var(--bad)]">
                        {NEEDS[f.need]?.name} {f.v}/100
                      </span>
                    )}
                  </li>
                ))}
                {!t.feedback?.length && <li className="text-[13px] text-[var(--muted)]">No one lives here yet.</li>}
              </ul>
              {t.anger > 0.6 && <div className="mt-1 text-[13px] text-[var(--bad)]">😠 Still upset about recent demolitions and resettlement.</div>}
              {t.needs && (t.pop || 0) > 0 && <NeedsCard town={t} />}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[13px] text-[var(--muted)]">
        Elections come every {TERM_YEARS} years. {D.voteMin && w.mode !== "sandbox" ? "Win more than half the votes across your towns to stay mayor." : "You can't be voted out, but residents still tell you what they think."} Unhappy towns slowly lose residents to other regions.
      </p>
    </Panel>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`rounded-2xl border-2 border-[var(--ink)]/10 px-2 py-1.5 ${tone === "bad" ? "bg-[var(--bad-bg)] text-[var(--bad)]" : "bg-[var(--soft)]"}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}

// Every need for one town, out of 100, with the change over the last 6 months.
function NeedsCard({ town: t }) {
  const [open, setOpen] = useState(false);
  const was = t.nh?.[0] || {};
  const minor = t.minor || [];
  const rows = Object.entries(NEEDS).map(([k, N]) => ({ k, N, v: Math.round(t.needs[k] ?? 0), d: was[k] != null ? Math.round(t.needs[k] ?? 0) - was[k] : 0, minor: minor.includes(k) }));
  const color = (v) => (v >= 65 ? "#2fbf71" : v >= 45 ? "#f5a524" : "#ff5a5a");
  const LV = ["Primary", "Secondary", "Polytechnic / uni"];
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="city-btn w-full rounded-xl bg-[var(--soft)] px-2.5 py-1.5 text-left text-[13px] font-bold">
        📊 All needs {open ? "▲" : "▼"}
        {!open && (
          <span className="ml-1 font-semibold text-[var(--muted)]">
            weakest: {rows.filter((r) => !r.minor).sort((a, b) => a.v - b.v).slice(0, 3).map((r) => `${r.N.icon} ${r.v}`).join(" · ")}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-1.5 grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.k} className={r.minor ? "opacity-45" : ""}>
              <div className="flex items-center justify-between gap-2">
                <span>
                  {r.N.icon} {r.N.name}
                  {r.minor && <span className="text-[11px] text-[var(--muted)]"> · not expected here</span>}
                </span>
                <span className="tabular-nums">
                  <b>{r.v}</b>
                  {r.d !== 0 && (
                    <span className={`ml-1 text-[11.5px] font-bold ${r.d > 0 ? "text-[var(--good)]" : "text-[var(--bad)]"}`}>
                      {r.d > 0 ? "▲" : "▼"}
                      {Math.abs(r.d)}
                    </span>
                  )}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--soft)]">
                <div className="h-full rounded-full" style={{ width: `${Math.max(2, r.v)}%`, background: color(r.v) }} />
              </div>
              {r.k === "school" && t.schools && (
                <div className="mt-0.5 space-y-0.5 pl-4 text-[11.5px] text-[var(--muted)]">
                  {t.schools.map((v, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{LV[i]} in reach</span>
                      <span className="tabular-nums" style={{ color: color(v) }}>
                        {Math.round(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <p className="text-[11.5px] text-[var(--muted)] sm:col-span-2">Out of 100. ▲▼ = change over the last 6 months. Greyed needs don't count for this town's purpose. Use 🗺️ map layers to see where coverage is missing.</p>
        </div>
      )}
    </div>
  );
}

// "+0.4–1.6%" of the whole region's vote
const fmtShare = (v) => {
  const lo = v * 0.4;
  const hi = v * 1.6;
  const f = (x) => (x < 0.1 ? "<0.1" : x < 1 ? x.toFixed(1) : String(Math.round(x)));
  return f(lo) === f(hi) ? `+${f(lo)}%` : `+${f(lo)}–${f(hi)}%`;
};

export function ElectionPanel({ world: w, onClose, onChange, toast, onReport }) {
  const [sortBy, setSortBy] = useState("support");
  const season = inSeason(w);
  const months = monthsToElection(w);
  const open = (w.pledges || []).filter((p) => p.status === "open");
  const thisTerm = open.filter((p) => p.term === w.election.next);
  const done = (w.pledges || []).filter((p) => p.status !== "open").slice(-6).reverse();
  const tp = w.towns.reduce((a, t) => a + (t.pop || 0), 0);
  const overall = tp ? w.towns.reduce((a, t, i) => a + townSupport(w, i) * (t.pop || 0), 0) / tp : 50;
  return (
    <Panel title="🗳️ Elections" onClose={onClose}>
      <div className={`rounded-2xl p-3 ${season ? "bg-[var(--bad-bg)]" : "bg-[var(--soft)]"}`}>
        <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--brand)]">{season ? "Election season!" : "Next election"}</div>
        <div className="text-xl font-bold">
          Polling day {tToDate(w, w.election.next)} · in {yearsMonths(months)}
        </div>
        <div className="mt-1 text-[14px]">
          If the vote were today you'd get about <b>{Math.round(overall)}%</b> {overall >= 50 ? "✅" : "⚠️"}
        </div>
        <Bar value={overall} c={overall >= 50 ? "#2fbf71" : "#ff5a5a"} mark={50} />
      </div>

      <h3 className="mb-1 mt-3 font-bold">Town by town</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {w.towns.map((t, i) => {
          const s = townSupport(w, i);
          return (
            <div key={t.name} className="text-[14px]">
              <div className="flex justify-between">
                <span>
                  {t.name} <span className="text-[12px] text-[var(--muted)]">· {tp ? Math.round(((t.pop || 0) / tp) * 100) : 0}% of voters</span>
                </span>
                <b>{Math.round(s)}%</b>
              </div>
              <Bar value={s} c={s >= 50 ? "#2fbf71" : "#ff5a5a"} mark={50} />
            </div>
          );
        })}
      </div>

      <h3 className="mb-1 mt-4 font-bold">📣 Pledges</h3>
      {season ? (
        <>
          <p className="text-[13px] text-[var(--muted)]">Promise up to 3 things to win votes now. Promises add at most 6% to any one town's vote. Each town's pledges fix what it's shortest of, and the towns least likely to vote for you are at the top. The worse off a town is, the more votes a pledge wins, and the angrier it gets if you break it.</p>
          {pledgeCred(w) < 0.99 && (
            <p className="mt-1 rounded-xl bg-[var(--bad-bg)] px-2.5 py-1.5 text-[13px] font-semibold text-[var(--bad)]">
              🤨 Voters doubt your promises after the ones you broke: pledges win {Math.round((1 - pledgeCred(w)) * 100)}% fewer votes. Keep a promise to win their trust back.
            </p>
          )}
          <div className="mt-2 flex items-center gap-1.5 text-[13px] font-bold">
            <span className="text-[var(--muted)]">Sort:</span>
            {[
              ["support", "😟 Least support"],
              ["size", "👥 Most voters"],
            ].map(([k, l]) => (
              <button key={k} onClick={() => setSortBy(k)} aria-pressed={sortBy === k} className={`city-btn rounded-full px-3 py-1 ${sortBy === k ? "bg-[var(--brand)] text-white" : "bg-[var(--soft)]"}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="mt-2 space-y-3">
            {(() => {
              const groups = [];
              for (const o of w.election.offers || []) {
                const key = o.all ? "all" : String(o.town);
                let g = groups.find((x) => x.key === key);
                if (!g) groups.push((g = { key, town: o.all ? null : o.town, items: [] }));
                g.items.push(o);
              }
              const share = (g) => (g.town == null ? 1 : tp ? (w.towns[g.town].pop || 0) / tp : 0);
              const sup0 = (g) => (g.town == null ? 999 : townSupport(w, g.town));
              groups.sort((a, b) => (a.town == null) - (b.town == null) || (sortBy === "size" ? share(b) - share(a) : sup0(a) - sup0(b)));
              return groups.map((g) => {
                const sup = g.town != null ? townSupport(w, g.town) : null;
                const sh = share(g);
                return (
                  <div key={g.key}>
                    <div className="mb-1 flex items-center justify-between text-[13px] font-bold">
                      <span>{g.town != null ? w.towns[g.town].name : "🏙️ Region-wide"}</span>
                      {sup != null && (
                        <span className={sup < 50 ? "text-[var(--bad)]" : "text-[var(--good)]"}>
                          {Math.round(sup)}% support · {Math.round(sh * 100)}% of voters
                          {sh < 0.08 ? " · small town" : sup < 45 ? " · top priority" : sup < 52 ? " · swing town" : ""}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {g.items.map((o, k) => {
                        const made = thisTerm.some((p) => p.kind === o.kind && p.town === o.town && (p.need ?? o.need) === o.need);
                        return (
                          <div key={k} className="flex items-center gap-2 rounded-2xl border-2 border-[var(--ink)]/10 p-2">
                            <span className="text-2xl">{o.icon}</span>
                            <div className="min-w-0 flex-1 leading-tight">
                              <div className="font-bold">{o.text}</div>
                              {o.cur != null && (
                                <div className="text-[12px] text-[var(--muted)]">
                                  {o.need ? `${o.need[0].toUpperCase()}${o.need.slice(1)} is ${o.cur}/100 here` : ""}
                                </div>
                              )}
                              <div className="text-[12px] text-[var(--good)]">
                                🗳️ {o.boostText} votes {o.all ? "everywhere" : `in ${w.towns[o.town]?.name}`}
                                {!o.all && ` (about ${fmtShare(o.boost * pledgeCred(w) * sh)} of your total)`} · deliver within {o.years} years
                              </div>
                              <div className="text-[12px] text-[var(--good)]">✅ If kept: {o.keptText}</div>
                              <div className="text-[12px] text-[var(--bad)]">💔 If broken: {o.penText}</div>
                            </div>
                            <button
                              disabled={made || thisTerm.length >= 3}
                              onClick={() => {
                                const r = makePledge(w, o);
                                if (!r.ok) toast(r.msg);
                                onChange();
                              }}
                              className="city-btn shrink-0 rounded-full bg-[var(--brand)] px-3 py-2 text-sm font-bold text-white disabled:bg-[var(--muted)]"
                            >
                              {made ? "Pledged" : "Pledge"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </>
      ) : (
        <p className="text-[13px] text-[var(--muted)]">Pledges open 6 months before polling day ({tToDate(w, w.election.next - 6)}).</p>
      )}

      {open.length > 0 && (
        <>
          <h3 className="mb-1 mt-4 font-bold">Promises to keep</h3>
          <ul className="space-y-1 text-[14px]">
            {open.map((p) => (
              <li key={p.id} className="rounded-xl bg-[var(--warn-bg)] px-2.5 py-1.5">
                {p.icon} {p.text} <span className="text-[12px] text-[var(--muted)]">· by {tToDate(w, p.deadline)}</span>
                {(() => {
                  const pr = pledgeProgress(w, p);
                  if (!pr) return null;
                  if (pr.towns)
                    return (
                      <div className="mt-0.5 flex flex-wrap gap-x-2 text-[12px]">
                        {pr.towns.map((x) => (
                          <span key={x.name} className={x.done ? "text-[var(--good)]" : "text-[var(--bad)]"}>
                            {x.done ? "✅" : "⬜"} {x.name}
                          </span>
                        ))}
                      </div>
                    );
                  return <div className="mt-0.5 text-[12px] text-[var(--muted)]">{pr.text}</div>;
                })()}
              </li>
            ))}
          </ul>
        </>
      )}
      {done.length > 0 && (
        <>
          <h3 className="mb-1 mt-4 font-bold">Past promises</h3>
          <ul className="space-y-1 text-[14px]">
            {done.map((p) => (
              <li key={p.id} className={p.status === "kept" ? "text-[var(--good)]" : "text-[var(--bad)]"}>
                {p.status === "kept" ? "✅" : "💔"} {p.text}
              </li>
            ))}
          </ul>
        </>
      )}
      {w.election.history.length > 0 && (
        <>
          <h3 className="mb-1 mt-4 font-bold">Past elections</h3>
          <ul className="space-y-1 text-[14px]">
            {[...w.election.history].reverse().map((e, k) => (
              <li key={e.year}>
                {e.won ? "🏆" : "❌"} {e.year}: {e.share}% · {e.results.map((r) => `${r.name} ${r.pct}%`).join(", ")}
                {e.analysis && onReport && (
                  <button onClick={() => onReport(w.election.history.length - 1 - k)} className="city-btn ml-1 rounded-full bg-[var(--soft)] px-2 py-0.5 text-[12px] font-bold">
                    📋 Report
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

function Slider({ id, label, value, min, max, step = 1, suffix = "%", onChange, hint }) {
  return (
    <div className="py-1.5">
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

export function BudgetPanel({ world: w, analysis: A, onChange, onClose }) {
  const B = A ? monthlyBudget(w, A) : { rev: {}, exp: {} };
  const tot = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const net = tot(B.rev) - tot(B.exp);
  const bars = (obj, labels, c) => {
    const rows = Object.entries(labels)
      .map(([k, l]) => [l, obj[k] || 0])
      .filter(([, v]) => v > 0.5)
      .sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...rows.map((r) => r[1]));
    return rows.length ? (
      rows.map(([l, v]) => (
        <div key={l} className="py-0.5 text-[14px]">
          <div className="flex justify-between">
            <span>{l}</span>
            <b className="tabular-nums">{fmtMoney(v)}</b>
          </div>
          <Bar value={v} max={max} c={c} />
        </div>
      ))
    ) : (
      <div className="text-sm text-[var(--muted)]">Nothing yet.</div>
    );
  };
  const set = (fn) => {
    fn();
    onChange();
  };
  return (
    <Panel title="💰 Town budget" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Treasury" value={fmtMoney(w.cash)} tone={w.cash < 0 ? "bad" : null} />
        <Stat label="Each month" value={(net >= 0 ? "+" : "") + fmtMoney(net)} tone={net < 0 ? "bad" : null} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 font-bold">Money in</h3>
          {bars(B.rev, REV_LABELS, "#2fbf71")}
        </div>
        <div>
          <h3 className="mb-1 font-bold">Money out</h3>
          {bars(B.exp, EXP_LABELS, "#ff6b6b")}
        </div>
      </div>
      <h3 className="mb-1 mt-4 font-bold">Your choices</h3>
      <Slider id="m-tax" label="🏠 Property tax" value={w.taxes.property} min={0} max={20} onChange={(v) => set(() => (w.taxes.property = v))} hint="More money, but above 8% residents feel the pinch." />
      <Slider id="m-grant" label="🔑 HDB grant" value={w.hdbGrant} min={0} max={100} step={5} onChange={(v) => set(() => (w.hdbGrant = v))} hint="Bigger grants make flats cheaper for families but bring in less from flat sales." />
      <Slider id="m-fund" label="🛠️ Services funding" value={w.funding} min={40} max={120} step={5} onChange={(v) => set(() => (w.funding = v))} hint="Less funding saves money but services reach fewer homes." />
    </Panel>
  );
}

export function RenewSheet({ target, options, world: w, onPick, onClose }) {
  return (
    <Panel title={`🏗️ ${target.title}`} onClose={onClose}>
      {target.lines?.length > 0 && (
        <ul className="mb-3 space-y-0.5 text-[14px] text-[var(--muted)]">
          {target.lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
      {!options.length && <p className="text-[var(--muted)]">Nothing to renew here.</p>}
      <div className="space-y-2">
        {options.map((o) => (
          <div key={o.id} className={`rounded-2xl border-2 p-3 ${o.ok ? "border-[var(--ink)]/15" : "border-[var(--ink)]/5 opacity-60"}`}>
            <div className="flex items-start gap-2">
              <span className="text-3xl leading-none">{o.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{o.name}</div>
                <div className="text-[14px] leading-snug text-[var(--muted)]">{o.desc}</div>
                {o.ok && (
                  <div className="mt-1 text-[13px] font-semibold">
                    💰 {fmtMoney(o.cost)} · ⏳ {o.months} months{o.effect ? ` · ${o.effect}` : ""}
                  </div>
                )}
                {!o.ok && o.why && <div className="mt-1 text-[13px] font-semibold text-[var(--bad)]">{o.why}</div>}
                {o.ok && <ImpactBox impact={o.impact} town={o.townName || target.townName} gain={o.gain} months={o.months} />}
              </div>
            </div>
            {o.ok && (
              <button
                onClick={() => onPick(o.id)}
                disabled={!w.sandbox && o.cost > w.cash}
                className="city-btn city-sticker mt-2 w-full rounded-2xl bg-[var(--brand)] py-2 font-bold text-white disabled:bg-[var(--muted)]"
              >
                {!w.sandbox && o.cost > w.cash ? "Not enough money" : `${o.name} · ${fmtMoney(o.cost)}`}
              </button>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function NewsPanel({ world, onClose }) {
  return (
    <Panel title="📰 Town news" onClose={onClose}>
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

export function GoalsPanel({ world: w, analysis: A, onClose }) {
  const open = (w.objectives || []).filter((o) => o.status === "open");
  const past = (w.objectives || []).filter((o) => o.status !== "open").slice(-6).reverse();
  const starterDone = GOALS.every((g) => w.goalsDone[g.id]);
  return (
    <Panel title="🎯 Goals & objectives" onClose={onClose}>
      <h3 className="mb-1 font-bold">🏛️ Mayor's objectives</h3>
      {open.length ? (
        <ul className="space-y-2">
          {open.map((o) => (
            <ObjectiveRow key={o.id} world={w} analysis={A} o={o} />
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-[var(--muted)]">New objectives appear once you're nearly through the starter goals. They adapt to what your region needs most, and pay a bonus grant when you hit them.</p>
      )}
      {past.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[13px]">
          {past.map((o) => (
            <li key={o.id} className={o.status === "done" ? "text-[var(--good)]" : "text-[var(--muted)]"}>
              {o.status === "done" ? "✅" : "⌛"} {o.text}
            </li>
          ))}
        </ul>
      )}
      <h3 className="mb-1 mt-4 font-bold">🌱 Starter goals {starterDone ? "(all done!)" : ""}</h3>
      <ul className="space-y-1.5 text-[15px]">
        {GOALS.map((g) => (
          <li key={g.id} className={w.goalsDone[g.id] ? "text-[var(--good)]" : ""}>
            {w.goalsDone[g.id] ? "✅" : "⬜"} {g.text}
            {!w.goalsDone[g.id] && <div className="pl-7 text-[13px] leading-snug text-[var(--muted)]">{g.hint}</div>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function HelpPanel({ onClose }) {
  const tips = [
    ["👆 Move around", "Drag with one finger. Pinch with two fingers to zoom."],
    ["🛣️ Curvy roads", "Tap where a road starts, then where it ends. Drag the yellow ↔ handle to bend it, or drag A and B to move the ends. Press ✓ Build."],
    ["🏘️ Paint zones", "Lots appear along both sides of every road. Pick a zone and paint over them with one finger (two fingers move the map)."],
    ["🏗️ Things take time", "New blocks are built over months. Watch the cranes, then families move in."],
    ["🕰️ Housing grows up", "Each decade brings better flats: emergency flats, slab blocks, point blocks, New Generation, modern estates, then BTO towers. Old estates age, so upgrade or rebuild them with 🏗️ Renew."],
    ["🛖 Kampongs", "Improve them with water and power, or resettle them to free land. Resettling costs money and upsets residents for a while."],
    ["🏘️ Listen to your towns", "Tap 🏘️ to see each town's happiness and what residents are saying."],
    ["🗳️ Elections every 6 years", "In the 6 months before polling day you can make pledges. Keep them and trust grows."],
    ["🚚 Where do people go?", "New flats fill gradually. When you clear homes, residents take empty flats first, then join the queue, and some leave. 🏗️ Renew shows the estimate before you commit."],
    ["💰 Finances", "Each term the government gives a fixed block grant. Tap 💰 for charts of money in and out, with projections, and set tax, S&CC and estate maintenance per town."],
    ["⚠️ Crises & decisions", "Real crises (oil shock, SARS, COVID…) arrive on their real dates, and random dilemmas pop up. Your choices and what you've built decide how hard they hit."],
    ["🗺️ Town borders & coverage", "Purple dashed lines mark where one town ends and the next begins; a service counts for the town it's built in. When placing or tapping a service, a blue circle shows the homes it reaches."],
    ["🎓 Schools", "Primary schools serve nearby homes, secondary schools a wider area, and one polytechnic or university most of the region. Residents say which level is missing."],
    ["🌟 Landmarks & malls", "Every landmark can be built in any region (a few are tied to geography). Name it, then pick a spot; big projects take years to build. Be first in Singapore for prestige, or residents may call yours a copycat. You can borrow for a landmark, but debt freezes other spending."],
    ["📐 Town purposes", "In 🏘️ Towns, plan each town as residential, commercial, industrial, heritage or mixed. It decides what grows there and what residents expect (no one asks for a wet market in a CBD)."],
    ["🏝️ Sentosa (South)", "The island is run for visitors: build links (cable car, bridge, monorail) and attractions, set the entry fee and marketing, and watch crowding."],
    ["🐉 Fantasy Mode", "From 2027 you can let real history go: zombies, meteors, aliens, new islands and stranger things, at random times and sizes. Some are one card, others are stories that branch over years, with 🎲 odds. What happened before decides what can happen next, and the map can change for good. Turn it on or off in ☰ Menu."],
    ["📊 Mayors' league", "AI mayors run the other regions. Every 10 years you get a report card comparing happiness, housing, health, births, money and reputation."],
  ];
  return (
    <Panel title="❓ How to be mayor" onClose={onClose}>
      <p className="mb-3 text-[15px] leading-snug">
        It's 1965 and you're the mayor of one region of a brand-new nation. Families are crowded into kampongs and waiting for homes. Plan roads, estates and services, renew old buildings as the decades pass, and keep your towns happy enough to win every election.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {tips.map(([t, d]) => (
          <div key={t} className="rounded-2xl border-2 border-[var(--ink)]/10 p-2.5">
            <div className="font-bold">{t}</div>
            <div className="text-[14px] text-[var(--muted)]">{d}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-[var(--muted)]">A game, not a real planning model. Singapore doesn't elect mayors this way; the regions, history and agencies are real, but the numbers are simplified for fun.</p>
    </Panel>
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

export function MenuPanel({ world, settings, setSettings, onClose, onSave, onHelp, onGoals, onQuit, saved, onFinance, onRivals, onFantasy }) {
  const set = (k, v) => setSettings({ ...settings, [k]: v });
  return (
    <Panel title="☰ Menu" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {[
          ["💾", saved ? "Saved!" : "Save now", onSave],
          ["🎯", "Goals", onGoals],
          ["💰", "Finances", onFinance],
          ["📊", "Mayors' league", onRivals],
          ["❓", "How to play", onHelp],
          ["🏠", "Switch region / title", onQuit],
          onFantasy && ["🐉", world.fantasy?.on ? "Fantasy chronicle" : "Fantasy Mode", onFantasy],
        ].filter(Boolean).map(([i, l, f]) => (
          <button key={l} onClick={f} className="city-btn flex items-center gap-2 rounded-2xl bg-[var(--soft)] px-3 py-3 text-left font-bold">
            <span className="text-2xl">{i}</span>
            {l}
          </button>
        ))}
      </div>
      <h3 className="mb-2 mt-4 font-bold">Settings</h3>
      <div className="space-y-2">
        <Toggle id="ms-large" label="Bigger text and buttons" hint="Easier to read and tap." checked={settings.large} onChange={(v) => set("large", v)} />
        <Toggle id="ms-motion" label="Moving cars, trains, boats and clouds" hint="Turn off to save battery or reduce motion." checked={settings.motion} onChange={(v) => set("motion", v)} />
      </div>
      <p className="mt-3 text-[13px] text-[var(--muted)]">
        {world.name} · {modeOf(world).name} · {diffOf(world).label}{world.endYear ? ` · ends ${world.endYear}` : ""}. Saves itself on this device every month and after every change.
      </p>
    </Panel>
  );
}
