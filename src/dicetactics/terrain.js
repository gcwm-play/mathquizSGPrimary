// Pixel-art ground for the board: castle courtyards on the back rows, dirt
// roads on the moat rows and meadow in between. Each square is a 16×16 pixel
// tile. The board is symmetrical: tiles are generated for the top-left
// quarter and mirrored left-right and top-bottom, so neither side's ground
// looks different.
import { W, H } from "./engine.js";

const T = 16; // pixels per square

// What each row is, from a back row towards the middle (mirrored for the other half).
const ROW_KIND = ["court", "road", "grass", "meadow", "meadow"];

const COLORS = {
  grass: ["#6fae4a", "#7fbe57", "#5f9d3f"],
  blade: "#4c8533",
  dirt: ["#b98b56", "#c99a63", "#a77a48"],
  pebble: "#8d7a63",
  stone: ["#a7a59c", "#b8b6ad", "#96948b"],
  mortar: "#6f6c64",
  rock: ["#9a9a94", "#c2c2bb", "#6d6d68"],
  petal: ["#fff6dc", "#f6d050", "#e889b0"],
};

// Small deterministic random numbers, so the board looks the same every time.
function rng(seed) {
  let x = seed * 2654435761 + 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 10000) / 10000;
  };
}

const pick = (r, list) => list[Math.floor(r() * list.length)];

// One 16×16 tile as rows of colours.
function tile(kind, seed) {
  const r = rng(seed);
  const px = Array.from({ length: T }, () => Array(T).fill(null));
  const fill = (palette, odds) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) px[y][x] = r() < odds ? pick(r, palette.slice(1)) : palette[0];
  };
  if (kind === "court") {
    // Cobblestones in staggered rows of 4×4 stones with mortar between.
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const row = Math.floor(y / 4);
        const xs = x + (row % 2 ? 2 : 0);
        px[y][x] = y % 4 === 3 || xs % 4 === 3 ? COLORS.mortar : r() < 0.25 ? pick(r, COLORS.stone.slice(1)) : COLORS.stone[0];
      }
    return px;
  }
  if (kind === "road") {
    fill(COLORS.dirt, 0.22);
    for (let i = 0; i < 4; i++) px[Math.floor(r() * T)][Math.floor(r() * T)] = COLORS.pebble;
    return px;
  }
  fill(COLORS.grass, 0.18);
  if (kind === "meadow") {
    const extra = r();
    if (extra < 0.35) {
      // A few grass tufts.
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(r() * 12);
        const y = 3 + Math.floor(r() * 11);
        px[y][x] = px[y - 1][x] = px[y - 2][x] = COLORS.blade;
        px[y][x - 1] = px[y - 1][x + 1] = COLORS.blade;
      }
    } else if (extra < 0.6) {
      // Little flowers.
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(r() * 12);
        const y = 2 + Math.floor(r() * 12);
        const petal = pick(r, COLORS.petal);
        px[y - 1][x] = px[y + 1][x] = px[y][x - 1] = px[y][x + 1] = petal;
        px[y][x] = "#f6d050";
      }
    } else if (extra < 0.72) {
      // A small stone.
      const x = 4 + Math.floor(r() * 7);
      const y = 5 + Math.floor(r() * 6);
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 4; dx++) px[y + dy][x + dx] = dy === 0 ? COLORS.rock[1] : dy === 2 ? COLORS.rock[2] : COLORS.rock[0];
    }
  }
  return px;
}

let cached = null;

// The whole board as an image URL (W×16 by H×16 pixels), drawn once.
export function terrainImage() {
  if (cached) return cached;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = W * T;
  canvas.height = H * T;
  const ctx = canvas.getContext("2d");
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      // Mirror into the top-left quarter, generate there, then flip back out.
      const rr = Math.min(r, H - 1 - r);
      const cc = Math.min(c, W - 1 - c);
      const px = tile(ROW_KIND[rr] || "meadow", rr * 31 + cc * 7 + 3);
      for (let y = 0; y < T; y++)
        for (let x = 0; x < T; x++) {
          const sy = r === rr ? y : T - 1 - y;
          const sx = c === cc ? x : T - 1 - x;
          ctx.fillStyle = px[sy][sx];
          ctx.fillRect(c * T + x, r * T + y, 1, 1);
        }
    }
  }
  cached = canvas.toDataURL();
  return cached;
}
