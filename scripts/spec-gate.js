#!/usr/bin/env node
"use strict";

/**
 * spec:gate — the exit gate for the `specify` phase.
 *
 * A spec is closed when every template section carries content or an explicit
 * typed open point, and no section holds an unmarked assumption.
 *
 * Usage: node scripts/spec-gate.js [path ...]
 *   with no path, every spec under 02-DOCS/wiki/sdd/specs is checked.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SPECS_DIR = path.join(ROOT, "02-DOCS", "wiki", "sdd", "specs");

const REQUIRED_SECTIONS = [
  "Problem & why",
  "Cost of not building it",
  "The cheapest alternative",
  "Goals",
  "Non-goals / out of scope",
  "Users & context",
  "Behaviour",
  "Acceptance criteria",
  "Points to clarify",
];

const DATED_SECTIONS = ["Cost of not building it", "The cheapest alternative"];
const DATED_FROM = "2026-09-06";

const OPEN_POINT_TYPES = [
  "pregunta abierta",
  "suposición tomada",
  "decisión diferida",
  "área no formulable",
];

const REQUIRED_FRONTMATTER = ["type", "title", "description", "tags", "timestamp", "topic", "slug", "status"];

const NOT_CHECKED = [
  "Whether the spec is the right thing to build — that is the user's call, not a parser's.",
  "Whether an assumption recorded as a taken supposition actually holds.",
  "Whether every acceptance criterion is truly observable by a machine and not by a person.",
  "Whether the decomposition covers the whole request — no parser can see what was never written down.",
];

function splitFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return { frontmatter: null, body: text };
  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    frontmatter[kv[1]] = kv[2].trim();
  }
  return { frontmatter, body: text.slice(match[0].length) };
}

function parseSections(body) {
  const sections = new Map();
  const lines = body.split(/\r?\n/);
  let current = null;
  let buffer = [];

  const flush = () => {
    if (current) sections.set(current, buffer.join("\n").trim());
  };

  for (const line of lines) {
    const heading = /^##\s+(.*\S)\s*$/.exec(line);
    if (heading) {
      flush();
      current = heading[1];
      buffer = [];
      continue;
    }
    if (current) buffer.push(line);
  }
  flush();
  return sections;
}

function findSpecFiles(targets) {
  if (targets.length > 0) return targets.map((t) => path.resolve(ROOT, t));
  if (!fs.existsSync(SPECS_DIR)) return [];
  return fs
    .readdirSync(SPECS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(SPECS_DIR, f));
}

function checkSpec(file) {
  const problems = [];
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");

  if (!fs.existsSync(file)) {
    return { file: relative, problems: ["file does not exist"] };
  }

  const text = fs.readFileSync(file, "utf8");
  const { frontmatter, body } = splitFrontmatter(text);

  if (!frontmatter) {
    problems.push("missing frontmatter block");
  } else {
    for (const key of REQUIRED_FRONTMATTER) {
      if (!frontmatter[key]) problems.push(`frontmatter is missing "${key}"`);
    }
  }

  const sections = parseSections(body);
  const timestamp = frontmatter ? frontmatter.timestamp : "";
  const dated = Boolean(timestamp) && timestamp.slice(0, 10) >= DATED_FROM;

  for (const name of REQUIRED_SECTIONS) {
    if (!dated && DATED_SECTIONS.includes(name)) continue;
    if (!sections.has(name)) {
      problems.push(`missing section "## ${name}"`);
      continue;
    }
    const content = sections.get(name);
    if (!content) {
      problems.push(`section "## ${name}" is empty`);
      continue;
    }
    if (/^\s*<[^>]+>\s*$/m.test(content)) {
      problems.push(`section "## ${name}" still holds template guidance`);
    }
  }

  if (/^\s*(TODO|TBD|FIXME)\b/im.test(body)) {
    problems.push("body still holds a TODO/TBD/FIXME placeholder");
  }

  const points = sections.get("Points to clarify");
  if (points) {
    const entries = points
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "));
    for (const entry of entries) {
      const typed = OPEN_POINT_TYPES.some((type) => entry.includes(`**${type}**`));
      if (!typed) {
        problems.push(`untyped open point (a point to clarify must name one of: ${OPEN_POINT_TYPES.join(", ")}): "${entry.slice(0, 60)}..."`);
      }
    }
  }

  return { file: relative, problems };
}

function main() {
  const targets = process.argv.slice(2);
  const files = findSpecFiles(targets);

  if (files.length === 0) {
    console.log("spec:gate — no specs found.");
    return 0;
  }

  let failed = 0;
  for (const file of files) {
    const result = checkSpec(file);
    if (result.problems.length === 0) {
      console.log(`PASS ${result.file}`);
      continue;
    }
    failed += 1;
    console.log(`FAIL ${result.file}`);
    for (const problem of result.problems) console.log(`  - ${problem}`);
  }

  console.log("");
  console.log("spec:gate does NOT check:");
  for (const item of NOT_CHECKED) console.log(`  - ${item}`);
  console.log("");
  console.log(failed === 0 ? `spec:gate — ${files.length} spec(s) closed.` : `spec:gate — ${failed} of ${files.length} spec(s) not closed.`);
  return failed === 0 ? 0 : 1;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { checkSpec, parseSections, splitFrontmatter, REQUIRED_SECTIONS, OPEN_POINT_TYPES };
