const childProcess = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { syncBuiltinESMExports } = require('node:module');

const originalSpawnSync = childProcess.spawnSync;

function runtimePath(fileName) {
  const directory = join(process.cwd(), '.roadmap-autopilot');
  mkdirSync(directory, { recursive: true });
  return {
    absolute: join(directory, fileName),
    relative: `.roadmap-autopilot/${fileName}`
  };
}

function normalizeWindowsShellArgs(command, args, options) {
  if (process.platform !== 'win32' || !Array.isArray(args) || options?.shell !== true) {
    return args;
  }

  // Node's shell:true path on Windows can flatten a single Wrangler --command
  // SQL argument into many cmd.exe tokens. Convert the SQL to --file so Wrangler
  // receives an unambiguous argument boundary.
  const commandIndex = args.indexOf('--command');
  if (commandIndex >= 0 && typeof args[commandIndex + 1] === 'string') {
    const sql = args[commandIndex + 1];
    const file = runtimePath('wrangler-d1-query.sql');
    writeFileSync(file.absolute, `${sql}\n`, 'utf8');
    const normalized = [...args];
    normalized.splice(commandIndex, 2, '--file', file.relative);
    return normalized;
  }

  // The roadmap runner also uses `node -e` for a generated bundle assertion.
  // Persist that code to a CJS file so cmd.exe cannot split or reinterpret it.
  const executable = String(command).toLowerCase().replace(/\\/g, '/').split('/').pop();
  if ((executable === 'node' || executable === 'node.exe') && args[0] === '-e' && typeof args[1] === 'string') {
    const file = runtimePath('inline-node-check.cjs');
    writeFileSync(file.absolute, `${args[1]}\n`, 'utf8');
    return [file.relative, ...args.slice(2)];
  }

  return args;
}

childProcess.spawnSync = function patchedSpawnSync(command, args, options) {
  return originalSpawnSync.call(
    childProcess,
    command,
    normalizeWindowsShellArgs(command, args, options),
    options
  );
};

// `production-roadmap-autopilot.mjs` imports spawnSync from node:child_process.
// Synchronize the patched CommonJS export into Node's built-in ESM named exports
// before the roadmap module is loaded.
syncBuiltinESMExports();
