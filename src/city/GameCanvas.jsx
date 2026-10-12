import React, { useEffect, useRef } from "react";
import { draw, screenToGrid, centerCamera } from "./render.js";
import { ALL_TOOLS } from "./defs.js";
import { previewTool } from "./sim.js";

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.6;
const TAP_SLOP = 9;

// The map canvas. Owns camera + pointer handling; the parent owns the world.
// One finger: build with the current tool (or pan/tap with Inspect).
// Two fingers: pan + pinch zoom. Mouse: right/middle drag pans, wheel zooms.
export default function GameCanvas({ worldRef, analysisRef, camRef, dirtyRef, tool, overlay, selected, onApply, onInspect, onPreview }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const previewRef = useRef(null);
  const propsRef = useRef({});
  propsRef.current = { tool, overlay, selected, onApply, onInspect, onPreview };

  useEffect(() => {
    dirtyRef.current = true;
  }, [tool, overlay, selected, dirtyRef]);

  // Resize + render loop
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
      const old = sizeRef.current;
      if (first || !camRef.current.init) {
        camRef.current.zoom = camRef.current.zoom || Math.max(0.4, Math.min(0.8, r.width / 1900));
        centerCamera(camRef.current, r.width, r.height);
        camRef.current.init = true;
        first = false;
      } else {
        // keep the same map point centred
        camRef.current.x += (r.width - old.width) / 2;
        camRef.current.y += (r.height - old.height) / 2;
      }
      sizeRef.current = { width: r.width, height: r.height, dpr };
      dirtyRef.current = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf;
    let last = 0;
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      if (!dirtyRef.current && t - last < 120) return;
      dirtyRef.current = false;
      last = t;
      const { width, height, dpr } = sizeRef.current;
      draw(ctx, worldRef.current, analysisRef.current, camRef.current, {
        width,
        height,
        dpr,
        overlay: propsRef.current.overlay,
        preview: previewRef.current,
        selected: propsRef.current.selected,
        time: t,
      });
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [worldRef, analysisRef, camRef, dirtyRef]);

  // Pointer handling
  useEffect(() => {
    const canvas = canvasRef.current;
    const pointers = new Map();
    let gesture = null; // { kind: 'build'|'pan'|'tap'|'pinch', ... }

    const local = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const setPreview = (p) => {
      previewRef.current = p;
      propsRef.current.onPreview?.(p);
      dirtyRef.current = true;
    };
    const zoomAt = (sx, sy, factor) => {
      const cam = camRef.current;
      const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom * factor));
      const f = nz / cam.zoom;
      cam.x = sx - (sx - cam.x) * f;
      cam.y = sy - (sy - cam.y) * f;
      cam.zoom = nz;
      dirtyRef.current = true;
    };

    const startPinch = () => {
      const [a, b] = [...pointers.values()];
      gesture = { kind: "pinch", dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      setPreview(null);
    };

    const down = (e) => {
      canvas.setPointerCapture?.(e.pointerId);
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (pointers.size === 2) return startPinch();
      if (pointers.size > 2) return;
      const toolId = propsRef.current.tool;
      const tool = ALL_TOOLS[toolId];
      const g = screenToGrid(camRef.current, p.x, p.y);
      if (e.button === 1 || e.button === 2 || !tool || tool.mode === "inspect") {
        gesture = { kind: "tap", start: p, last: p, grid: g, panOnly: e.button === 1 || e.button === 2 };
      } else {
        gesture = { kind: "build", start: p, a: g, b: g, toolId };
        setPreview(previewTool(worldRef.current, toolId, g, g));
      }
    };

    const move = (e) => {
      const p = local(e);
      if (!pointers.has(e.pointerId)) {
        // mouse hover: show placement ghost for buildings
        const tool = ALL_TOOLS[propsRef.current.tool];
        if (e.pointerType === "mouse" && tool && tool.mode === "place") {
          const g = screenToGrid(camRef.current, p.x, p.y);
          const cur = previewRef.current;
          if (!cur || cur.hover?.x !== g.x || cur.hover?.y !== g.y) setPreview({ ...previewTool(worldRef.current, tool.id, g, g), hover: g });
        }
        return;
      }
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, p);
      if (!gesture) return;
      const cam = camRef.current;
      if (gesture.kind === "pinch" && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        cam.x += mid.x - gesture.mid.x;
        cam.y += mid.y - gesture.mid.y;
        if (gesture.dist > 10) zoomAt(mid.x, mid.y, dist / gesture.dist);
        gesture.dist = dist;
        gesture.mid = mid;
        dirtyRef.current = true;
      } else if (gesture.kind === "tap" || gesture.kind === "pan") {
        if (gesture.kind === "tap" && Math.hypot(p.x - gesture.start.x, p.y - gesture.start.y) > TAP_SLOP) gesture.kind = "pan";
        if (gesture.kind === "pan") {
          cam.x += p.x - prev.x;
          cam.y += p.y - prev.y;
          dirtyRef.current = true;
        }
      } else if (gesture.kind === "build") {
        const g = screenToGrid(cam, p.x, p.y);
        if (g.x !== gesture.b.x || g.y !== gesture.b.y) {
          gesture.b = g;
          const tool = ALL_TOOLS[gesture.toolId];
          setPreview(previewTool(worldRef.current, gesture.toolId, tool.mode === "place" ? g : gesture.a, g));
        }
      }
    };

    const up = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (!gesture) return;
      if (gesture.kind === "pinch") {
        if (pointers.size === 0) gesture = null;
        else gesture = { kind: "pan-after-pinch" }; // ignore the remaining finger
        return;
      }
      if (e.type === "pointercancel") {
        gesture = null;
        setPreview(null);
        return;
      }
      if (gesture.kind === "tap" && !gesture.panOnly) propsRef.current.onInspect(gesture.grid);
      if (gesture.kind === "build") {
        const tool = ALL_TOOLS[gesture.toolId];
        propsRef.current.onApply(gesture.toolId, tool.mode === "place" ? gesture.b : gesture.a, gesture.b);
        setPreview(null);
      }
      gesture = null;
    };

    const wheel = (e) => {
      e.preventDefault();
      const p = local(e);
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015));
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
  }, [worldRef, camRef, dirtyRef]);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="block touch-none select-none" />
    </div>
  );
}

export function zoomBy(camRef, dirtyRef, factor, width, height) {
  const cam = camRef.current;
  const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom * factor));
  const f = nz / cam.zoom;
  cam.x = width / 2 - (width / 2 - cam.x) * f;
  cam.y = height / 2 - (height / 2 - cam.y) * f;
  cam.zoom = nz;
  dirtyRef.current = true;
}
