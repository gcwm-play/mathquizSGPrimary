// Keyboards, game controllers and on-screen touch buttons → {back, fwd, jump, duck}
// Player 1 (left hand): Z jump, A ◀ slower, D ▶ faster, S duck
// Player 2 (right hand): / jump, K ◀ slower, ; ▶ faster, L duck (arrow keys also work)
// With the "Jump only" controls setting, only Z and / do anything.

export const SCHEMES = {
  k1: {
    label: "Keyboard (left)",
    jumpKey: "Z",
    keys: { back: ["KeyA"], fwd: ["KeyD"], jump: ["KeyZ"], duck: ["KeyS"] },
    rows: [
      ["Z", "jump"],
      ["A", "◀ slower"],
      ["D", "▶ faster"],
      ["S", "duck"],
    ],
  },
  k2: {
    label: "Keyboard (right)",
    jumpKey: "/",
    keys: { back: ["KeyK", "ArrowLeft"], fwd: ["Semicolon", "ArrowRight"], jump: ["Slash"], duck: ["KeyL", "ArrowDown"] },
    rows: [
      ["/", "jump"],
      ["K or ←", "◀ slower"],
      ["; or →", "▶ faster"],
      ["L or ↓", "duck"],
    ],
  },
};

// each seat has its own keyboard keys
export const SEAT_SCHEME = ["k1", "k2"];

export function schemeLabel(p) {
  if (p.scheme === "bot") return "🤖 Robot player (plays by itself)";
  if (p.scheme === "touch") return "Touch buttons";
  if (p.scheme === "pad") return `Controller ${p.pad + 1}`;
  return SCHEMES[p.scheme]?.label || p.scheme;
}

export function schemeRows(p, controls = "simple") {
  const full = controls === "full";
  if (p.scheme === "touch") return full ? [["◀ ▶", "slower / faster"], ["▼ ⤒", "duck / jump"]] : [["⤒ Jump", "button on your side"]];
  if (p.scheme === "pad") return full ? [["A", "jump"], ["Stick", "◀ ▶"], ["B", "duck"]] : [["A", "jump"]];
  const rows = SCHEMES[p.scheme]?.rows || [];
  return full ? rows : rows.slice(0, 1);
}

export function schemeForCode(code) {
  for (const id of Object.keys(SCHEMES)) {
    for (const list of Object.values(SCHEMES[id].keys)) if (list.includes(code)) return id;
  }
  return null;
}

const ALL_CODES = new Set(Object.values(SCHEMES).flatMap((s) => Object.values(s.keys).flat()));

export function createInput() {
  const down = new Set();
  const touch = new Map(); // player index → {back,fwd,jump,duck}
  const onDown = (e) => {
    if (ALL_CODES.has(e.code)) {
      e.preventDefault(); // stops "/" opening quick-find and arrows scrolling
      down.add(e.code);
    }
  };
  const onUp = (e) => down.delete(e.code);
  const onBlur = () => down.clear();
  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);
  window.addEventListener("blur", onBlur);

  function read(p, idx) {
    const out = { back: false, fwd: false, jump: false, duck: false };
    if (p.scheme === "touch") {
      const t = touch.get(idx);
      if (t) Object.assign(out, t);
    } else if (p.scheme === "pad") {
      const gp = navigator.getGamepads?.()[p.pad];
      if (gp) {
        const b = (i) => !!gp.buttons[i]?.pressed;
        const ax = gp.axes[0] || 0;
        const ay = gp.axes[1] || 0;
        out.back = ax < -0.4 || b(14);
        out.fwd = ax > 0.4 || b(15);
        out.jump = b(0) || b(12) || b(3);
        out.duck = b(1) || b(13) || ay > 0.6;
      }
    } else if (SCHEMES[p.scheme]) {
      const k = SCHEMES[p.scheme].keys;
      for (const a of ["back", "fwd", "jump", "duck"]) out[a] = k[a].some((c) => down.has(c));
    }
    return out;
  }

  return {
    read,
    setTouch(idx, action, on) {
      const t = touch.get(idx) || { back: false, fwd: false, jump: false, duck: false };
      t[action] = on;
      touch.set(idx, t);
    },
    clearTouch(idx) {
      touch.delete(idx);
    },
    destroy() {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}
