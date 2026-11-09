// Keyboards, game controllers and on-screen touch buttons → {back, fwd, jump, duck}
// Jump is the only control: Player 1 = Z, Player 2 = /

export const SCHEMES = {
  k1: {
    label: "Keyboard (left)",
    jumpKey: "Z",
    keys: { back: [], fwd: [], jump: ["KeyZ"], duck: [] },
    rows: [["Z", "jump"]],
  },
  k2: {
    label: "Keyboard (right)",
    jumpKey: "/",
    keys: { back: [], fwd: [], jump: ["Slash"], duck: [] },
    rows: [["/", "jump"]],
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

export function schemeRows(p) {
  if (p.scheme === "touch") return [["⤒ Jump", "button on your side"]];
  if (p.scheme === "pad") return [["A", "jump"]];
  return SCHEMES[p.scheme]?.rows || [];
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
