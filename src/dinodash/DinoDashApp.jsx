import React, { useEffect, useRef, useState, useCallback } from "react";
import { MODES, COLORS, HATS, RACE_LENGTHS, createGame, step } from "./engine.js";
import { drawGame, drawDino } from "./render.js";
import { createInput, schemeForCode, schemeLabel, schemeHelp, KEY_SCHEMES, SCHEMES } from "./input.js";
import { playEvents, unlockAudio, setMuted } from "./sfx.js";

const STORE = "dinodash-room-v1";
const MAX = 4;
const DEFAULT_SETTINGS = { mode: "race", raceLength: "short", lives: 3, coinTime: 60, pace: "normal" };
const BOT_NAMES = ["Rexy", "Spike", "Dotty", "Zoom", "Pebbles", "Chomp"];

function loadRoom() {
  try {
    const r = JSON.parse(localStorage.getItem(STORE));
    if (r && Array.isArray(r.players)) {
      return {
        players: r.players.slice(0, MAX),
        settings: { ...DEFAULT_SETTINGS, ...r.settings },
        wins: r.wins || {},
        rounds: r.rounds || 0,
        muted: !!r.muted,
      };
    }
  } catch {
    /* ignore */
  }
  return { players: [], settings: DEFAULT_SETTINGS, wins: {}, rounds: 0, muted: false };
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

function freeColor(players) {
  return (COLORS.find((c) => !players.some((p) => p.color === c.id)) || COLORS[0]).id;
}

// ---------------------------------------------------------------- dino picture
function DinoPreview({ color, hat, size = 96, running = true }) {
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
      const s = (size / 80) * dpr;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      // drawDino draws relative to GROUND (138) — move it into view
      ctx.translate(14, 72 - 138);
      const hop = running ? Math.max(0, Math.sin(t * 3)) * 8 : 0;
      drawDino(ctx, 0, 138 - hop, colorHex(color), hat, { phase: running ? t * 12 : 0, air: hop > 1, height: hop });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [color, hat, size, running]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden="true" />;
}

// ---------------------------------------------------------------- room (lobby)
function PlayerCard({ p, i, players, wins, onChange, onRemove }) {
  return (
    <div className="dd-slot dd-filled" style={{ "--pc": colorHex(p.color) }}>
      <div className="dd-slot-top">
        <span className="dd-pnum">P{i + 1}</span>
        <button className="dd-x" onClick={onRemove} aria-label={`Remove ${p.name}`}>
          ✕
        </button>
      </div>
      <div className="dd-preview">
        <DinoPreview color={p.color} hat={p.hat} />
        {wins > 0 && <span className="dd-wins">🏆 {wins}</span>}
      </div>
      <input
        className="dd-name"
        value={p.name}
        maxLength={12}
        onChange={(e) => onChange({ name: e.target.value })}
        onBlur={(e) => !e.target.value.trim() && onChange({ name: `Player ${i + 1}` })}
        aria-label="Name"
      />
      <div className="dd-swatches" role="group" aria-label="Colour">
        {COLORS.map((c) => {
          const taken = players.some((q) => q !== p && q.color === c.id);
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
      <div className="dd-ctrl">
        <b>{schemeLabel(p)}</b>
        <span>{schemeHelp(p)}</span>
        {p.scheme === "bot" && (
          <div className="dd-seg small">
            {["easy", "normal", "hard"].map((s) => (
              <button key={s} className={p.botSkill === s ? "on" : ""} onClick={() => onChange({ botSkill: s })}>
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptySlot({ i, freeKeys, onTouch, onBot }) {
  return (
    <div className="dd-slot dd-empty">
      <span className="dd-pnum">P{i + 1}</span>
      <div className="dd-join">Join the room!</div>
      <p className="dd-join-help">
        Press a jump key:{" "}
        {freeKeys.map((k) => (
          <kbd key={k}>{{ wasd: "W", arrows: "↑", ijkl: "I", numpad: "Num 8" }[k]}</kbd>
        ))}
        <br />
        or press <kbd>A</kbd> on a game controller
      </p>
      <div className="dd-join-btns">
        <button onClick={onTouch}>👆 Touch buttons</button>
        <button onClick={onBot}>🤖 Computer</button>
      </div>
    </div>
  );
}

function Room({ room, setRoom, onStart }) {
  const { players, settings } = room;
  const roomRef = useRef(room);
  roomRef.current = room;

  const addPlayer = useCallback(
    (extra) => {
      setRoom((r) => {
        if (r.players.length >= MAX) return r;
        const n = r.players.length + 1;
        const isBot = extra.scheme === "bot";
        const botName = BOT_NAMES.find((b) => !r.players.some((p) => p.name === b)) || `Bot ${n}`;
        const p = {
          id: newId(),
          name: isBot ? botName : `Player ${n}`,
          color: freeColor(r.players),
          hat: HATS[r.players.length % HATS.length].id,
          botSkill: "normal",
          ...extra,
        };
        return { ...r, players: [...r.players, p] };
      });
    },
    [setRoom],
  );

  // join by pressing a key / controller button
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.code === "Enter" && roomRef.current.players.length >= 2) {
        e.preventDefault();
        onStart();
        return;
      }
      const s = schemeForCode(e.code);
      if (!s) return;
      e.preventDefault();
      if (roomRef.current.players.some((p) => p.scheme === s)) return;
      unlockAudio();
      addPlayer({ scheme: s });
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
          if (!roomRef.current.players.some((p) => p.scheme === "pad" && p.pad === gp.index)) addPlayer({ scheme: "pad", pad: gp.index });
          else if (gp.buttons[9]?.pressed && roomRef.current.players.length >= 2) onStart();
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
  }, [addPlayer, onStart]);

  const update = (id, patch) => setRoom((r) => ({ ...r, players: r.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const remove = (id) => setRoom((r) => ({ ...r, players: r.players.filter((p) => p.id !== id) }));
  const setS = (patch) => setRoom((r) => ({ ...r, settings: { ...r.settings, ...patch } }));
  const freeKeys = KEY_SCHEMES.filter((k) => !players.some((p) => p.scheme === k));
  const slots = [];
  for (let i = 0; i < MAX; i++) slots.push(players[i]);
  const ranked = [...players].filter((p) => room.wins[p.id]).sort((a, b) => room.wins[b.id] - room.wins[a.id]);

  return (
    <div className="dd-room">
      <header className="dd-head">
        <h1>
          <span aria-hidden="true">🦖</span> Dino Dash Party
        </h1>
        <p>A running game for 2 to 4 players. Join the game room, pick your dino, choose a mode and go!</p>
      </header>

      <section className="dd-slots" aria-label="Players">
        {slots.map((p, i) =>
          p ? (
            <PlayerCard
              key={p.id}
              p={p}
              i={i}
              players={players}
              wins={room.wins[p.id] || 0}
              onChange={(patch) => update(p.id, patch)}
              onRemove={() => remove(p.id)}
            />
          ) : (
            <EmptySlot
              key={`e${i}`}
              i={i}
              freeKeys={freeKeys}
              onTouch={() => {
                unlockAudio();
                addPlayer({ scheme: "touch" });
              }}
              onBot={() => addPlayer({ scheme: "bot" })}
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
          {settings.mode === "survival" && (
            <label>
              Lives
              <div className="dd-seg">
                {[1, 3, 5].map((n) => (
                  <button key={n} className={Number(settings.lives) === n ? "on" : ""} onClick={() => setS({ lives: n })}>
                    {"❤️".repeat(n === 5 ? 1 : n)}
                    {n === 5 ? " ×5" : ""}
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
            Speed
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
        </div>
        <button className="dd-start" disabled={players.length < 2} onClick={onStart}>
          {players.length < 2 ? `Need ${2 - players.length} more player${players.length === 1 ? "" : "s"}` : `▶ Start ${MODES[settings.mode].name}!`}
        </button>
        {players.length >= 2 && <p className="dd-hint">or press Enter (Start on a controller)</p>}
      </section>

      {room.rounds > 0 && (
        <section className="dd-panel">
          <h2>Room scoreboard · {room.rounds} round{room.rounds === 1 ? "" : "s"} played</h2>
          {ranked.length ? (
            <ol className="dd-board">
              {ranked.map((p) => (
                <li key={p.id} style={{ "--pc": colorHex(p.color) }}>
                  <span className="dd-dot" /> {p.name} <b>🏆 {room.wins[p.id]}</b>
                </li>
              ))}
            </ol>
          ) : (
            <p>No wins yet for the players in the room.</p>
          )}
          <button
            className="dd-link"
            onClick={() => setRoom((r) => ({ ...r, wins: {}, rounds: 0 }))}
          >
            Reset scoreboard
          </button>
        </section>
      )}

      <section className="dd-panel dd-how">
        <h2>How to play</h2>
        <ul>
          <li>
            <b>▶ Faster / ◀ Slower</b> — move your dino forward and back. Going fast uses your ⚡ boost bar (it refills when you stop
            boosting).
          </li>
          <li>
            <b>Jump</b> over rocks, stumps and spiky bushes. Hold jump for a big jump, tap it for a small hop.
          </li>
          <li>
            <b>Duck</b> under bats flying at head height (or jump over them). Duck in the air to land faster.
          </li>
          <li>Everyone gets the same course, so it's fair. See-through dinos show where the others are.</li>
          <li>
            Keyboard sets: {KEY_SCHEMES.map((k) => SCHEMES[k].label).join(", ")}. Up to 4 game controllers work too. On a phone or
            tablet, choose Touch buttons (turn it sideways for more room).
          </li>
          <li>Pause with Esc or P.</li>
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- touch buttons
function TouchPad({ p, idx, input }) {
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
    <div className="dd-pad" style={{ "--pc": colorHex(p.color) }}>
      <div className="dd-pad-name">{p.name}</div>
      <div className="dd-pad-row">
        <button {...bind("back")} aria-label="Slower">
          ◀
        </button>
        <button {...bind("fwd")} aria-label="Faster">
          ▶
        </button>
        <button {...bind("duck")} aria-label="Duck">
          ▼
        </button>
        <button className="dd-jump" {...bind("jump")} aria-label="Jump">
          ⤒
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- game
function Game({ room, onDone, onQuit, muted, setMutedState }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const inputRef = useRef(null);
  if (!inputRef.current) inputRef.current = createInput();
  const input = inputRef.current;

  useEffect(() => () => input.destroy(), [input]);

  useEffect(() => {
    const state = createGame(room);
    const cv = canvasRef.current;
    const ctx = cv.getContext("2d");
    let raf;
    let last = performance.now();
    let doneSent = false;
    let size = { w: 0, h: 0 };

    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      size = { w: r.width, h: r.height, dpr };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    const onKey = (e) => {
      if (e.code === "Escape" || e.code === "KeyP") setPaused((v) => !v);
    };
    window.addEventListener("keydown", onKey);

    const frame = (now) => {
      let dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) {
        const inputs = room.players.map((p, i) => input.read(p, i));
        // small fixed steps keep jumps the same on every screen
        while (dt > 0) {
          const h = Math.min(dt, 1 / 120);
          step(state, h, inputs);
          playEvents(state.events);
          dt -= h;
        }
      }
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      drawGame(ctx, state, size.w, size.h, now / 1000);
      if (state.phase === "done" && !doneSent) {
        doneSent = true;
        setTimeout(() => onDone(state.results), 400);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
    };
    // the game is created once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const touchers = room.players.map((p, i) => ({ p, i })).filter((x) => x.p.scheme === "touch");
  const fullscreen = () => {
    const el = wrapRef.current;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el?.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="dd-game" ref={wrapRef}>
      <div className="dd-canvas-wrap">
        <canvas ref={canvasRef} className="dd-canvas" />
        <div className="dd-game-btns">
          <button onClick={() => setPaused(true)} aria-label="Pause">
            ⏸
          </button>
          <button
            onClick={() => {
              setMutedState(!muted);
            }}
            aria-label={muted ? "Sound on" : "Sound off"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          {document.fullscreenEnabled && (
            <button onClick={fullscreen} aria-label="Full screen">
              ⛶
            </button>
          )}
        </div>
        {paused && (
          <div className="dd-overlay">
            <div className="dd-card">
              <h2>Paused</h2>
              <button className="dd-start" onClick={() => setPaused(false)}>
                ▶ Keep playing
              </button>
              <button className="dd-btn2" onClick={onQuit}>
                🚪 Back to the room
              </button>
            </div>
          </div>
        )}
      </div>
      {touchers.length > 0 && (
        <div className={`dd-pads n${touchers.length}`}>
          {touchers.map(({ p, i }) => (
            <TouchPad key={p.id} p={p} idx={i} input={input} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- results
const MEDAL = ["🥇", "🥈", "🥉", "4️⃣"];

function Results({ results, mode, onAgain, onRoom }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        onAgain();
      } else if (e.code === "Escape") onRoom();
    };
    // wait a moment so a held jump key doesn't skip this screen
    const t = setTimeout(() => window.addEventListener("keydown", onKey), 700);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onAgain, onRoom]);
  const winners = results.filter((r) => r.place === 1);
  return (
    <div className="dd-overlay dd-results">
      <div className="dd-card wide">
        <div className="dd-res-mode">
          {MODES[mode].icon} {MODES[mode].name}
        </div>
        <h2>{winners.length > 1 ? "It's a tie!" : `${winners[0]?.name} wins!`}</h2>
        <div className="dd-winner-pics">
          {winners.map((w) => (
            <DinoPreview key={w.id} color={w.color} hat={w.hat === "none" ? "crown" : w.hat} size={110} />
          ))}
        </div>
        <ol className="dd-res-list">
          {results.map((r) => (
            <li key={r.id} style={{ "--pc": colorHex(r.color) }}>
              <span className="dd-medal">{MEDAL[r.place - 1]}</span>
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

  useEffect(() => saveRoom(room), [room]);
  useEffect(() => setMuted(room.muted), [room.muted]);

  const start = useCallback(() => {
    unlockAudio();
    setRound((r) => r + 1);
    setScreen("game");
  }, []);

  const done = useCallback((res) => {
    setResults(res);
    setRoom((r) => {
      const wins = { ...r.wins };
      for (const x of res) if (x.place === 1) wins[x.id] = (wins[x.id] || 0) + 1;
      return { ...r, wins, rounds: r.rounds + 1 };
    });
    setScreen("results");
  }, []);

  const toRoom = useCallback(() => setScreen("room"), []);

  return (
    <div className={`dd-app dd-screen-${screen}`}>
      {screen === "room" && <Room room={room} setRoom={setRoom} onStart={start} />}
      {screen !== "room" && (
        <Game
          key={round}
          room={room}
          onDone={done}
          onQuit={toRoom}
          muted={room.muted}
          setMutedState={(m) => setRoom((r) => ({ ...r, muted: m }))}
        />
      )}
      {screen === "results" && results && <Results results={results} mode={room.settings.mode} onAgain={start} onRoom={toRoom} />}
    </div>
  );
}
