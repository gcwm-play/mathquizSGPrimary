import React, { useState } from "react";
import { Section, Bit, Button } from "../ui.jsx";
import { WORLDS, worldById } from "../worlds.js";

// Every question is answered somewhere in the world it is tagged with.
// The first option is the correct one; options are shuffled when shown.
const BANK = [
  // History
  { world: "history", q: "Who wrote a famous 1950 paper asking “Can machines think?”", options: ["Alan Turing", "Albert Einstein", "Thomas Edison"], why: "Alan Turing suggested the Turing test: if you can't tell a machine from a person in a chat, maybe it's thinking." },
  { world: "history", q: "When was the name “artificial intelligence” first used for a science workshop?", options: ["1956", "1999", "2022"], why: "It was at a summer workshop at Dartmouth College in 1956." },
  { world: "history", q: "What was ELIZA, made in 1966?", options: ["One of the first chatbots", "A robot vacuum cleaner", "The first smartphone"], why: "ELIZA chatted using simple word-matching rules. It didn't understand anything!" },
  { world: "history", q: "What was an “AI winter”?", options: ["A time when interest and money for AI dried up", "When computers froze in cold weather", "A snowy AI conference"], why: "AI winters happened when AI didn't live up to the hype, in the 1970s and late 1980s." },
  { world: "history", q: "In 2016, the AI AlphaGo beat a top player at which board game?", options: ["Go", "Chess", "Monopoly"], why: "AlphaGo beat Lee Sedol 4–1 at Go. Chess was beaten earlier, by Deep Blue in 1997." },
  { world: "history", q: "Which Singapore programme started in 2017 to grow AI research and skills?", options: ["AI Singapore", "Singapore Robot Club", "Smart Kopitiam"], why: "AI Singapore later built SEA-LION, an AI for Southeast Asian languages." },
  // Inside the Brain
  { world: "brain", q: "What are the little pieces an AI chops your words into?", options: ["Tokens", "Pixels", "Atoms"], why: "Tokens can be whole words or bits of words, and each has an ID number." },
  { world: "brain", q: "How does a chatbot write its answer?", options: ["One token at a time, guessing what comes next", "It copies the answer from one website", "It looks it up in a giant dictionary"], why: "It scores every possible next token, picks one, adds it, then repeats." },
  { world: "brain", q: "What happens if you turn the creativity slider all the way to “Boring”?", options: ["It always picks the most likely word", "It picks totally random words", "It types faster"], why: "This setting is called temperature. Higher temperature gives rarer words a bigger chance." },
  { world: "brain", q: "What does “attention” help an AI do?", options: ["Work out which earlier words matter, like who “it” is", "Stay awake at night", "Draw pictures"], why: "Every token looks back at the words before it to understand the sentence." },
  { world: "brain", q: "How do picture AIs make an image?", options: ["Start with static and clean it up step by step", "Take a photo with a camera", "Draw one line at a time with a pen"], why: "This is called diffusion. Your words steer what the static turns into." },
  { world: "brain", q: "What is it called when an AI confidently makes something up?", options: ["Hallucinating", "Buffering", "Downloading"], why: "AIs predict words that sound right, so always double-check important facts." },
  // AI Factory
  { world: "factory", q: "During pre-training, what does the AI practise trillions of times?", options: ["Guessing the next word", "Drawing circles", "Solving crosswords"], why: "Each guess nudges its knobs (parameters) so the next guess is a bit better." },
  { world: "factory", q: "What are an AI's “parameters”?", options: ["Millions or billions of adjustable knobs", "The buttons on your keyboard", "Its favourite words"], why: "Big AIs have hundreds of billions of these knobs, tuned during training." },
  { world: "factory", q: "Where are big AIs trained and run?", options: ["In data centres full of chips", "Inside your phone's camera", "In libraries"], why: "Data centres need lots of electricity and cooling." },
  { world: "factory", q: "Why do many data centres use water?", options: ["To cool down the hot chips", "To wash the computers", "To make drinks for the AI"], why: "Water evaporates in cooling towers to carry heat away, like sweat cooling your skin." },
  { world: "factory", q: "How do people teach an AI to give helpful, kind and safe answers?", options: ["By rating and comparing its answers", "By shouting at the computer", "By unplugging it"], why: "This human feedback step is like teaching the AI manners." },
  { world: "factory", q: "You see a shocking video of a leader promising free money. What should you do first?", options: ["Stop, think, and check", "Share it with everyone quickly", "Send them your money"], why: "It's probably a deepfake scam. Check trusted news sites and tell a grown-up." },
  // Model Zoo
  { world: "zoo", q: "An “open” AI model is most like…", options: ["A recipe book anyone can download", "A restaurant with a secret recipe", "A locked safe"], why: "Closed AIs are like restaurants: you can use them, but the recipe stays secret." },
  { world: "zoo", q: "Why are small “pocket” AIs useful?", options: ["They run on your phone, fast and private", "They are always the smartest", "They need giant data centres"], why: "Small AIs are less clever, but quick, cheap and can work offline." },
  { world: "zoo", q: "SEA-LION, made in Singapore, is built to understand…", options: ["Southeast Asian languages", "Only computer code", "Animal noises"], why: "It covers languages like Malay, Tamil, Indonesian, Thai and Vietnamese." },
  { world: "zoo", q: "By 2026, how big was the gap between the best US and Chinese AIs?", options: ["Very small, just a few percent", "Huge, about 50 percent", "China had no AI"], why: "The gap was 2.7% in March 2026, and they have swapped places at the top several times." },
  { world: "zoo", q: "Why can two different AIs give different answers to the same question?", options: ["They were trained on different data with different rules", "One of them is always broken", "They can see your screen"], why: "No AI is always right, so compare and check!" },
];

