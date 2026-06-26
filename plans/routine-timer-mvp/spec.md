# Routine Timer MVP Spec

Runnable static web MVP for a multi-step routine timer with local habit progression. Target score is 9/10 for correctness, completeness, edge cases, and craft.

## Lighthouse Optimization Addendum

Optimize the production build against `eval_ui.json`, a Lighthouse 13.2.0 mobile report for `http://127.0.0.1:8768/`.

Testable behaviors:
- All rendered progressbars have accessible names.
- Production HTML includes a useful meta description.
- `robots.txt` is valid and served as text.
- Static hashed assets receive long-lived immutable cache headers.
- Missing asset-like paths return 404 instead of the app shell.

Implementation parallelism: Sequential
Reason: Empty repo and tightly coupled first app shell; local controller can integrate faster than splitting files across agents.

Parallelization Strategy:
- Can parallelize: no
- Implementation lanes: one production-quality lane covering `index.html`, `public/robots.txt`, `src/components/ui/progress.jsx`, `src/App.jsx`, `scripts/static-server.cjs`, and smoke coverage.
- Sequential dependencies: build must copy public assets before server response checks; progress component must be patched before app-level labels are meaningful.
- Verification: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run smoke`, and static server response checks for robots/cache/fallback behavior.
- Recommended Phase 3 Agent Split Gate input: Local only, because the Lighthouse fixes touch shared app shell and server behavior with small edit boundaries.
