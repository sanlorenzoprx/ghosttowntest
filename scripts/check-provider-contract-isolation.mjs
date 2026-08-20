import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const runtimeDir = path.join(root, "tests", "runtime");
const prohibited = [
  /api\.stripe\.com/i,
  /aiplatform\.googleapis\.com/i,
  /dataforseo/i,
  /podcastindex/i,
  /youtube\.googleapis\.com/i,
  /generativelanguage\.googleapis\.com/i
];

const failures = [];
for (const name of fs.readdirSync(runtimeDir)) {
  if (!/\.(ts|tsx)$/.test(name)) continue;
  const file = path.join(runtimeDir, name);
  const text = fs.readFileSync(file, "utf8");
  for (const rule of prohibited) {
    if (rule.test(text)) failures.push(`${name}: contains external provider endpoint/token pattern ${rule}`);
  }
}

if (failures.length) {
  console.error("PROVIDER_CONTRACT_ISOLATION_FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PROVIDER_CONTRACT_ISOLATION_OK");
