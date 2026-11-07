// Keyboards, game controllers and on-screen touch buttons → {back, fwd, jump, duck}

export const SCHEMES = {
  wasd: { label: "W A S D", keys: { back: ["KeyA"], fwd: ["KeyD"], jump: ["KeyW"], duck: ["KeyS"] }, help: "A ◀  D ▶  W jump  S duck" },
  arrows: {
    label: "Arrow keys",
    keys: { back: ["ArrowLeft"], fwd: ["ArrowRight"], jump: ["ArrowUp"], duck: ["ArrowDown"] },
    help: "← ◀  → ▶  ↑ jump  ↓ duck",
  },
  ijkl: { label: "I J K L", keys: { back: ["KeyJ"], fwd: ["KeyL"], jump: ["KeyI"], duck: ["KeyK"] }, help: "J ◀  L ▶  I jump  K duck" },
  numpad: {
    label: "Number pad",
    keys: { back: ["Numpad4"], fwd: ["Numpad6"], jump: ["Numpad8"], duck: ["Numpad5", "Numpad2"] },
    help: "4 ◀  6 ▶  8 jump  5 duck",
  },
};

export const KEY_SCHEMES = Object.keys(SCHEMES);

export function schemeLabel(p) {
  if (p.scheme === "bot") return `Computer (${p.botSkill || "normal"})`;
  if (p.scheme === "touch") return "Touch buttons";
  if (p.scheme === "pad") return `Controller ${p.pad + 1}`;
  return SCHEMES[p.scheme]?.label || p.scheme;
}

export function schemeHelp(p) {
  if (p.scheme === "bot") return "Plays by itself";
  if (p.scheme === "touch") return "Buttons appear on screen";
  if (p.scheme === "pad") return "Stick/D-pad ◀ ▶  A jump  B duck";
  return SCHEMES[p.scheme]?.help || "";
}

// which key scheme a key code belongs to
export function schemeForCode(code) {
  for (const id of KEY_SCHEMES) {
    for (const list of Object.values(SCHEMES[id].keys)) if (list.includes(code)) return id;
  }
  return null;
}

const ALL_CODES = new Set(KEY_SCHEMES.flatMap((id) => Object.values(SCHEMES[id].keys).flat()));

export function createInput() {
  const down = new Set();
  const touch = new Map(); // player index → {back,fwd,jump,duck}
  const onDown = (e) => {
    if (ALL_CODES.has(e.code)) {
      e.preventDefault();
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
    destroy() {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}
