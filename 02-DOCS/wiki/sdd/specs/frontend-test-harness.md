---
type: spec
title: Spec — Storefront test harness and safety net
description: WHAT and WHY for giving the storefront executable, DOM-level tests and a single verification command, so every later slice of the rebuild can prove it did not change live prices, images, cart or admin behaviour.
tags: [sdd, spec]
timestamp: 2026-10-22T10:58:21Z
topic: sdd
slug: frontend-test-harness
status: draft
---

# Spec — Storefront test harness and safety net

> Slug: `frontend-test-harness` · Status: draft · Created: 2026-10-22
> Inherits: [constitution](../constitution.md) · Parent: [frontend-rebuild](frontend-rebuild.md)

## Problem & why

The storefront's own behaviour is untested. The two front-facing test files do not
exercise the storefront at all — they read the source text and match it with regular
expressions, which the constitution forbids precisely because they pass while the
behaviour breaks. The backend, by contrast, is well covered and green. So the exact
part of the system that is about to be redesigned in twelve slices is the exact part
nobody can demonstrate anything about. The business asked for a rebuild that does not
break the loaded images, the prices or anything else already working, and today that
promise rests on inspection.

## Cost of not building it

The first serious design slice touches catalog rendering, price display, the cart and
the admin form. A regression in any of them is invisible: the store keeps serving, so
nothing breaks loudly — a product quietly loses its image, or a discounted price is
computed with the wrong rule, or the cart stops counting quantity. The report arrives
days later, from a customer, with no way to point at the change that caused it. Every
later slice gets riskier and slower, because each one needs a human to reason about
what a diff might have broken. And the constitution's own quality bar — no test may
assert on source text — cannot be satisfied without this slice, which means no later
slice can legitimately merge.

## The cheapest alternative

Keep the current test runner and hand-write a minimal DOM stub: a few hundred lines
that fake element creation, event listeners and class lists. It avoids adding any
dependency and it starts the same day. It is not enough, because the stub would be a
fiction of the browser: no real event dispatch, no real focus or visibility semantics,
no real form values, no real timers. Every future storefront test would then assert
against the stub's behaviour instead of the platform's, and the stub would grow into a
second browser that nobody maintains and nobody trusts. A second, smaller alternative
is to defer testing until after the redesign — but then the redesign is the very thing
that has no safety net.

## Goals

- Every test that exists today still runs and still passes, with the same coverage of
  the backend, and with no change to what those tests assert.
- The storefront's user-visible behaviour — rendering the catalog, filtering it,
  calculating and displaying prices, holding the cart, handing off to WhatsApp, and
  saving a product from the admin — is covered by tests that execute the storefront's
  code and fail when that behaviour breaks.
- One command runs the whole gate: lint, type check and tests, and it exits with
  failure when any of the three reports a problem.
- Type errors in storefront code are reported by that command, not discovered at
  runtime by a customer.
- The suite runs with no browser installed, no network access and no external service.
- A test failure names the behaviour that broke, in plain language, so the person
  reading it knows what to fix without reading the implementation.

## Non-goals / out of scope

- Restructuring the storefront into modules. The harness must work against the
  storefront as it stands today; the restructuring is a later slice.
- Reaching a coverage percentage. Coverage is a signal, not a goal.
- Screenshot or visual-regression testing.
- End-to-end testing against the deployed site or against live storage.
- Changing how the backend is tested.
- Changing what the storefront does. This slice changes how the storefront is
  verified, and nothing about its behaviour.
- Introducing a bundler, a transpiler or a compile step for the storefront.

## Users & context

- **The developer** picks up a slice, changes something, and needs to know in seconds
  whether it is safe.
- **The reviewer** reads a diff and needs to trust that the claim "this does not change
  prices" is backed by something that runs.
- **The owner** needs the certainty that the redesign cannot silently break the
  catalog that is already loaded and selling.

## Behaviour

- Main path: one command runs everything and reports each part's outcome separately,
  so a type error and a test failure are told apart instead of collapsing into one
  red mark.
- Every storefront behaviour that is currently only asserted by reading source is now
  asserted by running it: the same catalog the owner loaded appears, the same price
  appears, the same cart contents survive a reload, the same WhatsApp message is
  produced.
