import React, { useState } from "react";
import { Bit, DigDeeper } from "../ui.jsx";

const PARTS = {
  power: {
    icon: "⚡",
    title: "Electricity",
    text: "Thousands of chips run day and night, so data centres need as much power as a small town. In 2024, data centres used about 1.5% of all the world's electricity. Experts think that could double by 2030, mostly because of AI.",
  },
  heat: {
    icon: "🔥",
    title: "Heat",
    text: "Almost all that electricity turns into heat, just like your laptop getting warm, but thousands of times more. If the chips get too hot, they slow down or break.",
  },
  cool: {
    icon: "❄️",
    title: "Cooling",
    text: "Giant fans and air-conditioning, or cold liquid flowing right next to the chips, carry the heat away. Cooling can use a big chunk of a data centre's electricity.",
  },
  water: {
    icon: "💧",
    title: "Water",
    text: "Many data centres cool down by letting water evaporate, like sweat cooling your skin. That water floats away as vapour. Power stations making the electricity often use water too.",
  },
};

function Building({ active }) {
  const dim = (part) => (active && active !== part ? 0.3 : 1);
  return (
    <svg viewBox="0 0 360 200" className="w-full h-auto" role="img" aria-label="A data centre with power lines, server racks, heat and a cooling tower">
      <rect width="360" height="200" fill="#E0F2FE" />
      <rect y="170" width="360" height="30" fill="#BBF7D0" />

      {/* power: solar panels + pylon + flowing line */}
      <g opacity={dim("power")}>
        <rect x="48" y="140" width="40" height="22" fill="#1E3A8A" transform="skewX(-15)" />
        <path d="M68 170 L78 100 L88 170 M72 130 H84 M70 150 H86" stroke="#475569" strokeWidth="2.5" fill="none" />
        <path d="M78 102 Q120 80 130 95" stroke="#475569" strokeWidth="2" fill="none" />
        <path d="M78 102 Q120 80 130 95" stroke="#FACC15" strokeWidth="3" fill="none" strokeDasharray="4 8" className="ai-flow" />
      </g>

      {/* the building with racks */}
      <rect x="125" y="90" width="140" height="80" rx="4" fill="#CBD5E1" stroke="#64748B" strokeWidth="2" />
      {[0, 1, 2, 3].map((r) => (
        <g key={r}>
          <rect x={137 + r * 32} y="102" width="22" height="60" rx="2" fill="#1E293B" />
          {[0, 1, 2, 3, 4, 5].map((l) => (
            <circle
              key={l}
              cx={143 + r * 32 + (l % 2) * 10}
              cy={110 + Math.floor(l / 2) * 18}
              r="2"
              fill={["#22C55E", "#38BDF8", "#FACC15"][(r + l) % 3]}
              className="ai-blink"
              style={{ animationDelay: `${((r * 7 + l * 3) % 10) / 10}s` }}
            />
          ))}
        </g>
      ))}

      {/* heat rising from the roof */}
      <g opacity={dim("heat")} stroke="#EF4444" strokeWidth="3" fill="none" strokeLinecap="round">
        {[150, 190, 230].map((x, i) => (
          <path key={x} d={`M${x} 85 q6 -8 0 -16 q-6 -8 0 -16`} className="ai-rise" style={{ animationDelay: `${i * 0.4}s` }} />
        ))}
      </g>

      {/* cooling: fans on the roof */}
      <g opacity={dim("cool")}>
        {[160, 220].map((x) => (
          <g key={x} transform={`translate(${x} 86)`}>
            <circle r="7" fill="#E2E8F0" stroke="#64748B" />
            <g className="ai-spin">
              <path d="M0 0 L0 -6 L3 -2 Z M0 0 L6 0 L2 3 Z M0 0 L0 6 L-3 2 Z M0 0 L-6 0 L-2 -3 Z" fill="#475569" />
            </g>
          </g>
        ))}
      </g>

      {/* water: pipe in + cooling tower with vapour */}
      <g opacity={dim("water")}>
        <path d="M265 150 H300" stroke="#0EA5E9" strokeWidth="4" strokeDasharray="5 5" className="ai-flow" />
        <path d="M290 170 L298 110 H332 L340 170 Z" fill="#94A3B8" />
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={308 + i * 8} cy="100" r="9" fill="#FFFFFF" opacity="0.9" className="ai-steam" style={{ animationDelay: `${i * 0.6}s` }} />
        ))}
      </g>
    </svg>
  );
}

// Per-question estimates published by Google (Aug 2025) for a median Gemini text prompt.
const WH_PER_Q = 0.24;
const ML_PER_Q = 0.26;

const GROUPS = [
  { id: "me", icon: "🙋", label: "Just me", people: 1 },
  { id: "class", icon: "👩‍🏫", label: "My class", people: 40 },
  { id: "school", icon: "🏫", label: "My school", people: 1500 },
  { id: "sg", icon: "🇸🇬", label: "All of Singapore", people: 6000000 },
];

