#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { manifest, source, verifySnapshot } = require('../templates/agent-template.js');

function validate(destination, { exact = false } = {}) {
  const root = path.resolve(destination);
  const errors = [], changed = [], actual = [];
  verifySnapshot();
  if (!fs.existsSync(root) || fs.lstatSync(root).isSymbolicLink() || !fs.statSync(root).isDirectory()) {
    return { ok: false, root, errors: ['Destination must be a real directory'], changed };
  }
  const expectedDirs = new Set(Object.keys(manifest).flatMap(name => {
    const parts = name.split('/');
    return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
  }));
  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const name = prefix + entry.name;
      if (entry.isSymbolicLink()) { errors.push(`Symlink not allowed: ${name}`); continue; }
      if (!prefix && entry.isDirectory() && ['.git', 'node_modules'].includes(entry.name)) continue;
      if (entry.isDirectory()) {
        if (!expectedDirs.has(name)) errors.push(`Unexpected directory: ${name}`);
        walk(path.join(dir, entry.name), name + '/');
      } else if (entry.isFile()) actual.push(name);
      else errors.push(`Unsupported file type: ${name}`);
    }
  }
  walk(root);
  const actualSet = new Set(actual);
  for (const name of Object.keys(manifest)) if (!actualSet.has(name)) errors.push(`Missing: ${name}`);
  for (const name of actual) {
    if (!Object.hasOwn(manifest, name)) { errors.push(`Unexpected file: ${name}`); continue; }
    const content = fs.readFileSync(path.join(root, name));
    if (crypto.createHash('sha256').update(content).digest('hex') !== manifest[name]) changed.push(name);
    if (name.endsWith('.js')) {
      const mode = name.startsWith('public/') ? 'module' : 'commonjs';
      const check = spawnSync(process.execPath, [`--input-type=${mode}`, '--check'], {
        input: content, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024,
      });
      if (check.status !== 0) errors.push(`Syntax error in ${name}: ${check.error?.message || check.stderr}`);
    }
  }
  if (actualSet.has('package.json')) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
      if (pkg.type && pkg.type !== 'commonjs') errors.push('Root package must use CommonJS');
      if (pkg.main !== 'server.js') errors.push('package.main must remain server.js');
      if (pkg.scripts?.start !== 'node server') errors.push('Keep the upstream start script: node server');
      if (Object.keys(pkg.dependencies || {}).length) errors.push('Baseline architecture has no runtime dependencies');
    } catch (error) { errors.push(`Invalid package.json: ${error.message}`); }
  }
  if (exact) for (const name of changed) errors.push(`Content differs from pinned source: ${name}`);
  return { ok: errors.length === 0, root, mode: exact ? 'exact' : 'structure', commit: source.commit,
    expectedFiles: Object.keys(manifest).length, actualFiles: actual.length, changed, errors };
}
module.exports = { validate };
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (!args[0] || args[0].startsWith('--') || args.slice(1).some(a => a !== '--exact') || args.length > 2) {
      throw new Error('Usage: node validate.js <app-directory> [--exact]');
    }
    const result = validate(args[0], { exact: args.includes('--exact') });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
