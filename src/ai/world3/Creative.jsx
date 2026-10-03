import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bit, DigDeeper, Button, TokenBug } from "../ui.jsx";

const N = 32; // pictures are 32x32 "pixels" so the noise is easy to see

const mulberry = (seed) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Paints a simple picture into an RGB array using a tiny canvas.
function paint(draw) {
  const c = document.createElement("canvas");
  c.width = N;
  c.height = N;
  const ctx = c.getContext("2d");
  draw(ctx);
  const d = ctx.getImageData(0, 0, N, N).data;
  const out = new Float32Array(N * N * 3);
  for (let i = 0; i < N * N; i++) {
    out[i * 3] = d[i * 4];
    out[i * 3 + 1] = d[i * 4 + 1];
    out[i * 3 + 2] = d[i * 4 + 2];
  }
  return out;
}

const circle = (ctx, x, y, r, color) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
};

const PROMPTS = [
  {
    id: "apple",
    label: "🍎 a red apple",
    draw: (ctx) => {
      ctx.fillStyle = "#FDF6E3";
      ctx.fillRect(0, 0, N, N);
      circle(ctx, 12, 18, 9, "#DC2626");
      circle(ctx, 20, 18, 9, "#DC2626");
      circle(ctx, 13, 15, 3, "#F87171");
      ctx.fillStyle = "#78350F";
      ctx.fillRect(15, 4, 2, 7);
      ctx.fillStyle = "#16A34A";
      ctx.beginPath();
      ctx.ellipse(21, 7, 5, 2.5, -0.5, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: "house",
    label: "🏠 a house in the sun",
    draw: (ctx) => {
      ctx.fillStyle = "#7DD3FC";
      ctx.fillRect(0, 0, N, N);
      circle(ctx, 26, 6, 4, "#FACC15");
      ctx.fillStyle = "#22C55E";
      ctx.fillRect(0, 24, N, 8);
      ctx.fillStyle = "#F97316";
      ctx.fillRect(8, 14, 16, 12);
      ctx.fillStyle = "#B91C1C";
      ctx.beginPath();
      ctx.moveTo(5, 15);
      ctx.lineTo(16, 6);
      ctx.lineTo(27, 15);
      ctx.fill();
      ctx.fillStyle = "#78350F";
      ctx.fillRect(14, 19, 4, 7);
    },
  },
  {
    id: "face",
    label: "😊 a happy face",
    draw: (ctx) => {
      ctx.fillStyle = "#E0E7FF";
      ctx.fillRect(0, 0, N, N);
      circle(ctx, 16, 16, 13, "#FACC15");
      circle(ctx, 11, 13, 2, "#1E293B");
      circle(ctx, 21, 13, 2, "#1E293B");
      ctx.strokeStyle = "#1E293B";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(16, 17, 6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    },
  },
];

const STEPS = 10;

function Pictures() {
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const canvasRef = useRef(null);

  const targets = useMemo(() => Object.fromEntries(PROMPTS.map((p) => [p.id, paint(p.draw)])), []);
  const noise = useMemo(() => {
    const rng = mulberry(42);
    return Float32Array.from({ length: N * N * 3 }, () => rng() * 255);
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    const img = ctx.createImageData(N, N);
    const a = Math.pow(step / STEPS, 1.4);
    const target = targets[prompt.id];
    for (let i = 0; i < N * N; i++) {
      for (let c = 0; c < 3; c++) img.data[i * 4 + c] = noise[i * 3 + c] * (1 - a) + target[i * 3 + c] * a;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [step, prompt, targets, noise]);

  useEffect(() => {
    if (!playing) return;
    if (step >= STEPS) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), 350);
    return () => clearTimeout(t);
  }, [playing, step]);

  return (
    <div className="space-y-4">
      <Bit>
        <p className="font-semibold">🎨 Picture AIs start with pure TV static, then clean it up step by step.</p>
        <p className="text-sm text-slate-600">
          At each step, the AI guesses which bits are noise and removes a little. Your words steer what it cleans the static into!
        </p>
      </Bit>
      <div className="flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setPrompt(p);
              setStep(0);
              setPlaying(false);
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold ${prompt.id === p.id ? "bg-fuchsia-500 text-white" : "bg-fuchsia-50 text-fuchsia-700"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <canvas ref={canvasRef} width={N} height={N} className="ai-pixel w-56 h-56 rounded-2xl shadow-lg" aria-label={`Picture of ${prompt.label}`} />
        <div className="flex-1 w-full space-y-3">
          <div className="text-sm font-semibold text-slate-700">
            Step {step} of {STEPS} {step === 0 ? "· pure static" : step === STEPS ? "· done! 🎉" : "· cleaning…"}
          </div>
          <input
            type="range"
            min="0"
            max={STEPS}
            value={step}
            onChange={(e) => {
              setPlaying(false);
              setStep(Number(e.target.value));
            }}
            className="w-full accent-fuchsia-500"
            aria-label="Cleaning step"
          />
          <Button
            variant="fun"
            onClick={() => {
              setStep(0);
              setPlaying(true);
            }}
          >
            ▶ Make the picture
          </Button>
          <p className="text-xs text-slate-500">Every prompt starts from the exact same static. Only the words are different!</p>
        </div>
      </div>
    </div>
  );
}

function Flipbook() {
  const [matching, setMatching] = useState(true);
  const [frame, setFrame] = useState(0);
  const canvasRef = useRef(null);
  const FRAMES = 12;

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % FRAMES), 160);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    const rng = mulberry(frame * 97 + 1);
    const wobble = (n) => (matching ? 0 : (rng() - 0.5) * n);
    const skies = ["#7DD3FC", "#FDA4AF", "#A5B4FC", "#FCD34D"];
    ctx.fillStyle = matching ? "#7DD3FC" : skies[Math.floor(rng() * skies.length)];
    ctx.fillRect(0, 0, N, N);
    const y = 26 - frame * 1.6 + wobble(10);
    circle(ctx, 16 + wobble(14), y, 4 + wobble(3), matching ? "#FACC15" : ["#FACC15", "#F97316", "#FFFFFF"][Math.floor(rng() * 3)]);
    ctx.fillStyle = matching ? "#16A34A" : ["#16A34A", "#65A30D", "#0F766E"][Math.floor(rng() * 3)];
    ctx.beginPath();
    ctx.ellipse(16, 32, 22 + wobble(8), 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }, [frame, matching]);

  return (
    <div className="space-y-3">
      <p className="font-semibold text-slate-800">🎬 And videos? A video is just lots of pictures shown really fast.</p>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <canvas ref={canvasRef} width={N} height={N} className="ai-pixel w-40 h-40 rounded-2xl shadow-lg" aria-label="Sunrise video" />
        <div className="flex-1 space-y-2">
          <p className="text-sm text-slate-600">
            The hard part is making every picture <b>match</b> the one before, so things don't jump around or change colour.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button variant={matching ? "primary" : "soft"} onClick={() => setMatching(true)}>
              ✅ Frames match
            </Button>
            <Button variant={!matching ? "primary" : "soft"} onClick={() => setMatching(false)}>
              ❌ Frames don't match
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Music: notes are tokens too ---

const NOTE_FREQ = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.0, A: 440.0, B: 493.88, "C'": 523.25 };
const NOTE_ORDER = ["C", "D", "E", "F", "G", "A", "B", "C'"];
const NOTE_COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6", "#3B82F6", "#6366F1", "#A855F7"];

// Public-domain nursery tunes the music model learns from.
const TUNES = [
  "C C G G A A G F F E E D D C G G F F E E D G G F F E E D C C G G A A G F F E E D D C",
  "E D C D E E E D D D E G G E D C D E E E E D D E D C",
  "C D E C C D E C E F G E F G G A G F E C G A G F E C C G C C G C",
  "C C C D E E D E F G C' C' C' G G G E E E C C C G F E D C",
];

const transitions = (() => {
  const t = {};
  for (const tune of TUNES) {
    const notes = tune.split(" ");
    for (let i = 1; i < notes.length; i++) {
      t[notes[i - 1]] = t[notes[i - 1]] ?? {};
      t[notes[i - 1]][notes[i]] = (t[notes[i - 1]][notes[i]] ?? 0) + 1;
    }
  }
  return t;
})();

const nextNote = (prev) => {
  const options = Object.entries(transitions[prev] ?? { C: 1 });
  const total = options.reduce((a, [, c]) => a + c, 0);
  let r = Math.random() * total;
  for (const [n, c] of options) {
    r -= c;
    if (r <= 0) return n;
  }
  return options[0][0];
};

let audioCtx = null;

// Phones only allow sound to start during a tap, so this must be called
// directly from a click handler, before any timers play notes.
const unlockAudio = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = audioCtx ?? new Ctx();
  if (audioCtx.state === "suspended") audioCtx.resume();
  // A silent blip fully unlocks audio on iPhones and iPads.
  const buffer = audioCtx.createBuffer(1, 1, 22050);
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(audioCtx.destination);
  src.start(0);
};

const playNote = (note) => {
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(NOTE_FREQ[note], now);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
};

function Music() {
  const [notes, setNotes] = useState([]);
  const [playing, setPlaying] = useState(false);
  const LENGTH = 12;

  useEffect(() => {
    if (!playing) return;
    if (notes.length >= LENGTH) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => {
      const n = notes.length === 0 ? "C" : nextNote(notes[notes.length - 1]);
      playNote(n);
      setNotes((ns) => [...ns, n]);
    }, 380);
    return () => clearTimeout(t);
  }, [playing, notes]);

  return (
    <div className="space-y-4">
      <Bit>
        <p className="font-semibold">🎵 Music and voice AIs use the same trick, but their tokens are little pieces of sound!</p>
        <p className="text-sm text-slate-600">
          My mini music AI learned from 4 old nursery songs. Each note-bug is picked by guessing what usually comes next.
        </p>
      </Bit>
      <div className="relative rounded-2xl bg-slate-50 h-44 overflow-hidden">
        {NOTE_ORDER.map((n, i) => (
          <div key={n} className="absolute left-0 right-0 border-t border-slate-200" style={{ bottom: `${8 + i * 11}%` }} />
        ))}
        <div className="absolute inset-0 flex items-end gap-1 px-2">
          {notes.map((n, i) => {
            const idx = NOTE_ORDER.indexOf(n);
            return (
              <div key={i} className="relative flex-1 h-full">
                <div className="absolute left-1/2 -translate-x-1/2 ai-pop" style={{ bottom: `${4 + idx * 11}%` }}>
                  <TokenBug text={n.replace("'", "↑")} small color={NOTE_COLORS[idx]} />
                </div>
              </div>
            );
          })}
          {Array.from({ length: LENGTH - notes.length }, (_, i) => (
            <div key={`e${i}`} className="flex-1" />
          ))}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="fun"
          disabled={playing}
          onClick={() => {
            unlockAudio();
            setNotes([]);
            setPlaying(true);
          }}
        >
          🎶 Make a new tune
        </Button>
        <Button variant="soft" disabled={playing || notes.length === 0} onClick={() => {
            unlockAudio();
            notes.forEach((n, i) => setTimeout(() => playNote(n), i * 300));
          }}>
          🔊 Play it again
        </Button>
      </div>
      <DigDeeper>
        <p>
          Real voice and music AIs chop sound into tiny slices, often dozens of sound tokens for every second, and predict the next ones
          just like words.
        </p>
        <p>
          ⚠️ Because AI can copy voices, some families agree on a secret password, so they can tell if a phone call from “family” is
          really them.
        </p>
      </DigDeeper>
    </div>
  );
}

export default function Creative() {
  return (
    <div className="space-y-6">
      <Pictures />
      <Flipbook />
      <DigDeeper>
        <p>
          This way of making pictures is called <b>diffusion</b>. During training, the AI is shown millions of pictures with
          captions. Noise is added to them, and the AI practises guessing the noise so it can take it away again.
        </p>
        <p>
          Our demo just fades the static away so you can see the idea. A real diffusion AI uses a neural network to decide what to remove
          at every step, so it can paint pictures nobody has ever drawn.
        </p>
      </DigDeeper>
      <hr className="border-slate-200" />
      <Music />
    </div>
  );
}
