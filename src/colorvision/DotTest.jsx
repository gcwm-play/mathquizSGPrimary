import React, { useMemo, useState } from "react";
import { VISION_TYPES, visionById, simulate } from "./simulate.js";
import { PLATE_KINDS, PLATE_SIZE, makePlate, makeTest, numberMask, visibility } from "./ishihara.js";
import { Owl } from "./Owl.jsx";

const SEES = {
  clear: { icon: "✅", text: "sees it" },
  faint: { icon: "🌫️", text: "only just" },
  hidden: { icon: "❌", text: "can't see it" },
};

function Plate({ plate, vision, className = "" }) {
  const colors = useMemo(() => plate.dots.map((d) => simulate(d.color, vision)), [plate, vision]);
  return (
    <svg viewBox={`0 0 ${PLATE_SIZE} ${PLATE_SIZE}`} className={`w-full h-auto ${className}`} role="img" aria-label="Dot plate">
      <circle cx={PLATE_SIZE / 2} cy={PLATE_SIZE / 2} r={PLATE_SIZE / 2 - 4} fill={simulate("#F4EFE6", vision)} />
      {plate.dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={colors[i]} />
      ))}
    </svg>
  );
}

function EyeChips({ vision, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {VISION_TYPES.map((v) => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          className={`px-3 py-1.5 rounded-full font-semibold text-sm border-2 transition-all ${
            vision === v.id ? "bg-amber-300 border-amber-400 shadow scale-105" : "bg-white border-transparent shadow-sm"
          }`}
        >
          {v.emoji} {v.nickname}
        </button>
      ))}
    </div>
  );
}

export default function DotTest() {
  const [test, setTest] = useState(() => makeTest());
  const [index, setIndex] = useState(0);
  const [vision, setVision] = useState("normal");
  const [answer, setAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = test[index];
  const plate = useMemo(
    () => makePlate(current.kind, current.number, current.seed, numberMask(current.number)),
    [current]
  );
  const v = visionById(vision);
  const kind = PLATE_KINDS[current.kind];

  const respond = (choice) => {
    const vis = visibility(current.kind, vision);
    const right = choice === current.number || (choice === "none" && vis === "hidden");
    setAnswer({ choice, right, vis, eyes: vision });
    if (right) setScore(score + 1);
  };

  const next = () => {
    if (index + 1 >= test.length) {
      setFinished(true);
    } else {
      setIndex(index + 1);
      setAnswer(null);
    }
  };

  const restart = () => {
    setTest(makeTest());
    setIndex(0);
    setAnswer(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="space-y-5 animate-fadeIn">
        <Owl mood="party">
          <p className="text-lg font-bold">You finished all {test.length} plates! 🎉</p>
          <p className="text-slate-600">
            You got <b>{score}</b> of {test.length} right.
          </p>
        </Owl>
        <div className="bg-white rounded-3xl shadow-lg p-5 space-y-2 text-slate-700">
          <h2 className="text-xl font-bold text-slate-800">🩺 What doctors do</h2>
          <p>
            Eye doctors use dot plates like these, called <b>Ishihara plates</b>, to check for colour blindness. They were
            invented over 100 years ago by a Japanese doctor, Shinobu Ishihara.
          </p>
          <p className="text-sm text-slate-500">
            These plates were made by this app just for fun and learning. They are not a real eye test. Screens show colours
            differently, so if you're worried about your eyes, ask a grown-up to take you to an eye doctor.
          </p>
        </div>
        <div className="text-center">
          <button
            onClick={restart}
            className="px-8 py-4 rounded-2xl bg-amber-400 text-slate-900 text-xl font-bold shadow-lg hover:bg-amber-300 hover:scale-105 active:scale-95 transition-transform"
          >
            🔄 New plates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      <Owl mood={answer?.right ? "party" : "happy"}>
        {!answer && (
          <>
            <p className="text-lg font-semibold">What number can you see in the dots? 🔍</p>
            <p className="text-sm text-slate-600">Tap different eyes to see how the plate changes!</p>
          </>
        )}
        {answer?.right && answer.choice === current.number && (
          <p className="text-lg font-bold text-emerald-600">Yes! It's {current.number}! 🎉</p>
        )}
        {answer?.right && answer.choice === "none" && (
          <p className="text-lg font-bold text-emerald-600">
            Right! With {visionById(answer.eyes).nickname} eyes the number vanishes! 🪄
          </p>
        )}
        {answer && !answer.right && answer.choice === "none" && (
          <p className="text-lg font-bold text-rose-600">Look closer, there is a number! It's {current.number}.</p>
        )}
        {answer && !answer.right && answer.choice !== "none" && (
          <p className="text-lg font-bold text-rose-600">Not quite. The number is {current.number}.</p>
        )}
      </Owl>

      <div className="flex items-center justify-between">
        <span className="px-3 py-1.5 rounded-full bg-white shadow font-semibold text-slate-800">
          Plate {index + 1} of {test.length}
        </span>
        <span className="px-3 py-1.5 rounded-full bg-amber-400 shadow font-bold text-slate-900">⭐ {score}</span>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-4 space-y-4">
        <div className="max-w-xs mx-auto">
          <Plate plate={plate} vision={vision} className="drop-shadow-md" />
        </div>
        <div className="text-center text-sm text-slate-600">
          Looking with {v.emoji} <b>{v.nickname}</b> eyes
        </div>
        <EyeChips vision={vision} onChange={setVision} />
      </div>

      {!answer ? (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            {current.choices.map((n) => (
              <button
                key={n}
                onClick={() => respond(n)}
                className="py-4 rounded-2xl bg-white shadow-md text-2xl font-bold text-slate-800 hover:bg-amber-100 hover:-translate-y-0.5 active:scale-95 transition-all"
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={() => respond("none")}
            className="w-full py-3 rounded-2xl bg-white/80 shadow text-lg font-semibold text-slate-700 hover:bg-white"
          >
            🤷 I can't see a number
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl p-5 space-y-4 animate-scaleUp">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {kind.title}: the secret number is {current.number}
            </h2>
            <p className="text-slate-600">{kind.hint}</p>
          </div>
          <div>
            <div className="font-bold text-slate-700 mb-2">👀 Who can see it? Tap one to look closer.</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {VISION_TYPES.map((vt) => {
                const vis = visibility(current.kind, vt.id);
                return (
                  <button
                    key={vt.id}
                    onClick={() => setVision(vt.id)}
                    className={`rounded-2xl p-2 text-center border-2 transition-all ${
                      vision === vt.id ? "border-amber-400 bg-amber-50" : "border-transparent bg-slate-50"
                    }`}
                  >
                    <Plate plate={plate} vision={vt.id} />
                    <div className="text-xs font-bold text-slate-700 mt-1 leading-tight">
                      {vt.emoji} {vt.nickname}
                    </div>
                    <div className="text-xs text-slate-500">
                      {SEES[vis].icon} {SEES[vis].text}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="text-right">
            <button
              onClick={next}
              className="px-8 py-3 rounded-2xl bg-emerald-500 text-white text-lg font-bold shadow-lg hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-transform"
            >
              {index + 1 >= test.length ? "Finish 🏁" : "Next plate →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
