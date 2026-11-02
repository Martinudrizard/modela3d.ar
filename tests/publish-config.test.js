const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const NETLIFY_TOML = fs.readFileSync(path.join(ROOT, "netlify.toml"), "utf8");

test("Netlify publishes only the built public directory", () => {
  assert.match(NETLIFY_TOML, /^ {2}publish = "dist"$/m);
  assert.match(NETLIFY_TOML, /^ {2}command = "npm run build"$/m);
});

test("the public build ships the storefront without internal files", () => {
  execFileSync(process.execPath, [path.join(ROOT, "scripts", "build-public.js")], {
    cwd: ROOT,
    stdio: "ignore",
  });

  const dist = path.join(ROOT, "dist");

  assert.ok(fs.existsSync(path.join(dist, "index.html")));
  assert.ok(fs.existsSync(path.join(dist, "app.js")));
  assert.ok(fs.existsSync(path.join(dist, "catalog-utils.js")));
  assert.ok(fs.existsSync(path.join(dist, "styles.css")));

  for (const internal of ["netlify", "tests", "scripts", "02-DOCS", ".env", "package.json"]) {
    assert.equal(fs.existsSync(path.join(dist, internal)), false, `${internal} must not be published`);
  }
});
