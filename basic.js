#!/usr/bin/env node
'use strict';
// Run: node /absolute/my-skill/examples/basic.js /absolute/new-app
const { scaffold } = require('../templates/agent-template.js');
const { validate } = require('../scripts/validate.js');

// Illustration only: adapt an EXISTING component rather than adding this as an app file.
// This string is browser ES-module code; it is not executed by Node.
const componentExample = `import BaseComponent from '../base-component.js';
class UserHeader extends BaseComponent {
  constructor({ users = [] } = {}) { super(); this.users = users; }
  connectedCallback() { this.render(); }
  render() {
    this.clear();
    this.appendChild(this.createElement('div', {
      class: 'mb-4',
      children: [
        this.createElement('h1', { innerText: 'Users' }),
        this.createElement('p', { innerText: 'Total users: ' + this.users.length }),
        this.createElement('a', {
          href: '/', innerText: 'Home',
          addEventListener: { name: 'click', handler: event => this.navigateTo('/', event) }
        })
      ]
    }));
  }
}
customElements.define('user-header', UserHeader);
export default UserHeader;
`;
function run(destination) {
  const result = scaffold(destination);
  const validation = validate(result.target, { exact: true });
  if (!validation.ok) throw new Error(validation.errors.join('\n'));
  return validation;
}
module.exports = { run, componentExample };
if (require.main === module) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node basic.js <new-app-directory>');
    console.log(JSON.stringify(run(process.argv[2]), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
