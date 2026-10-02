// Colour vision deficiency simulation.
// Dichromat matrices are from Machado, Oliveira & Fernandes (2009), severity 1.0,
// applied in linear RGB. Anomalous trichromacy ("-anomaly") is approximated by
// blending between normal vision and the full dichromat matrix.

const IDENTITY = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

const PROTAN = [
  [0.152286, 1.052583, -0.204868],
  [0.114503, 0.786281, 0.099216],
  [-0.003882, -0.048116, 1.051998],
];

const DEUTAN = [
  [0.367322, 0.860646, -0.227968],
  [0.280085, 0.672501, 0.047413],
  [-0.01182, 0.04294, 0.968881],
];

const TRITAN = [
  [1.255528, -0.076749, -0.178779],
  [-0.078411, 0.930809, 0.147602],
  [0.004733, 0.691367, 0.3039],
];

const ACHROMA = [
  [0.2126, 0.7152, 0.0722],
  [0.2126, 0.7152, 0.0722],
  [0.2126, 0.7152, 0.0722],
];

const blend = (m, t) => m.map((row, i) => row.map((v, j) => IDENTITY[i][j] * (1 - t) + v * t));

// `label` is the medical name; `nickname`/`tag` are the kid-friendly names shown first.
export const VISION_TYPES = [
  {
    id: "normal",
    label: "Typical colour vision",
    nickname: "Everyday Eyes",
    emoji: "👀",
    tag: "Typical colour vision",
    group: "Typical",
    matrix: IDENTITY,
    who: "Most people see like this.",
    blurb: "You can see every colour of the rainbow!",
    fact: "Your eyes have 3 kinds of colour helpers called cones: one for red, one for green and one for blue.",
  },
  {
    id: "deuteranomaly",
    label: "Deuteranomaly",
    nickname: "Weak Green",
    emoji: "🍃",
    tag: "Mild red-green colour blindness",
    group: "Red-green",
    matrix: blend(DEUTAN, 0.6),
    who: "The most common kind! About 1 in 20 boys.",
    blurb: "Greens look faded, so reds and greens can be tricky to tell apart.",
    fact: "If there are 20 boys in your class, one of them might see colours like this.",
  },
  {
    id: "deuteranopia",
    label: "Deuteranopia",
    nickname: "No Green",
    emoji: "🥦",
    tag: "Strong red-green colour blindness",
    group: "Red-green",
    matrix: DEUTAN,
    who: "About 1 in 100 boys.",
    blurb: "Red, green, brown and orange can all look like the same muddy yellow.",
    fact: "Dogs see colours a bit like this! 🐶",
  },
  {
    id: "protanomaly",
    label: "Protanomaly",
    nickname: "Weak Red",
    emoji: "🍓",
    tag: "Mild red-green colour blindness",
    group: "Red-green",
    matrix: blend(PROTAN, 0.6),
    who: "About 1 in 100 boys.",
    blurb: "Reds look darker and duller, and can be mixed up with greens and browns.",
    fact: "Girls can be colour blind too, but it is about 16 times more common in boys.",
  },
  {
    id: "protanopia",
    label: "Protanopia",
    nickname: "No Red",
    emoji: "🍎",
    tag: "Strong red-green colour blindness",
    group: "Red-green",
    matrix: PROTAN,
    who: "About 1 in 100 boys.",
    blurb: "Red can look almost like dark brown or black, and purple looks like blue.",
    fact: "Bulls can't see red either! They chase the matador's cape because it moves. 🐂",
  },
  {
    id: "tritanopia",
    label: "Tritanopia",
    nickname: "No Blue",
    emoji: "💧",
    tag: "Blue-yellow colour blindness",
    group: "Blue-yellow",
    matrix: TRITAN,
    who: "Very rare: about 1 in 10,000 people.",
    blurb: "Blue and green look alike, and yellow can look pink or light grey.",
    fact: "This kind affects girls and boys equally.",
  },
  {
    id: "achromatopsia",
    label: "Achromatopsia",
    nickname: "Grey World",
    emoji: "🐼",
    tag: "Total colour blindness",
    group: "No colour",
    matrix: ACHROMA,
    who: "Super rare: about 1 in 30,000 people.",
    blurb: "Almost no colours at all. Everything looks like an old black-and-white photo.",
    fact: "Bright sunlight can feel very dazzling, so many people with Grey World eyes wear dark glasses.",
  },
];

export const visionById = (id) => VISION_TYPES.find((v) => v.id === id) ?? VISION_TYPES[0];

export const PALETTE = [
  { name: "Red", hex: "#D62828" },
  { name: "Green", hex: "#2E9E44" },
  { name: "Brown", hex: "#8B5A2B" },
  { name: "Orange", hex: "#F08C00" },
  { name: "Yellow", hex: "#F5D90A" },
  { name: "Blue", hex: "#1F5FD1" },
  { name: "Purple", hex: "#7B3FBF" },
  { name: "Pink", hex: "#F28DB2" },
  { name: "Grey", hex: "#9A9A9A" },
  { name: "Teal", hex: "#1AA39A" },
];

const toLinear = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const toSrgb = (v) => {
  const x = Math.min(1, Math.max(0, v));
  const s = x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055;
  return Math.round(s * 255);
};

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgbToHex = (rgb) => "#" + rgb.map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase();

export function simulate(hex, visionId) {
  const m = visionById(visionId).matrix;
  if (m === IDENTITY) return hex.toUpperCase();
  const lin = hexToRgb(hex).map(toLinear);
  const out = m.map((row) => toSrgb(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]));
  return rgbToHex(out);
}

export function shade(hex, amount) {
  return rgbToHex(hexToRgb(hex).map((c) => Math.round(c * (1 - amount))));
}

function toLab(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

// How different two colours look to someone with the given vision (CIE76 ΔE).
// Roughly: under 10 is very hard to tell apart, over 30 is clearly different.
export function difference(hexA, hexB, visionId = "normal") {
  const a = toLab(simulate(hexA, visionId));
  const b = toLab(simulate(hexB, visionId));
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function trickiestPairs(visionId, count = 4) {
  const pairs = [];
  for (let i = 0; i < PALETTE.length; i++) {
    for (let j = i + 1; j < PALETTE.length; j++) {
      const a = PALETTE[i];
      const b = PALETTE[j];
      pairs.push({ a, b, diff: difference(a.hex, b.hex, visionId), normal: difference(a.hex, b.hex) });
    }
  }
  // Rank by how much harder the pair is than for normal vision, then by raw closeness.
  return pairs
    .filter((p) => visionId === "normal" || p.diff < p.normal * 0.6)
    .sort((x, y) => x.diff - y.diff)
    .slice(0, count);
}
