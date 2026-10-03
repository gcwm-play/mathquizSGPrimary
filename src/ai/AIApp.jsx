import React, { useState } from "react";
import { Bit } from "./ui.jsx";
import World3 from "./world3/World3.jsx";

const WORLDS = [
  { id: "factory", icon: "🏭", name: "The AI Factory", blurb: "How an AI is made, and what it costs our planet", ready: false },
  { id: "zoo", icon: "🦁", name: "The Model Zoo", blurb: "Why there are so many AIs", ready: false },
  { id: "brain", icon: "🔮", name: "Inside the Brain", blurb: "What happens when you type", ready: true },
];

export default function AIApp() {
  const [world, setWorld] = useState("brain");
  const current = WORLDS.find((w) => w.id === world);

  return (
    <div className="ai-app min-h-screen bg-gradient-to-b from-cyan-100 via-indigo-100 to-fuchsia-100">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <header className="space-y-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              AI Explorer <span aria-hidden="true">🤖</span>
            </h1>
            <p className="text-slate-700">Find out how AI really works, one little word-bug at a time</p>
          </div>
          <nav className="grid grid-cols-3 gap-2">
            {WORLDS.map((w) => (
              <button
                key={w.id}
                onClick={() => setWorld(w.id)}
                className={`relative rounded-2xl p-3 text-left shadow transition-all border-4 ${
                  world === w.id ? "bg-white border-indigo-400 scale-[1.03]" : "bg-white/70 border-transparent hover:bg-white"
                }`}
              >
                <div className="text-3xl">{w.icon}</div>
                <div className="font-bold text-slate-800 leading-tight">{w.name}</div>
                <div className="text-xs text-slate-500 leading-snug hidden sm:block">{w.blurb}</div>
                {!w.ready && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold bg-amber-300 text-slate-900 rounded-full px-2 py-0.5">SOON</span>
                )}
              </button>
            ))}
          </nav>
        </header>

        {current.ready ? (
          <World3 />
        ) : (
          <div className="space-y-4 animate-fadeIn">
            <Bit>
              <p className="font-semibold">
                {current.icon} {current.name} is still being built! 🚧
              </p>
              <p className="text-sm text-slate-600">{current.blurb}. Come back soon! Until then, explore Inside the Brain.</p>
            </Bit>
            <div className="text-center">
              <button onClick={() => setWorld("brain")} className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg">
                🔮 Go Inside the Brain
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
