const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const appJs = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");

test("catalog personalization section exists for custom keychains and preview rendering", () => {
  assert.match(appJs, /Personaliza tu llavero|keychain|logoUpload|render.*personal/i);
  assert.match(css, /\.customizer-shell|\.keychain-preview|\.customizer-upload/i);
  assert.doesNotMatch(appJs, /product-customizer-input|product-customizer-panel/i);
});
