import React, { useEffect, useRef, useState } from "react";
import { Section, Bit, DigDeeper, Button } from "../ui.jsx";

const ERAS = [
  {
    id: "start",
    icon: "🌱",
    name: "The beginning",
    years: "1950s–1970s",
    events: [
      { year: "1950", emoji: "🤔", title: "“Can machines think?”", text: "British mathematician Alan Turing wrote a famous paper asking this question. He suggested a test: if you chat with a machine and can't tell it apart from a person, maybe it's thinking. It's called the Turing test." },
      { year: "1956", emoji: "🏫", title: "AI gets its name", text: "Scientists met for a summer workshop at Dartmouth College in the USA. The organiser, John McCarthy, used the name “artificial intelligence”, and a new science was born." },
      { year: "1966", emoji: "💬", title: "ELIZA, the first chatbot", text: "Joseph Weizenbaum at MIT made ELIZA, a program that chatted like a counsellor. Some people felt it really understood them, but it was just matching words. Try it below!" },
      { year: "1970s", emoji: "❄️", title: "The first AI winter", text: "AI didn't live up to the big promises, so governments cut the money for research. These cold, quiet times are called “AI winters”." },
    ],
  },
  {
    id: "updown",
    icon: "🎢",
    name: "Ups and downs",
    years: "1980s–1990s",
    events: [
      { year: "1980s", emoji: "📋", title: "Expert systems", text: "Companies built “expert systems”: AIs packed with thousands of hand-written rules from human experts. They were useful, but hard to update and easy to break." },
      { year: "Late 1980s", emoji: "❄️", title: "The second AI winter", text: "Expert systems were expensive and disappointing, so interest and money dried up again." },
      { year: "1997", emoji: "♟️", title: "Deep Blue beats the chess champion", text: "IBM's Deep Blue computer beat world chess champion Garry Kasparov. It won by checking millions of moves every second, not by thinking like a person." },
    ],
  },
  {
    id: "learning",
    icon: "🧠",
    name: "Learning from data",
    years: "2000s–2016",
    events: [
      { year: "2011", emoji: "📺", title: "Watson wins a quiz show", text: "IBM's Watson beat two champions on the American TV quiz show Jeopardy!, answering questions asked in everyday language." },
      { year: "2012", emoji: "🖼️", title: "Deep learning takes off", text: "A program called AlexNet recognised objects in photos far better than anything before. It used a “neural network” trained on powerful graphics chips (GPUs), the same kind of chips used for AI today." },
      { year: "2016", emoji: "⚫", title: "AlphaGo masters Go", text: "Google DeepMind's AlphaGo beat top player Lee Sedol 4–1 at Go, a board game so complex that experts thought computers wouldn't win for another 10 years." },
    ],
  },
  {
    id: "chat",
    icon: "💬",
    name: "The chatbot boom",
    years: "2017–today",
    events: [
      { year: "2017", emoji: "⚡", title: "The Transformer", text: "Google researchers invented the Transformer, using “attention” to understand words. Almost every chatbot today is built on it." },
      { year: "2020", emoji: "📝", title: "GPT-3 surprises everyone", text: "OpenAI's GPT-3 could write stories, answer questions and even simple code, just from predicting the next word." },
      { year: "2022", emoji: "🚀", title: "ChatGPT", text: "ChatGPT launched in November 2022 and reached about 100 million users in two months. Suddenly, everyone was talking about AI." },
      { year: "2024", emoji: "🏅", title: "AI wins Nobel Prizes", text: "The Nobel Prize in Physics went to John Hopfield and Geoffrey Hinton for early work on neural networks. Part of the Chemistry prize went to the AlphaFold team, whose AI predicts the shapes of proteins." },
      { year: "2025", emoji: "🧩", title: "AIs that “think” first", text: "“Reasoning” AIs that work through problems step by step became common, and China's DeepSeek showed strong AI could be made more cheaply." },
    ],
  },
  {
    id: "sg",
    icon: "🇸🇬",
    name: "Singapore",
    years: "2017–today",
    events: [
      { year: "2017", emoji: "🚀", title: "AI Singapore begins", text: "Singapore launched AI Singapore, a national programme to grow AI research and skills." },
      { year: "2019", emoji: "🗺️", title: "National AI Strategy", text: "Singapore published its first National AI Strategy, with plans to use AI in areas like healthcare, education and transport." },
      { year: "2023", emoji: "🦁", title: "SEA-LION and a new strategy", text: "AI Singapore released SEA-LION, an AI for Southeast Asian languages. The government also launched National AI Strategy 2.0." },
      { year: "2024", emoji: "🗣️", title: "MERaLiON hears Singlish", text: "Singapore released MERaLiON, an AI that understands spoken Singlish and Singapore-accented English." },
    ],
  },
];

// A rough, illustrative "excitement about AI" curve. Not real measurements.
const HYPE = [
  [1950, 30], [1956, 60], [1966, 70], [1973, 25], [1980, 35], [1985, 65], [1990, 25], [1997, 40], [2005, 35], [2012, 55], [2016, 70], [2020, 78], [2022, 92], [2026, 97],
];

