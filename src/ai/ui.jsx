import React from "react";

const BUG_COLORS = ["#F97316", "#22C55E", "#3B82F6", "#A855F7", "#EC4899", "#14B8A6", "#EAB308", "#EF4444", "#6366F1"];

export const bugColor = (id) => BUG_COLORS[id % BUG_COLORS.length];

// A token drawn as a little bug: coloured body, googly eyes and six legs.
export function TokenBug({ text, id = 0, color, walking = false, showId = false, small = false, className = "", style }) {
  const fill = color ?? bugColor(id);
  return (
    <span className={`inline-flex flex-col items-center ${walking ? "ai-walking" : ""} ${className}`} style={style}>
      <span className="relative inline-block">
        <span className="absolute -top-1.5 left-1.5 flex gap-0.5" aria-hidden="true">
          {[0, 1].map((e) => (
            <span key={e} className="w-2.5 h-2.5 rounded-full bg-white border border-slate-700 flex items-center justify-center">
              <span className="w-1 h-1 rounded-full bg-slate-900" />
            </span>
          ))}
        </span>
        <span
          className={`inline-block rounded-full text-white font-bold shadow-md whitespace-pre ${
            small ? "px-2 py-0.5 text-sm" : "px-3 py-1 text-base"
          }`}
          style={{ background: fill }}
        >
          {text}
        </span>
        <svg className="absolute left-0 right-0 -bottom-1.5 w-full h-2" viewBox="0 0 30 8" preserveAspectRatio="none" aria-hidden="true">
          {[6, 15, 24].map((x) => (
            <g key={x} stroke="#334155" strokeWidth="1.6" strokeLinecap="round">
              <line className="ai-leg" x1={x - 1.5} y1="0" x2={x - 3} y2="7" />
              <line className="ai-leg" x1={x + 1.5} y1="0" x2={x + 3} y2="7" />
            </g>
          ))}
        </svg>
      </span>
      {showId && <span className="text-[11px] font-mono text-slate-500 mt-2">#{id}</span>}
    </span>
  );
}

export function Bit({ children, mood = "happy" }) {
  return (
    <div className="flex items-end gap-3">
      <div className="text-5xl ai-bob select-none" aria-hidden="true">
        {mood === "party" ? "🤖🎉" : mood === "think" ? "🤖💭" : "🤖"}
      </div>
      <div className="bg-white rounded-2xl rounded-bl-none shadow-md px-4 py-3 text-slate-800 flex-1">{children}</div>
    </div>
  );
}

export function Section({ title, subtitle, children }) {
  return (
    <section className="bg-white rounded-3xl shadow-lg p-5 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        {subtitle && <p className="text-slate-600">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function DigDeeper({ children, title = "Dig deeper" }) {
  return (
    <details className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-slate-700">
      <summary className="font-bold text-indigo-700 cursor-pointer">🔍 {title}</summary>
      <div className="mt-2 space-y-2 text-sm">{children}</div>
    </details>
  );
}

export function Button({ children, onClick, variant = "primary", disabled = false, className = "" }) {
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg",
    fun: "bg-amber-400 text-slate-900 hover:bg-amber-300 shadow-lg",
    soft: "bg-white text-slate-700 border-2 border-slate-200 hover:border-indigo-300",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2.5 rounded-2xl font-bold transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
