import { useEffect, useRef } from "react";

interface Shape {
  type: "circle" | "triangle" | "square" | "star";
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  phase: "fadein" | "alive" | "fadeout";
  life: number;
  maxLife: number;
}

const COLORS = [
  "#FF6B6B", // warm red
  "#4ECDC4", // teal
  "#FFE66D", // yellow
  "#A78BFA", // purple
  "#FB923C", // orange
  "#22C55E", // green
  "#3B82F6", // blue
  "#F472B6", // pink
];

const SHAPE_TYPES: Shape["type"][] = ["circle", "triangle", "square", "star"];

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const H_PADDING = 0.15; // 15% horizontal padding
const TOP_BIAS = 0.4; // shapes spawn in the bottom 60% of the screen

let colorIndex = 0;

function nextColor(): string {
  const color = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  return color;
}

function createShape(w: number, h: number): Shape {
  const size = random(40, 120);
  const speed = random(0.3, 2.5);
  const angle = random(0, Math.PI * 2);
  const padX = w * H_PADDING;

  return {
    type: pick(SHAPE_TYPES),
    x: random(padX + size, w - padX - size),
    y: random(h * TOP_BIAS + size, h - size),
    size,
    color: nextColor(),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rotation: random(0, Math.PI * 2),
    rotationSpeed: random(-0.005, 0.005),
    opacity: 0,
    phase: "fadein",
    life: 0,
    maxLife: random(1200, 3600), // frames (~20-60s at 60fps)
  };
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape
) {
  ctx.save();
  ctx.translate(shape.x, shape.y);
  ctx.rotate(shape.rotation);
  ctx.globalAlpha = shape.opacity;
  ctx.fillStyle = shape.color;
  ctx.shadowColor = shape.color;
  ctx.shadowBlur = 20;

  const s = shape.size / 2;

  switch (shape.type) {
    case "circle":
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "square":
      ctx.beginPath();
      ctx.roundRect(-s, -s, s * 2, s * 2, s * 0.15);
      ctx.fill();
      break;

    case "triangle":
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.87, s * 0.5);
      ctx.lineTo(-s * 0.87, s * 0.5);
      ctx.closePath();
      ctx.fill();
      break;

    case "star": {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const innerAngle = outerAngle + Math.PI / 5;
        ctx.lineTo(
          Math.cos(outerAngle) * s,
          Math.sin(outerAngle) * s
        );
        ctx.lineTo(
          Math.cos(innerAngle) * s * 0.4,
          Math.sin(innerAngle) * s * 0.4
        );
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

const FADE_FRAMES = 120; // 2 seconds
const MAX_SHAPES = 5;
const SPAWN_INTERVAL = 1800; // new shape every ~30s

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let shapes: Shape[] = [];
    let framesSinceSpawn = 60; // spawn first one immediately
    let animId: number;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    }

    resize();
    window.addEventListener("resize", resize);

    function tick() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Spawn new shapes
      framesSinceSpawn++;
      const aliveCount = shapes.filter((s) => s.phase !== "fadeout").length;
      if (aliveCount < 4) {
        // Immediately spawn when too few shapes (one per fade-in cycle)
        if (framesSinceSpawn >= 60) {
          shapes.push(createShape(w, h));
          framesSinceSpawn = 0;
        }
      } else if (framesSinceSpawn >= SPAWN_INTERVAL && aliveCount < MAX_SHAPES) {
        shapes.push(createShape(w, h));
        framesSinceSpawn = 0;
      }

      // Clear
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update & draw
      for (const shape of shapes) {
        // Move
        shape.x += shape.vx;
        shape.y += shape.vy;
        shape.rotation += shape.rotationSpeed;
        shape.life++;

        // Bounce off edges (with horizontal padding and top bias)
        const margin = shape.size / 2;
        const padX = w * H_PADDING;
        const minX = padX + margin;
        const maxX = w - padX - margin;
        const minY = h * TOP_BIAS + margin;
        const maxY = h - margin;

        if (shape.x < minX) {
          shape.x = minX;
          shape.vx *= -1;
        }
        if (shape.x > maxX) {
          shape.x = maxX;
          shape.vx *= -1;
        }
        if (shape.y < minY) {
          shape.y = minY;
          shape.vy *= -1;
        }
        if (shape.y > maxY) {
          shape.y = maxY;
          shape.vy *= -1;
        }

        // Lifecycle
        if (shape.phase === "fadein") {
          shape.opacity = Math.min(1, shape.opacity + 1 / FADE_FRAMES);
          if (shape.opacity >= 1) shape.phase = "alive";
        } else if (shape.phase === "alive") {
          if (shape.life >= shape.maxLife - FADE_FRAMES) {
            shape.phase = "fadeout";
          }
        } else if (shape.phase === "fadeout") {
          shape.opacity = Math.max(0, shape.opacity - 1 / FADE_FRAMES);
        }

        drawShape(ctx, shape);
      }

      // Remove dead shapes
      shapes = shapes.filter((s) => s.opacity > 0);

      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
