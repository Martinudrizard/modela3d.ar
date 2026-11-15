const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const appJs = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");

test("catalog navidad section exists as a product subsection with navidad styling", () => {
  assert.match(appJs, /Navidad/i);
  assert.match(appJs, /PRODUCT_SUBSECTIONS.*Navidad|\[.*Navidad.*\]/i);
  assert.match(css, /\.navidad-section/i);
  assert.doesNotMatch(appJs, /Personaliza tu llavero|keychain|customizer-shell/i);
});
