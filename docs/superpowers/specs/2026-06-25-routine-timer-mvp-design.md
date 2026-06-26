# Routine Timer MVP Design

## Goal
Build a first usable MVP for a Routine Timer + Habit Gamification app with polished UX, local persistence, and a complete routine completion reward loop.

## Product Scope
The MVP is a self-contained browser app. Users can create, edit, delete, and run multi-step routines. Completing a routine grants XP, updates a per-routine streak, unlocks achievements, updates dashboard metrics, and grows a small visual garden.

## Architecture
The app uses three files:

- `index.html`: semantic app shell and templates.
- `styles.css`: responsive product UI, timer visual states, dashboard, garden, and mobile layout.
- `app.js`: data model, localStorage persistence, timer engine, reward rules, achievements, and rendering.

The data model is intentionally small and versioned in localStorage so the MVP can evolve into a framework app later.

## UX Principles
- First screen is the working app, not marketing copy.
- Timer remains the visual anchor.
- Routine editing is available without leaving the dashboard.
- Reward feedback is immediate after completion.
- Mobile layout stacks into a focused timer-first workflow.

## MVP Requirements
- Create, edit, delete routines.
- Add, remove, and edit routine steps with name, duration, type, and order.
- Start, pause, resume, skip, and reset a routine.
- Automatically transition through steps.
- Track total and current step progress.
- Store current streak and best streak per routine.
- Award XP from completed minutes and streak milestones.
- Show level and XP progress.
- Unlock a small set of achievements.
- Show analytics summaries and a weekly completion chart.
- Grow a garden tile per completed routine.

## Non-Goals
- Backend accounts.
- Real push notification.
- Multiplayer, economy, boss battles, or skill trees.
