# Routine Timer UX/UI Target 9.5 Plan

Gate: PROCEED - frontend UX/UI improvement with locked rubric and target 9.5.

Intent: DELIVER - improve the static Routine Grove app.

Mode: Auto recommended - local controller implementation with multi-agent evaluation.

## Parallelization Strategy

Implementation parallelism: Sequential
Reason: the app is a tightly coupled static MVP where `index.html`, `styles.css`, and `app.js` change together.

Can parallelize: yes, for evaluation only.

Implementation lanes:
- Controller: edit `index.html`, `styles.css`, and `app.js`.
- Evaluator A: score mobile-first UX and layout stability against the rubric.
- Evaluator B: score routine CRUD, timer clarity, analytics, and gamification against the rubric.

Sequential dependencies:
- Update editor and rendering behavior first.
- Polish CSS after DOM contract is stable.
- Run local browser verification before agent evaluation.

Verification:
- `node --check app.js`
- Local HTTP server smoke test.
- Browser DOM checks for desktop and mobile sizes.
- Multi-agent rubric evaluation with evidence.

Recommended Phase 3 Agent Split Gate input: Spawn for evaluation, Local only for implementation.

## Implementation Tasks

1. Improve routine editing UX with seconds input, step summary, up/down reorder controls, and better mobile layout.
2. Improve timer and step queue readability with clearer active/complete states and action button polish.
3. Improve reward loop and analytics with a persistent reward summary, richer achievements, and better weekly pulse labels.
4. Tighten accessibility and mobile-first CSS for touch target size, contrast, overflow, and stable dimensions.
