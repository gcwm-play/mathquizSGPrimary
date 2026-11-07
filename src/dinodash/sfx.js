// Tiny beeps made with WebAudio (no sound files).
let ac = null;
let muted = false;

export function setMuted(m) {
  muted = m;
}

export function unlockAudio() {
  try {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
  } catch {
    ac = null;
  }
}

function tone(freq, dur, { type = "square", vol = 0.06, slide = 0, delay = 0 } = {}) {
  if (muted || !ac) return;
  const t0 = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ac.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

// each lane gets a slightly different pitch so players can tell sounds apart
const LANE_PITCH = [1, 1.12, 0.9, 1.25];

export function playEvents(events) {
  for (const e of events) {
    const k = LANE_PITCH[e.lane ?? 0] || 1;
    if (e.type === "jump") tone(330 * k, 0.12, { slide: 300, vol: 0.035 });
    else if (e.type === "hit") tone(160, 0.25, { type: "sawtooth", slide: -100, vol: 0.06 });
    else if (e.type === "out") tone(220, 0.5, { type: "triangle", slide: -170, vol: 0.08 });
    else if (e.type === "coin") {
      tone(988 * k, 0.07, { vol: 0.03 });
      tone(1319 * k, 0.12, { vol: 0.03, delay: 0.06 });
    } else if (e.type === "bolt") tone(500, 0.25, { type: "triangle", slide: 700, vol: 0.05 });
    else if (e.type === "count") tone(440, 0.15, { type: "triangle", vol: 0.08 });
    else if (e.type === "go") tone(880, 0.3, { type: "triangle", vol: 0.08 });
    else if (e.type === "finish") {
      [523, 659, 784].forEach((f, i) => tone(f * k, 0.12, { type: "triangle", vol: 0.06, delay: i * 0.08 }));
    } else if (e.type === "end") {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: "triangle", vol: 0.07, delay: i * 0.12 }));
    }
  }
}
