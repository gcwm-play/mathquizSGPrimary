import React, { useEffect, useMemo, useRef, useState } from "react";
import { TokenBug, Bit, DigDeeper, Button, bugColor } from "../ui.jsx";
import { tokenize, embedding, attention, engineWords, nextWordCounts, withTemperature, sample } from "../engine.js";

const STARTERS = [
  { text: "the cat sat on the", emoji: "🐱" },
  { text: "my robot likes to", emoji: "🤖" },
  { text: "in singapore we eat", emoji: "🍜" },
  { text: "once upon a time", emoji: "🏰" },
  { text: "the dragon lives in", emoji: "🐉" },
  { text: "the dog wagged its", emoji: "🐶" },
];

const STEPS = [
  { icon: "✏️", label: "Type" },
  { icon: "✂️", label: "Chop" },
  { icon: "🔢", label: "Numbers" },
  { icon: "👀", label: "Look" },
  { icon: "🧠", label: "Think" },
  { icon: "🎲", label: "Guess" },
];


function StepBar({ step, setStep, maxReached }) {
  return (
    <div className="grid grid-cols-6 gap-1">
      {STEPS.map((s, i) => (
        <button
          key={s.label}
          onClick={() => i <= maxReached && setStep(i)}
          disabled={i > maxReached}
          className={`rounded-xl py-1.5 text-center transition-all ${
            i === step ? "bg-indigo-600 text-white shadow-md scale-105" : i <= maxReached ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-400"
          }`}
        >
          <div className="text-lg leading-none">{s.icon}</div>
          <div className="text-[11px] font-semibold mt-0.5">{s.label}</div>
        </button>
      ))}
    </div>
  );
}

