import React, { useEffect, useState } from "react";
import { WORLDS, AS_OF, worldById } from "./worlds.js";
import World1 from "./world1/World1.jsx";
import World2 from "./world2/World2.jsx";
import World3 from "./world3/World3.jsx";
import History from "./history/History.jsx";
import Quiz from "./quiz/Quiz.jsx";

const INTRO_KEY = "ai-explorer-intro-closed";

const readClosed = () => {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
};

const saveClosed = (closed) => {
  try {
    localStorage.setItem(INTRO_KEY, closed ? "1" : "0");
  } catch {
    // Storage unavailable — the intro just shows again next visit.
  }
};

const initialWorld = () => {
  const id = window.location.hash.replace("#", "");
  return worldById(id) ? id : "brain";
};

function Intro({ onGo, onClose }) {
  return (
    <section className="relative rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white p-5 shadow-xl space-y-4 ai-pop">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-lg font-bold"
        aria-label="Close the introduction"
      >
        ✕
      </button>
      <div className="pr-10 space-y-2">
        <h2 className="text-2xl font-bold">Welcome, explorer! 👋</h2>
        <p className="text-white/90">
          AI chatbots like ChatGPT, Gemini and Claude are everywhere. But how do they actually work? In AI Explorer you'll{" "}
          <b>see inside an AI</b>, find out <b>how it's built</b> and <b>what it costs our planet</b>, meet <b>AIs from around the world</b>, and
          learn <b>how it all began</b>. Then test yourself!
        </p>
        <p className="text-sm text-white/80">
          Made for Primary 4 to 6 · Suggested path: start at 🔮 Inside the Brain and work your way to 🧠 Quiz · 📅 Info as of {AS_OF}
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {WORLDS.map((w, i) => (
          <div key={w.id} className="rounded-2xl bg-white text-slate-800 p-4 flex flex-col">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 shrink-0 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
              <span className="text-2xl">{w.icon}</span>
              <span className="font-bold text-lg leading-tight">{w.name}</span>
            </div>
            <div className="text-xs font-bold uppercase tracking-wide text-indigo-600 mt-2">After this, I can…</div>
            <ul className="text-sm text-slate-700 space-y-0.5 mt-1 flex-1">
              {w.outcomes.map((o) => (
                <li key={o} className="flex gap-1.5">
                  <span className="text-emerald-500">✓</span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => onGo(w.id)} className="mt-3 self-start px-4 py-2 rounded-xl bg-amber-400 text-slate-900 font-bold hover:bg-amber-300">
              Go to {w.short} →
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AIApp() {
  const [world, setWorld] = useState(initialWorld);
  const [introClosed, setIntroClosed] = useState(readClosed);
  const current = worldById(world);

  useEffect(() => {
    if (window.location.hash !== `#${world}`) window.history.replaceState(null, "", `#${world}`);
  }, [world]);

  useEffect(() => {
    const onHash = () => {
      const id = window.location.hash.replace("#", "");
      if (worldById(id)) setWorld(id);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (id) => {
    setWorld(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeIntro = (closed) => {
    setIntroClosed(closed);
    saveClosed(closed);
  };

  const index = WORLDS.findIndex((w) => w.id === world);
  const next = WORLDS[index + 1];

  return (
    <div className="ai-app min-h-screen bg-gradient-to-b from-cyan-100 via-indigo-100 to-fuchsia-100">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                AI Explorer <span aria-hidden="true">🤖</span>
              </h1>
              <p className="text-slate-700">Find out how AI really works, one little word-bug at a time</p>
            </div>
            {introClosed && (
              <button
                onClick={() => closeIntro(false)}
                className="shrink-0 px-3 py-2 rounded-2xl bg-white shadow text-sm font-bold text-indigo-700 hover:bg-indigo-50"
              >
                ℹ️ What can I learn?
              </button>
            )}
          </div>
          {!introClosed && <Intro onGo={go} onClose={() => closeIntro(true)} />}
          <nav className="grid grid-cols-5 gap-1 bg-white rounded-2xl p-1 shadow" aria-label="Worlds">
            {WORLDS.map((w, i) => (
              <button
                key={w.id}
                onClick={() => go(w.id)}
                aria-current={world === w.id ? "page" : undefined}
                className={`rounded-xl py-2 px-1 flex flex-col items-center leading-tight transition-all ${
                  world === w.id ? "bg-indigo-600 text-white shadow" : "text-slate-600 hover:bg-indigo-50"
                }`}
              >
                <span className="text-xl">{w.icon}</span>
                <span className="text-[11px] sm:text-sm font-bold mt-0.5">
                  <span className="hidden sm:inline">{i + 1}. </span>
                  {w.short}
                </span>
              </button>
            ))}
          </nav>
        </header>

        <div className="rounded-2xl bg-white/70 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-bold text-slate-800">
              {current.icon} {current.name}
            </div>
            <div className="text-sm text-slate-600">{current.blurb}</div>
          </div>
          <span className="text-xs font-semibold bg-amber-100 text-amber-800 rounded-full px-3 py-1">📅 Info as of {AS_OF}</span>
        </div>

        <div key={world} className="animate-fadeIn">
          {world === "history" && <History />}
          {world === "brain" && <World3 />}
          {world === "factory" && <World1 />}
          {world === "zoo" && <World2 />}
          {world === "quiz" && <Quiz onGo={go} />}
        </div>

        {next && (
          <button
            onClick={() => go(next.id)}
            className="w-full rounded-3xl bg-indigo-600 text-white p-4 shadow-lg flex items-center justify-between hover:bg-indigo-700"
          >
            <span className="text-left">
              <span className="block text-sm text-indigo-200">Next world</span>
              <span className="text-lg font-bold">
                {next.icon} {next.name}
              </span>
            </span>
            <span className="text-2xl">→</span>
          </button>
        )}
      </div>
    </div>
  );
}
