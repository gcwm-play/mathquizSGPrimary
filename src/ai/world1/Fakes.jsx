import React, { useState } from "react";
import { Bit, DigDeeper } from "../ui.jsx";

const STORIES = [
  {
    icon: "🍲",
    title: "AI “slop” floods the internet",
    text: "In 2025, the Merriam-Webster dictionary picked “slop” as its Word of the Year: low-quality stuff churned out in huge amounts with AI. Think weird videos, fake adverts, made-up “news” and lots of talking cats. It makes real, useful things harder to find.",
  },
  {
    icon: "💥",
    title: "The fake explosion",
    text: "In May 2023, a fake picture of an explosion near the Pentagon (a big US government building) spread on social media from an account pretending to be a news service. Within minutes the US stock market dipped, until officials confirmed there was no explosion at all.",
  },
  {
    icon: "🇸🇬",
    title: "Deepfake leaders in Singapore",
    text: "In December 2023, then-Prime Minister Lee Hsien Loong warned that AI “deepfake” videos showed him and Lawrence Wong promoting money scams. They never said those things. Scammers had used AI to copy their faces and voices.",
  },
  {
    icon: "🗳️",
    title: "A new law to fight back",
    text: "In October 2024, Singapore passed a law banning deepfakes of election candidates during elections. It was used for the first time in the 2025 General Election.",
  },
  {
    icon: "🙈",
    title: "The opposite problem",
    text: "Because fakes exist, some people now call REAL photos and videos “fake” when they don't like what they show. So it's important to check, not just to doubt everything.",
  },
];

const SCENARIOS = [
  {
    text: "📱 A video shows a famous leader saying “Send $100 and get $1,000 back, guaranteed!”",
    best: "check",
    why: "That's a classic deepfake scam. Real leaders don't promise free money. Don't send anything, and tell a grown-up.",
  },
  {
    text: "🦈 A friend sends a photo of a shark swimming down a flooded MRT station. It looks super real!",
    best: "check",
    why: "Shocking pictures spread fastest. Check whether trusted news sites are reporting it before you share. Shark-in-the-flood photos are a famous fake!",
  },
  {
    text: "🐱 You see a funny video of a cat playing the piano, posted by an account you don't know.",
    best: "enjoy",
    why: "Harmless fun is fine to enjoy, even if it's AI! Just don't believe it's real without checking, and think before you pass it on.",
  },
];

function WhatWouldYouDo() {
  const [answers, setAnswers] = useState({});
  return (
    <div className="space-y-3">
      <p className="font-bold text-slate-800">🤔 What would you do?</p>
      {SCENARIOS.map((s, i) => {
        const a = answers[i];
        return (
          <div key={s.text} className="rounded-2xl bg-slate-50 p-4 space-y-2">
            <p className="text-slate-800">{s.text}</p>
            {!a ? (
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["share", "📤 Share it"],
                  ["check", "🔍 Check first"],
                  ["enjoy", "😄 Just enjoy"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setAnswers({ ...answers, [i]: id })}
                    className="py-2 rounded-xl bg-white shadow-sm text-sm font-bold hover:bg-indigo-50 active:scale-95 transition-transform"
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="ai-pop">
                <p className={`font-bold ${a === s.best ? "text-emerald-700" : "text-rose-700"}`}>
                  {a === s.best ? "✅ Good thinking!" : a === "share" ? "⚠️ Wait! Sharing first can spread a fake." : "🤔 Hmm, think again!"}
                </p>
                <p className="text-sm text-slate-700">{s.why}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Fakes() {
  return (
    <div className="space-y-4">
      <Bit mood="think">
        <p className="font-semibold">AI can make amazing things… but it also makes it super easy to make junk and fakes.</p>
        <p className="text-sm text-slate-600">To be fair to both sides, here's the messy part.</p>
      </Bit>
      <div className="grid sm:grid-cols-2 gap-3">
        {STORIES.map((s) => (
          <div key={s.title} className="rounded-2xl bg-rose-50 p-4">
            <div className="text-3xl">{s.icon}</div>
            <div className="font-bold text-slate-800">{s.title}</div>
            <p className="text-sm text-slate-700">{s.text}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-indigo-50 border-2 border-indigo-200 p-4 space-y-1 text-slate-700">
        <div className="font-bold text-slate-800">🔍 How to spot a fake: STOP, THINK, CHECK</div>
        <p>
          🛑 <b>Stop</b> if something makes you feel shocked, scared or super excited. Fakes are made to do that!
        </p>
        <p>
          🤔 <b>Think:</b> who posted it? Is it a real news site or just a random account?
        </p>
        <p>
          ✅ <b>Check</b> if trusted news sites are saying the same thing. Look for odd hands, blurry text or strange shadows, but
          remember good fakes may look perfect.
        </p>
      </div>
      <WhatWouldYouDo />
      <DigDeeper>
        <p>
          A <b>deepfake</b> is a video, picture or voice recording made or changed by AI to show someone doing or saying something they
          never did.
        </p>
        <p>
          Some AI companies now add hidden “watermarks” or labels to AI-made pictures so they can be detected, but these don't work on
          everything yet.
        </p>
      </DigDeeper>
    </div>
  );
}
