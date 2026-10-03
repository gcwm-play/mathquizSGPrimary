import React, { useEffect, useRef, useState } from "react";
import { Bit, DigDeeper, Button } from "../ui.jsx";

// Each version of the "AI-written" program: the code shown to kids, which
// lines are new, and the real behaviour the preview runs.
const VERSIONS = [
  {
    code: [
      "let y = 20;",
      "let speed = 0;",
      "",
      "function draw() {",
      "  speed = speed + 0.5; // gravity",
      "  y = y + speed;",
      "  circle(150, y, 15);",
      "}",
    ],
    added: [],
    floor: false,
    rainbow: false,
  },
  {
    code: [
      "let y = 20;",
      "let speed = 0;",
      "",
      "function draw() {",
      "  speed = speed + 0.5; // gravity",
      "  y = y + speed;",
      "  if (y > 165) {       // floor?",
      "    y = 165;",
      "    speed = -speed * 0.9; // bounce!",
      "  }",
      "  circle(150, y, 15);",
      "}",
    ],
    added: [6, 7, 8, 9],
    floor: true,
    rainbow: false,
  },
  {
    code: [
      "let y = 20;",
      "let speed = 0;",
      "let colour = 0;",
      "",
      "function draw() {",
      "  speed = speed + 0.5; // gravity",
      "  y = y + speed;",
      "  if (y > 165) {       // floor?",
      "    y = 165;",
      "    speed = -speed * 0.9; // bounce!",
      "    colour = colour + 1;  // next colour",
      "  }",
      "  fill(rainbow[colour]);",
      "  circle(150, y, 15);",
      "}",
    ],
    added: [2, 10, 12],
    floor: true,
    rainbow: true,
  },
];

const RAINBOW = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#6366F1", "#A855F7"];