const ROUND = 8;
const BEST_KEY = "ai-explorer-quiz-best";

const shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

const makeRound = (worldId) =>
  shuffle(BANK.filter((q) => worldId === "all" || q.world === worldId))
    .slice(0, ROUND)
    .map((q) => ({ ...q, answer: q.options[0], shown: shuffle(q.options) }));

const readBest = () => {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY)) ?? {};
  } catch {
    return {};
  }
};

const QUIZ_WORLDS = WORLDS.filter((w) => w.id !== "quiz");

export default function Quiz({ onGo }) {
  const [topic, setTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [results, setResults] = useState([]);
  const [best, setBest] = useState(readBest);

  const start = (id) => {
    setTopic(id);
    setQuestions(makeRound(id));
    setI(0);
    setPicked(null);
    setResults([]);
  };

  const done = topic && i >= questions.length;
  const score = results.filter((r) => r.right).length;

  const finish = (finalResults) => {
    const s = finalResults.filter((r) => r.right).length;
    const pct = Math.round((s / finalResults.length) * 100);
    if (pct > (best[topic] ?? -1)) {
      const nb = { ...best, [topic]: pct };
      setBest(nb);
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(nb));
      } catch {
        // Storage unavailable — best score just won't be remembered.
      }
    }
  };

  if (!topic) {
    return (
      <Section title="🧠 Quiz Time!" subtitle="How much do you remember? Pick a topic.">
        <Bit>
          <p className="font-semibold">Each round has up to {ROUND} questions. You'll find out why after every answer!</p>
        </Bit>
        <div className="grid sm:grid-cols-2 gap-3">
          <button onClick={() => start("all")} className="sm:col-span-2 rounded-2xl p-4 text-left bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-lg hover:scale-[1.01] transition-transform">
            <div className="text-2xl">🌈 Everything mix</div>
            <div className="text-sm text-white/80">Questions from all the worlds{best.all !== undefined ? ` · Best: ${best.all}%` : ""}</div>
          </button>
          {QUIZ_WORLDS.map((w) => (
            <button key={w.id} onClick={() => start(w.id)} className="rounded-2xl p-4 text-left bg-white border-2 border-slate-100 shadow hover:border-indigo-300">
              <div className="text-xl font-bold text-slate-800">
                {w.icon} {w.name}
              </div>
              <div className="text-sm text-slate-500">
                {BANK.filter((q) => q.world === w.id).length} questions{best[w.id] !== undefined ? ` · Best: ${best[w.id]}%` : ""}
              </div>
            </button>
          ))}
        </div>
      </Section>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const missedWorlds = [...new Set(results.filter((r) => !r.right).map((r) => r.world))];
    return (
      <Section title="🏁 Quiz complete!">
        <div className="text-center space-y-2 ai-pop">
          <div className="text-6xl">{pct === 100 ? "🏆" : pct >= 75 ? "🌟" : pct >= 50 ? "👍" : "💪"}</div>
          <div className="text-3xl font-bold text-slate-800">
            {score} / {questions.length}
          </div>
          <p className="text-slate-600">
            {pct === 100 ? "Perfect! You're an AI expert!" : pct >= 75 ? "Brilliant work!" : pct >= 50 ? "Good job! Keep exploring." : "Nice try! A quick revisit will help."}
          </p>
        </div>
        {missedWorlds.length > 0 && (
          <div className="rounded-2xl bg-amber-50 p-4 space-y-2">
            <p className="font-bold text-slate-800">📚 Worth another visit:</p>
            <div className="flex flex-wrap gap-2">
              {missedWorlds.map((id) => (
                <Button key={id} variant="soft" onClick={() => onGo(id)}>
                  {worldById(id).icon} {worldById(id).name}
                </Button>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2 justify-center flex-wrap">
          <Button variant="fun" onClick={() => start(topic)}>
            🔄 Play again
          </Button>
          <Button variant="soft" onClick={() => setTopic(null)}>
            📋 Choose another topic
          </Button>
        </div>
      </Section>
    );
  }

  const q = questions[i];
  const answered = picked !== null;
  const right = picked === q.answer;
  const w = worldById(q.world);

  return (
    <Section title={`🧠 Question ${i + 1} of ${questions.length}`}>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${(i / questions.length) * 100}%` }} />
      </div>
      <div key={i} className="space-y-3 ai-pop">
        <div className="text-xs font-bold text-indigo-600">
          {w.icon} From {w.name}
        </div>
        <p className="text-xl font-bold text-slate-800">{q.q}</p>
        <div className="grid gap-2">
          {q.shown.map((o) => (
            <button
              key={o}
              disabled={answered}
              onClick={() => {
                setPicked(o);
                setResults((r) => [...r, { world: q.world, right: o === q.answer }]);
              }}
              className={`rounded-2xl px-4 py-3 text-left font-semibold border-2 transition-all ${
                !answered
                  ? "bg-white border-slate-200 hover:border-indigo-400 active:scale-[0.98]"
                  : o === q.answer
                  ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                  : o === picked
                  ? "bg-rose-50 border-rose-300 text-rose-800"
                  : "bg-white border-slate-100 text-slate-400"
              }`}
            >
              {answered && o === q.answer ? "✅ " : answered && o === picked ? "❌ " : ""}
              {o}
            </button>
          ))}
        </div>
        {answered && (
          <div className={`rounded-2xl p-4 ai-pop ${right ? "bg-emerald-50" : "bg-amber-50"}`}>
            <p className="font-bold text-slate-800">{right ? "Correct! 🎉" : "Not quite!"}</p>
            <p className="text-slate-700">{q.why}</p>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-slate-600">⭐ {score} correct</span>
        <Button
          disabled={!answered}
          onClick={() => {
            if (i + 1 >= questions.length) finish(results);
            setI(i + 1);
            setPicked(null);
          }}
        >
          {i + 1 >= questions.length ? "See my score 🏁" : "Next ▶"}
        </Button>
      </div>
    </Section>
  );
}
