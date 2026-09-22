#!/usr/bin/env node
/* Runs a command with DEEPSEEK_API_KEY injected from the DPAPI store, and nowhere else.
 *
 * The key is decrypted by scripts/secret-store.ps1 -Read, travels over the child pipe into this
 * process's memory, and is placed in the ENVIRONMENT OF THE SPAWNED COMMAND ONLY. It is never
 * printed, never written to disk, never exported to the parent shell, and this wrapper refuses to
 * run without a stored key rather than falling back to anything less deliberate.
 *
 *   node scripts/with-deepseek.mjs node pipeline/ontology_expand.mjs --all
 *   npm run ontology:expand                          (the same, packaged)
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cmd = process.argv.slice(2);
if (!cmd.length) {
  console.log('usage: node scripts/with-deepseek.mjs <command> [args...]');
  process.exit(1);
}

const read = spawnSync('powershell.exe',
  ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'scripts', 'secret-store.ps1'), '-Read'],
  { encoding: 'utf8' });

const key = (read.status === 0 && read.stdout) ? read.stdout.trim() : '';
if (!key) {
  console.log('No stored DeepSeek key. Store one, once, with a hidden prompt in your own terminal:');
  console.log('  npm run secret:deepseek');
  process.exit(2);
}

const child = spawnSync(cmd[0], cmd.slice(1), {
  stdio: 'inherit',
  shell: process.platform === 'win32',      // resolve node/npm shims on Windows
  env: { ...process.env, DEEPSEEK_API_KEY: key }
});
process.exit(child.status === null ? 1 : child.status);
