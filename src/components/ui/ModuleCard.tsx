"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import type { CanvasType } from "@/types";

interface ModuleCardTag {
  label: string;
  color: string;
}

interface ModuleCardStat {
  value: string;
  label: string;
  color: string;
}

interface ModuleCardProps {
  title: string;
  description: string;
  tags: ModuleCardTag[];
  stats: ModuleCardStat[];
  buttonLabel: string;
  buttonColor: string;
  href: string;
  canvasType: CanvasType;
}

function drawDots(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2 + Math.sin(time * 0.001) * 40;
  const cy = h / 2 + Math.cos(time * 0.0008) * 20;
  const spacing = 20;
  for (let x = 0; x < w; x += spacing) {
    for (let y = 0; y < h; y += spacing) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const size = Math.max(1, 4 - dist * 0.02);
      const alpha = Math.max(0.1, 0.6 - dist * 0.003);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(10, 132, 255, ${alpha})`;
      ctx.fill();
    }
  }
}

function drawWaves(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.clearRect(0, 0, w, h);
  const colors = ["rgba(48, 209, 88, 0.4)", "rgba(100, 210, 255, 0.3)", "rgba(10, 132, 255, 0.2)"];
  colors.forEach((color, i) => {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 2) {
      const y = h / 2 + Math.sin((x + time * (0.5 + i * 0.2)) * 0.02 + i) * (15 + i * 5) + i * 10;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  });
}

function drawChevrons(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.clearRect(0, 0, w, h);
  const spacing = 20;
  const offset = (time * 0.03) % spacing;
  for (let i = -2; i < w / spacing + 2; i++) {
    const x = i * spacing + offset;
    const alpha = 0.1 + 0.15 * Math.sin(time * 0.002 + i * 0.3);
    ctx.strokeStyle = `rgba(255, 214, 10, ${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h / 2, h);
    ctx.stroke();
  }
}

function drawNebula(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.clearRect(0, 0, w, h);
  const centers = [
    { color: "rgba(191, 90, 242, 0.15)", dx: 0.7, dy: 0.5, r: 60 },
    { color: "rgba(255, 55, 95, 0.1)", dx: 1.1, dy: 0.8, r: 50 },
    { color: "rgba(10, 132, 255, 0.1)", dx: 0.5, dy: 1.2, r: 55 },
  ];
  centers.forEach((c) => {
    const cx = w / 2 + Math.sin(time * 0.001 * c.dx) * (w * 0.3);
    const cy = h / 2 + Math.cos(time * 0.001 * c.dy) * (h * 0.3);
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, c.r);
    gradient.addColorStop(0, c.color);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  });
}

function drawPulse(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.clearRect(0, 0, w, h);
  const mid = h / 2;
  ctx.strokeStyle = "rgba(100, 210, 255, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const scrollX = (time * 0.05) % w;
  for (let x = 0; x <= w; x += 1) {
    const pos = (x + scrollX) % 200;
    let y = mid;
    if (pos > 60 && pos < 70) y = mid - 25;
    else if (pos > 70 && pos < 80) y = mid + 15;
    else if (pos > 80 && pos < 90) y = mid - 8;
    else if (pos > 90 && pos < 95) y = mid + 4;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Glow line
  ctx.strokeStyle = "rgba(100, 210, 255, 0.15)";
  ctx.lineWidth = 6;
  ctx.stroke();
}

function drawBars(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.clearRect(0, 0, w, h);
  const barWidth = 8;
  const gap = 4;
  const count = Math.floor(w / (barWidth + gap));
  for (let i = 0; i < count; i++) {
    const barH = 20 + Math.sin(time * 0.003 + i * 0.4) * 15 + Math.sin(time * 0.005 + i * 0.2) * 10;
    const alpha = 0.3 + Math.sin(time * 0.002 + i * 0.3) * 0.2;
    ctx.fillStyle = `rgba(255, 69, 58, ${alpha})`;
    ctx.fillRect(i * (barWidth + gap), h - barH, barWidth, barH);
  }
}

const DRAW_MAP: Record<CanvasType, (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => void> = {
  dots: drawDots,
  waves: drawWaves,
  chevrons: drawChevrons,
  nebula: drawNebula,
  pulse: drawPulse,
  bars: drawBars,
};

export function ModuleCard({
  title,
  description,
  tags,
  stats,
  buttonLabel,
  buttonColor,
  href,
  canvasType,
}: ModuleCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const drawFn = DRAW_MAP[canvasType];
    let animId: number;

    function animate(time: number) {
      drawFn(ctx!, rect.width, rect.height, time);
      animId = requestAnimationFrame(animate);
    }
    animId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animId);
  }, [canvasType]);

  return (
    <div
      className="glass-card"
      style={{
        overflow: "hidden",
        transition: "var(--transition)",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px) scale(1.005)";
        e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Canvas */}
      <div style={{ height: 110, position: "relative", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>

      {/* Body */}
      <div style={{ padding: "16px 20px 20px" }}>
        {/* Tags */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {tags.map((tag) => (
            <span
              key={tag.label}
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 4,
                background: `var(--${tag.color}-bg)`,
                color: `var(--${tag.color})`,
              }}
            >
              {tag.label}
            </span>
          ))}
        </div>

        {/* Title */}
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>
          {title}
        </h3>

        {/* Description */}
        <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5, marginBottom: 16 }}>
          {description}
        </p>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 16,
            padding: "10px 0",
            borderTop: "1px solid var(--glass-border)",
          }}
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: `var(--${stat.color})`,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Action button */}
        <Link
          href={href}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: "var(--radius-xs)",
            background: `var(--${buttonColor}-bg)`,
            color: `var(--${buttonColor})`,
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            transition: "var(--transition)",
          }}
        >
          {buttonLabel} →
        </Link>
      </div>
    </div>
  );
}