function NumberBars({ values }) {
  return (
    <div className="flex items-center gap-0.5 h-10">
      {values.map((v, i) => (
        <div key={i} className="w-2.5 h-10 relative bg-slate-100 rounded-sm">
          <div
            className={`absolute left-0 right-0 rounded-sm ${v >= 0 ? "bg-indigo-500" : "bg-rose-400"}`}
            style={v >= 0 ? { bottom: "50%", height: `${v * 50}%` } : { top: "50%", height: `${-v * 50}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function AttentionView({ tokens }) {
  const [focus, setFocus] = useState(() => {
    const it = tokens.findIndex((t) => ["it", "its", "she", "he", "they"].includes(t.text.toLowerCase()));
    return it > 0 ? it : tokens.length - 1;
  });
  const weights = attention(tokens, focus);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-2 gap-y-5 justify-center pt-2">
        {tokens.map((t, j) => {
          const w = weights[j];
          return (
            <button key={j} onClick={() => setFocus(j)} className="flex flex-col items-center gap-1">
              <TokenBug
                text={t.text}
                id={t.id}
                className={j === focus ? "scale-110" : ""}
                color={j > focus ? "#CBD5E1" : undefined}
              />
              <div className="h-12 w-6 flex items-end mt-1">
                <div
                  className="w-full rounded-t-md bg-amber-400 transition-all duration-500"
                  style={{ height: `${Math.max(2, w * 100 * 1.6)}%`, opacity: j > focus ? 0 : 1 }}
                />
              </div>
              <span className="text-[11px] text-slate-500">{j > focus ? "" : `${Math.round(w * 100)}%`}</span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-sm text-slate-600">
        Tap any bug. The yellow bars show how much <b>“{tokens[focus].text}”</b> is paying attention to each word before it.
      </p>
    </div>
  );
}

function Layers({ tokens, runKey }) {
  const shown = tokens.slice(0, 8);
  const layers = 4;
  return (
    <div className="relative rounded-2xl bg-slate-900 overflow-hidden" style={{ height: `${Math.max(4, shown.length) * 2.6 + 1}rem` }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {Array.from({ length: layers }, (_, l) => {
          const x = 22 + l * 18;
          return (
            <g key={`${l}-${runKey}`} className="ai-layer ai-on" style={{ animationDelay: `${0.35 + l * 0.5}s` }}>
              {Array.from({ length: 6 }, (_, n) =>
                Array.from({ length: 6 }, (_, m) => (
                  <line key={`${n}-${m}`} x1={x} y1={10 + n * 16} x2={x + 18} y2={10 + m * 16} stroke="#818CF8" strokeWidth="0.25" opacity={l < layers - 1 ? 0.6 : 0} />
                ))
              )}
              {Array.from({ length: 6 }, (_, n) => (
                <circle key={n} cx={x} cy={10 + n * 16} r="2.2" fill="#A5B4FC" />
              ))}
            </g>
          );
        })}
      </svg>
      {shown.map((t, i) => (
        <div key={`${i}-${runKey}`} className="ai-march" style={{ top: `${0.6 + i * 2.6}rem`, animationDelay: `${i * 0.08}s` }}>
          <TokenBug text={t.text} id={t.id} small walking />
        </div>
      ))}
      <div className="absolute bottom-1 right-2 text-[11px] text-indigo-200">layer 1 → 2 → 3 → 4</div>
    </div>
  );
}

function GuessStep({ startText }) {
  const [words, setWords] = useState(() => engineWords(startText));
  const [added, setAdded] = useState(0);
  const [temperature, setTemperature] = useState(1);
  const [picked, setPicked] = useState(null);
  const [auto, setAuto] = useState(false);
  const done = words[words.length - 1] === "." || added >= 20;

  const { options, source } = nextWordCounts(words);
  const probs = useMemo(() => withTemperature(options, temperature), [options, temperature]);
  const top = probs.slice(0, 5);
  const rest = probs.slice(5).reduce((a, o) => a + o.p, 0);

  const pick = () => {
    const w = sample(probs);
    setPicked(w);
    setWords((ws) => [...ws, w]);
    setAdded((n) => n + 1);
  };

  useEffect(() => {
    if (!auto) return;
    if (done) {
      setAuto(false);
      return;
    }
    const t = setTimeout(pick, 650);
    return () => clearTimeout(t);
  });

  const lastTwo = words.slice(-2).join(" ");
  const original = words.length - added;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-50 p-3 flex flex-wrap gap-x-1.5 gap-y-4 items-center min-h-[3.5rem]">
        {words.map((w, i) => (
          <TokenBug
            key={i}
            text={w}
            small
            color={i < original ? "#94A3B8" : bugColor(i * 7 + 3)}
            className={i >= original ? "ai-crawl-in" : ""}
          />
        ))}
        {!done && <span className="ai-caret text-indigo-500" />}
      </div>

      {!done ? (
        <>
          <p className="text-sm text-slate-600">
            {source === "trigram" && (
              <>
                It looked at the last two words, <b>“{lastTwo}”</b>, and checked what came next in the stories it learned.
              </>
            )}
            {source === "bigram" && (
              <>
                It's never seen <b>“{lastTwo}”</b> before, so it looks only at the last word, <b>“{words[words.length - 1]}”</b>.
              </>
            )}
            {source === "guess" && <>🤷 It has never seen these words, so it's just guessing common words!</>}
          </p>
          <div className="space-y-1.5">
            {top.map((o) => (
              <div key={o.word} className="flex items-center gap-2">
                <span className={`w-24 text-right font-bold truncate ${picked === o.word ? "text-indigo-700" : "text-slate-700"}`}>{o.word}</span>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-400 to-fuchsia-500 transition-all duration-500" style={{ width: `${o.p * 100}%` }} />
                </div>
                <span className="w-12 text-sm text-slate-600 tabular-nums">{Math.round(o.p * 100)}%</span>
              </div>
            ))}
            {rest > 0.005 && <div className="text-xs text-slate-500 text-right">+ other words: {Math.round(rest * 100)}%</div>}
          </div>
        </>
      ) : (
        <p className="font-semibold text-emerald-700">
          {words[words.length - 1] === "." ? "🏁 It picked a full stop, so the sentence is finished!" : "🏁 That's enough words for now!"}
        </p>
      )}

      <div className="rounded-2xl bg-amber-50 p-3">
        <label className="flex items-center gap-3">
          <span className="text-sm font-semibold whitespace-nowrap">🥱 Boring</span>
          <input
            type="range"
            min="0.2"
            max="2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="flex-1 accent-amber-500"
            aria-label="Creativity"
          />
          <span className="text-sm font-semibold whitespace-nowrap">🤪 Wild</span>
        </label>
        <p className="text-xs text-slate-600 mt-1">
          Slide it and watch the bars change! Boring always picks the top word. Wild gives unlikely words more of a chance.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={pick} disabled={done || auto} variant="fun">
          🎲 Pick a word
        </Button>
        <Button onClick={() => setAuto(true)} disabled={done || auto}>
          ✨ Write the rest
        </Button>
        <Button
          variant="soft"
          onClick={() => {
            setWords(engineWords(startText));
            setAdded(0);
            setPicked(null);
            setAuto(false);
          }}
        >
          🔄 Again
        </Button>
      </div>
    </div>
  );
}

export default function Pipeline() {
  const [text, setText] = useState("the cat sat on the");
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const tokens = useMemo(() => tokenize(text).slice(0, 12), [text]);
  const topRef = useRef(null);

  const go = (s) => {
    setStep(s);
    setMaxReached((m) => Math.max(m, s));
    if (s === 4) setRunKey((k) => k + 1);
  };

  const changeText = (t) => {
    setText(t);
    setMaxReached(0);
  };

  const ready = tokens.length > 0;

  return (
    <div className="space-y-4" ref={topRef}>
      <StepBar step={step} setStep={go} maxReached={maxReached} />

      {step === 0 && (
        <div className="space-y-3 ai-pop">
          <Bit>
            <p className="font-semibold">Pick the start of a sentence and I'll show you what happens inside an AI!</p>
            <p className="text-sm text-slate-600">
              My mini AI has only read about 60 short sentences, so it only knows the words in those. Real AIs have read billions of pages,
              so you can type anything to them!
            </p>
          </Bit>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {STARTERS.map((s) => (
              <button
                key={s.text}
                onClick={() => changeText(s.text)}
                className={`rounded-2xl p-3 text-left border-4 transition-all hover:-translate-y-0.5 ${
                  text === s.text ? "bg-indigo-50 border-indigo-400 shadow-lg scale-[1.03]" : "bg-white border-slate-100 shadow"
                }`}
              >
                <div className="text-3xl">{s.emoji}</div>
                <div className="font-bold text-slate-800 leading-snug">“{s.text}…”</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 ai-pop">
          <Bit>
            <p className="font-semibold">✂️ Snip snip! First, your words get chopped into pieces called <b>tokens</b>.</p>
            <p className="text-sm text-slate-600">
              Every token has its own ID number. Long words often get split into smaller bits, like “jump” + “ing”.
            </p>
          </Bit>
          <div className="flex flex-wrap gap-x-3 gap-y-6 justify-center py-3">
            {tokens.map((t, i) => (
              <TokenBug key={`${t.text}-${i}`} text={t.text} id={t.id} showId className="ai-pop" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
          <DigDeeper>
            <p>Real AIs know about 100,000 or more different tokens. In English, one token is about ¾ of a word on average.</p>
            <p>Tokens often include the space in front of a word, and the same word with a capital letter can be a different token!</p>
          </DigDeeper>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 ai-pop">
          <Bit>
            <p className="font-semibold">🔢 Computers only understand numbers, so each token becomes a list of numbers.</p>
            <p className="text-sm text-slate-600">
              Words with similar meanings get similar numbers. Try “cat” and “dog”: their bars look alike!
            </p>
          </Bit>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tokens.map((t, i) => (
              <div key={i} className="rounded-2xl bg-slate-50 p-3 flex flex-col items-center gap-3">
                <TokenBug text={t.text} id={t.id} small />
                <NumberBars values={embedding(t.text)} />
              </div>
            ))}
          </div>
          <DigDeeper>
            <p>We show 4 numbers per token. Real AIs use thousands of numbers for every token.</p>
            <p>These lists are called <b>embeddings</b>. The AI learns them while it trains, so that words used in similar ways end up with similar numbers.</p>
          </DigDeeper>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 ai-pop">
          <Bit>
            <p className="font-semibold">👀 Next, every token looks back at the words before it to understand what's going on.</p>
            <p className="text-sm text-slate-600">
              This is called <b>attention</b>. It's how the AI works out that “it” might mean the cat. Tokens can only look back, never ahead!
            </p>
          </Bit>
          <AttentionView key={text} tokens={tokens} />
          <DigDeeper>
            <p>
              Attention was the big idea in a famous 2017 research paper called “Attention Is All You Need”. The “T” in GPT stands for
              <b> Transformer</b>, the kind of AI that paper invented.
            </p>
            <p>
              Our picture is a simplified pretend version. A real AI has many “attention heads” that each look for different things,
              and it learns where to look by itself during training.
            </p>
          </DigDeeper>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 ai-pop">
          <Bit mood="think">
            <p className="font-semibold">🧠 Now the tokens march through layer after layer of the AI's brain.</p>
            <p className="text-sm text-slate-600">
              Each layer mixes and updates the numbers a little, so the AI understands more and more about your sentence.
            </p>
          </Bit>
          <Layers tokens={tokens} runKey={runKey} />
          <div className="text-center">
            <Button variant="soft" onClick={() => setRunKey((k) => k + 1)}>
              🔁 Watch again
            </Button>
          </div>
          <DigDeeper>
            <p>Big AIs have dozens to over a hundred layers, and billions of adjustable numbers called <b>parameters</b>.</p>
            <p>That's a LOT of maths for every single token, which is why AIs need powerful computer chips. More about that in the AI Factory!</p>
          </DigDeeper>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4 ai-pop">
          <Bit>
            <p className="font-semibold">🎲 Finally, the AI gives every possible next word a score, then picks one.</p>
            <p className="text-sm text-slate-600">
              The new word is added to the sentence, and the whole journey starts again for the next word. Answers are built one token at
              a time!
            </p>
          </Bit>
          <GuessStep key={text} startText={text} />
          <DigDeeper title="Dig deeper: is this a real AI?">
            <p>
              Sort of! Our mini AI learned from about 60 short sentences by counting which word comes after which. It looks at the last
              two words only.
            </p>
            <p>
              A real chatbot learns from trillions of tokens with a giant neural network, and looks at your whole conversation, so it can
              handle sentences it has never seen. But the last step is the same: score every possible next token, pick one, repeat.
            </p>
            <p>The Boring ↔ Wild slider is a real setting in AI models. It's called <b>temperature</b>.</p>
          </DigDeeper>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="soft" onClick={() => go(step - 1)} disabled={step === 0}>
          ◀ Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => go(step + 1)} disabled={!ready}>
            Next: {STEPS[step + 1].icon} {STEPS[step + 1].label} ▶
          </Button>
        ) : (
          <Button variant="soft" onClick={() => go(0)}>
            ✏️ Type something new
          </Button>
        )}
      </div>
    </div>
  );
}
