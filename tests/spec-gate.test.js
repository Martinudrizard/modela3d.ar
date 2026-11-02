const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { checkSpec } = require("../scripts/spec-gate.js");

const GATE = path.join(__dirname, "..", "scripts", "spec-gate.js");

const GOOD_SPEC = `---
type: spec
title: Spec — Example
description: Example spec used by the gate test.
tags: [sdd, spec]
timestamp: 2026-10-22T00:00:00Z
topic: sdd
slug: example
status: draft
---

# Spec — Example

## Problem & why
Something hurts.

## Cost of not building it
It keeps hurting.

## The cheapest alternative
Do it manually.

## Goals
- One goal.

## Non-goals / out of scope
- Not this.

## Users & context
A buyer.

## Behaviour
- Main path: works.

## Acceptance criteria
- Given a thing, When it happens, Then it works.

## Points to clarify
- **pregunta abierta** — Is it?
`;

function writeFixture(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-gate-"));
  const file = path.join(dir, "spec.md");
  fs.writeFileSync(file, content, "utf8");
  return file;
}

test("spec-gate passes a complete spec", () => {
  const result = checkSpec(writeFixture(GOOD_SPEC));
  assert.deepEqual(result.problems, []);
});

test("spec-gate reports a missing section", () => {
  const broken = GOOD_SPEC.replace("## Acceptance criteria\n- Given a thing, When it happens, Then it works.\n", "");
  const result = checkSpec(writeFixture(broken));
  assert.ok(result.problems.some((p) => p.includes("Acceptance criteria")));
});

test("spec-gate reports an empty section", () => {
  const broken = GOOD_SPEC.replace("## Goals\n- One goal.", "## Goals\n");
  const result = checkSpec(writeFixture(broken));
  assert.ok(result.problems.some((p) => p.includes("Goals") && p.includes("empty")));
});

test("spec-gate reports leftover template guidance", () => {
  const broken = GOOD_SPEC.replace("Something hurts.", "<The pain, who feels it, and the cost of leaving it unsolved.>");
  const result = checkSpec(writeFixture(broken));
  assert.ok(result.problems.some((p) => p.includes("template guidance")));
});

test("spec-gate reports an untyped open point", () => {
  const broken = GOOD_SPEC.replace("- **pregunta abierta** — Is it?", "- Is it?");
  const result = checkSpec(writeFixture(broken));
  assert.ok(result.problems.some((p) => p.includes("untyped open point")));
});

test("spec-gate reports missing frontmatter", () => {
  const broken = GOOD_SPEC.replace(/^---\n[\s\S]*?\n---\n/, "");
  const result = checkSpec(writeFixture(broken));
  assert.ok(result.problems.some((p) => p.includes("frontmatter")));
});

test("the specs in this repository close the gate", () => {
  const output = execFileSync(process.execPath, [GATE], { cwd: path.join(__dirname, ".."), encoding: "utf8" });
  assert.match(output, /PASS /);
  assert.doesNotMatch(output, /FAIL /);
});
