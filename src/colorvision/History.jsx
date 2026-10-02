import React, { useState } from "react";
import { Owl } from "./Owl.jsx";

const TIMELINE = [
  {
    year: "1777",
    emoji: "👞",
    title: "The shoemaker who couldn't find cherries",
    text: "One of the first written stories about colour blindness is about a shoemaker named Harris. As a boy he could see a cherry tree, but couldn't spot the red cherries among the green leaves!",
  },
  {
    year: "1794",
    emoji: "🧪",
    title: "John Dalton explains it",
    text: "Scientist John Dalton noticed a pink flower looked blue to him in daylight. He realised he and his brother saw colours differently, and wrote the first scientific report about it. For a long time colour blindness was even called “Daltonism”.",
  },
  {
    year: "1875",
    emoji: "🚂",
    title: "A train crash leads to colour tests",
    text: "Two trains crashed in Sweden. A scientist, Frithiof Holmgren, suggested the driver might have mixed up a red or green signal. Nobody knows for sure, but railways started testing workers' colour vision using bundles of coloured wool.",
  },
  {
    year: "1917",
    emoji: "🔴",
    title: "The famous dot test",
    text: "A Japanese eye doctor, Shinobu Ishihara, invented dot plates with hidden numbers, just like our Dot Test. Eye doctors around the world still use them today!",
  },
  {
    year: "1986",
    emoji: "🧬",
    title: "Finding the colour genes",
    text: "Scientists found the genes that build our colour cells. This explained why colour blindness runs in families and why it's more common in boys.",
  },
  {
    year: "1995",
    emoji: "👁️",
    title: "Dalton's eye is tested",
    text: "Dalton asked for his eyes to be studied after he died. 150 years later, scientists tested the DNA from his saved eye and found out he had No Green eyes (deuteranopia).",
  },
  {
    year: "2009",
    emoji: "🐒",
    title: "Monkeys get new colours",
    text: "Scientists used gene therapy to help colour-blind squirrel monkeys see red and green. It doesn't work for people yet, but it gives hope for the future.",
  },
  {
    year: "Today",
    emoji: "🎮",
    title: "Colour-blind modes",
    text: "Lots of video games, apps and websites now have colour-blind modes, and designers add shapes and labels so everyone can join in.",
  },
];

const PEOPLE = [
  {
    clue: "He was a famous scientist who loved weather and atoms, and was the first to write about his own colour blindness.",
    name: "John Dalton",
    emoji: "🧪",
    more: "He lived over 200 years ago in England, and colour blindness was named “Daltonism” after him.",
  },
  {
    clue: "He started one of the world's biggest social media websites. Its main colour is blue. Can you guess why?",
    name: "Mark Zuckerberg",
    emoji: "💙",
    more: "He started Facebook. He is red-green colour blind and has said blue is the colour he sees best!",
  },
  {
    clue: "He is one of the greatest golfers ever, and won 18 major championships.",
    name: "Jack Nicklaus",
    emoji: "⛳",
    more: "He is colour blind and has said some colours on the golf course can be hard for him to tell apart.",
  },
  {
    clue: "A famous painter known for swirly skies and bright sunflowers. Some scientists wonder if he was colour blind… maybe!",
    name: "Vincent van Gogh",
    emoji: "🌻",
    more: "Nobody knows for sure. Some people think his bold colour choices might show he saw colours differently. It's still a mystery!",
  },
  {
    clue: "They might be sitting near you right now!",
    name: "Someone in your class",
    emoji: "🧒",
    more: "About 1 in 12 boys and 1 in 200 girls are colour blind. In a class of 40, one or two people probably see colours differently.",
  },
];

