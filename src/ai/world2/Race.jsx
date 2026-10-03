import React, { useState } from "react";
import { Bit, DigDeeper, Button } from "../ui.jsx";

// Gaps between the best US and best Chinese models (Stanford AI Index 2025 and 2026).
// `lead` is a rough single number for drawing the runners; the text gives the real measurements.
const CHECKPOINTS = [
  {
    when: "End of 2023",
    lead: 24,
    title: "The USA is way ahead",
    text: "On big tests of general knowledge, maths and coding, the best US AI beat the best Chinese AI by about 17 to 32 points.",
    tests: [
      ["📚 General knowledge", 17.5],
      ["🧮 Maths", 24.3],
      ["💻 Coding", 31.6],
    ],
  },
  {
    when: "January 2024",
    lead: 9.3,
    title: "The vote leaderboard",
    text: "On the Chatbot Arena leaderboard, where people vote for the better of two secret answers, the top US AI led by about 9%.",
  },
  {
    when: "End of 2024",
    lead: 2,
    title: "China catches up, fast!",
    text: "In just one year, the gaps on those same tests shrank to just a few points.",
    tests: [
      ["📚 General knowledge", 0.3],
      ["🧮 Maths", 1.6],
      ["💻 Coding", 3.7],
    ],
  },
  {
    when: "January 2025",
    lead: 1.8,
    title: "The DeepSeek surprise 🐋",
    text: "China's DeepSeek released R1, a strong reasoning AI that was free to download and said to be cheap to train. It shocked investors around the world.",
  },
  {
    when: "February 2025",
    lead: 1.7,
    title: "Neck and neck",
    text: "On the vote leaderboard, the gap between the best US and Chinese AIs shrank to just 1.7%.",
  },
  {
    when: "March 2026",
    lead: 2.7,
    title: "Swapping places",
    text: "The gap was 2.7%. Since early 2025, US and Chinese AIs have swapped places at the top several times, even though US companies invested about 23 times more money in 2025.",
  },
];

export default function Race() {
  const [i, setI] = useState(0);
  const c = CHECKPOINTS[i];
  const behind = Math.min(70, c.lead * 2.6);

  return (
    <div className="space-y-4">
      <Bit>
        <p className="font-semibold">🏁 The great AI race! The USA and China have been racing to build the best AI. Let's watch the gap.</p>
      </Bit>

      <div className="rounded-2xl bg-gradient-to-b from-emerald-100 to-emerald-200 p-4 space-y-3">
        {[
          ["🇺🇸", "USA", 0],
          ["🇨🇳", "China", behind],
        ].map(([flag, name, gap]) => (
          <div key={name} className="relative h-12 rounded-full bg-white/60 border-2 border-dashed border-white">
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xl" aria-hidden="true">
              🏁
            </div>
            <div
              className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 transition-all duration-1000 ease-out"
              style={{ left: `calc(${85 - gap}% - 2.5rem)` }}
            >
              <span className="text-3xl">{flag}</span>
              <span className="text-2xl ai-bob">🏃</span>
            </div>
          </div>
        ))}
        <div className="text-center text-sm font-semibold text-emerald-900">The runners show the gap roughly, using different tests over time.</div>
      </div>

      <div key={i} className="rounded-2xl bg-slate-50 p-4 space-y-2 ai-pop">
        <div className="text-xs font-bold uppercase tracking-wide text-indigo-600">{c.when}</div>
        <div className="text-lg font-bold text-slate-800">{c.title}</div>
        <p className="text-slate-700">{c.text}</p>
        {c.tests && (
          <div className="space-y-1.5 pt-1">
            <div className="text-xs text-slate-500">How far the USA was ahead (points):</div>
            {c.tests.map(([label, gap]) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <span className="w-36 shrink-0">{label}</span>
                <div className="flex-1 h-4 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.max(1, (gap / 32) * 100)}%` }} />
                </div>
                <span className="w-10 text-right tabular-nums font-semibold">{gap}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="soft" onClick={() => setI(i - 1)} disabled={i === 0}>
          ◀
        </Button>
        <div className="flex gap-1.5">
          {CHECKPOINTS.map((_, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              aria-label={CHECKPOINTS[k].when}
              className={`w-3 h-3 rounded-full ${k === i ? "bg-indigo-600" : "bg-slate-300"}`}
            />
          ))}
        </div>
        <Button onClick={() => setI(i + 1)} disabled={i === CHECKPOINTS.length - 1}>
          Next ▶
        </Button>
      </div>

      <DigDeeper>
        <p>
          The tests are MMLU (general knowledge), MATH and HumanEval (coding). The vote leaderboard is called Chatbot Arena (now LMArena):
          thousands of people compare answers from two hidden AIs and pick the better one.
        </p>
        <p>
          Other places are in the race too: Europe, the UAE, South Korea, Japan, India and Singapore all build their own AIs. And
          “winning” depends on what you measure: smarts, cost, speed, safety or how many people use it.
        </p>
      </DigDeeper>
    </div>
  );
}
