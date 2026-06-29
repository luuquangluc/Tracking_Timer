---
name: bmad-create-ux
description: >
  BMAD Method: Collaborative UX design — screens, flows, interactions, and
  visual patterns. Use when user says "create UX", "CU", "UX design",
  "design the UX", "user experience design", or needs user experience planning.
  Phase 2 Planning workflow. Recommended for UI-heavy projects.
---

# BMAD Create UX Design Workflow

This skill activates the BMAD UX Design workflow. It creates comprehensive
UX design specifications through collaborative visual exploration and
informed decision-making.

## Activation

When this skill is triggered, load and follow the workflow directly:

Read fully and follow: `_bmad/bmm/workflows/2-plan-workflows/create-ux-design/workflow.md`

The workflow uses step-file architecture with steps in `steps/` directory.
- Configuration loading from `_bmad/bmm/config.yaml`
- Template: `_bmad/bmm/workflows/2-plan-workflows/create-ux-design/ux-design-template.md`
- Output: UX design specification in planning artifacts directory

## Workflow Steps (14 Steps + 1 Conditional Branch)

1. **step-01-init** — Workflow initialization, input document discovery, continuation detection
   - ↳ **step-01b-continue** — Continuation handler (conditional: auto-loaded if existing incomplete document found)
2. **step-02-discovery** — UX discovery and user insights
3. **step-03-core-experience** — Core experience definition
4. **step-04-emotional-response** — Emotional response and feel definition
5. **step-05-inspiration** — UX pattern analysis and inspiration gathering
6. **step-06-design-system** — Design system choice and strategy
7. **step-07-defining-experience** — Core interaction and experience mechanics
8. **step-08-visual-foundation** — Visual design foundation (colors, typography, spacing)
9. **step-09-design-directions** — Design direction mockups and visual explorations
10. **step-10-user-journeys** — User journey flows and interaction design
11. **step-11-component-strategy** — Component strategy and custom specifications
12. **step-12-ux-patterns** — UX consistency patterns for common interactions
13. **step-13-responsive-accessibility** — Responsive design and accessibility strategy
14. **step-14-complete** — Workflow completion, status update, next steps

## Commonly Missed Steps

- ⚠️ **step-12-ux-patterns** — Agents may skip UX consistency patterns after component strategy feels complete. These patterns prevent inconsistent implementations across the application.
- ⚠️ **step-13-responsive-accessibility** — Accessibility and responsive strategies are commonly deprioritized but are critical for implementation quality.
- ⚠️ **step-14-complete** — Final completion step that updates workflow status files. Must not be skipped.

## Replit Task List Integration

**MANDATORY on activation:** Before beginning Step 1, create a Replit task list using the `write_task_list` tool with one task per workflow step listed above (14 sequential steps; if step-01b continuation is triggered, add it as a task dynamically). Each task should include the step number and name (e.g., "Step 1: Init — Workflow initialization, input document discovery"). Mark the first task as `in_progress`. As you complete each step, immediately mark its task as `completed` (architect_reviewed: "not_applicable", reason: "BMAD workflow step — planning/facilitation, not code") and mark the next task as `in_progress`. This gives the user visible progress tracking throughout the workflow.

## Critical Rules

- NEVER skip steps or optimize the sequence
- NEVER auto-proceed past WAIT points — stop and wait for user input
- ALWAYS read each step file completely before taking action
- ALWAYS follow step-file architecture: load one step at a time, never look ahead
- ALWAYS update frontmatter stepsCompleted before loading next step
- ALWAYS halt at menus and wait for user selection
- This is a PARTNERSHIP — collaborative visual exploration as equals

## What's Next

After creating UX design, the typical next steps are:
- **Create Architecture (CA)** — if not yet done
- **Create Epics (CE)** — if architecture is complete