const MIXUPS = [
  {
    emoji: "🏈",
    title: "The football match nobody could follow",
    text: "In 2015, two American football teams played in special new uniforms: one team all in red and the other all in green. Lots of colour-blind fans watching on TV couldn't tell the teams apart!",
  },
  {
    emoji: "✈️",
    title: "The runway lights",
    text: "In 2002, a cargo plane landed too low and hit trees in the USA. Luckily all three crew members survived. Investigators found the co-pilot had trouble telling the red and white landing guide lights apart.",
  },
  {
    emoji: "🚦",
    title: "Why traffic lights are in order",
    text: "Red is always on top and green at the bottom. That way, people who can't tell red from green can still read the light by its position. Smart design helps everyone!",
  },
  {
    emoji: "🚢",
    title: "Ships at night",
    text: "Ships show a red light on one side and a green light on the other, so sailors can tell which way a ship is going in the dark. That's why sailors have their colour vision tested.",
  },
];

const MYTHS = [
  {
    q: "Colour-blind people only see black and white.",
    fact: false,
    why: "Most colour-blind people see lots of colours. They just mix up some of them. Seeing only grey (Grey World eyes) is super rare.",
  },
  {
    q: "Boys are more likely to be colour blind than girls.",
    fact: true,
    why: "The red-green colour genes are on the X chromosome. Boys have one X, so one faulty copy is enough. Girls have two, so the other one usually covers for it.",
  },
  {
    q: "You can catch colour blindness from a friend.",
    fact: false,
    why: "Colour blindness is not a germ. Most people are born with it because of the genes they got from their parents.",
  },
  {
    q: "Colour blindness was named after a scientist.",
    fact: true,
    why: "It was called “Daltonism” after John Dalton. In French and Spanish it's still called daltonisme and daltonismo!",
  },
  {
    q: "Special glasses can cure colour blindness.",
    fact: false,
    why: "Some special glasses can make certain colours easier to tell apart, but they don't cure colour blindness. Take them off and things look the same as before.",
  },
  {
    q: "The mantis shrimp has more kinds of colour cells than humans.",
    fact: true,
    why: "Humans have 3 kinds and mantis shrimps have 12 or more! Funny thing is, scientists found they're actually not better than us at telling similar colours apart.",
  },
];

