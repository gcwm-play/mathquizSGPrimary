import React, { useLayoutEffect, useRef, useState } from "react";

// A small line chart: solid history, dashed projection (shaded), optional
// faint "before your changes" ghost lines, crosshair tooltip on hover/touch,
// and labels at the end of each line.
// series: [{ name, color, hist: [{t, v}], proj: [{t, v}], ghost?: true }]
export function LineChart({ series, nowT, height = 170, fmtY, fmtX, marks = [], title, ticksX }) {
  const box = useRef(null);
  const [wd, setWd] = useState(320);
  const [hover, setHover] = useState(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    setWd(Math.max(240, el.clientWidth));
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([e]) => setWd(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const main = series.filter((s) => !s.ghost);
  const all = series.flatMap((s) => [...(s.hist || []), ...(s.proj || [])]);
  if (!all.length) return <div className="py-6 text-center text-sm text-[var(--muted)]">No data yet. Press ▶ and come back in a few months.</div>;
  const t0 = Math.min(...all.map((p) => p.t));
  const t1 = Math.max(...all.map((p) => p.t));
  let lo = Math.min(0, ...all.map((p) => p.v));
  let hi = Math.max(1, ...all.map((p) => p.v));
  const step = niceStep((hi - lo) / 4);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const longest = Math.max(4, ...main.map((s) => s.name.length));
  const pad = { l: 50, r: Math.min(120, 20 + longest * 6.6), t: 14, b: 22 };
  const W = wd;
  const H = height;
  const x = (t) => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (H - pad.t - pad.b);
  const path = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join("");

  // end labels, nudged apart so they don't overlap
  const labels = main
    .map((s) => {
      const pts = [...(s.hist || []), ...(s.proj || [])];
      const last = pts[pts.length - 1];
      return last ? { name: s.name, color: s.color, y: y(last.v), v: last.v } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 15) labels[i].y = labels[i - 1].y + 15;

  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);
  const xt = (ticksX || []).filter((t) => t >= t0 && t <= t1);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const t = t0 + ((px - pad.l) / (W - pad.l - pad.r)) * (t1 - t0);
    const pts = [...(main[0]?.hist || []), ...(main[0]?.proj || [])];
    if (!pts.length) return;
    let best = pts[0];
    for (const p of pts) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
    setHover(best.t);
  };
  const at = (s, t) => {
    const pts = [...(s.hist || []), ...(s.proj || [])];
    let best = null;
    for (const p of pts) if (!best || Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
    return best && Math.abs(best.t - t) <= 3 ? best : null;
  };
  const hx = hover != null ? x(hover) : 0;

  return (
    <figure className="m-0">
      {title && <figcaption className="mb-1 text-[13px] font-bold">{title}</figcaption>}
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--muted)]">
        {main.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1">
            <span className="inline-block h-[3px] w-4 rounded-full" style={{ background: s.color }} />
            <span className="text-[var(--ink)]">{s.name}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <svg width="18" height="4" aria-hidden="true">
            <line x1="0" y1="2" x2="18" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          projection
        </span>
        {series.some((s) => s.ghost) && (
          <span className="inline-flex items-center gap-1">
            <svg width="18" height="4" aria-hidden="true">
              <line x1="0" y1="2" x2="18" y2="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1 3" />
            </svg>
            before your changes
          </span>
        )}
      </div>
      <div ref={box} className="relative w-full select-none">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title || "Chart"} style={{ touchAction: "pan-y", display: "block" }} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}>
          {nowT != null && nowT < t1 && (
            <g>
              <rect x={x(nowT)} y={pad.t} width={W - pad.r - x(nowT)} height={H - pad.t - pad.b} fill="var(--soft)" opacity="0.8" />
              <text x={x(nowT) + 4} y={pad.t + 10} fontSize="10" fill="var(--muted)" fontWeight="700">
                PROJECTION
              </text>
            </g>
          )}
          {ticks.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--ink)" strokeOpacity={v === 0 ? 0.35 : 0.08} strokeWidth="1" />
              <text x={pad.l - 6} y={y(v) + 3.5} fontSize="10.5" textAnchor="end" fill="var(--muted)">
                {fmtY(v)}
              </text>
            </g>
          ))}
          {xt.map((t) => (
            <text key={t} x={x(t)} y={H - 6} fontSize="10.5" textAnchor="middle" fill="var(--muted)">
              {fmtX(t)}
            </text>
          ))}
          {marks
            .filter((m) => m.t >= t0 && m.t <= t1)
            .map((m) => (
              <g key={m.t}>
                <line x1={x(m.t)} x2={x(m.t)} y1={pad.t} y2={H - pad.b} stroke="var(--ink)" strokeOpacity="0.25" strokeDasharray="2 3" />
                <text x={x(m.t)} y={pad.t - 3} fontSize="10" textAnchor="middle">
                  {m.icon}
                </text>
              </g>
            ))}
          {series.map((s) =>
            s.ghost ? (
              <path key={s.name} d={path(s.proj || [])} fill="none" stroke={s.color} strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="1 3" strokeLinecap="round" />
            ) : (
              <g key={s.name}>
                {s.hist?.length > 1 && <path d={path(s.hist)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
                {s.proj?.length > 0 && <path d={path([...(s.hist?.length ? [s.hist[s.hist.length - 1]] : []), ...s.proj])} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />}
              </g>
            )
          )}
          {labels.map((l) => (
            <g key={l.name}>
              <circle cx={W - pad.r + 6} cy={l.y} r="3" fill={l.color} />
              <text x={W - pad.r + 12} y={l.y + 3.5} fontSize="11" fill="var(--ink)" fontWeight="700">
                {l.name}
              </text>
            </g>
          ))}
          {hover != null && (
            <g>
              <line x1={hx} x2={hx} y1={pad.t} y2={H - pad.b} stroke="var(--ink)" strokeOpacity="0.5" />
              {main.map((s) => {
                const p = at(s, hover);
                return p ? <circle key={s.name} cx={hx} cy={y(p.v)} r="4.5" fill={s.color} stroke="var(--card)" strokeWidth="2" /> : null;
              })}
            </g>
          )}
        </svg>
        {hover != null && (
          <div className="pointer-events-none absolute top-1 z-10 rounded-xl bg-[var(--card)] px-2 py-1 text-[12px] shadow-lg ring-1 ring-black/10" style={hx > W / 2 ? { right: W - hx + 8 } : { left: hx + 8 }}>
            <div className="font-bold">
              {fmtX(hover, true)}
              {nowT != null && hover > nowT ? " · projected" : ""}
            </div>
            {main.map((s) => {
              const p = at(s, hover);
              return p ? (
                <div key={s.name} className="flex items-center gap-1.5 whitespace-nowrap tabular-nums">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.name}: <b>{fmtY(p.v)}</b>
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>
    </figure>
  );
}

function niceStep(raw) {
  if (raw <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

// average a monthly series into chunks (default: quarters)
export function bucket(pts, n = 3) {
  const out = [];
  for (let i = 0; i < pts.length; i += n) {
    const chunk = pts.slice(i, i + n);
    out.push({ t: chunk[chunk.length - 1].t, v: chunk.reduce((a, p) => a + p.v, 0) / chunk.length });
  }
  return out;
}
