import React, { useEffect, useRef, useState } from "react";
import { PALETTE, VISION_TYPES, visionById, simulate, shade, difference, trickiestPairs } from "./simulate.js";
import { makeRound } from "./game.js";

const BEST_KEY = "colorvision-best";

const loadBest = () => {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY)) ?? {};
  } catch {
    return {};
  }
};

const saveBest = (best) => {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    // Storage unavailable (private mode etc.) — best scores just won't persist.
  }
};

function Door({ color, vision, label, onClick, state }) {
  const fill = simulate(color.hex, vision);
  const panel = simulate(shade(color.hex, 0.22), vision);
  const frame = simulate("#6B5B4B", vision);
  const knob = simulate("#D4A017", vision);
  const ring =
    state === "correct" ? "ring-4 ring-emerald-500" : state === "wrong" ? "ring-4 ring-rose-500" : "ring-0";

  const svg = (
    <svg viewBox="0 0 100 170" className="w-full h-auto drop-shadow-md" aria-hidden="true">
      <path d="M4 170 V48 A46 46 0 0 1 96 48 V170 Z" fill={frame} />
      <path d="M12 170 V50 A38 38 0 0 1 88 50 V170 Z" fill={fill} />
      <path d="M22 80 V56 A28 28 0 0 1 78 56 V80 Z" fill={panel} />
      <rect x="22" y="92" width="56" height="64" rx="3" fill={panel} />
      <circle cx="76" cy="124" r="4.5" fill={knob} />
    </svg>
  );

  return (
    <div className="flex flex-col items-center gap-2">
      {onClick ? (
        <button
          onClick={onClick}
          className={`w-full rounded-t-full transition-transform hover:-translate-y-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400 ${ring}`}
          aria-label="Open this door"
        >
          {svg}
        </button>
      ) : (
        <div className={`w-full rounded-t-full ${ring}`}>{svg}</div>
      )}
      {label && <span className="text-sm font-semibold text-slate-700">{label}</span>}
    </div>
  );
}

