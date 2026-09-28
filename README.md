# vanilla-js-app

A reusable skill for creating plain JavaScript apps from a bundled snapshot of [vanilla-js-starter-app](https://github.com/dpirek/vanilla-js-starter-app). It provides agent instructions, an offline generator, examples, and a validator.

The generated app uses a Node.js HTTP server, a custom router, and browser Web Components with native ES modules and Bootstrap styling. No build step or dependency installation is required to start it.

## Use with an agent

Point your agent to [SKILL.md](SKILL.md) and provide an app destination and your requirements. For example:

```text
Use the vanilla-js-app skill in this repository to create an app at
/absolute/new-app. Start from the bundled starter, then customize its
search view and API for a book catalog.
```

Keep the skill repository separate from the generated app. The destination must not already exist, and its parent directory must exist.

## Generate an app directly

With Node.js installed, run these commands from this repository:

```sh
node templates/agent-template.js /absolute/new-app
node scripts/validate.js /absolute/new-app --exact
cd /absolute/new-app
npm start
```

Open `http://localhost:8080`. To use another port, run `PORT=8090 node server.js` instead of `npm start`.

The generator creates all 25 tracked starter files from commit `60fdd97ac4118e0a860eadb4ac193505d75c6242`. It verifies the bundled checksums, refuses existing destinations, and does not download packages or start a server.

## Customize and validate

After making changes to the generated app, run from the skill repository:

```sh
node scripts/validate.js /absolute/new-app
```

Validation checks the expected paths, package/module conventions, and JavaScript syntax, and reports changed files. It rejects extra source files and symlinks, ignoring only the app's root `.git/` and `node_modules/`. Add `--exact` to require byte-for-byte agreement with the pinned snapshot.

The starter includes incomplete behavior; passing validation does not establish that every feature works. See [API notes and known limitations](references/api-notes.md) before extending it. Login testing requires a 32-byte `SECRET` environment value because the upstream fallback key is invalid for AES-256. The optional `npm run dev` command requires a separately available `nodemon`.

## Repository guide

| File | Purpose |
| --- | --- |
| [SKILL.md](SKILL.md) | Agent workflow and architecture rules |
| [templates/agent-template.js](templates/agent-template.js) | Pinned source snapshot, generator, checksums, and agent prompt helper |
| [scripts/validate.js](scripts/validate.js) | Structure, syntax, and optional content validation |
| [references/api-notes.md](references/api-notes.md) | Generated file tree, route contracts, and baseline limitations |
| [examples/basic.js](examples/basic.js) | Generate and validate an exact copy |
| [examples/advanced.js](examples/advanced.js) | Customize the existing search API and view |
| [examples/tool-calling.js](examples/tool-calling.js) | Local tool dispatcher for agent orchestration |

The generated app includes the upstream project's own README and skill instructions. This repository's tooling stays outside the app.
