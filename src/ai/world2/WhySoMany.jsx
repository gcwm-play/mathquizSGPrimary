import React, { useState } from "react";
import { Bit, DigDeeper } from "../ui.jsx";

const SIZES = [
  {
    icon: "📱",
    name: "Pocket AI",
    knobs: "about 1 to 3 billion knobs",
    where: "Runs right on a phone, even without internet. Google's Gemini Nano and Apple's on-device model are this size.",
    meters: { Smarts: 2, Speed: 5, "Low cost": 5, Privacy: 5 },
    scale: 0.55,
  },
  {
    icon: "🎒",
    name: "Backpack AI",
    knobs: "about 10 to 100 billion knobs",
    where: "Runs on a powerful computer. Many free-to-download (open) models come in this size.",
    meters: { Smarts: 3, Speed: 4, "Low cost": 3, Privacy: 4 },
    scale: 0.8,
  },
  {
    icon: "🚚",
    name: "Truck AI",
    knobs: "hundreds of billions of knobs or more",
    where: "Needs a giant data centre. The smartest chatbots are this size, but every question costs more energy and money.",
    meters: { Smarts: 5, Speed: 2, "Low cost": 1, Privacy: 2 },
    scale: 1.1,
  },
];

const REASONS = [
  ["🏁", "Competition", "Lots of companies are racing to build the best AI, so new ones come out every few months."],
  ["🎯", "Specialists", "Some AIs are experts at one thing: writing code, making pictures, music or videos, or helping scientists."],
  ["🌏", "Languages and cultures", "An AI trained mostly on English may not understand Thai, Tamil or Singlish well. So some are built for a region."],
  ["🏛️", "Countries want their own", "Many governments want AIs built in their own country that follow their own laws and values."],
  ["💸", "Price and speed", "A quick, cheap AI is better for simple jobs. A big, slow one is better for hard problems."],
  ["🔓", "Open vs closed", "Some companies share their AI for anyone to download. Others keep it secret and let you use it through their app."],
];

function Meter({ label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-16 shrink-0 text-slate-600">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`w-4 h-3 rounded-sm transition-colors duration-500 ${n <= value ? "bg-indigo-500" : "bg-slate-200"}`} />
        ))}
      </div>
    </div>
  );
}

export default function WhySoMany() {
  const [size, setSize] = useState(1);
  const [open, setOpen] = useState(null);
  const s = SIZES[size];

  return (
    <div className="space-y-5">
      <Bit>
        <p className="font-semibold">There are hundreds of different AIs! Why not just one? First reason: size.</p>
        <p className="text-sm text-slate-600">Slide to change the AI's size and watch what happens.</p>
      </Bit>

      <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
        <div className="flex items-center gap-4">
          <div className="w-20 h-28 shrink-0 flex items-center justify-center">
            <span className="text-6xl transition-transform duration-500" style={{ transform: `scale(${s.scale})` }} aria-hidden="true">
              🤖
            </span>
          </div>
          <div className="space-y-1 min-w-0">
            <div className="text-xl font-bold text-slate-800">
              {s.icon} {s.name}
            </div>
            <div className="text-sm text-indigo-700 font-semibold">{s.knobs}</div>
            {Object.entries(s.meters).map(([k, v]) => (
              <Meter key={k} label={k} value={v} />
            ))}
          </div>
        </div>
        <p className="text-slate-700">{s.where}</p>
        <input
          type="range"
          min="0"
          max="2"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="w-full accent-indigo-600"
          aria-label="AI size"
        />
        <div className="flex justify-between text-sm font-semibold text-slate-600">
          <span>📱 Pocket</span>
          <span>🎒 Backpack</span>
          <span>🚚 Truck</span>
        </div>
        <p className="text-xs text-slate-500">Star ratings are a rough guide to compare sizes, not exact measurements.</p>
      </div>

      <div>
        <p className="font-bold text-slate-800 mb-2">More reasons. Tap a card!</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {REASONS.map(([icon, title, text], i) => (
            <button
              key={title}
              onClick={() => setOpen(open === i ? null : i)}
              className={`rounded-2xl p-3 text-left border-2 transition-all ${open === i ? "bg-amber-50 border-amber-300" : "bg-white border-slate-100 shadow-sm"}`}
            >
              <div className="text-2xl">{icon}</div>
              <div className="font-bold text-slate-800 leading-tight">{title}</div>
              {open === i && <p className="text-sm text-slate-700 mt-1 ai-pop">{text}</p>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-rose-50 p-4">
          <div className="text-3xl">🍽️🔒</div>
          <div className="font-bold text-slate-800">Closed AI = a restaurant</div>
          <p className="text-sm text-slate-700">
            You order through their app and get your meal, but the recipe is a secret. ChatGPT, Claude and Gemini work like this.
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4">
          <div className="text-3xl">📖🔓</div>
          <div className="font-bold text-slate-800">Open AI = a recipe book</div>
          <p className="text-sm text-slate-700">
            Anyone can download it, run it on their own computer and change it. Llama, Qwen, DeepSeek and Mistral share models like this.
          </p>
        </div>
      </div>

      <DigDeeper>
        <p>
          “Open” AIs are usually <b>open-weight</b>: you can download the trained knobs (the weights), but not always all the training
          data or code. Some companies do both. Google shares its Gemma models and OpenAI released open-weight “gpt-oss” models in 2025.
        </p>
        <p>
          Open models let anyone study and improve them, but they can also be misused, because the company can't take them back once
          they're shared. People disagree about which is better.
        </p>
      </DigDeeper>
    </div>
  );
}