function Section({ title, children }) {
  return (
    <section className="bg-white rounded-3xl shadow-lg p-5 space-y-4">
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function GuessWho() {
  const [revealed, setRevealed] = useState({});
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {PEOPLE.map((p, i) => {
        const open = revealed[i];
        return (
          <button
            key={p.name}
            onClick={() => setRevealed({ ...revealed, [i]: !open })}
            className={`text-left rounded-2xl p-4 border-2 transition-all ${
              open ? "bg-amber-50 border-amber-300" : "bg-violet-50 border-violet-200 hover:-translate-y-0.5"
            }`}
          >
            {open ? (
              <div className="cv-pop space-y-1">
                <div className="text-3xl">{p.emoji}</div>
                <div className="font-bold text-lg text-slate-800">{p.name}</div>
                <p className="text-sm text-slate-700">{p.more}</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-3xl">❓</div>
                <p className="text-slate-700">{p.clue}</p>
                <div className="text-sm font-bold text-violet-600">Tap to find out who!</div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function MythOrFact() {
  const [answers, setAnswers] = useState({});
  const done = Object.keys(answers).length;
  const right = MYTHS.filter((m, i) => answers[i] === m.fact).length;
  return (
    <div className="space-y-3">
      {MYTHS.map((m, i) => {
        const a = answers[i];
        const answered = a !== undefined;
        return (
          <div key={m.q} className="rounded-2xl bg-slate-50 p-4 space-y-3">
            <p className="font-semibold text-slate-800">“{m.q}”</p>
            {!answered ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setAnswers({ ...answers, [i]: false })}
                  className="flex-1 py-2.5 rounded-xl bg-rose-100 text-rose-700 font-bold hover:bg-rose-200 active:scale-95 transition-transform"
                >
                  🙅 Myth
                </button>
                <button
                  onClick={() => setAnswers({ ...answers, [i]: true })}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-100 text-emerald-700 font-bold hover:bg-emerald-200 active:scale-95 transition-transform"
                >
                  👍 Fact
                </button>
              </div>
            ) : (
              <div className="cv-pop space-y-1">
                <div className={`font-bold ${a === m.fact ? "text-emerald-600" : "text-rose-600"}`}>
                  {a === m.fact ? "✅ You got it!" : "❌ Not quite!"} It's a {m.fact ? "FACT" : "MYTH"}.
                </div>
                <p className="text-sm text-slate-700">{m.why}</p>
              </div>
            )}
          </div>
        );
      })}
      {done === MYTHS.length && (
        <div className="text-center font-bold text-lg text-slate-800 cv-pop">
          You got {right} of {MYTHS.length}! {right === MYTHS.length ? "🏆 Myth buster!" : "🌟 Great try!"}
        </div>
      )}
    </div>
  );
}

export default function History() {
  return (
    <div className="space-y-5 animate-fadeIn">
      <Owl>
        <p className="font-semibold">Gather round for a story! 📜</p>
        <p className="text-sm text-slate-600">
          People have been colour blind forever, but it took a long time for anyone to understand it. Let's travel back
          in time!
        </p>
      </Owl>

      <Section title="⏳ Time machine">
        <ol className="relative border-l-4 border-violet-200 ml-3 space-y-5">
          {TIMELINE.map((t) => (
            <li key={t.year} className="ml-6">
              <span className="absolute -left-[22px] flex items-center justify-center w-10 h-10 rounded-full bg-violet-500 text-xl shadow">
                {t.emoji}
              </span>
              <div className="inline-block text-xs font-bold bg-amber-300 text-slate-900 rounded-full px-2 py-0.5">{t.year}</div>
              <h3 className="font-bold text-slate-800 mt-1">{t.title}</h3>
              <p className="text-slate-700">{t.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="😔 Then and now">
        <p className="text-slate-700">Long ago, people didn't understand colour blindness, so colour-blind people were often treated unfairly.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-100 p-4 space-y-2">
            <div className="font-bold text-slate-800">🕰️ Back then</div>
            <p className="text-sm text-slate-700">😢 Kids were scolded for “colouring wrong” or called careless or silly.</p>
            <p className="text-sm text-slate-700">🚫 People lost jobs on trains and ships, often without being tested fairly.</p>
            <p className="text-sm text-slate-700">🙊 Many people kept it a secret because they were embarrassed.</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4 space-y-2">
            <div className="font-bold text-slate-800">🌈 Today</div>
            <p className="text-sm text-slate-700">🧠 We know it's just how someone's eyes are built. It has nothing to do with being smart.</p>
            <p className="text-sm text-slate-700">🎨 Colour-blind people can be artists, scientists, athletes, anything!</p>
            <p className="text-sm text-slate-700">🤝 Some jobs, like pilots, still test colour vision for safety, and fair tests help everyone.</p>
          </div>
        </div>
      </Section>

      <Section title="🕵️ Guess who's colour blind">
        <GuessWho />
      </Section>

      <Section title="😬 Famous colour mix-ups">
        <div className="grid sm:grid-cols-2 gap-3">
          {MIXUPS.map((m) => (
            <div key={m.title} className="rounded-2xl bg-sky-50 p-4 space-y-1">
              <div className="text-3xl">{m.emoji}</div>
              <h3 className="font-bold text-slate-800">{m.title}</h3>
              <p className="text-sm text-slate-700">{m.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="🤔 Myth or fact?">
        <MythOrFact />
      </Section>

      <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 text-slate-700">
        <div className="font-bold text-slate-800 text-lg">💛 Remember</div>
        <p>
          Seeing colours differently isn't good or bad. It's just different! If a friend is colour blind, don't quiz them
          with “What colour is this?”. Help out when they ask, and add labels so everyone can join in.
        </p>
      </div>
    </div>
  );
}
