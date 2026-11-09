import React, { useEffect, useRef, useState, useCallback } from "react";
import { MODES, COLORS, HATS, RACE_LENGTHS, INFINITE_LIVES, createGame, step, finishNow } from "./engine.js";
import { drawView, drawDino } from "./render.js";
import { createInput, schemeForCode, schemeLabel, schemeRows, SEAT_SCHEME, SCHEMES, keyLabel, jumpKeyProblem } from "./input.js";
import { playEvents, unlockAudio, setMuted } from "./sfx.js";
import { SPECIES } from "./sprites.js";

const STORE = "dinodash-room-v2";
const SEATS = 2;
const DEFAULT_SETTINGS = { mode: "race", raceLength: "short", coinTime: 60, pace: "normal", layout: "auto", controls: "simple" };
const BOT_NAMES = ["Rexy", "Spike"];

function loadRoom() {
  try {
    const r = JSON.parse(localStorage.getItem(STORE));
    if (r && Array.isArray(r.seats)) {
      const settings = { ...DEFAULT_SETTINGS, ...r.settings };
      if (!MODES[settings.mode]) settings.mode = "race";
      return {
        seats: [r.seats[0] || null, r.seats[1] || null],
        settings,
        wins: r.wins || {},
        rounds: r.rounds || 0,
        muted: !!r.muted,
        record: r.record || null,
      };
    }
  } catch {
    /* ignore */
  }
  return { seats: [null, null], settings: DEFAULT_SETTINGS, wins: {}, rounds: 0, muted: false, record: null };
}

function saveRoom(room) {
  try {
    localStorage.setItem(STORE, JSON.stringify(room));
  } catch {
    /* ignore */
  }
}

const colorHex = (id) => (COLORS.find((c) => c.id === id) || COLORS[0]).body;
const newId = () => Math.random().toString(36).slice(2, 9);
const isTouchDevice = () => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
const minPlayers = (mode) => (mode === "endless" ? 1 : 2);

