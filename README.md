# Routine Grove

Routine Grove is a Vite React routine timer with Tailwind and local shadcn/ui-style components. The interface follows an Apple-inspired product-surface direction: full-bleed tiles, single blue action accent, pill CTAs, frosted sticky controls, and low visual chrome.

## Run

```powershell
npm.cmd install
npm.cmd run dev -- --port 8766
```

Then visit:

```text
http://127.0.0.1:8766
```

## Build

```powershell
npm.cmd run build
npm.cmd run serve:dist
```

The production build is served at:

```text
http://127.0.0.1:8768
```

## Features

- Create, edit, delete, reorder, and time routine steps.
- Start, pause, resume, skip, reset, and auto-advance a routine timer.
- Restore active timer state from localStorage.
- Track XP, levels, streaks, achievements, completion history, weekly pulse, and garden growth.
- Use local shadcn/ui-style primitives in `src/components/ui`.