function HypeMeter() {
  const W = 340;
  const H = 120;
  const x = (y) => 10 + ((y - 1950) / (2026 - 1950)) * (W - 20);
  const yv = (v) => H - 15 - (v / 100) * (H - 30);
  const path = HYPE.map(([yr, v], i) => `${i ? "L" : "M"}${x(yr).toFixed(1)} ${yv(v).toFixed(1)}`).join(" ");
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="text-sm font-bold text-slate-700 mb-1">🎢 The AI rollercoaster</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Excitement about AI rose and fell, with winters in the 1970s and late 1980s, and a boom since 2012">
        <rect x={x(1973)} y="5" width={x(1980) - x(1973)} height={H - 20} fill="#E0F2FE" rx="4" />
        <rect x={x(1987)} y="5" width={x(1993) - x(1987)} height={H - 20} fill="#E0F2FE" rx="4" />
        <text x={(x(1973) + x(1980)) / 2} y="20" textAnchor="middle" fontSize="12">❄️</text>
        <text x={(x(1987) + x(1993)) / 2} y="20" textAnchor="middle" fontSize="12">❄️</text>
        <path d={path} fill="none" stroke="#6366F1" strokeWidth="3" strokeLinejoin="round" />
        {[1950, 1970, 1990, 2010, 2026].map((yr) => (
          <text key={yr} x={x(yr)} y={H - 2} textAnchor="middle" fontSize="9" fill="#64748B">
            {yr}
          </text>
        ))}
      </svg>
      <p className="text-xs text-slate-500">
        A rough picture of how excited people were about AI (not exact measurements). The blue ❄️ zones are the AI winters.
      </p>
    </div>
  );
}

// --- A tiny ELIZA: matches patterns and flips pronouns, with no understanding at all ---

const SWAP = { i: "you", me: "you", my: "your", am: "are", mine: "yours", you: "I", your: "my", "i'm": "you're" };
const swap = (s) =>
  s
    .toLowerCase()
    .replace(/[.!?]+$/, "")
    .split(/\s+/)
    .map((w) => SWAP[w] ?? w)
    .join(" ");

