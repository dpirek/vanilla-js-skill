#!/usr/bin/env node
'use strict';
// Run: node /absolute/vanilla-js-app/examples/advanced.js /absolute/new-app
// Creates a starter variant: an in-memory searchable directory, with unchanged paths.
const fs = require('node:fs');
const path = require('node:path');
const { scaffold, files } = require('../templates/agent-template.js');
const { validate } = require('../scripts/validate.js');
const searchApiSource = `const users = [
  { id: 1, username: 'user1', email: 'user1@example.com' },
  { id: 2, username: 'user2', email: 'user2@example.com' }
];
async function searchApi({ queryParams }) {
  const q = String(queryParams.q || '').trim().toLowerCase();
  return q ? users.filter(user => (user.username + ' ' + user.email).toLowerCase().includes(q)) : [];
}
module.exports = { searchApi };
`;
const searchViewSource = `let searchController;
async function search() {
  searchController?.abort();
  searchController = new AbortController();
  const { signal } = searchController;
  const { q = '' } = getQueryParams();
  const view = document.createElement('section');
  view.className = 'container-fluid px-3 py-2';
  appContainer.replaceChildren(view);
  const heading = document.createElement('h1');
  heading.textContent = 'Search Results';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = 'Loading…';
  view.append(heading, status);
  try {
    const response = await fetch('/api/search?q=' + encodeURIComponent(q), { signal });
    if (response.status === 401) { window.location.assign('/login'); return; }
    if (!response.ok) throw new Error('Search request failed: ' + response.status);
    const users = await response.json();
    if (!Array.isArray(users)) throw new Error('Expected a search result array');
    if (!view.isConnected || signal.aborted) return;
    status.textContent = users.length ? users.length + ' results' : 'No matching users';
    const list = document.createElement('ul');
    users.forEach(user => {
      const item = document.createElement('li');
      item.textContent = user.username + ' — ' + user.email;
      list.appendChild(item);
    });
    view.appendChild(list);
  } catch (error) {
    if (error.name !== 'AbortError' && view.isConnected) status.textContent = error.message;
  }
}
`;
function run(destination) {
  const { target } = scaffold(destination);
  const main = files['public/app/main.js'];
  const start = main.indexOf('function search() {');
  const end = main.indexOf("\nfetch('/api/auth')", start);
  if (start < 0 || end < 0) throw new Error('Pinned main.js search boundaries not found');
  fs.writeFileSync(path.join(target, 'api/search.js'), searchApiSource);
  fs.writeFileSync(path.join(target, 'public/app/main.js'), main.slice(0, start) + searchViewSource + main.slice(end));
  const result = validate(target);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result;
}
module.exports = { run, searchApiSource, searchViewSource };
if (require.main === module) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node advanced.js <new-app-directory>');
    console.log(JSON.stringify(run(process.argv[2]), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
