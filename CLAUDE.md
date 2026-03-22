# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A fullscreen canvas animation of floating geometric shapes on a dark background, designed as a sensory experience for a 9-month-old baby. Projected on a wall in a dark room. Animations should be slow and long-lasting — the baby needs time to process what's happening.

## Commands

- `npm run dev` — Start dev server (Vite)
- `npm run build` — TypeScript check + Vite build (output in `dist/`)
- `npm run lint` — ESLint
- `npx wrangler deploy` — Deploy to Cloudflare Workers (static assets from `dist/`)

## Architecture

Single-page React app with two main files:

### `src/App.tsx` — Canvas animation + UI

- **Canvas animation loop** (`requestAnimationFrame`) draws shapes and background effects
- **Shapes** have lifecycle phases (fadein → alive → fadeout), bounce within a configurable window area
- **Two animation modes**:
  - **Classic** — Multiple shapes float, spawn, and despawn independently
  - **Explode** — Single shape appears → explodes into many identical pieces → pieces scatter (30-60s) → reunite → new shape. Cycle repeats
- **Background types**: black, space (twinkling stars), rain (falling drops)
- **Window border**: animated nebula-style glow with travelling particles along the perimeter, drawn when topBias or hPadding > 0
- **Collision**: optional elastic collision between shapes, mass proportional to area (size²)
- **Settings panel** (gear icon, top-right) shows mode-specific controls. Settings persist in `localStorage` under key `forme-settings`
- Settings are read in the animation loop via a `useRef` to avoid re-mounting the effect
- Colors cycle sequentially through a fixed palette (8 colors) to avoid duplicates
- Reusable UI components: `OptionRow` (button group selector), `SliderRow` (labeled range input)

### `src/sfx.ts` — Sound effects (Web Audio API)

- **Collision** (`playCollision`): short percussive impact with noise burst, pitch/volume scale with collision force
- **Explosion** (`playExplosion`): descending sawtooth sweep + sub bass thump + filtered noise burst
- **Gravity** (`playGravity`): ascending whoosh with harmonic layers + bandpass-filtered noise
- All three are independently toggleable in settings (on by default)
- Audio context unlocked on first user gesture (click/tap). No external dependencies — pure Web Audio API

## Keyboard Shortcuts

- `S` — Toggle settings panel
- `Esc` — Close settings panel
- `F` — Toggle fullscreen

## Key Dependencies

No external audio dependencies — sound effects use the native Web Audio API.

## Deploy

Hosted on Cloudflare Workers with static assets. Config in `wrangler.jsonc`, project name: `forme`.
URL: https://forme.francesco-cioria.workers.dev