function VisionPicker({ vision, onChange }) {
  const groups = [...new Set(VISION_TYPES.map((v) => v.group))];
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g}>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">{g}</div>
          <div className="flex flex-wrap gap-2">
            {VISION_TYPES.filter((v) => v.group === g).map((v) => (
              <button
                key={v.id}
                onClick={() => onChange(v.id)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  vision === v.id
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SwatchStrip({ vision }) {
  return (
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
      {PALETTE.map((c) => (
        <div key={c.name} className="flex flex-col items-center">
          <div className="w-full aspect-square rounded-md border border-black/10" style={{ background: simulate(c.hex, vision) }} />
          <span className="text-[10px] text-slate-500 mt-0.5">{c.name}</span>
        </div>
      ))}
    </div>
  );
}

function Menu({ vision, setVision, best, onStart }) {
  const v = visionById(vision);
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h2 className="text-lg font-bold text-slate-800">1. Choose whose eyes you are looking through</h2>
        <VisionPicker vision={vision} onChange={setVision} />
        <div className="rounded-xl bg-slate-50 p-4 space-y-2">
          <div className="font-bold text-slate-800">{v.label}</div>
          <div className="text-sm text-slate-600">{v.blurb}</div>
          <div className="text-xs text-slate-500">Who: {v.who}</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-600 mb-2">How the colours look with {v.label.toLowerCase()}:</div>
          <SwatchStrip vision={vision} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5 space-y-3">
        <h2 className="text-lg font-bold text-slate-800">2. Find the right door</h2>
        <p className="text-sm text-slate-600">
          Three doors stand in front of you. Only the door of the colour you are told to find leads onward. Pick the right
          one to go deeper. Pick the wrong one and your run ends.
        </p>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-slate-500">
            Best with {v.label.toLowerCase()}: <b className="text-slate-800">{best[vision] ?? 0}</b> doors
          </span>
          <button
            onClick={onStart}
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow hover:bg-indigo-700"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}

function Play({ vision, level, round, picked, onPick, onNext, onRetry, onMenu }) {
  const v = visionById(vision);
  const revealed = picked !== null;
  const chosen = revealed ? round.doors[picked] : null;
  const correct = revealed && chosen === round.target;
  const closeness = revealed && !correct ? difference(chosen.hex, round.target.hex, vision) : null;
  const resultRef = useRef(null);

  useEffect(() => {
    if (revealed) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [revealed]);

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between text-sm">
        <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-semibold">Seeing as: {v.label}</span>
        <span className="font-bold text-slate-700">Door {level}</span>
      </div>

      <div className="bg-white rounded-2xl shadow p-5">
        <p className="text-center text-xl font-bold text-slate-800 mb-5">
          Open the <span className="uppercase tracking-wide">{round.target.name}</span> door
        </p>
        <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-md mx-auto">
          {round.doors.map((c, i) => (
            <Door
              key={i}
              color={c}
              vision={vision}
              onClick={revealed ? undefined : () => onPick(i)}
              state={revealed ? (c === round.target ? "correct" : i === picked ? "wrong" : null) : null}
            />
          ))}
        </div>
      </div>

      {revealed && (
        <div ref={resultRef} className="bg-white rounded-2xl shadow p-5 space-y-4 animate-scaleUp">
          <div className={`text-lg font-bold ${correct ? "text-emerald-600" : "text-rose-600"}`}>
            {correct ? "Correct! The door opens…" : `That was the ${chosen.name} door.`}
          </div>

          {!correct && vision !== "normal" && closeness < 20 && (
            <p className="text-sm text-slate-700">
              To someone with {v.label.toLowerCase()}, <b>{chosen.name}</b> and <b>{round.target.name}</b> look almost the
              same. That is what everyday life can be like for them, like reading a traffic light, a map key or coloured
              chalk on the board.
            </p>
          )}
          {!correct && (vision === "normal" || closeness >= 20) && (
            <p className="text-sm text-slate-700">
              These colours are different enough to tell apart with {v.label.toLowerCase()}. Look carefully next time!
            </p>
          )}
          {correct && round.confusedBy && round.confusedBy !== vision && (
            <p className="text-sm text-slate-700">
              Watch out: someone with {visionById(round.confusedBy).label.toLowerCase()} would find these doors very
              hard to tell apart.
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-bold uppercase text-slate-500 mb-2">What you saw</div>
              <div className="grid grid-cols-3 gap-2">
                {round.doors.map((c, i) => (
                  <Door key={i} color={c} vision={vision} label={c.name} />
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase text-slate-500 mb-2">The real colours</div>
              <div className="grid grid-cols-3 gap-2">
                {round.doors.map((c, i) => (
                  <Door key={i} color={c} vision="normal" label={c.name} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end flex-wrap">
            {correct ? (
              <button onClick={onNext} className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700">
                Next door →
              </button>
            ) : (
              <>
                <div className="mr-auto self-center text-slate-700">
                  You got through <b>{level - 1}</b> door{level - 1 === 1 ? "" : "s"}.
                </div>
                <button onClick={onMenu} className="px-4 py-3 rounded-xl border-2 border-slate-200 font-semibold text-slate-700">
                  Change eyes
                </button>
                <button onClick={onRetry} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700">
                  Try again
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Explore() {
  const [focus, setFocus] = useState("deuteranopia");
  const pairs = trickiestPairs(focus);
  const v = visionById(focus);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-lg font-bold text-slate-800 mb-1">What others see</h2>
        <p className="text-sm text-slate-600 mb-4">Each row is one real colour. Each column shows how it looks to a different person.</p>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th></th>
                {VISION_TYPES.map((vt) => (
                  <th key={vt.id} className="font-semibold text-slate-600 px-1 align-bottom w-16">
                    {vt.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PALETTE.map((c) => (
                <tr key={c.name}>
                  <td className="pr-2 font-semibold text-slate-700 whitespace-nowrap">{c.name}</td>
                  {VISION_TYPES.map((vt) => (
                    <td key={vt.id}>
                      <div className="h-9 w-16 rounded-md border border-black/10" style={{ background: simulate(c.hex, vt.id) }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5 space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Hardest colours to tell apart</h2>
        <VisionPicker vision={focus} onChange={setFocus} />
        <p className="text-sm text-slate-600">{v.blurb}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {pairs.map(({ a, b }) => (
            <div key={a.name + b.name} className="rounded-xl bg-slate-50 p-3 flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-8 h-8 rounded" style={{ background: a.hex }} />
                <div className="w-8 h-8 rounded" style={{ background: b.hex }} />
              </div>
              <span className="text-slate-400">→</span>
              <div className="flex gap-1">
                <div className="w-8 h-8 rounded" style={{ background: simulate(a.hex, focus) }} />
                <div className="w-8 h-8 rounded" style={{ background: simulate(b.hex, focus) }} />
              </div>
              <span className="text-sm font-semibold text-slate-700">
                {a.name} &amp; {b.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-slate-700 space-y-1">
        <div className="font-bold text-slate-800">What helps</div>
        <p>Don't use colour as the only clue. Add words, symbols, patterns or numbers too, like labelling the doors or using stripes and dots on a chart.</p>
        <p>Pairs with a big light/dark difference (like yellow and blue) work for almost everyone.</p>
      </div>
    </div>
  );
}

export default function ColorVisionApp() {
  const [tab, setTab] = useState("play");
  const [vision, setVision] = useState("normal");
  const [phase, setPhase] = useState("menu");
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState(null);
  const [picked, setPicked] = useState(null);
  const [best, setBest] = useState(loadBest);

  useEffect(() => saveBest(best), [best]);

  const startRun = () => {
    setLevel(1);
    setRound(makeRound(1));
    setPicked(null);
    setPhase("play");
  };

  const handlePick = (i) => {
    setPicked(i);
    const cleared = round.doors[i] === round.target ? level : level - 1;
    if (cleared > (best[vision] ?? 0)) setBest({ ...best, [vision]: cleared });
  };

  const nextDoor = () => {
    setLevel(level + 1);
    setRound(makeRound(level + 1));
    setPicked(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Colour Vision Doors</h1>
            <p className="text-sm text-slate-600">See the world through someone else's eyes.</p>
          </div>
          <nav className="flex bg-white rounded-xl p-1 shadow-sm">
            {[
              ["play", "Play"],
              ["explore", "Explore"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === id ? "bg-indigo-600 text-white" : "text-slate-600"}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        {tab === "explore" ? (
          <Explore />
        ) : phase === "menu" ? (
          <Menu vision={vision} setVision={setVision} best={best} onStart={startRun} />
        ) : (
          <Play
            vision={vision}
            level={level}
            round={round}
            picked={picked}
            onPick={handlePick}
            onNext={nextDoor}
            onRetry={startRun}
            onMenu={() => setPhase("menu")}
          />
        )}

        <footer className="text-xs text-slate-400 text-center pt-4">
          Colour simulation based on Machado et al. (2009). Screens differ, so this is an approximation, not a medical test.
        </footer>
      </div>
    </div>
  );
}
