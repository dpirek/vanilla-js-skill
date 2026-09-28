# Repository architecture and API notes

Source: [dpirek/vanilla-js-starter-app](https://github.com/dpirek/vanilla-js-starter-app/tree/60fdd97ac4118e0a860eadb4ac193505d75c6242), commit `60fdd97ac4118e0a860eadb4ac193505d75c6242`. These notes describe that source snapshot, not a promise about subsequent upstream revisions.

Contents: exact tree; file responsibilities; server request flow; endpoint contracts; frontend conventions; limitations; verification; customization.

## Exact generated tree

```text
app/
├── README.md
├── SKILL.md
├── package.json
├── server.js
├── api/
│   ├── auth.js
│   ├── search.js
│   └── user.js
├── utils/
│   ├── auth.js
│   ├── response.js
│   ├── router.js
│   └── string.js
└── public/
    ├── index.html
    └── app/
        ├── main.js
        ├── router.js
        ├── theme.css
        ├── utils.js
        └── components/
            ├── base-component.js
            ├── header.js
            ├── loader.js
            ├── modal-component.js
            ├── auth/
            │   └── login.js
            └── user/
                ├── user-container.js
                ├── user-detail.js
                ├── user-header.js
                └── user-table.js
```

No `src/`, `dist/`, `index.js`, framework config, lockfile, database module, or test folder is tracked in this revision. The generator reproduces tracked source files, not `.git` history. Validation ignores root `.git/` and `node_modules/`, but treats new lockfiles, logs, or other files as structural deviations. Keep verification artifacts outside the generated app.

## File responsibilities

| File | Responsibility |
| --- | --- |
| `README.md` | Upstream one-line project title. |
| `SKILL.md` | Upstream maintenance instructions; distinct from this generating skill. |
| `package.json` | CommonJS backend, `main: server.js`, zero dependencies, `start` / `dev` scripts. |
| `server.js` | Register HTML/JSON routes, parse request context, enforce route auth, serialize handler output, listen on `PORT` or 8080. |
| `api/auth.js` | Dispatch auth check, login, logout; demo credential check. |
| `api/user.js` | Static three-user listing; placeholder detail/create/delete operations. |
| `api/search.js` | Read `queryParams.q`, currently return an empty array. |
| `utils/auth.js` | Encrypt/decrypt cookie, set/remove cookie, read authenticated user. |
| `utils/response.js` | HTTP status and serialization, body parser, static serving, index shell. |
| `utils/router.js` | Backend ordered route matching, named params, query parsing. |
| `utils/string.js` | Legacy text/file helpers and MIME mapping; also duplicate older HTTP helpers. |
| `public/index.html` | `#app` mount, module entry, CSS links, initial dark-mode body. |
| `public/app/main.js` | Initial auth fetch; home, login, users, and search view wiring. |
| `public/app/router.js` | Browser route matcher and `popstate` listener. |
| `public/app/utils.js` | Time/text formatting, template tags, browser query parsing. |
| `public/app/theme.css` | Dark-mode Bootstrap overrides. |
| `components/base-component.js` | HTMLElement base, element factory, children, navigation, refresh, transient message. |
| `components/header.js` | App navigation, search form, logout; `app-header`. |
| `components/loader.js` | Bootstrap spinner; `app-loader`. |
| `components/modal-component.js` | Light-DOM modal and backdrop; `modal-component`. |
| `components/auth/login.js` | FormData login POST, error display, reload after success; `app-login`. |
| `components/user/user-container.js` | Compose user header/table; `user-container`. |
| `components/user/user-header.js` | Users heading; `user-header`. |
| `components/user/user-table.js` | Username/email/date rows and delete request; `user-table`. |
| `components/user/user-detail.js` | Unwired legacy detail/modal code with missing dependencies; `user-detail`. |

Component paths in the last rows are relative to `public/app/`.

## Server request flow

1. Read the encrypted auth cookie and lowercase the URL for route matching.
2. Respond to static paths before matching registered routes. `/` serves `public/index.html` as a static request.
3. Match path and method through `route().match(url, method)`. Route registration is positional:

   ```js
   router.add('/api/search', 'GET', searchApi, 'json'); // protected by default
   router.add('/api/auth', 'GET', authApi, 'json', false); // explicitly public
   ```

4. Parse the request body and build handler context:

   ```js
   { url, method, params, queryParams, body, authUser, response }
   ```

   `url` remains the original `req.url`; matched params/query values came from the lowercased copy. `response` is the Node ServerResponse used for cookies. No Express middleware or `res.json()` exists.
5. Protected JSON routes return HTTP 401 `{ error: 'Unauthorized' }` without auth; protected HTML routes redirect 302 to `/login`.
6. Handler returns are serialized by `respondJson` or `respondHtml`. Normal JSON handler results use HTTP 200 even if they contain `{ error }`.
7. Unknown API paths return HTTP 404 `{ error: 'route not found' }`; unknown HTML paths return an HTML 404. Direct app routes must be registered explicitly.

Backend parameter matching uses `\w+`, so hyphenated identifiers do not match. Query values are strings, and repeated query keys retain the last value. JSON parsing requires the exact content-type string `application/json`; a charset suffix is not recognized by this implementation.

## Registered endpoint contracts

| Method / path | Access | Snapshot result |
| --- | --- | --- |
| GET `/` | Public shell | Index shell; browser auth check may render login. |
| GET `/login` | Public | Index shell. |
| GET `/user`, `/search` | Protected | Index shell or redirect to login. |
| GET `/api/auth` | Public | Cookie user object or `null`. |
| POST `/api/login` | Public | Body `{ username, password }`; success user object or `{ error: 'invalid credentials' }`; success sets cookie. |
| POST `/api/logout` | Public | Clear cookie, return `{ message: 'logged out' }`. |
| GET `/api/user` | Protected | Array of three `{ id, username, email, date }` objects. |
| GET `/api/user/:username` | Protected | `null` placeholder. |
| POST `/api/user` | Protected | `null` placeholder; no persistence. |
| DELETE `/api/user/:id` | Protected | `null` placeholder; no deletion. |
| POST `/api/user/login`, `/api/user/logout` | Protected | Registered but unsupported by userApi dispatch. |
| GET `/api/search` | Protected | Empty array, even when `q` is supplied. |

`auth.login(response, username, role)` sets an HttpOnly cookie with one-hour browser Max-Age and `/` path. Cookie name is `AUTH_COOKIE_NAME` or `ou_admin_auth`. Cookie plaintext includes `username`, `role`, and ISO `date`. Cookie payload and login response have different shapes; the latter includes email. Use the source's demo credentials only for local reproduction tests, not as a real identity system.

## Frontend conventions

Backend modules use CommonJS; browser `.js` files use imports/exports. Do not add a root ESM package declaration to support the frontend: `<script type="module" src="/app/main.js">` already does that.

`BaseComponent.createElement(tagOrElement, props)` supports attributes plus these special props:

```js
this.createElement('button', {
  class: 'btn btn-primary',
  innerText: 'Save',
  style: { marginLeft: '10px' },
  addEventListener: { name: 'click', handler: event => this.save(event) },
  children: []
});
```

Use `class`, not `className`, and the object-shaped event descriptor, not React-style handlers. Children must be DOM nodes. The factory uses truthy checks for `innerText` and `innerHTML`, so use string values where zero/empty values matter. `refresh()` calls `clear()` then `render()`. Most subclasses render on connection. Registration happens at module evaluation; do not define the same custom-element name twice.

`BaseComponent.navigateTo(path, event)` prevents default, pushes history, and dispatches `popstate`. `Router.navigate()` only invokes a matching handler; it does not push history. Browser query data comes from `getQueryParams()` reading `window.location.search`, not from the browser router match result. The server and client routers are separate implementations with different contracts.

`index.html` loads Bootstrap 5.0.2 CSS and Bootstrap Icons 1.13.1 from jsDelivr; no Bootstrap JS bundle is loaded. Modal behavior is implemented manually. Offline source generation works, but first-time styled rendering needs the CDN resources. Some classes in the source come from other Bootstrap versions; preserve them for exact copies and adjust them in-place if a requested UI requires correction.

## Known baseline limitations

Exact reproduction intentionally includes these upstream limitations. A structure-preserving custom app may fix them in existing files as needed; never describe a byte-identical copy as a completed production app.

- The fallback `SECRET` has 30 ASCII bytes, while AES-256 needs 32. Successful demo login therefore fails unless a valid key is supplied through the environment. Use a fresh 32-byte ASCII value for a local runtime smoke test. A custom auth implementation should validate configuration and handle errors.
- Demo credentials and profile data are hardcoded. There is no database, password hashing, server-enforced expiry, or authenticated encryption. The cookie's browser age is not a substitute for checking session expiry on the server.
- `setCookie` tests `maxAge` for truthiness, so logout's zero does not produce `Max-Age=0`; it sends an empty cookie value instead. That value no longer decrypts, but expiry semantics are incomplete.
- Body parsing, route handler failures, and missing static assets do not have complete error handling; malformed JSON can reject the async request handler, and missing static requests can remain unfinished. Static serving needs containment checks for real deployments.
- Lowercasing the URL affects query values and params. API handler dispatch compares the original URL, so `/api/user?x=1` misses the exact list branch. For requested fixes, normalize pathname separately and retain the original query value casing.
- `user-detail.js` imports nonexistent `../school/school-container.js` and references unregistered detail, image, delete, and conversation endpoints. It is not imported by the active app entry graph. Do not activate it without resolving those dependencies; preserve its path in structural mode.
- `UserContainer.navigateTo` references a `userTable` field that is never assigned and does not dispatch `popstate`. Existing initial table composition works independently of that method.
- Search returns no data; create/detail/delete APIs are placeholders; table deletion does not update state. The advanced example only implements search, leaving unrelated baseline limitations in place.
- The `html` and `md` tags do not forward interpolation values; some text helpers build unescaped HTML. Use `innerText` / `textContent` for external strings in added functionality.
- `npm run dev` refers to undeclared `nodemon`; `npm start` requires no external packages. There is no upstream automated test script.

## Verification expectations

The bundled validator checks filenames, directories, file kinds, syntax, and selected package conventions. It does not resolve imports, assess security, run a browser, validate accessibility, or prove API behavior. The dormant missing import above is a documented exception in the baseline, not a working dependency.

For an exact local smoke test, start the app with a temporary valid `SECRET` and an available `PORT`, then verify:

1. GET `/` and `/login` serve the shell; `/app/main.js` serves JavaScript.
2. Unauthenticated GET `/api/auth` returns null, GET `/api/user` returns 401, GET `/user` redirects to `/login`.
3. Invalid login returns its JSON error. Local demo login with credentials from `api/auth.js` sets a cookie when the secret is valid.
4. With the cookie, GET `/api/auth` identifies the user, GET `/api/user` returns three users, and GET `/api/search?q=test` returns `[]`.
5. POST `/api/logout` returns its message; using the returned empty cookie makes auth null.
6. The browser renders the login form and, after login, user navigation and table. Check console/network errors. This needs a browser; HTTP tests alone are insufficient.

For the advanced example, search for `user1` and expect one matching user. For app-specific changes, exercise loading, empty, error, auth, navigation, and refresh behavior as appropriate. Store screenshots, temporary tests, and logs outside the app if exact layout is required.

## Customization map

| Requested change | Existing files to edit |
| --- | --- |
| App title or color theme | `public/index.html`, `public/app/theme.css` |
| Navigation label or search form | `public/app/components/header.js` |
| Search implementation | `api/search.js`, `public/app/main.js` |
| User data or CRUD | `api/user.js`, `public/app/components/user/user-table.js`, related user components |
| Login/session behavior | `api/auth.js`, `utils/auth.js`, `public/app/components/auth/login.js` |
| Route semantics or request errors | `server.js`, `utils/router.js`, `utils/response.js`, `public/app/router.js` as needed |

Additional domains can require additional modules. If the user explicitly needs that expansion, preserve the baseline files, explain the new paths, and report that strict layout validation will fail for the additions. Do not hide additions by weakening the manifest.
