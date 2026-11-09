// Pixel-art dino sprites (T-rex and velociraptor), recoloured per player.
// The PNG strips and frames.json are made by sprites/slice.py from the source sheets.
import trexUrl from "./sprites/trex.png";
import raptorUrl from "./sprites/raptor.png";
import frames from "./sprites/frames.json";

// base: the skin hue in the art; range: which hues count as skin (eyes, belly and outline stay)
export const SPECIES = {
  trex: { id: "trex", name: "T-rex", url: trexUrl, base: 95, range: [55, 180], scale: 0.56, ...frames.trex },
  raptor: { id: "raptor", name: "Velociraptor", url: raptorUrl, base: 32, range: [14, 52], scale: 0.54, ...frames.raptor },
};

// running animation: frame index per step, and which frame to hold in the air
export const RUN = { frames: [0, 1, 2, 3], air: 2, duck: 3 };

const images = {};
let readyCount = 0;
const listeners = new Set();
export function onSpritesReady(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
if (typeof Image !== "undefined") {
  for (const s of Object.values(SPECIES)) {
    const img = new Image();
    img.onload = () => {
      readyCount++;
      listeners.forEach((fn) => fn());
    };
    img.src = s.url;
    images[s.id] = img;
  }
}

function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [r + m, g + m, b + m];
}

const cache = new Map();

// the sprite strip for one species in one skin hue (null until the PNG has loaded)
export function skin(speciesId, hue) {
  const sp = SPECIES[speciesId] || SPECIES.trex;
  const img = images[sp.id];
  if (!img || !img.complete || !img.naturalWidth) return null;
  const key = `${sp.id}:${hue}`;
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth;
  cv.height = img.naturalHeight;
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0);
  if (hue != null && Math.abs(hue - sp.base) > 2) {
    const data = ctx.getImageData(0, 0, cv.width, cv.height);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      if (!px[i + 3]) continue;
      const [h, s, v] = rgbToHsv(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255);
      if (s < 0.25 || v < 0.12 || h < sp.range[0] || h > sp.range[1]) continue;
      // keep the art's light/dark shading, squeeze its hue spread a little
      let nh = hue + (h - sp.base) * 0.35;
      nh = ((nh % 360) + 360) % 360;
      const [r, g, b] = hsvToRgb(nh, Math.min(1, s * 1.05), v);
      px[i] = Math.round(r * 255);
      px[i + 1] = Math.round(g * 255);
      px[i + 2] = Math.round(b * 255);
    }
    ctx.putImageData(data, 0, 0);
  }
  cache.set(key, cv);
  return cv;
}

export function spritesReady() {
  return readyCount >= Object.keys(SPECIES).length;
}
