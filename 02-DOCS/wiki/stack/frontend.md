# Stack — Frontend

The mechanics behind constitution principle 2. Recorded here so that principle stays
a principle and the mechanics stay revisitable in one file.

## The choice

The storefront stays on the platform:

- **Native ES modules.** No bundler, no compile step, no transform. The deploy
  pipeline stays exactly as it is: static files served by Netlify, functions
  unchanged.
- **Types through JSDoc**, checked in strict mode with the TypeScript compiler
  (`tsc --checkJs`). Types live next to the code they describe; the compiler is the
  only type checker in the toolchain.
- **CSS with design tokens** — colour, type, spacing, elevation and motion declared
  once and consumed by every component.
- **3D via a vendored library**, loaded lazily so a visitor who never opens the
  configurator never downloads it.
- **One test runner for the whole repository**, DOM-capable, so that a storefront
  behaviour can be asserted by running it.

## Why not a framework

The storefront is a single oversized script whose behaviour is currently untested,
and the business's hard constraint is that nothing that already works may break. A
rewrite of behaviour that cannot be proven equivalent is the riskiest move available.
The platform's own primitives keep every change reviewable, keep the deploy
unchanged, and let the tests prove equivalence instead of asserting it.

This is not permanent dogma. If a slice genuinely needs a build step, that is an
amendment to the constitution, not a quiet decision inside a slice.

## Toolchain

| Tool | Role |
| --- | --- |
| `npm` | Package manager. One lockfile, committed. |
| `node:test` | Backend and function tests today; the single runner replaces it for the whole repository. |
| DOM-capable runner | Storefront behaviour tests. Chosen in the `frontend-test-harness` plan. |
| `tsc --checkJs` | Type checking of the storefront. |
| Linter | Zero warnings on every commit. Enabled by the `frontend-test-harness` plan. |
| `npm run spec:gate` | Exit gate for specs written in this workspace. |

## Boundaries

- The backend stack is fixed: see `backend.md`.
- The data contracts listed there — blob keys, product shape, local storage keys,
  response envelope — are the storefront's contract. A storefront change that
  renames one of them is a breaking change to the product, not a refactor.