const RULES = [
  [/\b(hello|hi|hey)\b/i, () => "Hello. What would you like to talk about today?"],
  [/\bi feel (.+)/i, (m) => `Why do you feel ${swap(m[1])}?`],
  [/\bi am (.+)|\bi'm (.+)/i, (m) => `How long have you been ${swap(m[1] ?? m[2])}?`],
  [/\b(mum|mom|dad|mother|father|sister|brother|family)\b/i, () => "Tell me more about your family."],
  [/\bbecause\b/i, () => "Is that the real reason?"],
  [/\bi like (.+)/i, (m) => `What do you like most about ${swap(m[1])}?`],
  [/\byou\b/i, () => "We were talking about you, not me."],
  [/\?$/, () => "Why do you ask that?"],
];
const FALLBACK = ["Please go on.", "Tell me more.", "How does that make you feel?", "I see. Can you say more?"];

function eliza(input, turn) {
  for (const [re, reply] of RULES) {
    const m = input.match(re);
    if (m) return reply(m);
  }
  return FALLBACK[turn % FALLBACK.length];
}

const TRY = ["Hello!", "I feel tired today", "I like football", "My mum makes great laksa", "Are you a robot?"];

function Eliza() {
  const [chat, setChat] = useState([{ who: "eliza", text: "Hello, I am ELIZA. How are you feeling today?" }]);
  const [text, setText] = useState("");
  const boxRef = useRef(null);

  // Scroll only the chat box (not the whole page) to the newest message.
  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [chat]);

  const send = (msg) => {
    const m = msg.trim().slice(0, 80);
    if (!m) return;
    setChat((c) => [...c, { who: "you", text: m }, { who: "eliza", text: eliza(m, c.length) }]);
    setText("");
  };

  return (
    <div className="space-y-3">
      <Bit>
        <p className="font-semibold">💬 Chat with ELIZA, a copy of the 1966 chatbot!</p>
        <p className="text-sm text-slate-600">
          ELIZA follows a few simple rules, like turning “I feel sad” into “Why do you feel sad?”. Can you catch it out?
        </p>
      </Bit>
      <div ref={boxRef} className="rounded-2xl bg-slate-900 p-3 h-64 overflow-y-auto space-y-2 font-mono text-sm">
        {chat.map((c, i) => (
          <div key={i} className={`flex ${c.who === "you" ? "justify-end" : ""}`}>
            <span className={`px-3 py-1.5 rounded-xl max-w-[80%] ${c.who === "you" ? "bg-indigo-500 text-white" : "bg-emerald-900 text-emerald-200"}`}>
              {c.who === "eliza" ? "ELIZA: " : ""}
              {c.text}
            </span>
          </div>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={80}
          placeholder="Type to ELIZA…"
          className="flex-1 min-w-0 rounded-2xl border-2 border-indigo-200 px-4 py-2 focus:outline-none focus:border-indigo-500"
          aria-label="Message to ELIZA"
        />
        <Button>Send</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {TRY.map((t) => (
          <button key={t} onClick={() => send(t)} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold">
            {t}
          </button>
        ))}
      </div>
      <DigDeeper title="ELIZA vs today's AI">
        <p>
          <b>ELIZA (1966)</b> had a short list of rules written by one person. It didn't learn anything and didn't understand a word. It
          just spotted patterns and flipped “I” into “you”.
        </p>
        <p>
          <b>Today's chatbots</b> learned patterns from trillions of words, so they can answer almost anything. But like ELIZA, they can
          still sound like they understand more than they do!
        </p>
        <p>Please don't type private information here or in any chatbot.</p>
      </DigDeeper>
    </div>
  );
}

function Timeline() {
  const [era, setEra] = useState("start");
  const e = ERAS.find((x) => x.id === era);
  const i = ERAS.indexOf(e);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-1">
        {ERAS.map((x) => (
          <button
            key={x.id}
            onClick={() => setEra(x.id)}
            className={`rounded-xl py-2 px-1 text-center leading-tight border-2 ${
              era === x.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-700"
            }`}
          >
            <div className="text-xl">{x.icon}</div>
            <div className="text-[10px] sm:text-xs font-bold">{x.id === "sg" ? "Singapore" : x.years}</div>
          </button>
        ))}
      </div>
      <div key={era} className="space-y-1 ai-pop">
        <h3 className="text-xl font-bold text-slate-800">
          {e.icon} {e.name} <span className="text-base font-normal text-slate-500">({e.years})</span>
        </h3>
        <ol className="relative border-l-4 border-indigo-200 ml-3 space-y-4 pt-2">
          {e.events.map((ev, k) => (
            <li key={ev.title} className="ml-6 ai-pop" style={{ animationDelay: `${k * 0.1}s` }}>
              <span className="absolute -left-[22px] flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500 text-xl shadow">
                {ev.emoji}
              </span>
              <span className="inline-block text-xs font-bold bg-amber-300 text-slate-900 rounded-full px-2 py-0.5">{ev.year}</span>
              <h4 className="font-bold text-slate-800 mt-1">{ev.title}</h4>
              <p className="text-slate-700">{ev.text}</p>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex justify-between">
        <Button variant="soft" onClick={() => setEra(ERAS[i - 1].id)} disabled={i === 0}>
          ◀ Earlier
        </Button>
        <Button onClick={() => setEra(ERAS[i + 1].id)} disabled={i === ERAS.length - 1}>
          Later ▶
        </Button>
      </div>
    </div>
  );
}

export default function History() {
  return (
    <div className="space-y-6">
      <Section title="⏳ The story of AI" subtitle="Travel through 75 years of thinking machines.">
        <Bit>
          <p className="font-semibold">AI didn't appear overnight! People have been trying to build thinking machines for over 75 years.</p>
          <p className="text-sm text-slate-600">Tap an era to travel through time.</p>
        </Bit>
        <HypeMeter />
        <Timeline />
      </Section>
      <Section title="💬 Meet ELIZA (1966)">
        <Eliza />
      </Section>
      <details className="bg-white/70 rounded-3xl p-5 text-slate-700">
        <summary className="font-bold cursor-pointer">📚 Sources for grown-ups</summary>
        <ul className="list-disc pl-5 mt-3 space-y-1 text-sm">
          {[
            ["Turing (1950), Computing Machinery and Intelligence", "https://academic.oup.com/mind/article/LIX/236/433/986238"],
            ["Dartmouth Summer Research Project on Artificial Intelligence (1956)", "https://home.dartmouth.edu/about/artificial-intelligence-ai-coined-dartmouth"],
            ["Weizenbaum (1966), ELIZA", "https://dl.acm.org/doi/10.1145/365153.365168"],
            ["IBM, Deep Blue", "https://www.ibm.com/history/deep-blue"],
            ["Krizhevsky, Sutskever & Hinton (2012), ImageNet Classification with Deep Convolutional Neural Networks", "https://papers.nips.cc/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html"],
            ["Google DeepMind, AlphaGo", "https://deepmind.google/research/breakthroughs/alphago/"],
            ["Nobel Prize in Physics 2024", "https://www.nobelprize.org/prizes/physics/2024/summary/"],
            ["Nobel Prize in Chemistry 2024", "https://www.nobelprize.org/prizes/chemistry/2024/summary/"],
            ["Smart Nation Singapore, National AI Strategy", "https://www.smartnation.gov.sg/nais/"],
            ["AI Singapore", "https://aisingapore.org/"],
          ].map(([text, url]) => (
            <li key={url}>
              <a className="text-indigo-700 underline" href={url}>
                {text}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500 mt-3">The rollercoaster chart is an illustration of rising and falling interest, not measured data.</p>
      </details>
    </div>
  );
}
