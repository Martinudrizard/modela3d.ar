const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "dist");

const FILES = ["index.html", "app.js", "styles.css"];
const DIRECTORIES = ["assets"];

function copyFile(relativePath) {
  const from = path.join(ROOT, relativePath);
  if (!fs.existsSync(from)) {
    throw new Error(`Missing public file: ${relativePath}`);
  }
  fs.cpSync(from, path.join(OUT, relativePath), { recursive: true });
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const file of FILES) {
  copyFile(file);
}

for (const directory of DIRECTORIES) {
  copyFile(directory);
}

console.log(`Built ${path.relative(ROOT, OUT)} with ${FILES.length} files and ${DIRECTORIES.length} directories.`);
