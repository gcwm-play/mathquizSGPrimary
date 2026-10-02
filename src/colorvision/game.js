import { PALETTE, difference } from "./simulate.js";

const CONFUSION_TYPES = ["deuteranopia", "protanopia", "tritanopia"];

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

const shuffle = (arr, rng) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Chance that a round is built from colours some people confuse.
export const trickChance = (level) => (level <= 2 ? 0 : Math.min(1, 0.5 + (level - 3) * 0.15));

// Every round is solvable with normal vision: all three doors are clearly
// different to a typical eye. "Tricky" rounds pick colours that look alike
// to one kind of colour blindness, so whether a round is easy depends on
// whose eyes you are looking through.
export function makeRound(level, rng = Math.random) {
  const tricky = rng() < trickChance(level);
  const target = pick(PALETTE, rng);
  const others = PALETTE.filter((c) => c !== target && difference(c.hex, target.hex) > 25);

  let distractors;
  let confusedBy = null;
  if (tricky) {
    confusedBy = pick(CONFUSION_TYPES, rng);
    const ranked = others
      .map((c) => ({ c, d: difference(c.hex, target.hex, confusedBy) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 3)
      .map((x) => x.c);
    distractors = shuffle(ranked, rng).slice(0, 2);
  } else {
    const allEyes = ["normal", ...CONFUSION_TYPES];
    const fair = others.filter((c) => allEyes.every((v) => difference(c.hex, target.hex, v) > 30));
    distractors = shuffle(fair.length >= 2 ? fair : others, rng).slice(0, 2);
  }

  if (difference(distractors[0].hex, distractors[1].hex) < 25) {
    return makeRound(level, rng);
  }

  return { target, doors: shuffle([target, ...distractors], rng), confusedBy };
}
