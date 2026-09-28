#!/usr/bin/env node
'use strict';
// Local agent integration example; these are application-defined tools, not a model SDK.
// CLI: node tool-calling.js <existing-workspace> <new-app-folder-name>
const fs = require('node:fs');
const path = require('node:path');
const { scaffold, agentPrompt } = require('../templates/agent-template.js');
const { validate } = require('../scripts/validate.js');
const toolDefinitions = ['scaffold_app', 'validate_app'].map(name => ({
  type: 'function', name,
  description: name === 'scaffold_app' ? 'Create the pinned starter in a new workspace child directory' : 'Verify app structure or exact source fidelity',
  parameters: {
    type: 'object', additionalProperties: false,
    properties: { folder: { type: 'string', pattern: '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$' },
      ...(name === 'validate_app' ? { exact: { type: 'boolean' } } : {}) },
    required: ['folder'],
  },
}));
function createDispatcher(workspace) {
  const root = fs.realpathSync(workspace);
  if (!fs.statSync(root).isDirectory()) throw new Error('Workspace must be a directory');
  return function dispatch(name, args) {
    if (!toolDefinitions.some(tool => tool.name === name)) throw new Error('Unknown tool');
    if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Arguments must be an object');
    const allowed = name === 'validate_app' ? ['folder', 'exact'] : ['folder'];
    if (Object.keys(args).some(key => !allowed.includes(key))) throw new Error('Unexpected argument');
    if (typeof args.folder !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(args.folder)) throw new Error('Invalid folder');
    if ('exact' in args && typeof args.exact !== 'boolean') throw new Error('exact must be boolean');
    const destination = path.join(root, args.folder);
    if (fs.existsSync(destination) && fs.lstatSync(destination).isSymbolicLink()) throw new Error('Symlink destination rejected');
    return name === 'scaffold_app' ? scaffold(destination) : validate(destination, { exact: args.exact ?? false });
  };
}
module.exports = { toolDefinitions, createDispatcher };
if (require.main === module) {
  try {
    const [workspace, folder] = process.argv.slice(2);
    if (process.argv.length !== 4) throw new Error('Usage: node tool-calling.js <existing-workspace> <new-folder-name>');
    const dispatch = createDispatcher(workspace);
    const created = dispatch('scaffold_app', { folder });
    const result = dispatch('validate_app', { folder, exact: true });
    console.log(JSON.stringify({ created, validation: result, agentPrompt: agentPrompt({ destination: created.target }) }, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
