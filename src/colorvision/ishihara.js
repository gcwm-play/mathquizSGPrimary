// Ishihara-style dot plates, generated from scratch (the real Ishihara plates
// are a copyrighted medical test). The number and background colours sit on a
// "confusion line" for one type of colour blindness, so to those eyes they are
// the same colour and the number disappears. Random brightness speckle stops
// anyone from finding the number by light/dark alone.

import { confusionDirection, hexToLinear, linearToHex, difference } from "./simulate.js";

export const PLATE_SIZE = 300;
const RADIUS = 140;

// Each figure colour is the background base moved along that type's
// confusion line, as far as stays in gamut (up to ΔE 45 for normal eyes).
const lineFigure = (bgHex, visionId) => {
  const v = confusionDirection(visionId);
  const bg = hexToLinear(bgHex);
  let figure = bgHex;
  for (let t = 0.02; t < 1.5; t += 0.01) {
    const f = bg.map((x, i) => x + t * v[i]);
    if (f.some((x) => x < 0.005 || x > 0.97)) break;
    figure = linearToHex(f);
    if (difference(figure, bgHex) > 45) break;
  }
  return figure;
};

export const PLATE_KINDS = {
  warmup: {
    title: "Warm-up plate",
    hint: "Almost everyone can see this one, even Grey World eyes!",
    background: "#9CC3E6",
    figure: "#C2502A",
  },
  deuteranopia: {
    title: "Red-green plate",
    hint: "This number hides from No Green eyes.",
    background: "#9AA65A",
    figure: lineFigure("#9AA65A", "deuteranopia"),
  },
  protanopia: {
    title: "Red-green plate",
    hint: "This number hides from No Red eyes.",
    background: "#A8A06A",
    figure: lineFigure("#A8A06A", "protanopia"),
  },
  tritanopia: {
    title: "Blue-yellow plate",
    hint: "This number hides from No Blue eyes.",
    background: "#7FB0A0",
    figure: lineFigure("#7FB0A0", "tritanopia"),
  },
};

export const PLATE_ORDER = ["warmup", "deuteranopia", "protanopia", "tritanopia", "deuteranopia", "protanopia"];

// Numbers with chunky digits that read well as dots.
const NUMBERS = [2, 3, 5, 6, 8, 9, 12, 15, 16, 25, 26, 29, 35, 42, 45, 57, 73, 74, 86, 96, 97];

// How clearly someone with the given eyes can see the number.
export function visibility(kind, visionId) {
  const { figure, background } = PLATE_KINDS[kind];
  const d = difference(figure, background, visionId);
  return d >= 25 ? "clear" : d >= 12 ? "faint" : "hidden";
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Random non-overlapping dots inside the plate circle.
function packDots(rng) {
  const c = PLATE_SIZE / 2;
  const cell = 12;
  const grid = new Map();
  const dots = [];
  for (let attempt = 0; attempt < 20000 && dots.length < 1400; attempt++) {
    const r = 2 + rng() * 3.6;
    const x = c + (rng() * 2 - 1) * RADIUS;
    const y = c + (rng() * 2 - 1) * RADIUS;
    if (Math.hypot(x - c, y - c) + r > RADIUS) continue;
    const gx = Math.floor(x / cell);
    const gy = Math.floor(y / cell);
    let clash = false;
    for (let i = gx - 1; i <= gx + 1 && !clash; i++) {
      for (let j = gy - 1; j <= gy + 1 && !clash; j++) {
        for (const d of grid.get(`${i},${j}`) ?? []) {
          if (Math.hypot(d.x - x, d.y - y) < d.r + r + 1) {
            clash = true;
            break;
          }
        }
      }
    }
    if (clash) continue;
    const dot = { x, y, r };
    dots.push(dot);
    const key = `${gx},${gy}`;
    grid.set(key, [...(grid.get(key) ?? []), dot]);
  }
  return dots;
}

const speckle = (hex, rng) => {
  const k = 0.72 + rng() * 0.56;
  const lin = hexToLinear(hex).map((x) => x * k + (rng() - 0.5) * 0.03);
  return linearToHex(lin);
};

// isInside(x, y) says whether a point is part of the number's shape.
export function makePlate(kind, number, seed, isInside) {
  const rng = mulberry32(seed);
  const { figure, background } = PLATE_KINDS[kind];
  const dots = packDots(rng).map((d) => {
    const inFigure = isInside(d.x, d.y);
    return { ...d, color: speckle(inFigure ? figure : background, rng) };
  });
  return { kind, number, dots };
}

// Builds a hit-test for a number's shape by drawing it on a hidden canvas.
export function numberMask(number) {
  const size = PLATE_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const text = String(number);
  let fontSize = 190;
  ctx.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
  const width = ctx.measureText(text).width;
  if (width > 220) {
    fontSize = Math.floor((fontSize * 220) / width);
    ctx.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  ctx.fillText(text, size / 2, size / 2 + fontSize * 0.04);
  ctx.strokeText(text, size / 2, size / 2 + fontSize * 0.04);
  const data = ctx.getImageData(0, 0, size, size).data;
  return (x, y) => {
    const px = Math.min(size - 1, Math.max(0, Math.round(x)));
    const py = Math.min(size - 1, Math.max(0, Math.round(y)));
    return data[(py * size + px) * 4 + 3] > 128;
  };
}

export function makeTest(rng = Math.random) {
  const pool = [...NUMBERS];
  return PLATE_ORDER.map((kind) => {
    const number = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const others = NUMBERS.filter((n) => n !== number && String(n).length === String(number).length);
    const choices = [number];
    while (choices.length < 4) {
      const n = others[Math.floor(rng() * others.length)];
      if (!choices.includes(n)) choices.push(n);
    }
    choices.sort((a, b) => a - b);
    return { kind, number, choices, seed: Math.floor(rng() * 2 ** 31) };
  });
}