function energyLike(wh) {
  if (wh < 5) return `a 10-watt LED bulb on for ${Math.round((wh / 10) * 3600)} seconds`;
  if (wh < 15) return `a 10-watt LED bulb on for ${Math.round((wh / 10) * 60)} minutes`;
  if (wh < 10000) return `charging a phone ${Math.round(wh / 15).toLocaleString()} times`;
  return `powering ${Math.round(wh / 1000 / 381).toLocaleString()} four-room HDB flats for a whole month`;
}

function waterLike(ml) {
  if (ml < 1) return `about ${Math.round(ml / 0.05)} drops`;
  if (ml < 250) return `about ${Math.round(ml / 5)} teaspoons`;
  if (ml < 100000) return `about ${Math.round(ml / 250).toLocaleString()} cups`;
  return `about ${Math.round(ml / 150000).toLocaleString()} full bathtubs`;
}

function Meter() {
  const [group, setGroup] = useState(GROUPS[0]);
  const [asked, setAsked] = useState(false);
  const wh = group.people * WH_PER_Q;
  const ml = group.people * ML_PER_Q;

  return (
    <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
      <p className="font-bold text-slate-800">🔌 How much does one question use?</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              setGroup(g);
              setAsked(false);
            }}
            className={`rounded-xl p-2 text-sm font-semibold border-2 ${group.id === g.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200"}`}
          >
            {g.icon} {g.label}
          </button>
        ))}
      </div>
      <button
        onClick={() => setAsked(true)}
        className="w-full py-3 rounded-2xl bg-amber-400 text-slate-900 text-lg font-bold shadow hover:bg-amber-300 active:scale-95 transition-transform"
      >
        💬 {group.people === 1 ? "Ask the AI one question" : `Everyone asks one question (${group.people.toLocaleString()} people)`}
      </button>
      {asked && (
        <div className="grid sm:grid-cols-2 gap-3 ai-pop">
          <div className="rounded-xl bg-white p-3">
            <div className="text-sm text-slate-500">⚡ Electricity</div>
            <div className="text-xl font-bold text-slate-800">
              {wh < 1000 ? `${+wh.toFixed(2)} Wh` : `${(wh / 1000).toLocaleString()} kWh`}
            </div>
            <div className="text-sm text-slate-600">Roughly like {energyLike(wh)}</div>
          </div>
          <div className="rounded-xl bg-white p-3">
            <div className="text-sm text-slate-500">💧 Water</div>
            <div className="text-xl font-bold text-slate-800">{ml < 1000 ? `${+ml.toFixed(2)} mL` : `${(ml / 1000).toLocaleString()} litres`}</div>
            <div className="text-sm text-slate-600">That's {waterLike(ml)}</div>
          </div>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Based on Google's own estimate for a typical text question to its Gemini AI (2025). OpenAI has given a similar estimate for
        ChatGPT. Long answers, and especially making pictures and videos, use more. Companies don't share everything, so these are
        best guesses.
      </p>
    </div>
  );
}

export default function DataCentre() {
  const [active, setActive] = useState(null);
  return (
    <div className="space-y-4">
      <Bit>
        <p className="font-semibold">🏢 This is a data centre: a giant building full of AI chips. Tap the buttons to explore it!</p>
      </Bit>
      <div className="rounded-2xl overflow-hidden shadow-lg">
        <Building active={active} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(PARTS).map(([id, p]) => (
          <button
            key={id}
            onClick={() => setActive(active === id ? null : id)}
            className={`rounded-xl py-2 font-semibold text-sm border-2 ${active === id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200"}`}
          >
            <div className="text-xl">{p.icon}</div>
            {p.title}
          </button>
        ))}
      </div>
      {active && (
        <div key={active} className="rounded-2xl bg-indigo-50 p-4 text-slate-700 ai-pop">
          <span className="font-bold">
            {PARTS[active].icon} {PARTS[active].title}:{" "}
          </span>
          {PARTS[active].text}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-amber-50 p-4">
          <div className="text-3xl">🏋️</div>
          <p className="font-bold text-slate-800">Training is the heavy part</p>
          <p className="text-sm text-slate-700">
            Training GPT-3 (an older AI from 2020) used about 1,287,000 kWh of electricity. That's enough to power about
            <b> 280 four-room HDB flats for a whole year</b>!
          </p>
        </div>
        <div className="rounded-2xl bg-sky-50 p-4">
          <div className="text-3xl">💧</div>
          <p className="font-bold text-slate-800">Thirsty work</p>
          <p className="text-sm text-slate-700">
            Scientists estimated that training GPT-3 evaporated about <b>700,000 litres</b> of water to cool the data centre: over a quarter
            of an Olympic swimming pool.
          </p>
        </div>
      </div>

      <Meter />

      <DigDeeper>
        <p>
          One question is tiny. But hundreds of millions of people now use AI chatbots, often many times a day, so it adds up. And the
          newest AIs are much bigger than GPT-3.
        </p>
        <p>
          Where the electricity comes from matters too: power from the sun or wind causes far less pollution than power from burning
          gas or coal.
        </p>
      </DigDeeper>
    </div>
  );
}
