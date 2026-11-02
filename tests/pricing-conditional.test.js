const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");

test("discount label is conditional and not rendered for all products", () => {
  assert.doesNotMatch(css, /\.product-price::before\s*\{[\s\S]*?content:\s*["']Ahora["']/m);
  assert.doesNotMatch(css, /\.product-detail-price::before\s*\{[\s\S]*?content:\s*["']Ahora["']/m);
  assert.match(css, /\.product-price\.is-discounted::before\s*\{[\s\S]*?content:\s*["']Ahora["']/m);
  assert.match(css, /\.product-detail-price\.is-discounted::before\s*\{[\s\S]*?content:\s*["']Ahora["']/m);
});
