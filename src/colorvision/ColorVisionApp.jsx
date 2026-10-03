import React, { useEffect, useRef, useState } from "react";
import { PALETTE, VISION_TYPES, visionById, simulate, shade, difference, trickiestPairs } from "./simulate.js";
import { makeRound } from "./game.js";
import { Owl } from "./Owl.jsx";
import DotTest from "./DotTest.jsx";
import History from "./History.jsx";

const BEST_KEY = "colorvision-best";
const MUTE_KEY = "colorvision-muted";

const BADGES = [
  { at: 3, name: "Bronze Explorer", icon: "🥉" },
  { at: 6, name: "Silver Seeker", icon: "🥈" },
  { at: 10, name: "Golden Eyes", icon: "🥇" },
  { at: 15, name: "Castle Champion", icon: "🏆" },
];

const CHEERS = ["Great eyes!", "Woohoo!", "You found it!", "Door unlocked!", "Brilliant!", "Super spotting!"];

const badgeFor = (doors) => [...BADGES].reverse().find((b) => doors >= b.at) ?? null;
const nextBadge = (doors) => BADGES.find((b) => doors < b.at) ?? null;

const readStore = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
};

const writeStore = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode etc.) — progress just won't persist.
  }
};

// --- Synthesized sounds (Web Audio API) ---
const sound = {
  ctx: null,
  muted: false,
  play(notes, type = "sine", vol = 0.15) {
    if (this.muted) return;
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
    }
    const now = this.ctx.currentTime;
    notes.forEach(([freq, start, dur]) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(vol, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  },
  correct() {
    this.play([[523.25, 0, 0.2], [659.25, 0.09, 0.2], [783.99, 0.18, 0.3]]);
  },
  wrong() {
    this.play([[220, 0, 0.25], [165, 0.15, 0.35]], "triangle", 0.2);
  },
  badge() {
    this.play([[523.25, 0, 0.15], [659.25, 0.1, 0.15], [783.99, 0.2, 0.15], [1046.5, 0.3, 0.4]]);
  },
};

function Confetti({ burst }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!burst) return;
    setPieces(
      Array.from({ length: 40 }, (_, i) => ({
        id: `${burst}-${i}`,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        color: PALETTE[i % PALETTE.length].hex,
      }))
    );
    const t = setTimeout(() => setPieces([]), 2400);
    return () => clearTimeout(t);
  }, [burst]);
  return pieces.map((p) => (
    <span key={p.id} className="cv-confetti" style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s` }} />
  ));
}

function Door({ color, vision, open = false, shake = false, glow = false, onClick, label }) {
  const fill = simulate(color.hex, vision);
  const panel = simulate(shade(color.hex, 0.22), vision);
  const frame = simulate("#7A5C44", vision);
  const stone = simulate("#B9AFA3", vision);
  const knob = simulate("#E3B23C", vision);
  const light = simulate("#FFE58A", vision);

  const svg = (
    <svg viewBox="0 0 100 170" className="w-full h-auto drop-shadow-lg" aria-hidden="true">
      <path d="M0 170 V46 A50 50 0 0 1 100 46 V170 Z" fill={stone} />
      <path d="M5 170 V48 A45 45 0 0 1 95 48 V170 Z" fill={frame} />
      <path d="M12 170 V50 A38 38 0 0 1 88 50 V170 Z" fill={light} className={open ? "cv-glow" : ""} />
      <g className={`cv-leaf ${open ? "cv-open" : ""}`}>
        <path d="M12 170 V50 A38 38 0 0 1 88 50 V170 Z" fill={fill} />
        <path d="M22 80 V56 A28 28 0 0 1 78 56 V80 Z" fill={panel} />
        <rect x="22" y="92" width="56" height="64" rx="3" fill={panel} />
        <circle cx="76" cy="124" r="5" fill={knob} />
      </g>
    </svg>
  );

  const wrap = `w-full ${shake ? "cv-shake" : ""} ${glow ? "drop-shadow-[0_0_18px_rgba(250,204,21,0.9)]" : ""}`;

  return (
    <div className="flex flex-col items-center gap-1">
      {onClick ? (
        <button
          onClick={onClick}
          className={`${wrap} rounded-t-full transition-transform hover:-translate-y-2 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300`}
          aria-label="Open this door"
        >
          {svg}
        </button>
      ) : (
        <div className={wrap}>{svg}</div>
      )}
      {label && <span className="text-sm font-semibold text-slate-700">{label}</span>}
    </div>
  );
}

function EyePicker({ vision, onChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {VISION_TYPES.map((v) => {
        const active = vision === v.id;
        return (
          <button
            key={v.id}
            onClick={() => onChange(v.id)}
            className={`rounded-2xl p-3 text-left border-4 transition-all hover:-translate-y-0.5 ${
              active ? "bg-amber-100 border-amber-400 shadow-lg scale-[1.03]" : "bg-white border-transparent shadow"
            }`}
          >
            <div className="text-3xl">{v.emoji}</div>
            <div className="font-bold text-slate-800 leading-tight mt-1">{v.nickname}</div>
            <div className="text-xs text-slate-500 leading-snug">{v.tag}</div>
          </button>
        );
      })}
    </div>
  );
}

function EyeInfo({ vision }) {
  const v = visionById(vision);
  return (
    <div className="rounded-2xl bg-white/80 p-4 space-y-2 cv-pop" key={vision}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-2xl">{v.emoji}</span>
        <span className="font-bold text-lg text-slate-800">{v.nickname}</span>
        {vision !== "normal" && (
          <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">Doctors call it: {v.label}</span>
        )}
      </div>
      <p className="text-slate-700">{v.blurb}</p>
      <p className="text-sm text-slate-600">👥 {v.who}</p>
      <p className="text-sm text-indigo-700 bg-indigo-50 rounded-xl px-3 py-2">💡 {v.fact}</p>
    </div>
  );
}

function Scene({ vision }) {
  const c = (hex) => simulate(hex, vision);
  return (
    <svg viewBox="0 0 400 240" className="w-full h-auto block" aria-hidden="true">
      <rect width="400" height="240" fill={c("#7EC8F2")} />
      <circle cx="345" cy="48" r="26" fill={c("#FFD23F")} />
      <g fill="#FFFFFF">
        <ellipse cx="90" cy="40" rx="30" ry="12" />
        <ellipse cx="115" cy="34" rx="22" ry="12" />
        <ellipse cx="230" cy="60" rx="26" ry="10" />
      </g>
      <path d="M0 160 Q100 120 210 150 T400 140 V240 H0 Z" fill={c("#8BC34A")} />
      <path d="M0 190 Q120 165 250 185 T400 180 V240 H0 Z" fill={c("#4CAF50")} />
      {/* tree with apples */}
      <rect x="62" y="120" width="16" height="70" rx="4" fill={c("#8B5A2B")} />
      <circle cx="70" cy="105" r="38" fill={c("#2E9E44")} />
      <circle cx="45" cy="120" r="22" fill={c("#2E9E44")} />
      <circle cx="96" cy="118" r="22" fill={c("#2E9E44")} />
      {[
        [55, 95],
        [82, 88],
        [70, 120],
        [100, 112],
        [42, 118],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="7" fill={c("#D62828")} />
      ))}
      {/* flowers */}
      {[
        [150, "#F28DB2"],
        [180, "#7B3FBF"],
        [210, "#D62828"],
        [240, "#F08C00"],
      ].map(([x, petal]) => (
        <g key={x}>
          <rect x={x - 1.5} y="190" width="3" height="28" fill={c("#2E7D32")} />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx={x + 9 * Math.cos((a * Math.PI) / 180)}
              cy={188 + 9 * Math.sin((a * Math.PI) / 180)}
              r="7"
              fill={c(petal)}
            />
          ))}
          <circle cx={x} cy="188" r="5" fill={c("#F5D90A")} />
        </g>
      ))}
      {/* butterfly */}
      <g transform="translate(290 110)">
        <ellipse cx="-8" cy="0" rx="9" ry="12" fill={c("#F08C00")} />
        <ellipse cx="8" cy="0" rx="9" ry="12" fill={c("#1F5FD1")} />
        <rect x="-1.5" y="-10" width="3" height="20" rx="1.5" fill="#333333" />
      </g>
      {/* traffic light */}
      <rect x="352" y="120" width="8" height="100" fill="#555555" />
      <rect x="338" y="70" width="36" height="86" rx="8" fill="#2B2B2B" />
      <circle cx="356" cy="88" r="10" fill={c("#E53935")} />
      <circle cx="356" cy="113" r="10" fill={c("#FFB300")} />
      <circle cx="356" cy="138" r="10" fill={c("#43A047")} />
    </svg>
  );
}

function SwipeScene({ vision }) {
  const [pos, setPos] = useState(50);
  const v = visionById(vision);
  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden shadow-lg">
        <Scene vision={vision} />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <Scene vision="normal" />
        </div>
        <div className="absolute top-0 bottom-0 w-1 bg-white shadow" style={{ left: `calc(${pos}% - 2px)` }} />
        <span className="absolute top-2 left-2 text-xs font-bold bg-white/90 rounded-full px-2 py-1">👀 Everyday Eyes</span>
        <span className="absolute top-2 right-2 text-xs font-bold bg-white/90 rounded-full px-2 py-1">
          {v.emoji} {v.nickname}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="w-full accent-amber-500"
        aria-label="Swipe between everyday eyes and the chosen eyes"
      />
      <p className="text-center text-sm text-slate-600">⬅️ Slide to swap eyes ➡️</p>
    </div>
  );
}

function Menu({ vision, setVision, best, onStart }) {
  const v = visionById(vision);
  const myBest = best[vision] ?? 0;
  const badge = badgeFor(myBest);
  return (
    <div className="space-y-5 animate-fadeIn">
      <Owl>
        <p className="font-semibold">Hoo-hoo! Welcome to the Colour Castle!</p>
        <p className="text-sm text-slate-600">
          Not everyone sees colours the same way. Pick some eyes, then find the right doors to escape the castle.
        </p>
      </Owl>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-800">1. Pick your eyes 👓</h2>
        <EyePicker vision={vision} onChange={setVision} />
        <EyeInfo vision={vision} />
        <div className="rounded-2xl overflow-hidden shadow-lg cv-pop" key={vision}>
          <Scene vision={vision} />
        </div>
        <p className="text-center text-sm text-slate-600">This is how the world looks with {v.nickname} eyes.</p>
      </section>

      <section className="bg-gradient-to-br from-violet-500 to-indigo-600 rounded-3xl p-5 text-white shadow-xl space-y-3">
        <h2 className="text-xl font-bold">2. Escape the Colour Castle 🏰</h2>
        <p className="text-white/90">
          Three doors. Only one is the colour you need. Pick right and go deeper. Pick wrong and you're back to the start!
        </p>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-white/90">
            Your best with {v.emoji} {v.nickname}: <b className="text-white text-lg">{myBest}</b> doors {badge && badge.icon}
          </span>
          <button
            onClick={onStart}
            className="px-8 py-4 rounded-2xl bg-amber-400 text-slate-900 text-xl font-bold shadow-lg hover:bg-amber-300 hover:scale-105 active:scale-95 transition-transform"
          >
            Enter the castle!
          </button>
        </div>
      </section>
    </div>
  );
}

function Play({ vision, level, round, picked, newBest, onPick, onNext, onRetry, onMenu }) {
  const v = visionById(vision);
  const revealed = picked !== null;
  const chosen = revealed ? round.doors[picked] : null;
  const correct = revealed && chosen === round.target;
  const cleared = correct ? level : level - 1;
  const closeness = revealed && !correct ? difference(chosen.hex, round.target.hex, vision) : null;
  const tricky = closeness !== null && vision !== "normal" && closeness < 20;
  const [cheer] = useState(() => CHEERS[Math.floor(Math.random() * CHEERS.length)]);
  const resultRef = useRef(null);
  const upcoming = nextBadge(cleared);
  const earned = badgeFor(cleared);

  useEffect(() => {
    if (revealed) {
      const t = setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 450);
      return () => clearTimeout(t);
    }
  }, [revealed]);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="px-3 py-1.5 rounded-full bg-white shadow text-slate-800 font-semibold">
          {v.emoji} {v.nickname} eyes
        </span>
        <span className="px-3 py-1.5 rounded-full bg-amber-400 shadow text-slate-900 font-bold">🚪 Door {level}</span>
      </div>

      {upcoming && (
        <div className="bg-white/70 rounded-full h-4 overflow-hidden shadow-inner" title={`Next badge: ${upcoming.name}`}>
          <div
            className="h-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-500"
            style={{ width: `${(cleared / upcoming.at) * 100}%` }}
          />
        </div>
      )}

      <Owl mood={!revealed ? "happy" : correct ? "party" : "sad"}>
        {!revealed && (
          <p className="text-lg">
            Find the <b className="text-2xl tracking-wide">{round.target.name.toUpperCase()}</b> door!
          </p>
        )}
        {revealed && correct && <p className="text-lg font-bold text-emerald-600">{cheer} 🎉</p>}
        {revealed && !correct && <p className="text-lg font-bold text-rose-600">Oh no! That was the {chosen.name} door.</p>}
      </Owl>

      <div className="rounded-3xl p-4 sm:p-6 shadow-xl bg-gradient-to-b from-stone-300 to-stone-400">
        <div className="grid grid-cols-3 gap-3 sm:gap-8 max-w-lg mx-auto">
          {round.doors.map((c, i) => (
            <Door
              key={i}
              color={c}
              vision={vision}
              open={revealed && c === round.target}
              glow={revealed && c === round.target}
              shake={revealed && i === picked && !correct}
              onClick={revealed ? undefined : () => onPick(i)}
            />
          ))}
        </div>
      </div>

      {revealed && (
        <div ref={resultRef} className="bg-white rounded-3xl shadow-xl p-5 space-y-4 animate-scaleUp">
          {tricky && (
            <p className="text-slate-700">
              With {v.emoji} <b>{v.nickname}</b> eyes, <b>{chosen.name}</b> and <b>{round.target.name}</b> look almost the
              same. It's not your fault! People with these eyes have to deal with this every day, like with traffic lights,
              maps or coloured markers.
            </p>
          )}
          {!correct && !tricky && (
            <p className="text-slate-700">
              These colours look different enough with {v.nickname} eyes. Look a bit more carefully next time! 🔍
            </p>
          )}
          {correct && round.confusedBy && round.confusedBy !== vision && (
            <p className="text-slate-700">
              🤔 Did you know? Someone with {visionById(round.confusedBy).emoji} <b>{visionById(round.confusedBy).nickname}</b>{" "}
              eyes would find these doors super tricky!
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-sm font-bold text-slate-600 mb-2">
                {v.emoji} Through {v.nickname} eyes
              </div>
              <div className="grid grid-cols-3 gap-2">
                {round.doors.map((c, i) => (
                  <Door key={i} color={c} vision={vision} label={c.name} />
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-sm font-bold text-slate-600 mb-2">👀 The real colours</div>
              <div className="grid grid-cols-3 gap-2">
                {round.doors.map((c, i) => (
                  <Door key={i} color={c} vision="normal" label={c.name} />
                ))}
              </div>
            </div>
          </div>

          {correct ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-slate-600">
                {upcoming ? `${upcoming.at - cleared} more to ${upcoming.icon} ${upcoming.name}!` : "You're a Castle Champion! 🏆"}
              </span>
              <button
                onClick={onNext}
                className="px-8 py-3 rounded-2xl bg-emerald-500 text-white text-lg font-bold shadow-lg hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-transform"
              >
                Next door →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-lg text-slate-700">
                  You escaped through <b className="text-2xl">{cleared}</b> door{cleared === 1 ? "" : "s"}!
                </div>
                {earned && (
                  <div className="font-bold text-amber-600">
                    {earned.icon} {earned.name}
                  </div>
                )}
                {newBest && (
                  <div className="text-sm text-emerald-600 font-semibold">⭐ Your best ever with these eyes!</div>
                )}
              </div>
              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  onClick={onMenu}
                  className="px-5 py-3 rounded-2xl bg-white border-2 border-slate-200 font-bold text-slate-700 hover:border-amber-400"
                >
                  👓 Swap eyes
                </button>
                <button
                  onClick={onRetry}
                  className="px-8 py-3 rounded-2xl bg-amber-400 text-slate-900 text-lg font-bold shadow-lg hover:bg-amber-300 hover:scale-105 active:scale-95 transition-transform"
                >
                  🔄 Try again
                </button>
              </div>
            </div>
          )}
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
    <div className="space-y-5 animate-fadeIn">
      <Owl>
        <p className="font-semibold">Let's see the world through someone else's eyes!</p>
        <p className="text-sm text-slate-600">Pick some eyes, then slide to compare.</p>
      </Owl>

      <EyePicker vision={focus} onChange={setFocus} />
      <SwipeScene vision={focus} />
      <EyeInfo vision={focus} />

      {focus !== "normal" && (
        <section className="bg-white rounded-3xl shadow-lg p-5 space-y-3">
          <h2 className="text-xl font-bold text-slate-800">👯 Colour twins</h2>
          <p className="text-slate-600">
            These colours look very different to Everyday Eyes, but like twins to {v.emoji} {v.nickname} eyes.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {pairs.map(({ a, b }) => (
              <div key={a.name + b.name} className="rounded-2xl bg-slate-50 p-3 flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-9 h-9 rounded-full shadow" style={{ background: a.hex }} />
                  <div className="w-9 h-9 rounded-full shadow" style={{ background: b.hex }} />
                </div>
                <span className="text-xl">➡️</span>
                <div className="flex gap-1">
                  <div className="w-9 h-9 rounded-full shadow" style={{ background: simulate(a.hex, focus) }} />
                  <div className="w-9 h-9 rounded-full shadow" style={{ background: simulate(b.hex, focus) }} />
                </div>
                <span className="font-semibold text-slate-700">
                  {a.name} &amp; {b.name}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 space-y-2 text-slate-700">
        <h2 className="text-xl font-bold text-slate-800">🦸 How to be a colour hero</h2>
        <p>✅ Don't use colour as the only clue. Add words, symbols or patterns too.</p>
        <p>✅ Look at the traffic light in the picture: red is always on top, so everyone knows what it means!</p>
        <p>✅ If a friend mixes up colours, help them out. Never tease them!</p>
      </section>

      <details className="bg-white/70 rounded-3xl p-5 text-slate-700">
        <summary className="font-bold cursor-pointer">For grown-ups: every colour, every type of eyes</summary>
        <div className="overflow-x-auto -mx-5 px-5 mt-4">
          <table className="border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th></th>
                {VISION_TYPES.map((vt) => (
                  <th key={vt.id} className="font-semibold text-slate-600 px-1 align-bottom w-16">
                    {vt.emoji}
                    <br />
                    {vt.nickname}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PALETTE.map((c) => (
                <tr key={c.name}>
                  <td className="pr-2 font-semibold whitespace-nowrap">{c.name}</td>
                  {VISION_TYPES.map((vt) => (
                    <td key={vt.id}>
                      <div className="h-8 w-16 rounded-md border border-black/10" style={{ background: simulate(c.hex, vt.id) }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="text-xs text-slate-500 mt-3 space-y-1">
          {VISION_TYPES.filter((vt) => vt.id !== "normal").map((vt) => (
            <li key={vt.id}>
              {vt.emoji} {vt.nickname} = {vt.label} ({vt.tag.toLowerCase()})
            </li>
          ))}
          <li>
            Simulation based on Machado et al. (2009); the mild types are approximated. Screens differ, so this is not a
            medical test.
          </li>
        </ul>
      </details>
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
  const [best, setBest] = useState(() => readStore(BEST_KEY, {}));
  const [muted, setMuted] = useState(() => readStore(MUTE_KEY, false));
  const [burst, setBurst] = useState(0);
  const [newBest, setNewBest] = useState(false);

  useEffect(() => writeStore(BEST_KEY, best), [best]);
  useEffect(() => {
    sound.muted = muted;
    writeStore(MUTE_KEY, muted);
  }, [muted]);

  const startRun = () => {
    setLevel(1);
    setRound(makeRound(1));
    setPicked(null);
    setPhase("play");
  };

  const handlePick = (i) => {
    setPicked(i);
    const correct = round.doors[i] === round.target;
    const cleared = correct ? level : level - 1;
    if (correct) {
      if (BADGES.some((b) => b.at === level)) {
        sound.badge();
        setBurst(Date.now());
      } else {
        sound.correct();
      }
    } else {
      sound.wrong();
    }
    const beat = cleared > (best[vision] ?? 0);
    setNewBest(beat);
    if (beat) setBest({ ...best, [vision]: cleared });
  };

  const nextDoor = () => {
    setLevel(level + 1);
    setRound(makeRound(level + 1));
    setPicked(null);
  };

  return (
    <div className="cv-app min-h-screen bg-gradient-to-b from-sky-200 via-violet-100 to-amber-100">
      <Confetti burst={burst} />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                <span className="text-red-500">C</span>
                <span className="text-orange-500">o</span>
                <span className="text-yellow-500">l</span>
                <span className="text-green-500">o</span>
                <span className="text-blue-500">u</span>
                <span className="text-violet-500">r</span> Castle 🏰
              </h1>
              <p className="text-slate-700">See the world through someone else's eyes</p>
            </div>
            <button
              onClick={() => setMuted(!muted)}
              className="w-10 h-10 shrink-0 rounded-2xl bg-white shadow text-lg"
              aria-label={muted ? "Turn sound on" : "Turn sound off"}
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </div>
          <nav className="grid grid-cols-4 gap-1 bg-white rounded-2xl p-1 shadow">
            {[
              ["play", "🚪", "Doors"],
              ["dots", "🔴", "Dot Test"],
              ["explore", "🌈", "See the World"],
              ["story", "📜", "Story"],
            ].map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-1 py-2 rounded-xl font-semibold text-sm sm:text-base leading-tight flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 ${
                  tab === id ? "bg-violet-500 text-white" : "text-slate-600"
                }`}
              >
                <span className="text-lg sm:text-base">{icon}</span>
                {label}
              </button>
            ))}
          </nav>
        </header>

        {tab === "explore" ? (
          <Explore />
        ) : tab === "dots" ? (
          <DotTest />
        ) : tab === "story" ? (
          <History />
        ) : phase === "menu" ? (
          <Menu vision={vision} setVision={setVision} best={best} onStart={startRun} />
        ) : (
          <Play
            key={level}
            vision={vision}
            level={level}
            round={round}
            picked={picked}
            newBest={newBest}
            onPick={handlePick}
            onNext={nextDoor}
            onRetry={startRun}
            onMenu={() => setPhase("menu")}
          />
        )}

        <footer className="text-center pt-2">
          <span className="inline-block text-xs font-semibold bg-white/80 text-slate-600 rounded-full px-3 py-1 shadow-sm">
            📅 Info as of October 2026
          </span>
        </footer>
      </div>
    </div>
  );
}
