import React, { useState } from "react";
import { Section, Bit, DigDeeper } from "../ui.jsx";
import WhySoMany from "./WhySoMany.jsx";
import Zoo from "./Zoo.jsx";
import Race from "./Race.jsx";

// Share of real-world coding problems (SWE-bench Verified) the best AI could solve
// (International AI Safety Report, first key update, Oct 2025).
const CODING = [
  { when: "Early 2024", pct: 2, label: "almost none" },
  { when: "Late 2024", pct: 40, label: "about 40%" },
  { when: "2025", pct: 60, label: "over 60%" },
];

function GettingSmarter() {
  const [grown, setGrown] = useState(false);
  return (
    <div className="space-y-4">
      <Bit>
        <p className="font-semibold">📈 Whoever is “winning”, all AIs are improving super fast.</p>
        <p className="text-sm text-slate-600">
          Scientists gave AIs real problems from real computer projects, the kind professional programmers fix. Tap to see how many
          the best AI could solve.
        </p>
      </Bit>
      <button onClick={() => setGrown(true)} className="w-full rounded-2xl bg-slate-50 p-4">
        <div className="flex items-end justify-around h-44 gap-4">
          {CODING.map((c) => (
            <div key={c.when} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-sm font-bold text-slate-800 mb-1">{grown ? c.label : "?"}</span>
              <div
                className="w-full max-w-[5rem] rounded-t-xl bg-gradient-to-t from-indigo-500 to-fuchsia-400 transition-all duration-1000 ease-out"
                style={{ height: grown ? `${Math.max(3, c.pct * 1.6)}%` : "3%" }}
              />
              <span className="text-xs text-slate-600 mt-1">{c.when}</span>
            </div>
          ))}
        </div>
        {!grown && <div className="font-bold text-indigo-600 mt-2">👆 Tap to reveal</div>}
      </button>
      <DigDeeper>
        <p>
          This test is called SWE-bench Verified. Scores like these can be a bit too good, because some AIs may have seen the test
          questions during training, so scientists keep inventing new, harder tests.
        </p>
      </DigDeeper>
    </div>
  );
}

function Choosing() {
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-3xl">🔄</div>
          <div className="font-bold text-slate-800">Different AIs, different answers</div>
          <p className="text-sm text-slate-700">
            Ask two AIs the same question and you'll often get different answers. Each was trained on different data with different
            rules, so none of them is always right.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-3xl">🧑‍🏫</div>
          <div className="font-bold text-slate-800">Age rules</div>
          <p className="text-sm text-slate-700">
            Most AI chatbots are only meant for teenagers or adults (often 13+, some 18+). If you use AI for school, do it with a parent
            or teacher.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function World2() {
  return (
    <div className="space-y-6">
      <Section title="🤔 Why are there so many AIs?">
        <WhySoMany />
      </Section>
      <Section title="🦁 Meet the Model Zoo" subtitle="Famous AI families from around the world.">
        <Zoo />
      </Section>
      <Section title="🏁 The great AI race: West vs East">
        <Race />
      </Section>
      <Section title="📈 Getting smarter, fast">
        <GettingSmarter />
      </Section>
      <Section title="🧭 So which AI is best?">
        <Choosing />
      </Section>
      <details className="bg-white/70 rounded-3xl p-5 text-slate-700">
        <summary className="font-bold cursor-pointer">📚 Sources for grown-ups</summary>
        <ul className="list-disc pl-5 mt-3 space-y-1 text-sm">
          {[
            ["Stanford HAI, AI Index 2025: Technical Performance (US–China gaps on MMLU, MMMU, MATH, HumanEval; Chatbot Arena)", "https://hai.stanford.edu/ai-index/2025-ai-index-report/technical-performance"],
            ["Stanford HAI, AI Index 2026: Technical Performance (2.7% Arena gap, March 2026)", "https://hai.stanford.edu/ai-index/2026-ai-index-report/technical-performance"],
            ["TechCrunch (2025), Nvidia drops $600B off its market cap amid the rise of DeepSeek", "https://techcrunch.com/2025/01/27/nvidia-drops-600bn-off-its-market-cap-amid-the-rise-of-deepseek"],
            ["International AI Safety Report (2025), First Key Update: SWE-bench Verified progress", "https://arxiv.org/abs/2510.13653"],
            ["The Next Web (2026), Qwen is the world's most downloaded open model", "https://thenextweb.com/news/alibaba-qwen-downloads-hugging-face-open-models"],
            ["Globe and Mail / UBS (2023), ChatGPT sets record for fastest-growing user base", "https://www.theglobeandmail.com/business/article-chatgpt-sets-record-for-fastest-growing-user-base-analyst-note-says/"],
            ["OpenAI (2025), Introducing gpt-oss", "https://openai.com/index/introducing-gpt-oss/"],
            ["SEA-LION: Southeast Asian Languages in One Network", "https://arxiv.org/abs/2504.05747"],
            ["MERaLiON-AudioLLM: Advancing Speech and Language Understanding for Singapore", "https://aclanthology.org/2025.acl-demo.3/"],
            ["Android Police, Gemini Nano: everything you need to know", "https://www.androidpolice.com/gemini-nano-guide/"],
            ["Apple Machine Learning Research, Introducing Apple's On-Device and Server Foundation Models", "https://machinelearning.apple.com/research/introducing-apple-foundation-models"],
          ].map(([text, url]) => (
            <li key={url}>
              <a className="text-indigo-700 underline" href={url}>
                {text}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500 mt-3">
          Model families and facts as of October 2026. AI changes quickly, so newer versions may have come out since.
        </p>
      </details>
    </div>
  );
}
