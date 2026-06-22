"use client";

import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from "react";
import { Eraser } from "lucide-react";

const COLORS = ["#6b3a1f", "#c14a33", "#3949ab", "#2e7d32", "#3b2716"];
const PAPER = "#fffaf2";

export interface DoodleCanvasHandle {
  exportBlob: () => Promise<Blob | null>;
  clear: () => void;
  isEmpty: () => boolean;
}

interface Props {
  height?: number;
}

const DoodleCanvas = forwardRef<DoodleCanvasHandle, Props>(function DoodleCanvas({ height = 190 }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[0]);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  // Initialise the canvas resolution (DPR aware) + paper background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const point = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent) => {
    drawing.current = true;
    last.current = point(e);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current!.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    hasDrawn.current = true;
  };

  const onUp = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, rect.width, rect.height);
    hasDrawn.current = false;
  };

  useImperativeHandle(ref, () => ({
    exportBlob: () =>
      new Promise<Blob | null>((resolve) => {
        const canvas = canvasRef.current;
        if (!canvas) return resolve(null);
        canvas.toBlob((b) => resolve(b), "image/png");
      }),
    clear,
    isEmpty: () => !hasDrawn.current,
  }));

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height,
          touchAction: "none",
          borderRadius: 12,
          border: "1.5px solid var(--input-border)",
          background: PAPER,
          cursor: "crosshair",
          display: "block",
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />
      <div className="flex items-center gap-1.5 mt-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Pen colour ${c}`}
            style={{
              background: c,
              width: 22,
              height: 22,
              borderRadius: 999,
              border: color === c ? "2px solid var(--text)" : "2px solid transparent",
              boxShadow: color === c ? "0 0 0 2px var(--card-bg)" : "none",
            }}
          />
        ))}
        <button
          type="button"
          onClick={clear}
          className="ml-auto flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-opacity hover:opacity-70"
          style={{ background: "var(--input-bg)", color: "var(--text-soft)", border: "1px solid var(--divider)" }}
        >
          <Eraser size={12} /> Clear
        </button>
      </div>
    </div>
  );
});

export default DoodleCanvas;
