// Births, health and the yardsticks used to compare mayors across eras.
import { clamp } from "./geom.js";

// Singapore-like national trends that every region drifts with.
const TFR = [
  [1965, 4.6], [1970, 3.1], [1977, 1.82], [1988, 1.96], [1990, 1.83], [2000, 1.6], [2004, 1.26], [2010, 1.15], [2018, 1.14], [2023, 0.97], [2050, 0.95], [2100, 1.05], [2300, 1.1],
];
const LIFE = [
  [1965, 65.5], [1970, 68], [1980, 72.1], [1990, 75.3], [2000, 78], [2010, 81.7], [2020, 83.5], [2040, 85.5], [2080, 88], [2300, 92],
];
function lerpTable(tab, year) {
  if (year <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) {
    if (year <= tab[i][0]) {
      const [y0, v0] = tab[i - 1];
      const [y1, v1] = tab[i];
      return v0 + ((v1 - v0) * (year - y0)) / (y1 - y0);
    }
  }
  return tab[tab.length - 1][1];
}
export const baseTfr = (year) => lerpTable(TFR, year);
export const baseLife = (year) => lerpTable(LIFE, year);

// Fertility for a town: national trend, nudged by homes, childcare,
// mood, the housing queue and family policies.
export function townTfr(year, needs, happy, unhoused, policy = 0) {
  const base = baseTfr(year);
  const homes = (needs.housing - 55) / 45; // -1..1
  const care = ((needs.school + needs.community) / 2 - 55) / 45;
  const mood = (happy - 55) / 45;
  const m = 1 + homes * 0.1 + care * 0.07 + mood * 0.07 - unhoused * 0.35 + policy;
  return clamp(base * m, 0.5, 6.5);
}

export function townLife(year, needs, policy = 0, crisisHit = 0) {
  return clamp(baseLife(year) + (needs.health - 60) * 0.05 + (needs.environment - 70) * 0.03 + (needs.green - 55) * 0.015 + policy - crisisHit, 40, 100);
}

// --- era-relative indices (0–100, 50 = national average for the year) ---
export const lifeIndex = (year, life) => clamp(50 + (life - baseLife(year)) * 9, 0, 100);
export const tfrIndex = (year, tfr) => clamp(50 + (tfr / baseTfr(year) - 1) * 120, 0, 100);
// reserves measured in months of spending
export const financeIndex = (months) => clamp(30 + months * 3.5, 0, 100);

export const METRICS = [
  { k: "happy", name: "Happiness", icon: "😊", w: 0.24 },
  { k: "housing", name: "Housing", icon: "🏠", w: 0.18 },
  { k: "health", name: "Health", icon: "🩺", w: 0.15 },
  { k: "fert", name: "Family & births", icon: "👶", w: 0.1 },
  { k: "finance", name: "Finances", icon: "💰", w: 0.15 },
  { k: "rep", name: "Reputation", icon: "⭐", w: 0.18 },
];
export function mayorScore(m) {
  let s = 0;
  for (const M of METRICS) s += (m[M.k] ?? 50) * M.w;
  return Math.round(s);
}

export function grade(score) {
  if (score >= 78) return { g: "A+", text: "Legendary" };
  if (score >= 70) return { g: "A", text: "Outstanding" };
  if (score >= 62) return { g: "B", text: "Good" };
  if (score >= 54) return { g: "C", text: "Average" };
  if (score >= 45) return { g: "D", text: "Struggling" };
  return { g: "E", text: "In trouble" };
}
