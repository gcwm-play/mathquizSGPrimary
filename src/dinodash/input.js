// Keyboards, game controllers and on-screen touch buttons → {back, fwd, jump, duck}
// Player 1 (left hand): Z jump, A ◀ slower, D ▶ faster, S duck
// Player 2 (right hand): / jump, K ◀ slower, ; ▶ faster, L duck (arrow keys also work)
// With the "Jump only" controls setting, only Z and / do anything.
// A keyboard player can pick their own jump key (p.jumpCode / p.jumpLabel).

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

// keys a player may never use as their jump key
const RESERVED = new Set(["Escape", "Enter", "NumpadEnter", "Tab", "KeyP", "MetaLeft", "MetaRight", "ContextMenu"]);

// the key that makes this player jump
export function jumpCodes(p) {
  if (p.jumpCode) return [p.jumpCode];
  return SCHEMES[p.scheme]?.keys.jump || [];
}

// every key code this player uses (jump plus faster / slower / duck)
function codesOf(p) {
  const k = SCHEMES[p.scheme]?.keys;
  if (!k) return [];
  return [...jumpCodes(p), ...k.back, ...k.fwd, ...k.duck];
}

// a short label for a key press, e.g. "Space", "J", "↑", "Num 5"
export function keyLabel(e) {
  const named = {
    Space: "Space", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", ShiftLeft: "Left Shift",
    ShiftRight: "Right Shift", ControlLeft: "Left Ctrl", ControlRight: "Right Ctrl", AltLeft: "Left Alt",
    AltRight: "Right Alt", Backspace: "Backspace", CapsLock: "Caps Lock", Backquote: "`",
  };
  if (named[e.code]) return named[e.code];
  if (e.code.startsWith("Numpad")) return `Num ${e.code.slice(6)}`;
  if (e.key && e.key.length === 1) return e.key.toUpperCase();
  return e.key || e.code;
}

// can player p (in seat `seat`) use this key to jump? returns null if yes, or the reason why not
export function jumpKeyProblem(code, label, p, seat, seats) {
  if (RESERVED.has(code)) {
    if (code === "KeyP" || code === "Escape") return `${label} pauses the game — pick another key`;
    return `${label} can't be used — pick another key`;
  }
  const mine = SCHEMES[p.scheme]?.keys;
  if (mine) {
    for (const [what, list] of [["◀ slower", mine.back], ["▶ faster", mine.fwd], ["duck", mine.duck]]) {
      if (list.includes(code)) return `${label} is already your ${what} key`;
    }
  }
  const otherSeat = 1 - seat;
  const other = seats[otherSeat];
  if (other && codesOf(other).includes(code)) return `${label} is already used by ${other.name}`;
  // an empty seat still needs its own keys so that player can join
  const otherScheme = SCHEMES[`k${otherSeat + 1}`];
  if (!other && Object.values(otherScheme.keys).flat().includes(code)) return `${label} is Player ${otherSeat + 1}'s key`;
  return null;
}

export function schemeRows(p, controls = "simple") {
  const full = controls === "full";
  if (p.scheme === "touch") return full ? [["◀ ▶", "slower / faster"], ["▼ ⤒", "duck / jump"]] : [["⤒ Jump", "button on your side"]];
  if (p.scheme === "pad") return full ? [["A", "jump"], ["Stick", "◀ ▶"], ["B", "duck"]] : [["A", "jump"]];
  let rows = SCHEMES[p.scheme]?.rows || [];
  if (p.jumpCode && rows.length) rows = [[p.jumpLabel || p.jumpCode, "jump"], ...rows.slice(1)];
  return full ? rows : rows.slice(0, 1);
}

export function schemeForCode(code) {
  for (const id of Object.keys(SCHEMES)) {
    for (const list of Object.values(SCHEMES[id].keys)) if (list.includes(code)) return id;
  }
  return null;
}

const ALL_CODES = new Set(Object.values(SCHEMES).flatMap((s) => Object.values(s.keys).flat()));

export function createInput(players = []) {
  const down = new Set();
  // keys pressed since the last frame, so a tap quicker than one frame still counts
  const tapped = new Set();
  const touch = new Map(); // player index → {back,fwd,jump,duck}
  const used = new Set([...ALL_CODES, ...players.flatMap((p) => (p.jumpCode ? [p.jumpCode] : []))]);
  const onDown = (e) => {
    if (used.has(e.code)) {
      e.preventDefault(); // stops "/" opening quick-find and arrows scrolling
      down.add(e.code);
      if (!e.repeat) tapped.add(e.code);
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
      for (const a of ["back", "fwd", "duck"]) out[a] = k[a].some((c) => down.has(c));
      out.jump = jumpCodes(p).some((c) => down.has(c) || tapped.has(c));
    }
    return out;
  }

  return {
    read,
    // call once per frame after reading every player
    endFrame() {
      tapped.clear();
    },
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
