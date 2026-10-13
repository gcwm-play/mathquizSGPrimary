import React, { useEffect, useRef } from "react";
import { draw, screenToGrid, centerCamera, createRenderer } from "./render.js";
import { ALL_TOOLS, N } from "./defs.js";
import { previewTool } from "./sim.js";
import { PX, PY } from "./art.js";

const MIN_ZOOM = 0.28;
const MAX_ZOOM = 2.4;
const TAP_SLOP = 10;

// Keep the middle of the screen over the island.
function clampCam(cam, width, height) {
  const cx = (width / 2 - cam.x) / cam.zoom;
  const cy = (height / 2 - cam.y) / cam.zoom;
  const lim = N * 32;
  const nx = Math.max(-lim, Math.min(lim, cx));
  const ny = Math.max(0, Math.min(lim, cy));
  cam.x = width / 2 - nx * cam.zoom;
  cam.y = height / 2 - ny * cam.zoom;
}

export function zoomAt(cam, sx, sy, factor, width, height) {
  const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom * factor));
  const f = nz / cam.zoom;
  cam.x = sx - (sx - cam.x) * f;
  cam.y = sy - (sy - cam.y) * f;
  cam.zoom = nz;
  clampCam(cam, width, height);
}

// The map. Touch: one finger moves the map, a tap builds or inspects, two fingers pinch.
// Mouse: left-drag builds (or pans with Look), right/middle-drag pans, wheel zooms.
export default function GameCanvas({ worldRef, analysisRef, camRef, dirtyRef, previewRef, startRef, sizeRef, tool, overlay, selected, motion, onTap, onMouseBuild, onInspect, onTouchStart }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const interactingRef = useRef(false);
  const propsRef = useRef({});
  propsRef.current = { tool, overlay, selected, motion, onTap, onMouseBuild, onInspect, onTouchStart };
  if (!rendererRef.current) rendererRef.current = createRenderer();

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
      const old = sizeRef.current;
      const cam = camRef.current;
      if (first && !cam.init) {
        cam.zoom = Math.max(0.5, Math.min(1, Math.min(r.width, r.height) / 520));
        const f = worldRef.current.focus;
        centerCamera(cam, r.width, r.height, f ? f.x : N / 2, f ? f.y : N / 2);
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
    let cost = 16; // smoothed draw time; slow devices animate at a lower frame rate
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const animate = propsRef.current.motion;
      const gap = Math.min(100, Math.max(33, cost * 1.6));
      if (!dirtyRef.current && (!animate || t - last < gap) && t - last < 700) return;
      if (document.hidden) return;
      dirtyRef.current = false;
      last = t;
      const { width, height, dpr } = sizeRef.current;
      const t0 = performance.now();
      draw(ctx, rendererRef.current, worldRef.current, analysisRef.current, camRef.current, {
        width,
        height,
        dpr,
        overlay: propsRef.current.overlay,
        preview: previewRef.current,
        startMark: startRef.current,
        selected: propsRef.current.selected,
        time: t,
        interacting: interactingRef.current,
        motion: animate,
      });
      cost = cost * 0.9 + (performance.now() - t0) * 0.1;
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [worldRef, analysisRef, camRef, dirtyRef, previewRef, startRef, sizeRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const pointers = new Map();
    let gesture = null;
    const local = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const size = () => sizeRef.current;
    const endInteract = () => {
      interactingRef.current = false;
      dirtyRef.current = true;
    };

    const down = (e) => {
      canvas.setPointerCapture?.(e.pointerId);
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (e.pointerType !== "mouse") propsRef.current.onTouchStart?.();
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        gesture = { kind: "pinch", dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
        interactingRef.current = true;
        return;
      }
      if (pointers.size > 2) return;
      const tool = ALL_TOOLS[propsRef.current.tool];
      const g = screenToGrid(camRef.current, p.x, p.y);
      const mouseBuild = e.pointerType === "mouse" && e.button === 0 && tool && tool.mode !== "inspect";
      if (mouseBuild) {
        gesture = { kind: "build", a: g, b: g, toolId: tool.id };
        previewRef.current = previewTool(worldRef.current, tool.id, g, g);
        dirtyRef.current = true;
      } else gesture = { kind: "tap", start: p, grid: g, panOnly: e.pointerType === "mouse" && e.button !== 0 };
    };

    const move = (e) => {
      const p = local(e);
      if (!pointers.has(e.pointerId)) {
        const tool = ALL_TOOLS[propsRef.current.tool];
        if (e.pointerType === "mouse" && tool && tool.mode === "place") {
          const g = screenToGrid(camRef.current, p.x, p.y);
          const cur = previewRef.current;
          if (!cur || !cur.hover || cur.hover.x !== g.x || cur.hover.y !== g.y) {
            previewRef.current = { ...previewTool(worldRef.current, tool.id, g, g), hover: g };
            dirtyRef.current = true;
          }
        }
        return;
      }
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, p);
      if (!gesture) return;
      const cam = camRef.current;
      const { width, height } = size();
      if (gesture.kind === "pinch" && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        cam.x += mid.x - gesture.mid.x;
        cam.y += mid.y - gesture.mid.y;
        if (gesture.dist > 10) zoomAt(cam, mid.x, mid.y, dist / gesture.dist, width, height);
        gesture.dist = dist;
        gesture.mid = mid;
        dirtyRef.current = true;
      } else if (gesture.kind === "tap" || gesture.kind === "pan") {
        if (gesture.kind === "tap" && Math.hypot(p.x - gesture.start.x, p.y - gesture.start.y) > TAP_SLOP) {
          gesture.kind = "pan";
          interactingRef.current = true;
        }
        if (gesture.kind === "pan") {
          cam.x += p.x - prev.x;
          cam.y += p.y - prev.y;
          clampCam(cam, width, height);
          dirtyRef.current = true;
        }
      } else if (gesture.kind === "build") {
        const g = screenToGrid(cam, p.x, p.y);
        if (g.x !== gesture.b.x || g.y !== gesture.b.y) {
          gesture.b = g;
          const tool = ALL_TOOLS[gesture.toolId];
          previewRef.current = previewTool(worldRef.current, gesture.toolId, tool.mode === "place" ? g : gesture.a, g);
          dirtyRef.current = true;
        }
      }
    };

    const up = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (!gesture) return;
      if (gesture.kind === "pinch") {
        if (pointers.size === 0) {
          gesture = null;
          endInteract();
        } else gesture = { kind: "after-pinch" };
        return;
      }
      if (gesture.kind === "after-pinch") {
        gesture = null;
        endInteract();
        return;
      }
      const g = gesture;
      gesture = null;
      endInteract();
      if (e.type === "pointercancel") return;
      if (g.kind === "tap" && !g.panOnly) {
        const tool = ALL_TOOLS[propsRef.current.tool];
        if (!tool || tool.mode === "inspect") propsRef.current.onInspect(g.grid);
        else propsRef.current.onTap(tool.id, g.grid);
      } else if (g.kind === "build") {
        const tool = ALL_TOOLS[g.toolId];
        propsRef.current.onMouseBuild(g.toolId, tool.mode === "place" ? g.b : g.a, g.b);
      }
    };

    const wheel = (e) => {
      e.preventDefault();
      const p = local(e);
      const { width, height } = size();
      interactingRef.current = true;
      zoomAt(camRef.current, p.x, p.y, Math.exp(-e.deltaY * 0.0015), width, height);
      dirtyRef.current = true;
      clearTimeout(wheel.t);
      wheel.t = setTimeout(endInteract, 200);
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
  }, [worldRef, camRef, dirtyRef, previewRef, sizeRef]);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="block touch-none select-none" aria-label="City map" role="img" />
    </div>
  );
}

// Centre the camera on a grid tile (used by "find" buttons).
export function lookAt(cam, size, gx, gy) {
  cam.x = size.width / 2 - PX(gx + 0.5, gy + 0.5) * cam.zoom;
  cam.y = size.height / 2 - PY(gx + 0.5, gy + 0.5) * cam.zoom;
}
