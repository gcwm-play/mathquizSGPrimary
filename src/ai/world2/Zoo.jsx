import React, { useState } from "react";
import { Bit } from "../ui.jsx";

const REGIONS = [
  {
    id: "usa",
    flag: "🇺🇸",
    name: "USA",
    models: [
      { icon: "💬", family: "GPT (ChatGPT)", maker: "OpenAI", open: "both", fact: "ChatGPT launched in November 2022 and reached about 100 million users in just two months, the fastest-growing app ever at the time." },
      { icon: "✳️", family: "Claude", maker: "Anthropic", open: "closed", fact: "Anthropic was started in 2021 by researchers who left OpenAI wanting to focus on AI safety." },
      { icon: "✨", family: "Gemini (and Gemma)", maker: "Google", open: "both", fact: "Google researchers invented the Transformer in 2017, the design almost every chatbot uses today." },
      { icon: "🦙", family: "Llama", maker: "Meta", open: "open", fact: "In 2023, Llama 2 became one of the first powerful AIs that companies could download and use for free." },
      { icon: "✖️", family: "Grok", maker: "xAI", open: "both", fact: "Grok is built into the X social media app. xAI has also shared some of its older models for anyone to download." },
    ],
  },
  {
    id: "europe",
    flag: "🇪🇺",
    name: "Europe",
    models: [
      { icon: "🌬️", family: "Mistral", maker: "Mistral AI (France 🇫🇷)", open: "both", fact: "Started in Paris in 2023, it quickly became one of Europe's best-known AI companies, sharing many of its models openly." },
    ],
  },
  {
    id: "china",
    flag: "🇨🇳",
    name: "China",
    models: [
      { icon: "🐋", family: "DeepSeek", maker: "DeepSeek", open: "open", fact: "When its R1 model came out in January 2025, chipmaker Nvidia lost about US$590 billion in value in one day, the biggest one-day drop for any company ever." },
      { icon: "☁️", family: "Qwen", maker: "Alibaba", open: "open", fact: "Qwen is the most downloaded open AI family in the world, and people have built well over 100,000 new models from it." },
      { icon: "🌱", family: "Doubao / Seed", maker: "ByteDance (TikTok's parent company)", open: "closed", fact: "In March 2026, a Seed model was the top-rated Chinese AI on a famous leaderboard where people vote for the best answers." },
      { icon: "🌙", family: "Kimi", maker: "Moonshot AI", open: "open", fact: "Kimi became famous for being able to read very long documents in one go." },
      { icon: "🎓", family: "GLM", maker: "Zhipu AI", open: "open", fact: "Zhipu grew out of AI research at Tsinghua University in Beijing." },
    ],
  },
  {
    id: "asia",
    flag: "🌏",
    name: "Singapore & more",
    models: [
      { icon: "🦁", family: "SEA-LION", maker: "AI Singapore 🇸🇬", open: "open", fact: "Built for Southeast Asia's languages, including Malay, Tamil, Indonesian, Thai, Vietnamese, Filipino, Burmese, Khmer and Lao." },
      { icon: "🗣️", family: "MERaLiON", maker: "Singapore's National Multimodal LLM Programme 🇸🇬", open: "open", fact: "Made to understand spoken Singlish and Singapore-accented English, plus languages like Mandarin, Malay and Tamil." },
      { icon: "🦅", family: "Falcon", maker: "Technology Innovation Institute (UAE 🇦🇪)", open: "open", fact: "One of the best-known open AI families from the Middle East." },
      { icon: "🍀", family: "HyperCLOVA X", maker: "Naver (South Korea 🇰🇷)", open: "closed", fact: "Built especially to understand Korean language and culture." },
    ],
  },
];

const BADGE = {
  open: ["🔓 Open", "bg-emerald-100 text-emerald-800"],
  closed: ["🔒 Closed", "bg-rose-100 text-rose-800"],
  both: ["🔓🔒 Both", "bg-amber-100 text-amber-800"],
};

export default function Zoo() {
  const [region, setRegion] = useState("usa");
  const [flipped, setFlipped] = useState({});
  const r = REGIONS.find((x) => x.id === region);

  return (
    <div className="space-y-4">
      <Bit>
        <p className="font-semibold">Welcome to the zoo! 🦁 Here are some of the best-known AI families around the world.</p>
        <p className="text-sm text-slate-600">
          Each family has many versions, and new ones arrive every few months, so we show the family names. Tap a card for a fun fact!
        </p>
      </Bit>
      <div className="grid grid-cols-4 gap-2">
        {REGIONS.map((x) => (
          <button
            key={x.id}
            onClick={() => setRegion(x.id)}
            className={`rounded-xl py-2 text-sm font-bold border-2 leading-tight ${
              region === x.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-700"
            }`}
          >
            <div className="text-xl">{x.flag}</div>
            {x.name}
          </button>
        ))}
      </div>
      <div key={region} className="grid sm:grid-cols-2 gap-3">
        {r.models.map((m, i) => {
          const key = `${region}-${i}`;
          const show = flipped[key];
          return (
            <button
              key={key}
              onClick={() => setFlipped({ ...flipped, [key]: !show })}
              className={`text-left rounded-2xl p-4 border-2 transition-all ai-pop ${show ? "bg-amber-50 border-amber-300" : "bg-white border-slate-100 shadow"}`}
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-3xl">{m.icon}</div>
                <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${BADGE[m.open][1]}`}>{BADGE[m.open][0]}</span>
              </div>
              <div className="font-bold text-lg text-slate-800 leading-tight mt-1">{m.family}</div>
              <div className="text-sm text-slate-500">by {m.maker}</div>
              {show ? (
                <p className="text-sm text-slate-700 mt-2 ai-pop">💡 {m.fact}</p>
              ) : (
                <p className="text-xs font-bold text-indigo-600 mt-2">Tap for a fun fact</p>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        There are many more, from Japan, India, Canada and elsewhere. 🔓 Open = you can download it. 🔒 Closed = use it through the
        company's app. 🔓🔒 Both = the company makes some of each.
      </p>
    </div>
  );
}
