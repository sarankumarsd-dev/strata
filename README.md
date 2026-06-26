# Strata — BGMI Strategy Analyzer (local build)

A self-contained local copy of the Strata tactical board, recreated from the
Lovable project so it runs fully offline with no cloud credits.

## Run it

```bash
cd /Users/saransparkee/python_learning/strata
npm install   # first time only
npm run dev
```

Then open **http://localhost:5273**

## Routes

| Path | Page |
|------|------|
| `/` | Landing page |
| `/maps` | Pick a map → opens the board |
| `/board?map=erangel` | Tactical board (real 4K Erangel satellite map) |
| `/board?map=miramar` | Tactical board (real 4K Miramar satellite map) |
| `/forum` | Community demo cards |

## Tactical board features

- **Real 4K maps** for Erangel & Miramar (in `public/maps/`). Other maps use the
  procedural tactical render.
- **Ultra-zoom**: scroll wheel / pinch to zoom (0.5×–8×), drag to pan, +/−/reset
  buttons, live zoom indicator.
- **Tools**: zone circle, god spots, chokes, high/low ground polygons, gun-range
  cones, rotation splits, rush targets, text labels.
- **Zone circles** keep a fixed real-map radius regardless of zoom.
- **Undo/redo**, layers panel, and **Save** (stored in browser `localStorage`).

## What needs the cloud backend (stubbed locally)

The hosted Strata app uses Supabase + an AI API. In this offline build:

- **Auth / public profiles** — removed.
- **AI suggestions** — the "AI: …" button shows an info toast instead of calling
  the model.
- **Forum publishing & likes** — shows demo cards; Save persists to `localStorage`.

## Stack

Vite + React 19 + TypeScript + Tailwind CSS v4 + react-router-dom. No backend.
