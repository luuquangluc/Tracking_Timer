# Focus Cockpit Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Routine Grove into a timer-first cockpit while preserving routine-specific achievements and existing localStorage behavior.

**Architecture:** Keep the current single-file React state model in `src/App.jsx` to avoid risky state migration. Replace the desktop section flow with a three-zone cockpit shell, keep mobile tabs, and add smoke checks that guard the new UX contract.

**Tech Stack:** Vite, React 19, Tailwind CSS, local shadcn-style components, lucide-react icons, existing Node smoke script.

---

### Task 1: Smoke Contract

**Files:**
- Modify: `scripts/production-smoke.mjs`

- [ ] Add checks for cockpit shell, routine rail, insight rail, and the selected routine copy.
- [ ] Run `npm.cmd run smoke` before implementation and confirm the new checks fail.

### Task 2: React Layout

**Files:**
- Modify: `src/App.jsx`

- [ ] Replace the desktop sequence of full-width surfaces with a responsive `AppShell`.
- [ ] Add `RoutineRail`, `TimerCockpit`, `InsightRail`, `MobileViewPane`, and `MobileTabBar` usage around existing timer/progress/award data.
- [ ] Preserve timer controls, editor dialog, duplicate routines, localStorage warnings, and per-routine achievement calculations.

### Task 3: Visual System

**Files:**
- Modify: `src/index.css`

- [ ] Add cockpit layout utilities, stable desktop height constraints, and responsive mobile fallbacks.
- [ ] Keep token-based colors, visible focus states, touch targets, and reduced-motion behavior.

### Task 4: Verification

**Files:**
- Run only

- [ ] Run `npm.cmd run build`.
- [ ] Run `npm.cmd run smoke`.
- [ ] Report any remaining gaps honestly.
