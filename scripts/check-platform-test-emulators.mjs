import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const allowlistPath = path.join(root, "tests", "runtime", "platform-emulator-allowlist.json");
const allowlist = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
const allowed = new Set(allowlist.files || []);

const patterns = [
  /as unknown as D1Database/,
  /as D1Database/,
  /class\s+MemoryKv\b/,
  /as unknown as R2Bucket/,
  /as R2Bucket/,
  /as unknown as KVNamespace/,
  /as KVNamespace/,
  /\bprepare\s*:\s*\(/,
  /\bBLUEPRINTS\s*:\s*\{/,
  /\bKV\s*:\s*\{/
];

const failures = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "runtime") continue;
      walk(full);
      continue;
    }
    if (!/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
    const rel = path.relative(root, full).replace(/\\/g, "/");
    const text = fs.readFileSync(full, "utf8");
    const hasEmulator = patterns.some(pattern => pattern.test(text));
    if (hasEmulator && !allowed.has(rel)) {
      failures.push(rel);
    }
  }
}
walk(path.join(root, "tests"));

if (failures.length) {
  console.error("PLATFORM_EMULATOR_FORBIDDEN");
  console.error("Use Cloudflare runtime bindings (env.DB/env.KV/env.BLUEPRINTS) instead of adding new platform emulators.");
  console.error("Only existing grandfathered business/failure tests may remain on the allowlist.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`PLATFORM_EMULATOR_GUARD_OK grandfathered=${allowed.size}`);
