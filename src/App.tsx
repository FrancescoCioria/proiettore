import { useCallback, useEffect, useRef, useState } from "react";

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

type BgType = "black" | "space" | "rain";
type Mode = "classic" | "explode";

export interface Settings {
  mode: Mode;
  shapeCount: number;
  sizeMin: number;
  sizeMax: number;
  speedMin: number;
  speedMax: number;
  topBias: number;
  hPadding: number;
  background: BgType;
}

const DEFAULT_SETTINGS: Settings = {
  mode: "classic",
  shapeCount: 5,
  sizeMin: 40,
  sizeMax: 120,
  speedMin: 0.3,
  speedMax: 2.5,
  topBias: 0.4,
  hPadding: 0.15,
  background: "black",
};

// --- Background particles ---

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
}

function createStars(w: number, h: number, count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    size: random(0.5, 2.5),
    brightness: random(0.3, 1),
    twinkleSpeed: random(0.005, 0.02),
    twinklePhase: random(0, Math.PI * 2),
  }));
}

function createRainDrops(w: number, count: number): RainDrop[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * -500,
    speed: random(2, 6),
    length: random(10, 30),
    opacity: random(0.1, 0.4),
  }));
}

function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], frame: number) {
  for (const star of stars) {
    const alpha = star.brightness * (0.5 + 0.5 * Math.sin(frame * star.twinkleSpeed + star.twinklePhase));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function updateAndDrawRain(ctx: CanvasRenderingContext2D, drops: RainDrop[], w: number, h: number) {
  ctx.lineCap = "round";
  for (const drop of drops) {
    drop.y += drop.speed;
    if (drop.y > h + drop.length) {
      drop.y = -drop.length;
      drop.x = Math.random() * w;
    }
    ctx.globalAlpha = drop.opacity;
    ctx.strokeStyle = "#6BA3D6";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x, drop.y + drop.length);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

const STORAGE_KEY = "forme-settings";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
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

let colorIndex = 0;

function nextColor(): string {
  const color = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  return color;
}

function createShape(w: number, h: number, s: Settings): Shape {
  const size = random(s.sizeMin, s.sizeMax);
  const speed = random(s.speedMin, s.speedMax);
  const angle = random(0, Math.PI * 2);
  const padX = w * s.hPadding;

  return {
    type: pick(SHAPE_TYPES),
    x: random(padX + size, w - padX - size),
    y: random(h * s.topBias + size, h - size),
    size,
    color: nextColor(),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rotation: random(0, Math.PI * 2),
    rotationSpeed: random(-0.005, 0.005),
    opacity: 0,
    phase: "fadein",
    life: 0,
    maxLife: random(1200, 3600),
  };
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
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
        ctx.lineTo(Math.cos(outerAngle) * s, Math.sin(outerAngle) * s);
        ctx.lineTo(Math.cos(innerAngle) * s * 0.4, Math.sin(innerAngle) * s * 0.4);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

const FADE_FRAMES = 120;
const SPAWN_INTERVAL = 1800;
const EXPLODE_COUNT = 12;
const SINGLE_DURATION = 300;
const EXPLODE_DURATION = 60;
const SCATTER_DURATION_MIN = 1800; // 30s at 60fps
const SCATTER_DURATION_MAX = 3600; // 60s at 60fps
const REUNITE_DURATION = 300;
const PAUSE_DURATION = 60;

type ExplodePhase = "single" | "exploding" | "scattered" | "reuniting" | "pause";

// --- Settings Menu ---

function SettingsMenu({
  settings,
  onChange,
  onClose,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}) {
  const update = (partial: Partial<Settings>) => {
    const next = { ...settings, ...partial };
    onChange(next);
    saveSettings(next);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 320,
        background: "rgba(20, 20, 20, 0.95)",
        color: "#fff",
        padding: "24px 20px",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
        overflowY: "auto",
        zIndex: 100,
        cursor: "default",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>Impostazioni</span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#999",
            fontSize: 24,
            cursor: "pointer",
            padding: "0 4px",
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      <OptionRow
        label="Modalità"
        options={["classic", "explode"] as const}
        value={settings.mode}
        labels={{ classic: "Classica", explode: "Esplosione" }}
        onChange={(m) => update({ mode: m })}
      />

      <OptionRow
        label="Sfondo"
        options={["black", "space", "rain"] as const}
        value={settings.background}
        labels={{ black: "Nero", space: "Spazio", rain: "Pioggia" }}
        onChange={(bg) => update({ background: bg })}
      />

      <SliderRow
        label="Numero forme"
        value={settings.shapeCount}
        min={1}
        max={10}
        step={1}
        onChange={(v) => update({ shapeCount: v })}
      />
      <SliderRow
        label="Dimensione min"
        value={settings.sizeMin}
        min={10}
        max={200}
        step={5}
        onChange={(v) => update({ sizeMin: Math.min(v, settings.sizeMax) })}
      />
      <SliderRow
        label="Dimensione max"
        value={settings.sizeMax}
        min={10}
        max={200}
        step={5}
        onChange={(v) => update({ sizeMax: Math.max(v, settings.sizeMin) })}
      />
      <SliderRow
        label="Velocit&agrave; min"
        value={settings.speedMin}
        min={0.1}
        max={5}
        step={0.1}
        format={(v) => v.toFixed(1)}
        onChange={(v) => update({ speedMin: Math.min(v, settings.speedMax) })}
      />
      <SliderRow
        label="Velocit&agrave; max"
        value={settings.speedMax}
        min={0.1}
        max={5}
        step={0.1}
        format={(v) => v.toFixed(1)}
        onChange={(v) => update({ speedMax: Math.max(v, settings.speedMin) })}
      />

      <div style={{ borderTop: "1px solid #333", margin: "20px 0", paddingTop: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, display: "block" }}>Finestra</span>
        <SliderRow
          label="Limite superiore"
          value={Math.round(settings.topBias * 100)}
          min={0}
          max={80}
          step={5}
          format={(v) => `${v}%`}
          onChange={(v) => update({ topBias: v / 100 })}
        />
        <SliderRow
          label="Padding laterale"
          value={Math.round(settings.hPadding * 100)}
          min={0}
          max={40}
          step={1}
          format={(v) => `${v}%`}
          onChange={(v) => update({ hPadding: v / 100 })}
        />
      </div>
    </div>
  );
}

function OptionRow<T extends string>({
  label,
  options,
  value,
  labels,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  labels: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ color: "#ccc", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 6,
              border: value === opt ? "2px solid #A78BFA" : "2px solid #333",
              background: value === opt ? "rgba(167, 139, 250, 0.15)" : "rgba(255,255,255,0.05)",
              color: value === opt ? "#fff" : "#999",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {labels[opt]}
          </button>
        ))}
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const display = format ? format(value) : String(value);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, color: "#ccc" }}>
        <span>{label}</span>
        <span style={{ color: "#fff", fontWeight: 500 }}>{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "#A78BFA" }}
      />
    </div>
  );
}