// ---------------------------------------------------------------- dino picture
function DinoPreview({ species, color, hat, size = 96 }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    cv.width = size * dpr;
    cv.height = size * dpr;
    let raf;
    const t0 = performance.now();
    const draw = (now) => {
      const t = (now - t0) / 1000;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      const s = (size / 92) * dpr;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.translate(30, 80 - 138); // drawDino draws on the lane's ground line (138)
      drawDino(ctx, 0, 138, { species, color, hat }, { phase: t * 14 });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [species, color, hat, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden="true" />;
}

// ---------------------------------------------------------------- room (lobby)
// "Change jump key": the next key pressed becomes this player's jump key
function JumpKeyPicker({ p, seat, other, onChange }) {
  const [listening, setListening] = useState(false);
  const [msg, setMsg] = useState("");
  const defaultKey = SCHEMES[p.scheme].jumpKey;

  useEffect(() => {
    if (!listening) return undefined;
    const onKey = (e) => {
      // capture phase + stop: the room must not treat this press as "join" or "start"
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      if (e.code === "Escape") {
        setListening(false);
        setMsg("");
        return;
      }
      const label = keyLabel(e);
      const seats = seat === 0 ? [p, other] : [other, p];
      const problem = jumpKeyProblem(e.code, label, p, seat, seats);
      if (problem) {
        setMsg(`✋ ${problem}`);
        return;
      }
      const isDefault = SCHEMES[p.scheme].keys.jump.includes(e.code);
      onChange(isDefault ? { jumpCode: null, jumpLabel: null } : { jumpCode: e.code, jumpLabel: label });
      setMsg(`✅ Jump is now ${label}`);
      setListening(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [listening, p, seat, other, onChange]);

  return (
    <div className="dd-mapkey">
      {listening ? (
        <div className="dd-mapkey-listen" role="status">
          ⌨️ Press the key you want for <b>jump</b>…
          <button onClick={() => setListening(false)}>Cancel</button>
        </div>
      ) : (
        <div className="dd-mapkey-row">
          <button
            className="dd-mapkey-btn"
            onClick={(e) => {
              e.currentTarget.blur(); // so Space / Enter don't press this button again
              setMsg("");
              setListening(true);
            }}
          >
            🎯 Change jump key
          </button>
          {p.jumpCode && (
            <button
              className="dd-link"
              onClick={() => {
                onChange({ jumpCode: null, jumpLabel: null });
                setMsg(`Jump is back to ${defaultKey}`);
              }}
            >
              back to {defaultKey}
            </button>
          )}
        </div>
      )}
      {msg && <div className="dd-mapkey-msg">{msg}</div>}
    </div>
  );
}

function PlayerCard({ p, i, other, wins, controls, onChange, onRemove }) {
  return (
    <div className="dd-slot dd-filled" style={{ "--pc": colorHex(p.color) }}>
      <div className="dd-slot-top">
        <span className="dd-pnum">Player {i + 1}</span>
        <button className="dd-x" onClick={onRemove} aria-label={`Remove ${p.name}`}>
          ✕
        </button>
      </div>
      <div className="dd-preview">
        <DinoPreview species={p.species} color={p.color} hat={p.hat} />
        {wins > 0 && <span className="dd-wins">🏆 {wins}</span>}
      </div>
      <input
        className="dd-name"
        value={p.name}
        maxLength={10}
        onChange={(e) => onChange({ name: e.target.value })}
        onBlur={(e) => !e.target.value.trim() && onChange({ name: `Player ${i + 1}` })}
        aria-label="Name"
      />
      <div className="dd-seg dd-species" role="group" aria-label="Dinosaur">
        {Object.values(SPECIES).map((sp) => (
          <button key={sp.id} className={(p.species || "trex") === sp.id ? "on" : ""} onClick={() => onChange({ species: sp.id })}>
            {sp.id === "trex" ? "T-rex" : "Raptor"}
          </button>
        ))}
      </div>
      <div className="dd-swatches" role="group" aria-label="Skin colour">
        {COLORS.map((c) => {
          const taken = other?.color === c.id;
          return (
            <button
              key={c.id}
              className={`dd-sw ${p.color === c.id ? "on" : ""}`}
              style={{ background: c.body }}
              disabled={taken}
              title={taken ? `${c.name} (taken)` : c.name}
              aria-label={c.name}
              onClick={() => onChange({ color: c.id })}
            />
          );
        })}
      </div>
      <div className="dd-hats" role="group" aria-label="Hat">
        {HATS.map((h) => (
          <button key={h.id} className={`dd-hat ${p.hat === h.id ? "on" : ""}`} title={h.name} onClick={() => onChange({ hat: h.id })}>
            {h.icon}
          </button>
        ))}
      </div>
      <div className="dd-lives">
        <span>❤️ Lives</span>
        <div className="dd-seg small">
          {[1, 2, 3, INFINITE_LIVES].map((n) => (
            <button
              key={n}
              className={p.lives === n ? "on" : ""}
              onClick={() => onChange({ lives: n })}
              aria-label={n === INFINITE_LIVES ? "Never run out of lives" : `${n} lives`}
              title={n === INFINITE_LIVES ? "Never run out of lives" : `${n} lives`}
            >
              {n === INFINITE_LIVES ? "∞" : n}
            </button>
          ))}
        </div>
      </div>
      <div className="dd-ctrl">
        <b>{schemeLabel(p)}</b>
        {p.scheme === "bot" ? (
          <div className="dd-seg small">
            {["easy", "normal", "hard"].map((s) => (
              <button key={s} className={p.botSkill === s ? "on" : ""} onClick={() => onChange({ botSkill: s })}>
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        ) : (
          <div className="dd-keys">
            {schemeRows(p, controls).map(([k, what]) => (
              <span key={what}>
                <kbd>{k}</kbd> {what}
              </span>
            ))}
          </div>
        )}
        {SCHEMES[p.scheme] && <JumpKeyPicker p={p} seat={i} other={other} onChange={onChange} />}
      </div>
    </div>
  );
}

function EmptySlot({ i, touch, onKeys, onTouch, onBot }) {
  const key = SCHEMES[SEAT_SCHEME[i]].jumpKey;
  return (
    <div className="dd-slot dd-empty">
      <span className="dd-pnum">Player {i + 1}</span>
      <div className="dd-join">Join!</div>
      {touch ? (
        <button className="dd-join-big" onClick={onTouch}>
          👆 Tap to join
        </button>
      ) : (
        <>
          <button className="dd-join-big" onClick={onKeys}>
            ⌨️ Join — jump with {key}
          </button>
          <p className="dd-join-help">
            or just press <kbd className="big">{key}</kbd>
          </p>
        </>
      )}
      <div className="dd-join-btns">
        {touch ? <button onClick={onKeys}>⌨️ Use keyboard ({key})</button> : <button onClick={onTouch}>👆 Use touch screen</button>}
      </div>
      <div className="dd-robot">
        <span>No one to play with?</span>
        <button onClick={onBot}>🤖 Add a robot player</button>
      </div>
    </div>
  );
}

function Room({ room, setRoom, onStart }) {
  const { seats, settings } = room;
  const roomRef = useRef(room);
  roomRef.current = room;
  const touch = isTouchDevice();
  const count = seats.filter(Boolean).length;
  const need = minPlayers(settings.mode);
  const canStart = count >= need;

  const join = useCallback(
    (seat, extra) => {
      setRoom((r) => {
        if (r.seats[seat]) return r;
        const other = r.seats[1 - seat];
        const isBot = extra.scheme === "bot";
        const want = seat === 0 ? "green" : "orange"; // each dino's natural skin
        const color = (COLORS.find((c) => c.id !== other?.color && c.id === want) || COLORS.find((c) => c.id !== other?.color)).id;
        const p = {
          id: newId(),
          name: isBot ? BOT_NAMES[seat] : `Player ${seat + 1}`,
          color,
          hat: "none",
          species: seat === 0 ? "trex" : "raptor",
          botSkill: "normal",
          lives: 3,
          ...extra,
        };
        const next = [...r.seats];
        next[seat] = p;
        return { ...r, seats: next };
      });
    },
    [setRoom],
  );

  // join by pressing your jump key (Z or /) or a controller button
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      const r = roomRef.current;
      if (e.code === "Enter" && r.seats.filter(Boolean).length >= minPlayers(r.settings.mode)) {
        e.preventDefault();
        onStart();
        return;
      }
      const s = schemeForCode(e.code);
      if (!s) return;
      e.preventDefault();
      const seat = SEAT_SCHEME.indexOf(s);
      if (r.seats[seat]) return;
      unlockAudio();
      join(seat, { scheme: s });
    };
    window.addEventListener("keydown", onKey);
    let raf;
    const held = new Set();
    const poll = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of pads) {
        if (!gp) continue;
        const pressed = gp.buttons.some((b) => b.pressed);
        if (pressed && !held.has(gp.index)) {
          const r = roomRef.current;
          const mine = r.seats.some((p) => p?.scheme === "pad" && p.pad === gp.index);
          const free = r.seats.findIndex((p) => !p);
          if (!mine && free >= 0) join(free, { scheme: "pad", pad: gp.index });
          else if (mine && gp.buttons[9]?.pressed && r.seats.filter(Boolean).length >= minPlayers(r.settings.mode)) onStart();
        }
        if (pressed) held.add(gp.index);
        else held.delete(gp.index);
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, [join, onStart]);

  const update = (seat, patch) => setRoom((r) => ({ ...r, seats: r.seats.map((p, i) => (i === seat ? { ...p, ...patch } : p)) }));
  const remove = (seat) => setRoom((r) => ({ ...r, seats: r.seats.map((p, i) => (i === seat ? null : p)) }));
  const setS = (patch) => setRoom((r) => ({ ...r, settings: { ...r.settings, ...patch } }));
  const players = seats.filter(Boolean);
  const ranked = players.filter((p) => room.wins[p.id]).sort((a, b) => room.wins[b.id] - room.wins[a.id]);

  return (
    <div className="dd-room">
      <header className="dd-head">
        <h1>
          <span aria-hidden="true">🦖</span> Dino Dash Duel
        </h1>
        <p>A running game for 1 or 2 players. Join, pick your dino, choose a mode and go!</p>
      </header>

      <section className="dd-slots" aria-label="Players">
        {seats.map((p, i) =>
          p ? (
            <PlayerCard
              key={p.id}
              controls={settings.controls}
              p={p}
              i={i}
              other={seats[1 - i]}
              wins={room.wins[p.id] || 0}
              onChange={(patch) => update(i, patch)}
              onRemove={() => remove(i)}
            />
          ) : (
            <EmptySlot
              key={`e${i}`}
              i={i}
              touch={touch}
              onKeys={() => join(i, { scheme: SEAT_SCHEME[i] })}
              onTouch={() => {
                unlockAudio();
                join(i, { scheme: "touch" });
              }}
              onBot={() => join(i, { scheme: "bot" })}
            />
          ),
        )}
      </section>

      <section className="dd-panel">
        <h2>Game mode</h2>
        <div className="dd-modes">
          {Object.values(MODES).map((m) => (
            <button key={m.id} className={`dd-mode ${settings.mode === m.id ? "on" : ""}`} onClick={() => setS({ mode: m.id })}>
              <span className="dd-mode-icon">{m.icon}</span>
              <b>{m.name}</b>
              <span>{m.blurb}</span>
            </button>
          ))}
        </div>
        <div className="dd-opts">
          {settings.mode === "race" && (
            <label>
              Race length
              <div className="dd-seg">
                {Object.entries(RACE_LENGTHS).map(([k, m]) => (
                  <button key={k} className={settings.raceLength === k ? "on" : ""} onClick={() => setS({ raceLength: k })}>
                    {k[0].toUpperCase() + k.slice(1)} · {m} m
                  </button>
                ))}
              </div>
            </label>
          )}
          {settings.mode === "coins" && (
            <label>
              Time
              <div className="dd-seg">
                {[45, 60, 90].map((n) => (
                  <button key={n} className={Number(settings.coinTime) === n ? "on" : ""} onClick={() => setS({ coinTime: n })}>
                    {n} s
                  </button>
                ))}
              </div>
            </label>
          )}
          <label>
            Controls
            <div className="dd-seg">
              {[
                ["simple", "⤒ Jump only"],
                ["full", "🎮 Jump + faster / slower + duck"],
              ].map(([k, l]) => (
                <button key={k} className={(settings.controls || "simple") === k ? "on" : ""} onClick={() => setS({ controls: k })}>
                  {l}
                </button>
              ))}
            </div>
          </label>
          <label>
            {settings.mode === "endless" ? "Starting speed" : "Speed"}
            <div className="dd-seg">
              {[
                ["chill", "🐢 Chill"],
                ["normal", "🦖 Normal"],
                ["turbo", "🚀 Turbo"],
              ].map(([k, l]) => (
                <button key={k} className={settings.pace === k ? "on" : ""} onClick={() => setS({ pace: k })}>
                  {l}
                </button>
              ))}
            </div>
          </label>
          {count === 2 && (
            <label>
              Screen
              <div className="dd-seg">
                {[
                  ["auto", "Auto"],
                  ["table", "📱 Face to face"],
                  ["stack", "🖥️ Top & bottom"],
                ].map(([k, l]) => (
                  <button key={k} className={settings.layout === k ? "on" : ""} onClick={() => setS({ layout: k })}>
                    {l}
                  </button>
                ))}
              </div>
            </label>
          )}
        </div>
        {settings.mode === "endless" && room.record && (
          <p className="dd-record">
            🏅 Best ever: <b>{room.record.m} m</b> by {room.record.name}
          </p>
        )}
        <button className="dd-start" disabled={!canStart} onClick={onStart}>
          {canStart ? `▶ Start ${MODES[settings.mode].name}!` : need === 2 ? "Need 2 players (or add a robot player)" : "Join to play"}
        </button>
        {canStart && <p className="dd-hint">or press Enter</p>}
      </section>

      {room.rounds > 0 && (
        <section className="dd-panel">
          <h2>
            Scoreboard · {room.rounds} round{room.rounds === 1 ? "" : "s"} played
          </h2>
          {ranked.length ? (
            <ol className="dd-board">
              {ranked.map((p) => (
                <li key={p.id} style={{ "--pc": colorHex(p.color) }}>
                  <span className="dd-dot" /> {p.name} <b>🏆 {room.wins[p.id]}</b>
                </li>
              ))}
            </ol>
          ) : (
            <p>No wins yet.</p>
          )}
          <button className="dd-link" onClick={() => setRoom((r) => ({ ...r, wins: {}, rounds: 0 }))}>
            Reset scoreboard
          </button>
        </section>
      )}

      <section className="dd-panel dd-how">
        <h2>How to play</h2>
        <ul>
          <li>
            <b>Jump</b> over rocks, stumps, spiky bushes and bats. Hold it for a big jump, tap it for a small hop. Your dino runs by
            itself.
          </li>
          <li>
            <b>Controls</b>: "Jump only" is the standard race. "Jump + faster / slower + duck" adds <b>▶ faster</b> and{" "}
            <b>◀ slower</b> (going fast uses your ⚡ boost bar, which refills when you stop) and <b>▼ duck</b> (under bats at head
            height, or to drop faster in the air).
          </li>
          <li>
            Every crash makes you stumble and costs a life ❤️. Each dino can have 1, 2 or 3 lives, or <b>∞</b> to never run out (the
            race always goes on to the finish). With ∞ in Endless, pause and press "Finish now" to end.
          </li>
          <li>
            <b>On a computer:</b> Player 1 (top screen) jumps with <kbd>Z</kbd> (or press 🎯 Change jump key on your card to
            pick any key), and with full controls uses <kbd>A</kbd> slower,{" "}
            <kbd>D</kbd> faster, <kbd>S</kbd> duck. Player 2 (bottom screen) jumps with <kbd>/</kbd>, and uses <kbd>K</kbd> or{" "}
            <kbd>←</kbd> slower, <kbd>;</kbd> or <kbd>→</kbd> faster, <kbd>L</kbd> or <kbd>↓</kbd> duck.
          </li>
          <li>
            🤖 <b>Robot player</b> means the computer plays that dino for you — only add one if you want to play against the computer.
          </li>
          <li>
            <b>On a phone or tablet:</b> lay it flat between you and sit on opposite sides. The screen splits in two and the top half is
            turned around for the player sitting across, each with their own buttons.
          </li>
          <li>Pause with Esc or P.</li>
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- touch buttons
function TouchPad({ idx, input, full }) {
  const bind = (action) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      e.currentTarget.classList.add("down");
      input.setTouch(idx, action, true);
    },
    onPointerUp: (e) => {
      e.currentTarget.classList.remove("down");
      input.setTouch(idx, action, false);
    },
    onPointerCancel: (e) => {
      e.currentTarget.classList.remove("down");
      input.setTouch(idx, action, false);
    },
    onContextMenu: (e) => e.preventDefault(),
  });
  return (
    full ? (
      <div className="dd-pad">
        <div className="dd-pad-group">
          <button {...bind("back")} aria-label="Slower">
            ◀
          </button>
          <button {...bind("fwd")} aria-label="Faster">
            ▶
          </button>
        </div>
        <div className="dd-pad-group">
          <button {...bind("duck")} aria-label="Duck">
            ▼
          </button>
          <button className="dd-jump" {...bind("jump")} aria-label="Jump">
            ⤒ Jump
          </button>
        </div>
      </div>
    ) : (
      <div className="dd-pad simple">
        <button className="dd-jump" {...bind("jump")} aria-label="Jump">
          ⤒ JUMP
        </button>
      </div>
    )
  );
}

// ---------------------------------------------------------------- game
function pickLayout(players, layout) {
  if (players.length < 2) return "single";
  if (layout === "table" || layout === "stack") return layout;
  return players.some((p) => p.scheme === "touch") ? "table" : "stack";
}

function Game({ players, settings, onDone, onQuit, muted, setMutedState }) {
  const wrapRef = useRef(null);
  const canvasRefs = useRef([]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const stateRef = useRef(null);
  const inputRef = useRef(null);
  if (!inputRef.current) inputRef.current = createInput(players);
  const input = inputRef.current;
  const layout = pickLayout(players, settings.layout);

  useEffect(() => () => input.destroy(), [input]);

  useEffect(() => {
    const state = createGame({ players, settings });
    stateRef.current = state;
    const views = players.map((_, i) => {
      const cv = canvasRefs.current[i];
      return { cv, ctx: cv.getContext("2d"), w: 0, h: 0, dpr: 1 };
    });
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      for (const v of views) {
        // clientWidth/Height ignore the 180° turn of the top view
        v.w = v.cv.clientWidth;
        v.h = v.cv.clientHeight;
        v.dpr = dpr;
        v.cv.width = Math.round(v.w * dpr);
        v.cv.height = Math.round(v.h * dpr);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    views.forEach((v) => ro.observe(v.cv));

    const onKey = (e) => {
      if (e.code === "Escape" || e.code === "KeyP") setPaused((v) => !v);
    };
    window.addEventListener("keydown", onKey);

    let raf;
    let last = performance.now();
    let doneSent = false;
    const frame = (now) => {
      let dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) {
        const inputs = players.map((p, i) => input.read(p, i));
        input.endFrame();
        while (dt > 0) {
          const h = Math.min(dt, 1 / 120);
          step(state, h, inputs);
          playEvents(state.events);
          dt -= h;
        }
      }
      let viewW = Infinity;
      views.forEach((v, i) => {
        if (!v.w || !v.h) return;
        v.ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
        viewW = Math.min(viewW, drawView(v.ctx, state, state.players[i], v.w, v.h, now / 1000));
      });
      if (viewW < Infinity) state.viewW = viewW;
      if (state.phase === "done" && !doneSent) {
        doneSent = true;
        setTimeout(() => onDone(state.results), 1400);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
    };
    // one game per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else wrapRef.current?.requestFullscreen?.().catch(() => {});
  };

  // top-to-bottom order of the views
  const order = layout === "table" ? [1, 0] : players.map((_, i) => i);
  const view = (i, pos) => {
    const p = players[i];
    const flipped = layout === "table" && pos === 0 && p.scheme !== "bot";
    return (
      <div key={p.id} className={`dd-view ${flipped ? "flipped" : ""}`} style={{ "--pc": colorHex(p.color) }}>
        <canvas ref={(el) => (canvasRefs.current[i] = el)} className="dd-canvas" />
        {p.scheme === "touch" && <TouchPad idx={i} input={input} full={settings.controls === "full"} />}
      </div>
    );
  };
  const bar = (
    <div className="dd-midbar">
      <button onClick={() => setPaused(true)} aria-label="Pause">
        ⏸
      </button>
      <button onClick={() => setMutedState(!muted)} aria-label={muted ? "Sound on" : "Sound off"}>
        {muted ? "🔇" : "🔊"}
      </button>
      {document.fullscreenEnabled && (
        <button onClick={fullscreen} aria-label="Full screen">
          ⛶
        </button>
      )}
    </div>
  );

  return (
    <div className={`dd-game dd-layout-${layout}`} ref={wrapRef}>
      {order.length === 1 ? (
        <>
          {bar}
          {view(order[0], 0)}
        </>
      ) : (
        <>
          {view(order[0], 0)}
          {bar}
          {view(order[1], 1)}
        </>
      )}
      {paused && (
        <div className="dd-overlay">
          <div className="dd-card">
            <h2>Paused</h2>
            <button className="dd-start" onClick={() => setPaused(false)}>
              ▶ Keep playing
            </button>
            <button
              className="dd-btn2"
              onClick={() => {
                if (stateRef.current) finishNow(stateRef.current);
                setPaused(false);
              }}
            >
              🏁 Finish now (see who won)
            </button>
            <button className="dd-btn2" onClick={onQuit}>
              🏠 Back to the room
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- results
const MEDAL = ["🥇", "🥈"];

function Results({ results, mode, newRecord, onAgain, onRoom }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        onAgain();
      } else if (e.code === "Escape") onRoom();
    };
    // wait a moment so a held key doesn't skip this screen
    const t = setTimeout(() => window.addEventListener("keydown", onKey), 700);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onAgain, onRoom]);
  const winners = results.filter((r) => r.place === 1);
  const solo = results.length === 1;
  const title = solo ? `${results[0].best} m!` : winners.length > 1 ? "It's a tie!" : `${winners[0]?.name} wins!`;
  return (
    <div className="dd-overlay dd-results">
      <div className="dd-card wide">
        <div className="dd-res-mode">
          {MODES[mode].icon} {MODES[mode].name}
        </div>
        <h2>{title}</h2>
        {newRecord && <div className="dd-newrec">🏅 New best ever!</div>}
        <div className="dd-winner-pics">
          {winners.map((w) => (
            <DinoPreview key={w.id} species={w.species} color={w.color} hat={w.hat === "none" ? "crown" : w.hat} size={110} />
          ))}
        </div>
        <ol className="dd-res-list">
          {results.map((r) => (
            <li key={r.id} style={{ "--pc": colorHex(r.color) }}>
              <span className="dd-medal">{solo ? "🦖" : MEDAL[r.place - 1]}</span>
              <span className="dd-res-name">{r.name}</span>
              <span className="dd-res-main">{r.main}</span>
              <span className="dd-res-extra">{r.extra}</span>
            </li>
          ))}
        </ol>
        <div className="dd-res-btns">
          <button className="dd-start" onClick={onAgain}>
            🔁 Play again
          </button>
          <button className="dd-btn2" onClick={onRoom}>
            🏠 Back to the room
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- app
export default function DinoDashApp() {
  const [room, setRoom] = useState(loadRoom);
  const [screen, setScreen] = useState("room"); // room | game | results
  const [round, setRound] = useState(0);
  const [results, setResults] = useState(null);
  const [newRecord, setNewRecord] = useState(false);
  const [playing, setPlaying] = useState(null); // players + settings frozen for the round

  useEffect(() => saveRoom(room), [room]);
  useEffect(() => setMuted(room.muted), [room.muted]);

  const roomRef = useRef(room);
  roomRef.current = room;

  const start = useCallback(() => {
    const r = roomRef.current;
    const players = r.seats.filter(Boolean);
    if (players.length < minPlayers(r.settings.mode)) return;
    unlockAudio();
    setPlaying({ players, settings: r.settings });
    setRound((n) => n + 1);
    setScreen("game");
  }, []);

  const done = useCallback((res) => {
    setResults(res);
    const r = roomRef.current;
    let rec = false;
    let record = r.record;
    if (r.settings.mode === "endless") {
      const top = [...res].sort((a, b) => b.best - a.best)[0];
      if (top && top.best > (record?.m || 0)) {
        record = { m: top.best, name: top.name };
        rec = true;
      }
    }
    setNewRecord(rec);
    setRoom((x) => {
      const wins = { ...x.wins };
      if (res.length > 1) for (const it of res) if (it.place === 1) wins[it.id] = (wins[it.id] || 0) + 1;
      return { ...x, wins, record, rounds: x.rounds + (res.length > 1 ? 1 : 0) };
    });
    setScreen("results");
  }, []);

  const toRoom = useCallback(() => setScreen("room"), []);

  return (
    <div className={`dd-app dd-screen-${screen}`}>
      {screen === "room" && <Room room={room} setRoom={setRoom} onStart={start} />}
      {screen !== "room" && playing && (
        <Game
          key={round}
          players={playing.players}
          settings={playing.settings}
          onDone={done}
          onQuit={toRoom}
          muted={room.muted}
          setMutedState={(m) => setRoom((r) => ({ ...r, muted: m }))}
        />
      )}
      {screen === "results" && results && (
        <Results results={results} mode={playing.settings.mode} newRecord={newRecord} onAgain={start} onRoom={toRoom} />
      )}
    </div>
  );
}