- Edge cases: a test that needs the page present gets a real page to work against; a
  test that needs the network gets a controlled substitute; a test that needs to wait
  for time to pass can do so deterministically; a test whose subject throws for an
  unexpected reason fails with that reason, not as a silent pass.
- Error paths: a failing assertion reports the expected and the actual value. A
  missing or broken fixture fails loudly at the start of the run rather than halfway
  through it.

## Acceptance criteria

- Given the repository as it stands, When the gate command runs, Then it executes the
  existing suite, the existing suite's assertions are unchanged, and the result is
  green.
- Given a storefront behaviour that is currently asserted by reading source text,
  When that behaviour breaks, Then at least one executed test fails, and the failure
  reports the expected value and the actual value.
- Given a storefront behaviour that is currently asserted by reading source text,
  When that behaviour is correct, Then the executed test passes without the source
  text being read.
- Given the gate command runs, When the lint step reports a problem, Then the command
  fails and names the file and the rule.
- Given the gate command runs, When the type check reports an error in storefront code,
  Then the command fails and names the file and the line.
- Given the gate command runs, When a test fails, Then the command fails and reports
  which test, and the remaining tests still run.
- Given a test needs a page to work against, When it runs, Then it has a real document
  with working elements, attributes, events and form values.
- Given the suite runs, When the machine has no network and no browser installed,
  Then the suite still runs green.
- Given the whole suite runs, When it is inspected, Then no test in it asserts on the
  literal text of a source file.

## Points to clarify

- **suposición tomada** — The existing source-text assertions are replaced by
  behaviour assertions rather than deleted. *Base:* the constitution forbids the former,
  and the behaviours they were standing in for are worth protecting. *Riesgo:* if some
  of those tests were guarding a property that no real behaviour assertion covers, that
  property becomes unguarded and must be re-established as an explicit check.
- **suposición tomada** — The harness works against the storefront in its current
  single-file shape; no module boundary is introduced by this slice. *Base:* the
  restructuring is a separate slice with its own plan, and coupling the two would make
  both harder to verify. *Riesgo:* the harness's own helpers may need rework once the
  storefront is modular, which is a known and bounded cost.
- **suposición tomada** — Linting is enabled in this slice even though the repository
  has no linter today, because the constitution's definition of done requires a lint
  step that is clean. *Base:* a gate that cannot check lint cannot satisfy the
  constitution. *Riesgo:* enabling a linter over existing code may surface many
  warnings; the slice's own plan decides how much is fixed now versus grandfathered,
  and that decision belongs to the plan, not here.
- **suposición tomada** — The gate stays reachable as `npm test`, so the constitution's
  Definition of Done needs no wording change, and a separate command exposes the
  same gate plus the extra steps the release flow wants. *Base:* the constitution
  names `npm test` as the gate that has to be green before merge. *Riesgo:* if the
  gate grows slow enough that developers stop running it, the command has to split
  into a fast subset and a full one, and the constitution's wording has to follow.
- **suposición tomada** — The harness drives the storefront through the page itself,
  the way a browser loads it, with the smallest possible seam if that turns out to be
  impossible; the storefront does not become a module tree in this slice. *Base:* the
  full restructuring belongs to later slices, and coupling it here would make both
  harder to verify. *Riesgo:* if the seam has to grow to make the storefront testable,
  this slice starts carrying restructuring work that belongs to the catalog and shell
  slices, and it should be re-scoped rather than allowed to sprawl.
- **pregunta abierta** — Should the storefront's type checking be strict from this
  slice, or should the existing code be marked as not-yet-checked and tightened
  progressively as the slices land? clarify asks this, because it changes whether
  this slice can merge green on day one.
- **decisión diferida** — Visual regression testing and end-to-end testing against the
  deployed site. clarify leaves them out of this cycle; both need infrastructure
  that does not exist yet.
- **área no formulable** — The owner's own tolerance for a gate that is slower than
  the current one. clarify notes it; if the gate turns out to be too slow to be run
  before every commit, the plan has to answer it with caching or splitting, not with
  lowering the bar.