// --- Gear icon ---

function GearIcon({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 50,
        background: "none",
        border: "none",
        cursor: "pointer",
        opacity: 0.3,
        transition: "opacity 0.2s",
        padding: 8,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.3")}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  );
}

// --- Main App ---

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const handleChange = useCallback((s: Settings) => {
    setSettings(s);
  }, []);

  // Request fullscreen on first user interaction
  useEffect(() => {
    function requestFs() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      document.removeEventListener("click", requestFs);
      document.removeEventListener("touchstart", requestFs);
    }
    document.addEventListener("click", requestFs, { once: true });
    document.addEventListener("touchstart", requestFs, { once: true });
    return () => {
      document.removeEventListener("click", requestFs);
      document.removeEventListener("touchstart", requestFs);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let shapes: Shape[] = [];
    let framesSinceSpawn = 60;
    let animId: number;
    let frame = 0;
    let stars: Star[] = [];
    let rainDrops: RainDrop[] = [];
    let currentBg: BgType = "black";

    // Explode mode state
    let explodePhase: ExplodePhase = "single";
    let explodeTimer = 0;
    let explodeShapes: Shape[] = [];
    let explodeTarget = { x: 0, y: 0 };
    let currentMode: Mode = "classic";
    let scatterDuration = 0;

    function initExplodeMode(w: number, h: number, s: Settings) {
      explodePhase = "single";
      explodeTimer = 0;
      const size = random(s.sizeMin, s.sizeMax);
      const cx = w / 2;
      const cy = h * 0.55;
      explodeShapes = [{
        type: pick(SHAPE_TYPES),
        x: cx,
        y: cy,
        size,
        color: nextColor(),
        vx: random(-1, 1),
        vy: random(-0.5, 0.5),
        rotation: 0,
        rotationSpeed: random(-0.005, 0.005),
        opacity: 0,
        phase: "fadein",
        life: 0,
        maxLife: 99999,
      }];
    }

    function initBg(w: number, h: number, bg: BgType) {
      if (bg === "space" && (currentBg !== "space" || stars.length === 0)) {
        stars = createStars(w, h, 200);
      }
      if (bg === "rain" && (currentBg !== "rain" || rainDrops.length === 0)) {
        rainDrops = createRainDrops(w, 150);
      }
      currentBg = bg;
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      initBg(window.innerWidth, window.innerHeight, settingsRef.current.background);
    }

    resize();
    window.addEventListener("resize", resize);

    function tickClassic(s: Settings, w: number, h: number) {
      // Spawn new shapes
      framesSinceSpawn++;
      const aliveCount = shapes.filter((sh) => sh.phase !== "fadeout").length;
      if (aliveCount < s.shapeCount - 1) {
        if (framesSinceSpawn >= 60) {
          shapes.push(createShape(w, h, s));
          framesSinceSpawn = 0;
        }
      } else if (framesSinceSpawn >= SPAWN_INTERVAL && aliveCount < s.shapeCount) {
        shapes.push(createShape(w, h, s));
        framesSinceSpawn = 0;
      }

      // Update & draw
      for (const shape of shapes) {
        shape.x += shape.vx;
        shape.y += shape.vy;
        shape.rotation += shape.rotationSpeed;
        shape.life++;

        bounceShape(shape, w, h, s);

        // Lifecycle
        if (shape.phase === "fadein") {
          shape.opacity = Math.min(1, shape.opacity + 1 / FADE_FRAMES);
          if (shape.opacity >= 1) shape.phase = "alive";
        } else if (shape.phase === "alive") {
          if (shape.life >= shape.maxLife - FADE_FRAMES) shape.phase = "fadeout";
        } else if (shape.phase === "fadeout") {
          shape.opacity = Math.max(0, shape.opacity - 1 / FADE_FRAMES);
        }

        drawShape(ctx, shape);
      }

      shapes = shapes.filter((sh) => sh.opacity > 0);
    }

    function bounceShape(shape: Shape, w: number, h: number, s: Settings) {
      const margin = shape.size / 2;
      const padX = w * s.hPadding;
      const minX = padX + margin;
      const maxX = w - padX - margin;
      const minY = h * s.topBias + margin;
      const maxY = h - margin;

      if (shape.x < minX) { shape.x = minX; shape.vx *= -1; }
      if (shape.x > maxX) { shape.x = maxX; shape.vx *= -1; }
      if (shape.y < minY) { shape.y = minY; shape.vy *= -1; }
      if (shape.y > maxY) { shape.y = maxY; shape.vy *= -1; }
    }

    function tickExplode(s: Settings, w: number, h: number) {
      explodeTimer++;

      if (explodePhase === "single") {
        const shape = explodeShapes[0];
        if (shape) {
          // Fade in
          if (shape.phase === "fadein") {
            shape.opacity = Math.min(1, shape.opacity + 1 / FADE_FRAMES);
            if (shape.opacity >= 1) shape.phase = "alive";
          }
          shape.x += shape.vx;
          shape.y += shape.vy;
          shape.rotation += shape.rotationSpeed;
          bounceShape(shape, w, h, s);
          drawShape(ctx, shape);
        }

        if (explodeTimer >= SINGLE_DURATION) {
          // Explode!
          const src = explodeShapes[0];
          const shapeType = src.type;
          const shapeColor = src.color;
          const pieceSize = src.size * 0.5;

          explodeShapes = Array.from({ length: EXPLODE_COUNT }, () => {
            const angle = random(0, Math.PI * 2);
            const speed = random(3, 8);
            return {
              type: shapeType,
              x: src.x,
              y: src.y,
              size: pieceSize,
              color: shapeColor,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              rotation: random(0, Math.PI * 2),
              rotationSpeed: random(-0.02, 0.02),
              opacity: 1,
              phase: "alive" as const,
              life: 0,
              maxLife: 99999,
            };
          });
          explodePhase = "exploding";
          explodeTimer = 0;
        }
      } else if (explodePhase === "exploding") {
        for (const shape of explodeShapes) {
          shape.x += shape.vx;
          shape.y += shape.vy;
          shape.rotation += shape.rotationSpeed;
          // Decelerate
          shape.vx *= 0.96;
          shape.vy *= 0.96;
          bounceShape(shape, w, h, s);
          drawShape(ctx, shape);
        }

        if (explodeTimer >= EXPLODE_DURATION) {
          // Give each piece a gentle velocity for scattering
          for (const shape of explodeShapes) {
            const speed = random(0.5, 2);
            const angle = random(0, Math.PI * 2);
            shape.vx = Math.cos(angle) * speed;
            shape.vy = Math.sin(angle) * speed;
          }
          explodePhase = "scattered";
          explodeTimer = 0;
          scatterDuration = Math.round(random(SCATTER_DURATION_MIN, SCATTER_DURATION_MAX));
        }
      } else if (explodePhase === "scattered") {
        for (const shape of explodeShapes) {
          shape.x += shape.vx;
          shape.y += shape.vy;
          shape.rotation += shape.rotationSpeed;
          bounceShape(shape, w, h, s);
          drawShape(ctx, shape);
        }

        if (explodeTimer >= scatterDuration) {
          // Pick a reunion target
          explodeTarget = { x: w / 2 + random(-w * 0.2, w * 0.2), y: h * 0.5 + random(-h * 0.15, h * 0.15) };
          explodePhase = "reuniting";
          explodeTimer = 0;
        }
      } else if (explodePhase === "reuniting") {
        const progress = Math.min(1, explodeTimer / REUNITE_DURATION);
        // Ease-in-out
        const ease = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        for (const shape of explodeShapes) {
          // Lerp toward target
          const dx = explodeTarget.x - shape.x;
          const dy = explodeTarget.y - shape.y;
          shape.x += dx * ease * 0.08;
          shape.y += dy * ease * 0.08;
          shape.rotation += shape.rotationSpeed;

          // Shrink slightly as they converge at the end
          if (progress > 0.7) {
            shape.opacity = Math.max(0, 1 - (progress - 0.7) / 0.3);
          }

          drawShape(ctx, shape);
        }

        if (explodeTimer >= REUNITE_DURATION) {
          explodePhase = "pause";
          explodeTimer = 0;
        }
      } else if (explodePhase === "pause") {
        if (explodeTimer >= PAUSE_DURATION) {
          // Restart cycle with a new shape
          const size = random(s.sizeMin, s.sizeMax);
          explodeShapes = [{
            type: pick(SHAPE_TYPES),
            x: explodeTarget.x,
            y: explodeTarget.y,
            size,
            color: nextColor(),
            vx: random(-1, 1),
            vy: random(-0.5, 0.5),
            rotation: 0,
            rotationSpeed: random(-0.005, 0.005),
            opacity: 0,
            phase: "fadein",
            life: 0,
            maxLife: 99999,
          }];
          explodePhase = "single";
          explodeTimer = 0;
        }
      }
    }

    function tick() {
      const s = settingsRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;
      frame++;

      // Handle mode switch
      if (s.mode !== currentMode) {
        currentMode = s.mode;
        if (s.mode === "explode") {
          initExplodeMode(w, h, s);
        } else {
          shapes = [];
          framesSinceSpawn = 60;
          explodeShapes = [];
        }
      }

      // Re-init bg particles if setting changed
      if (s.background !== currentBg) {
        initBg(w, h, s.background);
      }

      // Clear
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw background
      ctx.shadowBlur = 0;
      if (s.background === "space") drawStars(ctx, stars, frame);
      if (s.background === "rain") updateAndDrawRain(ctx, rainDrops, w, h);

      if (s.mode === "classic") {
        tickClassic(s, w, h);
      } else {
        tickExplode(s, w, h);
      }

      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      {!menuOpen && <GearIcon onClick={() => setMenuOpen(true)} />}
      {menuOpen && (
        <SettingsMenu
          settings={settings}
          onChange={handleChange}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