function Preview({ version, runKey }) {
  const ref = useRef(null);
  const [fellOff, setFellOff] = useState(false);

  useEffect(() => {
    const ctx = ref.current.getContext("2d");
    let y = 20;
    let speed = 0;
    let colour = 0;
    let frame;
    let gone = 0;
    setFellOff(false);
    const tick = () => {
      speed += 0.5;
      y += speed;
      if (version.floor && y > 165) {
        y = 165;
        speed = -speed * 0.9;
        if (Math.abs(speed) < 2) speed = -11; // keep it bouncing for the demo
        colour++;
      }
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(0, 0, 300, 180);
      ctx.fillStyle = version.rainbow ? RAINBOW[colour % RAINBOW.length] : "#F97316";
      ctx.beginPath();
      ctx.arc(150, y, 15, 0, Math.PI * 2);
      ctx.fill();
      if (!version.floor && y > 200) {
        gone++;
        if (gone === 1) setFellOff(true);
        if (gone > 50) {
          y = 20;
          speed = 0;
          gone = 0;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [version, runKey]);

  return (
    <div className="relative">
      <canvas ref={ref} width="300" height="180" className="w-full rounded-2xl shadow-inner" aria-label="Program preview" />
      {fellOff && (
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold bg-rose-500 text-white rounded-full px-3 py-1 ai-pop">
          The ball fell off the screen! 😱
        </span>
      )}
    </div>
  );
}

function CodeView({ version, typing }) {
  const full = version.code.join("\n");
  const [shown, setShown] = useState(typing ? 0 : full.length);

  useEffect(() => {
    if (!typing) {
      setShown(full.length);
      return;
    }
    setShown(0);
    const t = setInterval(() => setShown((n) => (n >= full.length ? n : n + 3)), 25);
    return () => clearInterval(t);
  }, [full, typing]);

  let count = 0;
  return (
    <pre className="rounded-2xl bg-slate-900 text-slate-100 text-xs sm:text-sm p-3 overflow-x-auto font-mono leading-relaxed">
      {version.code.map((line, i) => {
        const start = count;
        count += line.length + 1;
        if (start > shown) return null;
        const visible = line.slice(0, Math.max(0, shown - start));
        const isNew = version.added.includes(i) && !typing;
        return (
          <div key={i} className={isNew ? "bg-emerald-500/25 -mx-3 px-3" : ""}>
            {isNew ? "+ " : "  "}
            {visible || " "}
          </div>
        );
      })}
    </pre>
  );
}

const STAGES = [
  { icon: "🙋", label: "Ask" },
  { icon: "💭", label: "Plan" },
  { icon: "✍️", label: "Write" },
  { icon: "▶️", label: "Run" },
  { icon: "🐞", label: "Check" },
  { icon: "🔧", label: "Fix" },
  { icon: "🎉", label: "Works!" },
  { icon: "🌈", label: "Upgrade" },
];

export default function VibeCode() {
  const [stage, setStage] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const version = stage >= 7 ? VERSIONS[2] : stage >= 5 ? VERSIONS[1] : VERSIONS[0];

  const go = (s) => {
    setStage(s);
    setRunKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <Bit>
        <p className="font-semibold">💻 AIs can write computer code too! Telling an AI what you want and letting it code is called “vibe coding”.</p>
        <p className="text-sm text-slate-600">Code is just text, so the AI predicts it token by token, just like a story.</p>
      </Bit>

      <div className="flex flex-wrap gap-1">
        {STAGES.map((s, i) => (
          <span
            key={s.label}
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              i === stage ? "bg-indigo-600 text-white" : i < stage ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"
            }`}
          >
            {s.icon} {s.label}
          </span>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 space-y-3 min-h-[8rem]">
        {stage === 0 && (
          <div className="flex justify-end">
            <div className="bg-indigo-600 text-white rounded-2xl rounded-br-none px-4 py-2 ai-pop">Make a bouncing ball! 🏀</div>
          </div>
        )}
        {stage === 1 && (
          <div className="ai-pop space-y-1 text-slate-700">
            <p className="font-semibold">🤖 My plan:</p>
            <p>1️⃣ Draw a ball near the top.</p>
            <p>2️⃣ Add gravity so it falls faster and faster.</p>
            <p>3️⃣ Make it bounce when it hits the floor.</p>
          </div>
        )}
        {stage >= 2 && stage !== 4 && <CodeView version={version} typing={stage === 2} />}
        {stage >= 3 && stage !== 5 && <Preview key={runKey} version={version} runKey={runKey} />}
        {stage === 4 && (
          <div className="ai-pop space-y-2 text-slate-700">
            <p className="font-semibold">🤖 Checking the result…</p>
            <p>
              🐞 Uh-oh! The ball falls off the bottom of the screen. I did step 2, but I <b>forgot step 3</b>: there's no floor!
            </p>
          </div>
        )}
        {stage === 5 && <p className="text-slate-700 ai-pop">🔧 Adding the missing floor and bounce. The green lines are new:</p>}
        {stage === 6 && <p className="text-emerald-700 font-semibold ai-pop">🎉 It bounces! The AI checked its own work and fixed the bug.</p>}
        {stage === 7 && (
          <div className="space-y-2">
            <div className="flex justify-end">
              <div className="bg-indigo-600 text-white rounded-2xl rounded-br-none px-4 py-2 ai-pop">Now make it change colour every bounce! 🌈</div>
            </div>
            <p className="text-slate-700">🤖 Easy! Just 3 new lines:</p>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="soft" onClick={() => go(stage - 1)} disabled={stage === 0}>
          ◀ Back
        </Button>
        {stage < STAGES.length - 1 ? (
          <Button onClick={() => go(stage + 1)}>
            Next: {STAGES[stage + 1].icon} {STAGES[stage + 1].label} ▶
          </Button>
        ) : (
          <Button variant="soft" onClick={() => go(0)}>
            🔄 Start over
          </Button>
        )}
      </div>

      <DigDeeper>
        <p>
          Coding AIs learned from huge amounts of public code. Newer “agent” AIs can also run the code, read the errors, and try again,
          just like the plan → write → run → check → fix loop you saw.
        </p>
        <p>
          AI-written code can still have bugs or security holes, so real programmers always test and review it. The best results come
          from people who understand the code AND know how to ask the AI clearly.
        </p>
      </DigDeeper>
    </div>
  );
}
