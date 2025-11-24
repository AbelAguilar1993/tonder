// scripts/run-tailwind.cjs
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

function resolveBin(pkgName, binKey) {
  try {
    const pkgPath = require.resolve(`${pkgName}/package.json`, { paths: [process.cwd()] });
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    let binRel = null;

    if (binKey && pkg.bin && typeof pkg.bin === "object" && pkg.bin[binKey]) {
      binRel = pkg.bin[binKey];
    } else if (pkg.bin && typeof pkg.bin === "string") {
      binRel = pkg.bin;
    } else if (pkg.bin && typeof pkg.bin === "object") {
      const first = Object.values(pkg.bin)[0];
      if (first) binRel = first;
    }

    if (!binRel) return null;
    return path.resolve(path.dirname(pkgPath), binRel);
  } catch {
    return null;
  }
}

function resolveTailwindCli() {
  // v4+: CLI er i @tailwindcss/cli (bin hedder "tailwindcss")
  const cliV4 = resolveBin("@tailwindcss/cli", "tailwindcss");
  if (cliV4) return cliV4;

  // v3 fallback: CLI lå i tailwindcss-pakken (bin: "tailwindcss")
  const cliV3 = resolveBin("tailwindcss", "tailwindcss");
  if (cliV3) return cliV3;

  console.error(
    "❌ Kunne ikke finde Tailwind CLI.\n" +
    "Kør: npm i -D @tailwindcss/cli (for v4) eller tailwindcss (for v3)"
  );
  process.exit(1);
}

const cli = resolveTailwindCli();
const args = process.argv.slice(2);
const res = spawnSync(process.execPath, [cli, ...args], { stdio: "inherit" });
process.exit(res.status ?? 0);
