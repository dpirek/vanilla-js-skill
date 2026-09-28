---
name: my-skill
description: Create apps with the exact tracked file structure of dpirek/vanilla-js-starter-app using its bundled, pinned source snapshot. Use for reproducing this starter or building a new app with its plain Node.js server, custom router, and browser Web Components architecture.
---

# Build from the Vanilla JS Starter App

Produce the same app file structure as the reference repository. Start from the bundled source instead of reconstructing files from memory. The seven files in this skill are tooling and instructions; the generated application has a separate 25-file tree.

## Baseline and fidelity

- Repository: https://github.com/dpirek/vanilla-js-starter-app
- Pinned commit: `60fdd97ac4118e0a860eadb4ac193505d75c6242`
- Snapshot: [templates/agent-template.js](templates/agent-template.js). Its `files` map contains all 25 tracked files verbatim; `manifest` stores their SHA-256 hashes.
- Reproduction means identical tracked paths and bytes, including the upstream `README.md` and `SKILL.md`. Git internals and installed dependencies are not part of that baseline.
- For a new product built on this architecture, first reproduce the baseline, then change contents in the existing files. Preserve paths and module boundaries. Add or rename files only when the user's requested feature requires a structural extension; report that deviation and do not claim exact structural parity.
- The pin is intentional. Do not silently replace it with the moving default branch. If the user requests a newer baseline, inspect that revision and regenerate the snapshot, hashes, reference tree, and validations together.

## Workflow

1. Read [references/api-notes.md](references/api-notes.md) for the exact tree, file responsibilities, route contracts, and upstream limitations.
2. Resolve the skill folder and app destination to absolute paths. Keep this skill outside the generated app. Select a new destination with an existing parent directory. If the intended destination already has files, inspect them and work in a new sibling directory; do not clear the destination to make the script work.
3. Generate the app offline:

   ```sh
   node /absolute/my-skill/templates/agent-template.js /absolute/new-app
   node /absolute/my-skill/scripts/validate.js /absolute/new-app --exact
   ```

   Substitute actual paths. The generator refuses every existing destination and never downloads packages or starts a server.
4. If the request is an exact copy, preserve source contents and report known limitations. If it requests a customized working app, implement its features in the mapped files and repair relevant incomplete behavior in place. Use the patterns below, and read only the examples needed.
5. Validate the final layout:

   ```sh
   node /absolute/my-skill/scripts/validate.js /absolute/new-app
   ```

   This requires all 25 paths, rejects extra source files and symlinks, checks package/module conventions and JavaScript syntax, and reports changed files. It ignores only root `.git/` and `node_modules/`. `--exact` additionally requires every source hash to match. Validation does not prove runtime behavior.
6. Run from the app directory with `npm start` (default port 8080) or `PORT=8090 node server.js`. No dependency installation is necessary. `npm run dev` assumes `nodemon` is already available; it is not declared in the package.
7. Verify the requested flows in a browser and relevant HTTP responses. Use a 32-byte `SECRET` environment value for a local login smoke test because the upstream fallback key is invalid for AES-256. See the reference for baseline expectations. Stop any server you started after verification. Report the output location, baseline commit, validation result, changes, and any unverified or incomplete behavior.

## Architecture rules

- Keep `server.js` as a Node `http.createServer` entry point with CommonJS `require` / `module.exports`. Do not set the root package to `"type": "module"`.
- Keep API functions in `api/` and backend helpers in `utils/`. Register routes in `server.js` with `router.add(path, method, handler, type, auth)`; auth defaults to true. Explicitly pass false for public routes.
- API handlers receive one context object, not Express `(req, res)` arguments. Return data for the central response helpers. Use its `response` field for auth cookies.
- Keep browser files under `public/app/` as native ES modules with explicit `.js` imports. Build custom elements with `BaseComponent`, `createElement`, lifecycle methods, and `customElements.define`.
- Keep normal light DOM and Bootstrap classes so `public/app/theme.css` styles components. Do not introduce React, Vue, TypeScript, a bundler, Shadow DOM, or a new dependency by default.
- Route client views in `public/app/main.js`; register corresponding server shell routes so direct navigation works. The server has no arbitrary SPA catch-all.
- Prefer `innerText` for user-controlled content. Clear existing children before rerendering. Preserve loading, empty, and error states when implementing real data flows.
- Keep secrets and external service calls on the server. The `tool-calling.js` example is local scaffold orchestration, not an upstream LLM feature.

## Supporting files

- [examples/basic.js](examples/basic.js): create and validate a byte-identical app; also exposes a component example using the actual BaseComponent props shape.
- [examples/advanced.js](examples/advanced.js): customize the existing search API and view without adding app files; demonstrates context dispatch, loading/error states, and safe DOM construction.
- [examples/tool-calling.js](examples/tool-calling.js): executable local tool dispatcher with strict argument validation and a bounded destination; useful when wiring this skill into an agent runner. No model SDK or API key is required.
- [templates/agent-template.js](templates/agent-template.js): canonical source snapshot, generator, manifest, and reusable agent brief. Read its functions as needed; do not load the entire source map merely to understand the workflow.
- [references/api-notes.md](references/api-notes.md): consult for route behavior and implementation decisions.
- [scripts/validate.js](scripts/validate.js): read-only layout, syntax, and optional content-fidelity checks. Exit 0 means checks passed; exit 1 means failure.

Do not copy the skill's examples, template, validator, or reference folder into the application. The source snapshot's own `SKILL.md` belongs in the application because it is an upstream tracked file.
