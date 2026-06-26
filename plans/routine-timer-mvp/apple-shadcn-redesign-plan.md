# Apple + shadcn UI Redesign Plan

Gate: PROCEED - requested redesign uses a design reference, shadcn/ui, target 9.5, and multi-agent evaluation.

Intent: DELIVER - rebuild Routine Grove into a Vite React app with Tailwind and shadcn-style local components.

Mode: Auto recommended - local controller implementation with multi-agent evaluation.

## Design Source

Use `C:\Users\ThinkPad\.codex\attachments\3627ab0d-0f35-4aa4-bdeb-88f1073cd425\pasted-text.txt`.

Core direction:
- Apple-style full-bleed surfaces with alternating white, parchment, and near-black tiles.
- Single blue action accent `#0066cc`.
- Pill CTAs, frosted sticky bars, minimal shadows, low chrome.
- shadcn/ui utility components for buttons, cards, dialog, progress, badges, tabs, and scroll areas.
- User flow is more important than dashboard density: choose routine, run timer, complete, see reward/history, edit routine.

## Implementation

Implementation parallelism: Sequential
Reason: migration from static app to React touches app shell, state model, styling, and build tooling together.

Can parallelize: yes, evaluation only.

Implementation lanes:
- Controller: create Vite/Tailwind/shadcn structure and implement the app.
- Evaluator A: score product flow and timer/reward UX.
- Evaluator B: score visual craft, mobile ergonomics, and Apple-design alignment.
- Evaluator C: score technical reliability and localStorage migration.

Verification:
- `npm install`
- `npm run build`
- browser smoke on local dev server
- multi-agent rubric scoring against target 9.5

## Acceptance

- Existing routine timer behavior remains available.
- UI uses React components under `src/components/ui`.
- Flow is timer-first and mobile-first.
- App persists compatible data in `localStorage`.
- Final weighted score meets or exceeds 9.5.
