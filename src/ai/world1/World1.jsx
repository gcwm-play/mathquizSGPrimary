import React, { useState } from "react";
import { Section, Bit, DigDeeper } from "../ui.jsx";
import Factory from "./Factory.jsx";
import DataCentre from "./DataCentre.jsx";
import Fakes from "./Fakes.jsx";

// Estimated computer-time cost to train each model (Stanford AI Index 2024).
const COSTS = [
  { name: "Transformer", year: 2017, usd: 930, emoji: "🐣" },
  { name: "GPT-3", year: 2020, usd: 4.3e6, emoji: "🐥" },
  { name: "GPT-4", year: 2023, usd: 78e6, emoji: "🦅" },
  { name: "Gemini Ultra", year: 2023, usd: 191e6, emoji: "🐉" },
];

const money = (usd) => (usd < 1e6 ? `US$${usd.toLocaleString()}` : `US$${+(usd / 1e6).toFixed(1)} million`);

function Costs() {
  const [grown, setGrown] = useState(false);
  const max = Math.max(...COSTS.map((c) => c.usd));
  return (
    <div className="space-y-4">
      <Bit>
        <p className="font-semibold">💰 Renting all those chips for months costs a LOT of money, and it's grown super fast.</p>
        <p className="text-sm text-slate-600">Tap to grow the bars. These are experts' estimates of just the computer time for training.</p>
      </Bit>
      <button onClick={() => setGrown(true)} className="w-full rounded-2xl bg-slate-50 p-4 space-y-3 text-left">
        {COSTS.map((c) => (
          <div key={c.name} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-bold text-slate-700">
                {c.emoji} {c.name} <span className="font-normal text-slate-500">({c.year})</span>
              </span>
              <span className="font-semibold text-slate-700 tabular-nums">{grown ? money(c.usd) : "?"}</span>
            </div>
            <div className="h-6 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-300 to-rose-500 transition-all duration-1000 ease-out"
                style={{ width: grown ? `${Math.max(0.4, (c.usd / max) * 100)}%` : "0%" }}
              />
            </div>
          </div>
        ))}
        {!grown && <div className="text-center font-bold text-indigo-600">👆 Tap to reveal</div>}
        {grown && (
          <p className="text-sm text-slate-600 ai-pop">
            The 2017 one is so cheap its bar is almost invisible! In just 6 years, the cost went up about <b>200,000 times</b>.
          </p>
        )}
      </button>
      <DigDeeper>
        <p>
          These numbers only count the computer time for the final training. Paying researchers, buying chips and building data centres
          costs far more. The biggest tech companies now spend tens of billions of dollars a year building data centres.
        </p>
        <p>
          Some teams have found clever ways to train for less. In 2024, the Chinese company DeepSeek said the final training run of its
          V3 model cost about US$5.6 million in chip rental, though that leaves out its research, earlier experiments and the chips
          themselves.
        </p>
      </DigDeeper>
    </div>
  );
}

