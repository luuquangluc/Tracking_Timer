# Routine Timer MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished self-contained MVP for routine timing, habit streaks, XP, achievements, analytics, and garden progression.

**Architecture:** Use a static browser app with localStorage persistence. Keep HTML, CSS, and JavaScript separate so the app can be migrated to a framework later without changing the product model.

**Tech Stack:** HTML, CSS, vanilla JavaScript, localStorage, PowerShell static server for verification.

---

### Task 1: Product Shell And Styling

**Files:**
- Create: `index.html`
- Create: `styles.css`

- [ ] Add semantic app regions for routine list, timer stage, dashboard, achievements, garden, and routine editor dialog.
- [ ] Add responsive CSS with compact information density, clear timer hierarchy, accessible controls, and mobile stacking.

### Task 2: State Model And Routine CRUD

**Files:**
- Create: `app.js`

- [ ] Define localStorage state with routines, completions, XP, level, achievements, and selected routine.
- [ ] Seed a Morning Routine with four timed steps.
- [ ] Implement create, edit, delete, step add/remove, and selected routine rendering.

### Task 3: Timer Engine And Rewards

**Files:**
- Modify: `app.js`

- [ ] Implement start, pause, resume, skip step, reset, automatic step transitions, progress bars, and completion handling.
- [ ] Award XP from completed minutes, streak bonuses, achievements, and garden progress.

### Task 4: Verification And Polish

**Files:**
- Create: `README.md`
- Modify: `styles.css`
- Modify: `app.js`

- [ ] Verify the app loads in a local browser context.
- [ ] Check desktop and mobile layout.
- [ ] Fix visual overlap, empty states, timer edge cases, and persistence issues.
