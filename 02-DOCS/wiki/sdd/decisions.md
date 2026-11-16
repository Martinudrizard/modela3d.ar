# SDD decisions

Append-only log of the decisions taken while running the rsc-sdd chain. The
constitution is the highest-order record; this file holds the decisions taken inside
a phase. Entries are never rewritten — a changed decision is a new entry that points
at the one it replaces.

---

## 2026-10-22 — The storefront rebuild is a program of slices, not one change

**Decision**: The rebuild ships as a parent spec (`frontend-rebuild`) plus twelve
ordered sub-specs, each planned, built and verified on its own.

**Why**: The request spans the visual system, the catalog, checkout, a 3D
configurator, discovery, measurement and the admin — subsystems that share a look
but not a risk profile. One change would break the 400-line review budget, could not
be verified in a single pass, and would put the only working sales channel behind a
single unreviewed diff.

**Options considered**:
- One big-bang relaunch — rejected: unverifiable while the storefront has no
  behavioural tests, and it risks taking down the channel that currently works.
- Reskin only — rejected as the whole program; kept as the `design-system` slice,
  because it is genuinely the cheapest visible win.
- Ordered, independently verifiable slices — chosen.

**Consequence**: the current storefront keeps serving traffic until a slice is
verified; the slices are ordered by dependency, not by excitement.

---

## 2026-10-22 — The test harness is the first slice, not a later one

**Decision**: `frontend-test-harness` is the first sub-spec to be planned and built.

**Why**: The constitution forbids tests that assert on source text, and the two
storefront test files do exactly that — they read `app.js` and `styles.css` and
match them with regular expressions. Without an executed, DOM-capable suite, no
later slice can satisfy the constitution's Definition of Done, and the promise that
the rebuild does not change live prices, live images or cart contents cannot be
demonstrated. That promise is the user's hard constraint.

**Options considered**:
- Design first, tests later — rejected: the first design slice touches catalog
  rendering, prices and the cart at once, with nothing to catch a regression.
- A hand-rolled DOM stub — rejected: it re-implements the browser, so every future
  test would assert against a fiction instead of the platform.
- A real DOM-capable runner plus lint plus type check behind one command — chosen.

---

## 2026-10-22 — Frontend stack: the platform, not a framework

**Decision**: The storefront stays on native ES modules with JSDoc types checked in
strict mode, CSS with design tokens, a 3D library vendored locally and loaded
lazily, and one test runner for the whole repository. No bundler, no compile step,
no framework, no change to the deploy pipeline.

**Why**: The storefront is 3407 lines of untested code sharing one global scope,
while the backend is production-grade and tested. Under a hard "do not break what
works" constraint, a rewrite of behaviour that cannot be proven equivalent is the
riskiest possible move; a modular refactor on the platform's own primitives keeps
every step reviewable and every deploy unchanged.

**Options considered**:
- React / Next.js — rejected: a rewrite under this constraint is unverifiable, and it
  changes the deploy model the business already runs on.
- A bundler-based setup (Vite) — rejected for now: it adds a build step to a static
  site that has none. Revisitable if a slice genuinely needs it.
- Native ES modules + JSDoc + type check + one runner — chosen.

**Status**: recorded in the constitution as principle 2. Changing it later is a MAJOR
amendment and needs a decision-log entry like this one.

---

## 2026-10-22 — The spec exit gate ships with the repository

**Decision**: The exit gate for the `specify` phase lives in the repository as
`scripts/spec-gate.js`, wired as `npm run spec:gate`, and is watched by
`tests/spec-gate.test.js`.

**Why**: The phase defines an exit gate but the tool that enforces it was not
present in the workspace, so no spec could be closed against it. A gate that cannot
be run is a gate that gets ignored.

**Note**: the gate checks structure, emptiness, template leftovers and the typing of
open points. It explicitly does not check whether the spec is worth building — that
stays with the human.
