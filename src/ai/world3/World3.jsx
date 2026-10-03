import React, { useEffect, useState } from "react";
import { Bit, Section, Button, TokenBug, bugColor } from "../ui.jsx";
import { engineWords, nextWordCounts, withTemperature, sample } from "../engine.js";
import Pipeline from "./Pipeline.jsx";
import Creative from "./Creative.jsx";
import VibeCode from "./VibeCode.jsx";

const QUESTION = "the capital of singapore is";

function MadeUp() {
  const [words, setWords] = useState(null);
  const base = engineWords(QUESTION).length;

  useEffect(() => {
    if (!words || words[words.length - 1] === "." || words.length > base + 12) return;
    const t = setTimeout(() => setWords((w) => [...w, sample(withTemperature(nextWordCounts(w).options, 1))]), 450);
    return () => clearTimeout(t);
  }, [words, base]);

  const finished = words && (words[words.length - 1] === "." || words.length > base + 12);

  return (
    <div className="space-y-4">
      <Bit mood="think">
        <p className="font-semibold">Let's ask my mini AI a question it never learned the answer to…</p>
      </Bit>
      <div className="rounded-2xl bg-slate-50 p-3 flex flex-wrap gap-x-1.5 gap-y-4 min-h-[3.5rem] items-center">
        {(words ?? engineWords(QUESTION)).map((w, i) => (
          <TokenBug key={i} text={w} small color={i < base ? "#94A3B8" : bugColor(i * 5 + 1)} className={i >= base ? "ai-crawl-in" : ""} />
        ))}
      </div>
      <Button variant="fun" onClick={() => setWords(engineWords(QUESTION))} disabled={words !== null && !finished}>
        {words ? "🔄 Ask again" : "❓ Ask the mini AI"}
      </Button>
      {finished && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-4 space-y-2 text-slate-700 ai-pop">
          <p className="font-bold text-rose-700">🤥 It sounds confident… but it didn't answer the question! (The capital of Singapore is Singapore. It's a city-state!)</p>
          <p>
            My mini AI never learned this fact. It just strung together words that often come after “singapore is” in its stories.
          </p>
          <p>
            Big AIs know much, much more, but they can still do this when they're unsure. It's called <b>hallucinating</b>: making up
            something that <i>sounds</i> right.
          </p>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          ["✅", "Double-check important facts with a trusted book, website or grown-up."],
          ["🔒", "Never share your full name, address, school, passwords or photos with an AI."],
          ["🧑‍🤝‍🧑", "An AI can sound friendly, but it isn't a person. Talk to real people about things that worry you."],
          ["✍️", "Use AI to help you learn and explain things, not to do your homework for you!"],
        ].map(([icon, tip]) => (
          <div key={tip} className="rounded-2xl bg-amber-50 p-3 flex gap-2 text-slate-700">
            <span className="text-xl">{icon}</span>
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function World3() {
  return (
    <div className="space-y-6">
      <Section title="🐛 Watch a message travel through an AI" subtitle="Follow your words step by step, all the way to the AI's answer.">
        <Pipeline />
      </Section>
      <Section title="🎨 How AI makes pictures, videos and music">
        <Creative />
      </Section>
      <Section title="💻 How AI writes code">
        <VibeCode />
      </Section>
      <Section title="🤥 Why AI can make things up">
        <MadeUp />
      </Section>
      <details className="bg-white/70 rounded-3xl p-5 text-slate-700">
        <summary className="font-bold cursor-pointer">📚 Sources for grown-ups</summary>
        <ul className="list-disc pl-5 mt-3 space-y-1 text-sm">
          <li>
            Vaswani et al. (2017),{" "}
            <a className="text-indigo-700 underline" href="https://arxiv.org/abs/1706.03762">
              Attention Is All You Need
            </a>
            : the Transformer architecture behind today's LLMs.
          </li>
          <li>
            Ho, Jain &amp; Abbeel (2020),{" "}
            <a className="text-indigo-700 underline" href="https://arxiv.org/abs/2006.11239">
              Denoising Diffusion Probabilistic Models
            </a>
            : the idea behind most picture generators.
          </li>
          <li>
            OpenAI Help Center,{" "}
            <a className="text-indigo-700 underline" href="https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them">
              What are tokens and how to count them?
            </a>
            : the “1 token ≈ ¾ of a word” rule of thumb.
          </li>
          <li>
            The mini AIs on this page are simplified teaching models (a word-counting “trigram” model and a note-counting tune model). Real
            AIs use large neural networks trained on vastly more data.
          </li>
        </ul>
      </details>
    </div>
  );
}
