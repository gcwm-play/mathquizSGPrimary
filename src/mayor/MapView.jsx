import React, { useEffect, useRef } from "react";
import { draw, screenToWorld, worldToScreen, centerOn, createRenderer, HANDLE_R } from "./render.js";
import { MAP } from "./regions.js";

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.6;
const TAP_SLOP = 10;

function clampCam(cam, width, height) {
  const c = screenToWorld(cam, width / 2, height / 2);
  const x = Math.max(-2, Math.min(MAP + 2, c.x));
  const y = Math.max(-2, Math.min(MAP + 2, c.y));
  if (x !== c.x || y !== c.y) centerOn(cam, width, height, x, y);
}

export function zoomAt(cam, sx, sy, factor, width, height) {
  const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom * factor));
  const f = nz / cam.zoom;
  cam.x = sx - (sx - cam.x) * f;
  cam.y = sy - (sy - cam.y) * f;
  cam.zoom = nz;
  clampCam(cam, width, height);
}

// The map. One finger moves the map (or paints with a brush tool, or drags a
// road handle); a tap acts with the current tool; two fingers pinch-zoom.
export default function MapView({ worldRef, analysisRef, camRef, dirtyRef, previewRef, sizeRef, handlesRef, tool, brush, overlay, selected, motion, paused, onTap, onBrush, onHandle, onTouchStart }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const R = useRef(null);
  const interacting = useRef(false);
  const props = useRef({});
  props.current = { tool, brush, overlay, selected, motion, paused, onTap, onBrush, onHandle, onTouchStart };
  if (!R.current) R.current = createRenderer();

  useEffect(() => {
    dirtyRef.current = true;
  }, [tool, overlay, selected, motion, dirtyRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas.getContext("2d");
    let first = true;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      const cam = camRef.current;
      const old = sizeRef.current;
      if (first && !cam.init) {
        cam.zoom = Math.max(0.55, Math.min(1.1, Math.min(r.width, r.height) / 480));
        const f = worldRef.current.focus || { x: MAP / 2, y: MAP / 2 };
        centerOn(cam, r.width, r.height, f.x, f.y);
        cam.init = true;
      } else if (old.width) {
        cam.x += (r.width - old.width) / 2;
        cam.y += (r.height - old.height) / 2;
      }
      first = false;
      sizeRef.current = { width: r.width, height: r.height, dpr };
      dirtyRef.current = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    let raf;
    let last = 0;
    let cost = 16;
    // animation clock that stands still while the game is paused
    let clock = 0;
    let prevT = null;
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const frozen = !!props.current.paused;
      if (prevT != null && !frozen) clock += Math.min(250, t - prevT);
      prevT = t;
      const animate = props.current.motion && !frozen;
      const gap = Math.min(100, Math.max(33, cost * 1.6));
      if (!dirtyRef.current && (!animate || t - last < gap) && t - last < 700) return;
      if (document.hidden) return;
      dirtyRef.current = false;
      last = t;
      const { width, height, dpr } = sizeRef.current;
      const t0 = performance.now();
      draw(ctx, R.current, worldRef.current, analysisRef.current, camRef.current, {
        width,
        height,
        dpr,
        overlay: props.current.overlay,
        preview: previewRef.current,
        selected: props.current.selected,
        time: clock,
        interacting: interacting.current,
        motion: animate,
      });
      cost = cost * 0.9 + (performance.now() - t0) * 0.1;
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [worldRef, analysisRef, camRef, dirtyRef, previewRef, sizeRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const pointers = new Map();
    let g = null;
    const local = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const world = (p) => screenToWorld(camRef.current, p.x, p.y);
    const size = () => sizeRef.current;
    const end = () => {
      interacting.current = false;
      dirtyRef.current = true;
    };
    const handleAt = (p) => {
      for (const h of handlesRef.current || []) {
        const s = worldToScreen(camRef.current, h.x, h.y);
        if (Math.hypot(s.x - p.x, s.y - p.y) < HANDLE_R * camRef.current.zoom + 16) return h.id;
      }
      return null;
    };

    const down = (e) => {
      canvas.setPointerCapture?.(e.pointerId);
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (e.pointerType !== "mouse") props.current.onTouchStart?.();
      if (pointers.size === 2) {
        if (g?.kind === "brush") props.current.onBrush("cancel");
        const [a, b] = [...pointers.values()];
        g = { kind: "pinch", dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
        interacting.current = true;
        return;
      }
      if (pointers.size > 2) return;
      if (e.pointerType === "mouse" && e.button !== 0) {
        g = { kind: "pan", start: p };
        return;
      }
      const h = handleAt(p);
      if (h) {
        g = { kind: "handle", id: h };
        return;
      }
      if (props.current.brush) {
        g = { kind: "brush" };
        props.current.onBrush("start", world(p));
        return;
      }
      g = { kind: "tap", start: p };
    };
    const move = (e) => {
      const p = local(e);
      if (!pointers.has(e.pointerId)) {
        if (e.pointerType === "mouse" && props.current.brush) props.current.onBrush("hover", world(p));
        return;
      }
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, p);
      if (!g) return;
      const cam = camRef.current;
      const { width, height } = size();
      if (g.kind === "pinch" && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        cam.x += mid.x - g.mid.x;
        cam.y += mid.y - g.mid.y;
        if (g.dist > 10) zoomAt(cam, mid.x, mid.y, dist / g.dist, width, height);
        g.dist = dist;
        g.mid = mid;
        dirtyRef.current = true;
      } else if (g.kind === "tap" || g.kind === "pan") {
        if (g.kind === "tap" && Math.hypot(p.x - g.start.x, p.y - g.start.y) > TAP_SLOP) g.kind = "pan";
        if (g.kind === "pan") {
          interacting.current = true;
          cam.x += p.x - prev.x;
          cam.y += p.y - prev.y;
          clampCam(cam, width, height);
          dirtyRef.current = true;
        }
      } else if (g.kind === "handle") {
        props.current.onHandle(g.id, world(p));
      } else if (g.kind === "brush") {
        props.current.onBrush("move", world(p));
      }
    };
    const up = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (!g) return;
      if (g.kind === "pinch") {
        if (pointers.size === 0) {
          g = null;
          end();
        } else g = { kind: "after" };
        return;
      }
      const gg = g;
      g = null;
      end();
      if (gg.kind === "after") return;
      if (e.type === "pointercancel") {
        if (gg.kind === "brush") props.current.onBrush("cancel");
        return;
      }
      if (gg.kind === "tap") props.current.onTap(world(gg.start));
      else if (gg.kind === "brush") props.current.onBrush("end");
      else if (gg.kind === "handle") props.current.onHandle(gg.id, null);
    };
    const wheel = (e) => {
      e.preventDefault();
      const p = local(e);
      const { width, height } = size();
      interacting.current = true;
      zoomAt(camRef.current, p.x, p.y, Math.exp(-e.deltaY * 0.0015), width, height);
      dirtyRef.current = true;
      clearTimeout(wheel.t);
      wheel.t = setTimeout(end, 200);
    };
    const ctxMenu = (e) => e.preventDefault();
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("contextmenu", ctxMenu);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("contextmenu", ctxMenu);
    };
  }, [camRef, dirtyRef, sizeRef, handlesRef]);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="block touch-none select-none" role="img" aria-label="Map of your region" />
    </div>
  );
}

export function lookAt(camRef, sizeRef, x, y) {
  const s = sizeRef.current;
  centerOn(camRef.current, s.width, s.height, x, y);
}
