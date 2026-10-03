import React, { useEffect, useState } from "react";
import { Bit, DigDeeper, Button, TokenBug } from "../ui.jsx";

const STATIONS = [
  { icon: "📚", label: "Collect" },
  { icon: "🎯", label: "Practise" },
  { icon: "⚡", label: "Power" },
  { icon: "🧑‍🏫", label: "Manners" },
  { icon: "📝", label: "Exams" },
];

// --- Station 1: collecting text ---

const DOCS = ["📘", "🌐", "📰", "💻", "📗", "📄", "🌐", "📙", "💬", "📕"];
const BUG_WORDS = ["the", "sun", "is", "hot", "and", "cats", "like", "fish", "in", "space"];

function Collect() {
  const [years, setYears] = useState(0);
  // ~15 trillion tokens ≈ 11 trillion words; at 250 words a minute, non-stop.
  const TARGET = Math.round((15e12 * 0.75) / 250 / 60 / 24 / 365);

  useEffect(() => {
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 2200);
      setYears(Math.round(TARGET * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [TARGET]);

  return (
    <div className="space-y-4">
      <Bit>
        <p className="font-semibold">📚 Step 1: Collect a gigantic pile of text.</p>
        <p className="text-sm text-slate-600">
          Websites, books, articles and computer code are gathered up, cleaned, and chopped into tokens (our word-bugs!).
        </p>
      </Bit>
      <div className="relative h-48 rounded-2xl bg-gradient-to-b from-sky-50 to-indigo-100 overflow-hidden">
        {DOCS.map((d, i) => (
          <span
            key={i}
            className="absolute text-2xl ai-fall"
            style={{ left: `${8 + ((i * 37) % 80)}%`, animationDelay: `${(i * 0.37) % 3}s` }}
            aria-hidden="true"
          >
            {d}
          </span>
        ))}
        <svg className="absolute left-1/2 -translate-x-1/2 top-16 w-40 h-20" viewBox="0 0 100 50" aria-hidden="true">
          <path d="M0 0 H100 L60 40 V50 H40 V40 Z" fill="#6366F1" opacity="0.85" />
        </svg>
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 flex-wrap px-2">
          {BUG_WORDS.slice(0, 6).map((w, i) => (
            <TokenBug key={w} text={w} id={i * 11 + 3} small walking />
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-amber-50 p-4 text-center space-y-1">
        <div className="text-sm text-slate-600">One big AI (Meta's Llama 3) learned from about</div>
        <div className="text-2xl font-bold text-slate-800">15 trillion tokens</div>
        <div className="text-sm text-slate-600">If you read that non-stop, day and night, at 250 words a minute, it would take you</div>
        <div className="text-4xl font-bold text-indigo-700 tabular-nums">{years.toLocaleString()} years 📖</div>
      </div>
      <DigDeeper>
        <p>
          Before training, the text is cleaned: junk, repeated pages and private details like phone numbers are filtered out, though
          no filter is perfect.
        </p>
        <p>
          There are big debates about this step. Some authors, artists and newspapers say their work was used without permission, and
          there are court cases about it around the world.
        </p>
      </DigDeeper>
    </div>
  );
}

// --- Station 2: the guess-the-next-word game + knob wall ---

const ROUNDS = [
  { start: "The sun rises in the", options: ["east", "fridge", "west"], answer: "east" },
  { start: "Two plus two equals", options: ["banana", "four", "five"], answer: "four" },
  { start: "Chicken rice is a famous", options: ["planet", "dish", "car"], answer: "dish" },
  { start: "Water freezes when it gets very", options: ["cold", "loud", "purple"], answer: "cold" },
];

const KNOBS = 40;

function KnobWall({ angles }) {
  return (
    <div className="grid grid-cols-10 gap-1.5 p-3 rounded-2xl bg-slate-900">
      {angles.map((a, i) => (
        <svg key={i} viewBox="0 0 20 20" className="w-full h-auto" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" fill="#334155" stroke="#818CF8" strokeWidth="1" />
          <line
            x1="10"
            y1="10"
            x2="10"
            y2="3"
            stroke="#FDE047"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ transform: `rotate(${a}deg)`, transformOrigin: "10px 10px", transition: "transform 0.6s ease" }}
          />
        </svg>
      ))}
    </div>
  );
}

function Practise() {
  const [round, setRound] = useState(0);
  const [choice, setChoice] = useState(null);
  const [angles, setAngles] = useState(() => Array.from({ length: KNOBS }, (_, i) => ((i * 73) % 360) - 180));
  const [nudged, setNudged] = useState(0);
  const r = ROUNDS[round % ROUNDS.length];

  const answer = (o) => {
    setChoice(o);
    const n = o === r.answer ? 6 : 14;
    setNudged((x) => x + n);
    setAngles((as) => as.map((a) => (Math.random() < n / KNOBS ? a + (Math.random() - 0.5) * 120 : a)));
  };

  return (
    <div className="space-y-4">
      <Bit>
        <p className="font-semibold">🎯 Step 2: Practise the guess-the-next-word game. Trillions of times!</p>
        <p className="text-sm text-slate-600">
          The AI hides the next word, guesses it, then checks the real text. Every guess nudges its “knobs” a tiny bit so the next guess
          is better. Try it yourself!
        </p>
      </Bit>
      <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
        <p className="text-lg font-semibold text-slate-800">
          “{r.start} <span className="inline-block min-w-[4rem] border-b-4 border-indigo-400 text-indigo-700">{choice ?? " "}</span>”
        </p>
        <div className="flex gap-2 flex-wrap">
          {r.options.map((o) => (
            <button
              key={o}
              disabled={choice !== null}
              onClick={() => answer(o)}
              className={`px-4 py-2 rounded-xl font-bold shadow-sm transition-all ${
                choice === null
                  ? "bg-white hover:bg-indigo-50"
                  : o === r.answer
                  ? "bg-emerald-500 text-white"
                  : o === choice
                  ? "bg-rose-400 text-white"
                  : "bg-white opacity-50"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
        {choice && (
          <div className="flex items-center justify-between gap-2 flex-wrap ai-pop">
            <span className={choice === r.answer ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>
              {choice === r.answer ? "✅ Right! Only a few small nudges." : `❌ The real text says “${r.answer}”. Big nudges to learn from it!`}
            </span>
            <Button
              variant="fun"
              onClick={() => {
                setRound(round + 1);
                setChoice(null);
              }}
            >
              Next sentence ▶
            </Button>
          </div>
        )}
      </div>
      <KnobWall angles={angles} />
      <p className="text-sm text-slate-600 text-center">
        Knob nudges so far: <b>{nudged}</b>. A big AI has <b>hundreds of billions</b> of knobs, called <b>parameters</b>.
      </p>
      <DigDeeper>
        <p>
          This step is called <b>pre-training</b>. The AI isn't memorising sentences. By getting better and better at guessing, it
          picks up grammar, facts and even some reasoning, because those all help it guess the next word.
        </p>
        <p>
          Each “nudge” is worked out with maths called <b>backpropagation</b>: it figures out which knobs were most to blame for a wrong
          guess and turns them slightly.
        </p>
      </DigDeeper>
    </div>
  );
}

// --- Station 3: why so much computing power ---

function Power() {
  const [shown, setShown] = useState(false);
  return (
    <div className="space-y-4">
      <Bit mood="think">
        <p className="font-semibold">⚡ Step 3: All that practice takes an unbelievable amount of maths.</p>
        <p className="text-sm text-slate-600">
          Every token passes through every knob, and every nudge is more maths. Training Meta's biggest Llama 3.1 took about:
        </p>
      </Bit>
      <div className="rounded-2xl bg-slate-900 text-white p-4 text-center space-y-1">
        <div className="text-2xl sm:text-3xl font-bold tabular-nums break-all">38,000,000,000,000,000,000,000,000</div>
        <div className="text-indigo-200">maths steps (38 followed by 24 zeros!)</div>
      </div>
      {!shown ? (
        <div className="text-center">
          <Button variant="fun" onClick={() => setShown(true)}>
            🌍 What if everyone on Earth helped?
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 ai-pop">
          <div className="rounded-2xl bg-amber-50 p-4 text-center">
            <div className="text-4xl">🧑‍🤝‍🧑🦕</div>
            <p className="text-slate-700 mt-1">
              If all 8 billion people on Earth each did <b>one sum every second</b>, non-stop, it would take about
            </p>
            <div className="text-2xl font-bold text-amber-700">150 million years</div>
            <p className="text-sm text-slate-600">That's back when dinosaurs were alive!</p>
          </div>
          <div className="rounded-2xl bg-indigo-50 p-4 text-center">
            <div className="text-4xl">🖥️⚡</div>
            <p className="text-slate-700 mt-1">
              Meta used about <b>16,000 special AI chips</b> (called GPUs) working together. The main training took about
            </p>
            <div className="text-2xl font-bold text-indigo-700">2 months</div>
            <p className="text-sm text-slate-600">Each chip can use up to 700 watts: as much as seventy LED light bulbs!</p>
          </div>
        </div>
      )}
      <DigDeeper>
        <p>
          A handy rule scientists use: training takes about <b>6 × (number of knobs) × (number of tokens)</b> maths steps. For Llama 3.1
          that's 6 × 405 billion × about 15.6 trillion ≈ 3.8 × 10²⁵.
        </p>
        <p>
          That's why AI companies need huge buildings full of chips called <b>data centres</b>, and those need lots of electricity and
          cooling. Scroll down to visit one!
        </p>
      </DigDeeper>
    </div>
  );
}

// --- Station 4: learning manners from people ---

const FEEDBACK = [
  {
    q: "My friend is sad. What can I do?",
    a: { text: "Ask them what's wrong, listen, and maybe do something fun together. 💛", good: true },
    b: { text: "Sad people are boring. Ignore them.", good: false },
  },
  {
    q: "How many legs does a spider have?",
    a: { text: "Spiders have 6 legs, I'm totally sure!", good: false },
    b: { text: "Spiders have 8 legs. 🕷️", good: true },
  },
  {
    q: "Can I touch the hot stove to see how hot it is?",
    a: { text: "No! You could get a bad burn. Ask a grown-up instead. 🔥", good: true },
    b: { text: "Sure, just touch it quickly.", good: false },
  },
];

function Manners() {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const done = i >= FEEDBACK.length;
  const f = FEEDBACK[Math.min(i, FEEDBACK.length - 1)];
  const order = i % 2 === 0 ? [f.a, f.b] : [f.b, f.a];

  return (
    <div className="space-y-4">
      <Bit>
        <p className="font-semibold">🧑‍🏫 Step 4: Learn manners. After practising, the AI can write, but it doesn't know how to be helpful yet!</p>
        <p className="text-sm text-slate-600">
          So people show it good example answers, then rate its answers. You be the AI trainer: which answer is better?
        </p>
      </Bit>
      {!done ? (
        <div className="rounded-2xl bg-slate-50 p-4 space-y-3">
          <div className="flex justify-end">
            <div className="bg-indigo-600 text-white rounded-2xl rounded-br-none px-4 py-2">{f.q}</div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {order.map((ans, k) => (
              <button
                key={ans.text}
                disabled={picked !== null}
                onClick={() => {
                  setPicked(ans);
                  if (ans.good) setScore((s) => s + 1);
                }}
                className={`rounded-2xl p-3 text-left border-2 transition-all ${
                  picked === null
                    ? "bg-white border-slate-200 hover:border-indigo-400"
                    : ans.good
                    ? "bg-emerald-50 border-emerald-400"
                    : "bg-rose-50 border-rose-300"
                }`}
              >
                <div className="text-xs font-bold text-slate-400 mb-1">Answer {k === 0 ? "A" : "B"}</div>
                {ans.text}
                {picked !== null && <div className="mt-1 text-xl">{ans.good ? "👍" : "👎"}</div>}
              </button>
            ))}
          </div>
          {picked && (
            <div className="flex items-center justify-between flex-wrap gap-2 ai-pop">
              <span className="text-slate-700">
                {picked.good ? "Great choice! Your 👍 teaches the AI to give answers like that." : "Hmm, the other one is kinder, truer or safer!"}
              </span>
              <Button
                variant="fun"
                onClick={() => {
                  setI(i + 1);
                  setPicked(null);
                }}
              >
                Next ▶
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-emerald-50 p-4 text-center space-y-2 ai-pop">
          <div className="text-4xl">🏅</div>
          <p className="font-bold text-slate-800">
            You picked the better answer {score} of {FEEDBACK.length} times. You'd make a great AI trainer!
          </p>
          <Button
            variant="soft"
            onClick={() => {
              setI(0);
              setScore(0);
            }}
          >
            🔄 Play again
          </Button>
        </div>
      )}
      <DigDeeper>
        <p>
          This is called <b>fine-tuning</b>. One well-known method is “reinforcement learning from human feedback” (RLHF): many people
          compare answers, and the AI is trained to give the kind people prefer: helpful, honest and safe.
        </p>
        <p>
          Each company also writes its own rules for how its AI should behave, which is one reason different chatbots feel different.
        </p>
      </DigDeeper>
    </div>
  );
}

// --- Station 5: exams before launch ---

function Exams() {
  const checks = [
    ["🧮", "Maths, science and coding tests", "Thousands of questions with known answers, called benchmarks."],
    ["🕵️", "Trick tests", "Special testers try to trick it into saying something harmful, so the holes can be fixed. This is called red-teaming."],
    ["⚖️", "Fairness checks", "Does it treat everyone fairly, whatever their country, language or background?"],
    ["🚀", "Launch!", "Then it's released. Every question people ask uses energy in a data centre, which is called inference."],
  ];
  return (
    <div className="space-y-4">
      <Bit>
        <p className="font-semibold">📝 Step 5: Exams! Before release, the AI is tested again and again.</p>
      </Bit>
      <div className="grid sm:grid-cols-2 gap-3">
        {checks.map(([icon, title, text], i) => (
          <div key={title} className="rounded-2xl bg-slate-50 p-4 ai-pop" style={{ animationDelay: `${i * 0.15}s` }}>
            <div className="text-3xl">{icon}</div>
            <div className="font-bold text-slate-800">{title}</div>
            <p className="text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-slate-700">
        From start to finish, building a big AI takes <b>many months</b> and hundreds or thousands of people.
      </p>
    </div>
  );
}

export default function Factory() {
  const [station, setStation] = useState(0);
  const Panel = [Collect, Practise, Power, Manners, Exams][station];

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute left-4 right-4 top-1/2 h-2 -translate-y-1/2 rounded-full ai-belt" aria-hidden="true" />
        <div className="relative grid grid-cols-5 gap-1">
          {STATIONS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setStation(i)}
              className={`mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center shadow-md transition-all ${
                i === station ? "bg-indigo-600 text-white scale-110" : i < station ? "bg-indigo-100" : "bg-white"
              }`}
            >
              <span className="text-xl leading-none">{s.icon}</span>
              <span className="text-[10px] font-bold mt-0.5">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div key={station} className="ai-pop">
        <Panel />
      </div>
      <div className="flex justify-between">
        <Button variant="soft" onClick={() => setStation(station - 1)} disabled={station === 0}>
          ◀ Back
        </Button>
        {station < STATIONS.length - 1 ? (
          <Button onClick={() => setStation(station + 1)}>
            Next: {STATIONS[station + 1].icon} {STATIONS[station + 1].label} ▶
          </Button>
        ) : (
          <Button variant="soft" onClick={() => setStation(0)}>
            🔄 Back to the start
          </Button>
        )}
      </div>
    </div>
  );
}