function Planet() {
  const cards = [
    ["📈", "It's growing fast", "Data centres used about 1.5% of the world's electricity in 2024. Experts expect that to roughly double by 2030, with AI the biggest reason."],
    ["⚙️", "It's getting more efficient", "Chips and software keep improving. Google says the energy for a typical Gemini question dropped about 33 times in one year (that's the company's own figure)."],
    ["☀️", "Cleaner power helps", "Many tech companies are buying solar and wind power, but a lot of the world's electricity still comes from burning gas and coal."],
    ["🧬", "AI can help the planet too", "AI is helping scientists design new medicines and materials. The team behind AlphaFold, an AI that predicts the shapes of proteins, won the 2024 Nobel Prize in Chemistry."],
  ];
  return (
    <div className="space-y-4">
      <Bit mood="think">
        <p className="font-semibold">🌍 So… is AI bad for the planet?</p>
        <p className="text-sm text-slate-600">The honest answer: it has real costs AND real benefits. Here are the facts, so you can decide.</p>
      </Bit>
      <div className="grid sm:grid-cols-2 gap-3">
        {cards.map(([icon, title, text]) => (
          <div key={title} className="rounded-2xl bg-slate-50 p-4">
            <div className="text-3xl">{icon}</div>
            <div className="font-bold text-slate-800">{title}</div>
            <p className="text-sm text-slate-700">{text}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4 space-y-1 text-slate-700">
        <div className="font-bold text-slate-800">🌱 What can you do?</div>
        <p>✅ Use AI when it really helps you, not for everything.</p>
        <p>✅ Ask clear questions, so you don't need lots of tries.</p>
        <p>✅ Think twice before making dozens of AI pictures or videos just for fun. They use much more energy than text.</p>
      </div>
    </div>
  );
}

function SingaporeBox() {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-rose-500 to-red-600 text-white p-5 space-y-2 shadow-lg">
      <h3 className="text-xl font-bold">🇸🇬 Data centres in Singapore</h3>
      <p>
        Singapore is a key hub for data centres in Asia. By 2020, they used about <b>7% of all Singapore's electricity</b>.
      </p>
      <p>
        Because Singapore is small, with limited land and energy, the government <b>paused new data centres from 2019 to 2022</b>. Now
        new ones must be extra energy-efficient and use more green energy.
      </p>
      <p>
        Being hot and humid all year makes cooling harder here, so Singapore is testing ways for data centres to run safely at warmer
        temperatures.
      </p>
    </div>
  );
}

export default function World1() {
  return (
    <div className="space-y-6">
      <Section title="🏭 How an AI is made" subtitle="Ride the conveyor belt through the five stations of the AI factory.">
        <Factory />
      </Section>
      <Section title="🏢 Inside a data centre" subtitle="Where AIs are trained and where your questions get answered.">
        <DataCentre />
      </Section>
      <SingaporeBox />
      <Section title="💰 What does it cost?">
        <Costs />
      </Section>
      <Section title="🌍 Is AI bad for the planet?">
        <Planet />
      </Section>
      <Section title="😵 The messy side: AI slop and fakes">
        <Fakes />
      </Section>
      <details className="bg-white/70 rounded-3xl p-5 text-slate-700">
        <summary className="font-bold cursor-pointer">📚 Sources for grown-ups</summary>
        <ul className="list-disc pl-5 mt-3 space-y-1 text-sm">
          {[
            ["International Energy Agency (2025), Energy and AI: data centres ~415 TWh (~1.5%) in 2024, ~945 TWh by 2030", "https://www.iea.org/reports/energy-and-ai/executive-summary"],
            ["Google (2025), Measuring the environmental impact of AI inference: 0.24 Wh, 0.26 mL per median Gemini Apps text prompt; 33× efficiency gain", "https://cloud.google.com/blog/products/infrastructure/measuring-the-environmental-impact-of-ai-inference"],
            ["Meta (2024), Llama 3.1 release: 15T+ tokens, 16K+ H100 GPUs", "https://ai.meta.com/blog/meta-llama-3-1/"],
            ["Meta (2024), The Llama 3 Herd of Models: 3.8 × 10²⁵ FLOPs, 54 days of pre-training", "https://arxiv.org/abs/2407.21783"],
            ["Patterson et al. (2021), Carbon Emissions and Large Neural Network Training: GPT-3 ~1,287 MWh", "https://arxiv.org/abs/2104.10350"],
            ["Li et al. (2023), Making AI Less “Thirsty”: GPT-3 training ~700,000 L on-site water", "https://arxiv.org/abs/2304.03271"],
            ["Stanford HAI, AI Index 2024: training cost estimates", "https://hai.stanford.edu/news/ai-index-state-ai-13-charts"],
            ["DeepSeek-AI (2024), DeepSeek-V3 Technical Report: US$5.576M final training run", "https://arxiv.org/abs/2412.19437"],
            ["Singapore MSE: average 4-room HDB electricity use (380.7 kWh/month, 2024)", "https://www.mse.gov.sg/latest-news/written-reply-to-parliamentary-question-on--monthly-average-electricity-and-water-consumption-rates-for-households/"],
            ["Singapore's data centre pause and Green Data Centre Roadmap", "https://www.nortonrosefulbright.com/en/knowledge/publications/3b294288/singapore-s-green-data-centre-roadmap-and-dc-cfa2-driving-sustainable-ai-ready-infrastructure"],
            ["Nobel Prize in Chemistry 2024 (AlphaFold)", "https://www.nobelprize.org/prizes/chemistry/2024/summary/"],
            ["NBC News (2025), Merriam-Webster names “slop” its 2025 word of the year", "https://www.nbcnews.com/news/us-news/merriam-webster-word-of-the-year-2025-rcna247864"],
            ["NPR (2023), Fake viral images of an explosion at the Pentagon were probably created by AI", "https://www.npr.org/2023/05/22/1177590231/fake-viral-images-of-an-explosion-at-the-pentagon-were-probably-created-by-ai"],
            ["SCMP (2023), PM Lee warns of deepfake video of him promoting crypto investment", "https://www.scmp.com/news/asia/southeast-asia/article/3246629/singapore-pm-lee-issues-warning-after-deepfake-video-him-promoting-crypto-investment-emerges"],
            ["Baker McKenzie (2024), Singapore ban on deepfakes of election candidates", "https://connectontech.bakermckenzie.com/singapore-ban-on-the-publication-boosting-sharing-and-reposting-of-deepfake-content-depicting-election-candidates-comes-into-effect/"],
          ].map(([text, url]) => (
            <li key={url}>
              <a className="text-indigo-700 underline" href={url}>
                {text}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500 mt-3">
          Kid-friendly comparisons are our own maths: reading time assumes 0.75 words per token at 250 words/minute; the “everyone on
          Earth” comparison divides 3.8 × 10²⁵ by 8 billion sums per second; HDB comparisons use 381 kWh/month; phone charge ≈ 15 Wh.
        </p>
      </details>
    </div>
  );
}
