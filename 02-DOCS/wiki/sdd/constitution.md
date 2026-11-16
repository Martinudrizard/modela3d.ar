---
type: constitution
title: Modela3D.ar — Constitution
description: The non-negotiable principles every rsc-sdd phase obeys.
tags: [sdd, constitution]
timestamp: 2026-10-22T13:50:00Z
topic: sdd
version: v1.0.0-draft
---

# Modela3D.ar — Constitution

> Version: v1.0.0-draft · Drafted: 2026-10-22 · Ratified: — pending human sign-off —
> The non-negotiable principles every rsc-sdd phase obeys. Stack mechanics live in
> `02-DOCS/wiki/stack/*`; this file ratifies the principle and links the detail.
> Every principle is in force from now on; what is pending is the human signature on
> the document itself.

## 1. Stack canon

1. **Backend is fixed**: Netlify Functions (Node 24, CommonJS) + `@netlify/blobs` +
   Mercado Pago Checkout Pro + Google/email customer identity. It is tested and it works;
   a storefront rebuild does not touch it. Detail: `02-DOCS/wiki/stack/backend.md`.
2. **Frontend stack: native ES modules, no framework, no bundler, no build step.**
   Types are written as JSDoc and checked in strict mode; CSS declares design tokens
   once; the 3D library is vendored locally and loaded lazily; one DOM-capable runner
   covers the whole repository. Chosen on 2026-10-22 because the storefront's
   behaviour is currently untested and the hard constraint is that nothing already
   working may break — a rewrite of behaviour that cannot be proven equivalent is the
   riskiest available move, while a modular refactor keeps the deploy pipeline
   untouched and lets the tests prove equivalence instead of asserting it.
   Detail: `02-DOCS/wiki/stack/frontend.md`. Changing this is a MAJOR amendment and
   needs an entry in `02-DOCS/wiki/sdd/decisions.md`.
3. Package manager is `npm`, one lockfile, committed. No second lockfile, no yarn/pnpm.

## 2. Quality bar

4. **No test may assert on source text.** A test that reads a file and matches a regex is
   not a test. Frontend behaviour ships only with executable tests that fail when the
   behaviour breaks. (Enforced by `verify`: `tests/` must contain DOM-level tests.)
5. Strict TDD on new behaviour: a failing test that fails for the right reason, then the
   code that makes it pass, then refactor. `testing.strict_tdd` is `true` in
   `02-DOCS/wiki/sdd/config.yaml`.
6. No module exceeds 500 lines. Modules expose an explicit public surface; no file may
   rely on global scope for cross-module state.
7. Types are checked and the type checker passes with zero errors before merge, on the
   frontend and the functions.
8. Code is lint-clean with zero warnings on every commit.

## 3. Conventions

9. Naming: kebab-case files, camelCase identifiers, PascalCase components, `UPPER_SNAKE`
   for constants. One component per file.
10. Function responses use the envelope `{ ok: boolean, error?: string, data?: unknown }`
    with a correct HTTP status. Errors never leak stack traces or secrets to the client.
11. Money is an integer amount of ARS. Never a float. The server recomputes every total
    from the catalog; a client-supplied price is never trusted.
12. Commit messages follow Conventional Commits (`feat(scope):`, `fix(scope):`, `chore:`).

## 4. Branching & shipping

13. Work happens on a feature branch off `main` and lands through a PR. No direct pushes
    to `main`.
14. **Git authorship is the human's.** No `Co-Authored-By` an AI, no "generated with"
    footer. Enforced at the `ship` phase.
15. A PR stays under 400 changed lines (`sdd.review_budget`). Larger work is split into
    a chain of reviewable slices.

## 5. Security & privacy floor

16. **No secret is ever logged** — not fully, and not partially. No fingerprints, no
    prefixes, no suffixes of a secret in any log line, including debug logging.
17. No secret is committed. Every environment variable the code reads is documented in
    `.env.example` with its purpose. A variable the code reads but the example omits is
    a defect.
18. Secrets are compared in constant time. Admin-only write endpoints require
    `ADMIN_PANEL_KEY`; catalog reads stay public.
19. The Content Security Policy stays as strict as the feature set allows. `unsafe-inline`
    in `script-src` is forbidden; `style-src` may only relax for what is actually needed.
20. No new runtime dependency lands without a recorded reason in the decisions log.

## 6. UX / accessibility floor

21. WCAG 2.2 AA: everything reachable by keyboard, visible focus, labelled controls,
    meaningful alt text, `prefers-reduced-motion` honoured.
22. Mobile-first: the primary viewport is 390 px wide. The storefront is judged on a
    phone, not on a laptop.
23. **No duplicate DOM ids.** A repeated `id` in the document is a build-stopping defect:
    `getElementById` silently resolves to the first match and the second node becomes
    dead UI.
24. Every user-visible flow has an explicit loading, empty and error state. Never a
    silent no-op.

## 7. Performance budgets

25. LCP ≤ 2.5 s on a throttled mobile connection. Catalog data payload ≤ 150 KB gzipped.
26. **No N+1 network calls.** One page view may not fan out into one request per item;
    a catalog view is one data request plus at most one image request.
27. No client request may block the UI for more than 10 s. Every fetch has a timeout at
    or below that budget.
28. Images are WebP or AVIF, sized to their rendered box, and carry explicit dimensions.

## 8. Knowledge & decisions

29. Every significant decision is appended to `02-DOCS/wiki/sdd/decisions.md` with date,
    options considered and the why. The constitution is the highest-order decision record.
30. The README documents every environment variable and every user-facing flow. An
    undocumented feature is an undocumented defect.

## Definition of Done (the merge bar `verify` runs against)

A change ships only when ALL hold:

- [ ] Lint clean, zero warnings (principles 7, 8).
- [ ] Type checker passes with zero errors (principle 7).
- [ ] `npm test` green, and every new behaviour has an executable test — no regex-over-source (principles 4, 5).
- [ ] No module over 500 lines; no global-scope coupling (principle 6).
- [ ] Response envelope, money and naming conventions followed (principles 9-11).
- [ ] On a branch, merged via PR, authored by the human, under the line budget (principles 13-15).
- [ ] No secret logged or committed; every env var documented in `.env.example` (principles 16-18).
- [ ] Accessibility, mobile and performance budgets verified (principles 21-28).
- [ ] README and decisions log updated (principles 29, 30).

## Amendment log (append-only)

| Date | Version | Change | Why |
|------|---------|--------|-----|
| 2026-10-22 | v1.0.0-draft | Initial constitution drafted from the storefront audit. | Storefront rebuild kickoff. |
| 2026-10-22 | v1.0.0-draft | Principle 2 resolved: native ES modules, JSDoc types, design tokens, one runner — no framework, no bundler. | The storefront's behaviour is untested and nothing that works may break; a rewrite cannot be proven equivalent. See `02-DOCS/wiki/sdd/decisions.md`. |
