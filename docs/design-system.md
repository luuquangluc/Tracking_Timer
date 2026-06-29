# Routine Grove Design System

Routine Grove uses an Apple-inspired product surface: calm hierarchy, restrained chrome, generous touch targets, and motion that supports timing rather than decoration. This file is the UI contract for future AI or human edits.

## Principles

- The timer screen is the product center. It should feel immediate, quiet, and readable at arm's length.
- Prefer native-feeling controls over decorative UI. Buttons, sheets, cards, and progress should be predictable.
- Do not introduce one-off colors, shadows, radii, or spacing when a token exists.
- Mobile layouts must never require horizontal scrolling.

## UI/UX Pro Max Application

This design system uses `ui-ux-pro-max-skill` as a review and implementation checklist. For Routine Grove, apply its high-priority rules in this order:

1. Accessibility: visible focus states, labels for icon buttons, progressbar labels, and toast announcements.
2. Touch and interaction: minimum `44px` targets, `touch-action: manipulation`, pressed feedback, and no hover-only behavior.
3. Layout and responsive: mobile-first, no horizontal scroll, safe-area aware fixed bars, and stable control dimensions.
4. Typography and color: semantic tokens, readable contrast, tabular timer numerals, and no raw per-component hex unless documented.
5. Animation: 150-300ms meaningful transitions, transform/opacity only, and `prefers-reduced-motion` support.

The skill's generated recommendation for this product is useful mainly for its "Minimal Single Column" layout and pre-delivery checklist. Do not adopt its more vibrant amber palette by default; Routine Grove stays calm, Apple-inspired, and timer-focused.

## Layout System

- Use a 4/8pt spacing rhythm. Small gaps are `4px`, normal gaps are `8px` or `16px`, section spacing is `24px`, and screen padding is `16px` mobile / `24px` desktop.
- Touch targets are at least `44px` high and wide. Use `--touch-target`.
- Respect safe areas with `--safe-area-top` and `--safe-area-bottom` for sticky controls and mobile tabs.
- Fixed-format controls such as timer buttons, duration steppers, tab buttons, and progress bars must use stable dimensions so labels and state changes do not shift layout.
- Modal content must use `overflow-x-hidden`, `min-w-0`, and `minmax(0, 1fr)` inside responsive grids.

## Typography System

- Font stack: system UI with Apple first: `-apple-system`, `BlinkMacSystemFont`, `SF Pro Display`, `SF Pro Text`, `Segoe UI`, `sans-serif`.
- Do not scale type with viewport width.
- Letter spacing is `0` by default. Use slight positive or tokenized tracking only for uppercase metadata.
- Timer numerals may use tighter tracking only when already established by the component.
- Text sizes:
  - Display timer: existing hero scale.
  - Page title: `24px` to `32px`.
  - Card title: `17px`.
  - Body: `15px` to `16px`.
  - Caption/metadata: `12px` to `13px`.

## Color Tokens

Use semantic tokens from `src/index.css` and Tailwind:

- `background`: app background.
- `surface`: elevated app surfaces.
- `surface-muted`: quiet controls, secondary buttons, and subtle panels.
- `foreground`: primary text.
- `muted-foreground`: secondary text.
- `primary`: main action and active state.
- `border`: dividers and control outlines.
- `ring`: focus treatment.

Light and dark mode tokens must stay paired. Avoid hard-coded black/white except for deliberate contrast inside token definitions.

## Components

- Button: pill shape, minimum 44px touch target, clear focus ring, active press feedback.
- Card: 8px radius unless a larger product-surface container is already established. Do not nest cards inside cards.
- Dialog/Modal: sheet-like surface, no horizontal scroll, sticky header only when content can scroll vertically.
- Progress: semantic `progressbar`, rounded track, smooth indicator transition, accessible label.
- Timer controls: start/pause is primary; skip/reset are secondary. Do not hide essential controls behind menus.
- Duration editor: one duration field in `m:ss`, plus small steppers and presets. Do not split minutes and seconds into separate fields.

## Interaction Rules

- Use short transitions: 150ms to 300ms.
- Use press feedback on buttons with `active:scale-95`.
- Interactive controls use `touch-action: manipulation` to reduce mobile tap delay.
- Use haptic/audio feedback only for meaningful timer events: step transition and routine completion.
- Avoid decorative animation that competes with the timer.
- Respect reduced motion by disabling nonessential transform and opacity animations.

## Accessibility Rules

- Touch targets: minimum `44px`.
- Focus rings must be visible.
- Color contrast must remain readable in light and dark mode.
- Icon-only buttons require `aria-label`.
- Progress indicators require accessible names.
- Dialogs require `aria-labelledby` and `aria-describedby`.
- Do not rely on color alone to communicate selected state; preserve text, shape, or position cues.

## AI Editing Rule

When asking AI to change the UI, include:

```text
Follow docs/design-system.md. Reuse existing tokens and components. Do not add one-off colors, shadows, radii, or layout rules unless the design system is updated too.
```
