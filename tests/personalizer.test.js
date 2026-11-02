const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const appJs = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");

test("catalog personalization section is hidden for now while preview logic remains ready", () => {
  assert.doesNotMatch(appJs, /PRODUCT_SUBSECTIONS.*Personaliza tu llavero|\[.*Personaliza tu llavero.*\]/i);
  assert.match(appJs, /customizer-shell|keychainLogoUpload|keychainPreviewName/i);
  assert.match(css, /\.customizer-shell|\.keychain-preview|\.customizer-upload/i);
  assert.doesNotMatch(appJs, /product-customizer-input|product-customizer-panel/i);
});

test("keychain tag width adapts to the entered name length", () => {
  assert.match(appJs, /tagWidth|--tag-width|setProperty\("--tag-width"/i);
  assert.match(appJs, /Math\.min\(370, Math\.max\(180, 110 \+ displayText\.length \* 18\)\)/i);
});
