# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A fullscreen canvas animation of floating geometric shapes on a dark background, designed as a sensory experience for a baby. Projected on a wall in a dark room.

## Commands

- `npm run dev` — Start dev server (Vite)
- `npm run build` — TypeScript check + Vite build (output in `dist/`)
- `npm run lint` — ESLint
- `npx wrangler deploy` — Deploy to Cloudflare Workers (static assets from `dist/`)

## Architecture

Single-page React app, all logic in `src/App.tsx`:

- **Canvas animation loop** (`requestAnimationFrame`) draws shapes and background effects
- **Shapes** have lifecycle phases (fadein → alive → fadeout), bounce within a configurable window area
- **Background types**: black, space (twinkling stars), rain (falling drops)
- **Settings panel** (gear icon, top-right) configures shape count, size, speed, and window bounds
- **Settings persist** in `localStorage` under key `forme-settings`
- Settings are read in the animation loop via a `useRef` to avoid re-mounting the effect

Colors cycle sequentially through a fixed palette (8 colors) to avoid duplicates.

## Deploy

Hosted on Cloudflare Workers with static assets. Config in `wrangler.jsonc`, project name: `forme`.
