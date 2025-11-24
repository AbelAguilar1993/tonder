// scripts/copy-css.cjs
const fs = require("fs");
const path = require("path");

const SRC = path.resolve("public/styles/app.css");
const DEST_DIR = path.resolve("out/styles");
const DEST = path.join(DEST_DIR, "app.css");

if (!fs.existsSync(SRC)) {
  console.error("❌ CSS-kilde mangler:", SRC);
  process.exit(1);
}
fs.mkdirSync(DEST_DIR, { recursive: true });
fs.copyFileSync(SRC, DEST);
const bytes = fs.statSync(DEST).size;
console.log(`✅ Kopieret: ${SRC} → ${DEST} (${bytes} bytes)`);
