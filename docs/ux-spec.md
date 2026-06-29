# UX Specification: Routine Grove

Date: 2026-06-26
Designer: Codex using BMAD UX
Version: 1.0.0

## Design Principles

1. Timer first: the active routine, current step, remaining time, and primary action must be visible before secondary progress content.
2. Calm reward loop: XP, streaks, and achievements should encourage return visits without turning the timer into an arcade dashboard.
3. Routine-specific progress: achievements and streak signals always describe the selected routine, not lifetime totals.
4. One-hand mobile use: mobile users can switch between Timer, Routines, Progress, and Awards with fixed bottom navigation and stable controls.
5. Recoverable editing: routine edits use clear labels, duration presets, and duplicate/remove actions with no horizontal overflow.

## Target Platforms

- Primary: responsive web app.
- Device support: mobile first, with expanded desktop sections.
- Browser support: modern Chromium, Safari, Firefox, and Edge.
- Accessibility target: WCAG AA basics for focus, labels, contrast, touch target size, and live feedback.

## Personas And Scenarios

- Focus starter: opens the app, picks the current routine, starts the timer within a few seconds.
- Routine builder: adjusts steps and durations, duplicates similar steps, and expects edits to survive refresh.
- Progress checker: reviews streak, weekly pulse, recent completions, and routine-specific achievements after a session.

Critical scenarios:

- Start, pause, resume, skip, and reset an active timer.
- Create a first routine when none exists.
- Switch routines without mixing timer state.
- Complete a routine and see XP, streak, and achievement progress update.
- Continue using the app when localStorage is unavailable, with a visible warning.

## Screen Inventory

### Timer

Purpose: run the selected routine.

Layout: two-column desktop hero and single-column mobile hero. The timer ring is paired with the routine name, current step, action controls, and a Session focus panel.

States:

- Idle: Start is primary, skip disabled, progress remains readable.
- Running: Pause is primary, skip and reset are available.
- Paused: Resume is primary.
- Empty: Create routine is available from the timer surface.

### Routines

Purpose: select, create, duplicate, and inspect routines.

Layout: responsive card grid using semantic surfaces. The selected routine has a check icon and distinct surface treatment.

States:

- Selected: visible check and selected styling.
- Empty: users can create a routine from global nav or timer empty state.

### Progress

Purpose: show the reward loop for the selected routine.

Layout: level, weekly pulse, streak summary, and completion history.

States:

- Empty history: explain that running the routine creates the first log.
- Populated history: show last five completions.

### Awards

Purpose: show routine-specific achievement progress.

Layout: achievement cards with progress bars and unlocked indicators.

States:

- Locked: muted card and numeric progress.
- Unlocked: primary border and leaf icon.

## Interaction Patterns

- Primary timer action uses a filled button and icon.
- Secondary timer actions use outline or secondary icon buttons.
- Feedback uses a polite live-region toast.
- Progress bars expose accessible names and current values.
- Dialogs include labels and descriptions.
- Duration editing uses one m:ss field, steppers, and presets.

## Responsive Behavior

- Mobile: one active pane at a time, fixed bottom tab bar, fixed timer action bar above it.
- Desktop: all panes are full-width page sections with anchor navigation.
- Fixed controls respect safe-area insets and minimum 44px touch targets.

## Validation Plan

- Run `npm.cmd run build`.
- Run `npm.cmd run smoke`.
- Browser smoke at mobile and desktop widths: verify no horizontal scroll, timer controls stay reachable, and awards/progress describe the selected routine.

## Open Questions

- Whether to add a dedicated export/import flow for users whose browser storage is blocked.
- Whether completion history should eventually support filtering beyond the selected routine.
