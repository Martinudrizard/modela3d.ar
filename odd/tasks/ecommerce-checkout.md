# E-commerce Checkout Integration

## Objective
Turn the current WhatsApp-only cart into an authenticated purchase flow with server-verified Mercado Pago Checkout Pro payments and shipping quotes from Correo Argentino and Andreani, while preserving existing products and admin workflows.

## Problem and Why
`handleCheckout()` currently opens WhatsApp; there is no customer identity, order model, payment processing, or shipping quotation. The user requested a real purchase flow and explicitly selected Correo Argentino and Andreani. Orders and integration state must be separate from the existing product catalog in Netlify Blobs.

## Scope
- Google customer sign-in using Google Identity Services; verify ID tokens server-side with Google's Node auth library in Netlify Functions.
- Server-side order creation, trusted product-price lookup, Mercado Pago Checkout Pro preference creation, signed webhook validation, payment retrieval, and idempotent order status updates.
- Shipping address capture and quotation adapters for Correo Argentino and Andreani; optional package weight/dimensions on products without changing existing catalog values.
- Checkout UI that requires sign-in, presents verified shipping options and payment, and retains the existing catalog/admin flows.
- Configuration and setup documentation; tests for validation, totals, order transitions, and provider request boundaries.

## Constraints and Dependencies
- Carrier API credentials and official Correo Argentino documentation are still pending. The user has an MP test Access Token and buyer account, kept private and not configured. Never ask the user to send secrets in chat; configure them through the appropriate secret settings when the integration is ready.
- Andreani's official developer portal says QA credentials require an Andreani customer account. Public Correo Argentino documentation could not be retrieved, so its endpoint contract must be confirmed from official docs before implementation; do not guess endpoints.
- Origin postal code is 3265 (provided by the user). Product package dimensions/weights are still required for dependable live rates. Until configured, quote integrations must report unavailable rather than fabricate a price.
- A Google OAuth web client ID and Mercado Pago webhook secret remain external prerequisites. The user has obtained an MP test Access Token and test buyer account; the token is not shared or configured. Do not deploy or change remote site settings without explicit authorization.
- Never write orders or shipping configuration through the existing product synchronization path. Do not alter or replace current product records.
- Receipt-driven development remains enabled globally but is disabled for this clone at the user's request. Use ordinary focused tests; do not run native review for this feature.

## Authorized Scope
- Existing: `app.js`, `index.html`, `styles.css`, `package.json`, `README.md`, `netlify/functions/store.js`, `netlify.toml`.
- New: `netlify/functions/`, `tests/`, `.env.example`.
- This task does not authorize remote deployment, Netlify environment changes, provider account creation, or use of credentials.
- The user requested eventual production on `modela3dar.netlify.app`; deployment remains pending because no remote credential/session was authorized.
- User authorized updating the public `@netlify/blobs` dependency from npmjs.com for this local branch only; no credentials or Netlify settings may be accessed.

## Delivery and Routing
- Feature branch: `feat/ecommerce-checkout` (created from `main`).
- Route: delegated direct for multi-file implementation; mapping trigger satisfied by checkout and storage exploration; writer trigger applies because each behavior spans UI, server functions, and tests.
- Delivery strategy: `feature-branch-chain` (chosen by the user); current running authored count is 1,650 lines across commits `13cce87`, `a08a8e7`, `c8cbd4e`, and `3c81f5a`, excluding generated files. Planned PR chain starts with EC-1 identity (283 lines) then orders (290 lines); the cohesive EC-3 preference (588 lines) and webhook (489 lines) work units exceed 400. Before any PR, make one honest slicing pass or request an explicit `size:exception`; no tracker PR, child PR, push, or deploy without remote authorization.
- No repository skill registry exists. Loaded applicable user skills: `work-unit-commits` and `chained-pr`.

## Tasks and Acceptance Criteria
- [x] EC-1: Add isolated order storage and Google-authenticated customer identity. Orders are stored under a dedicated namespace; current products and admin mutations remain unchanged. Server endpoints reject missing/invalid Google ID tokens with an audience check. Verified by 5 auth tests and 11 order tests; commits `13cce87` and `a08a8e7`.
- [ ] EC-2 (blocked): Add carrier rate adapters and package/origin data. Rates are generated from validated server-side package and postal-code inputs. Carrier errors or missing configuration are explicit; no guessed/fallback prices. The origin postal code is 3265; wait for official Correo Argentino docs and carrier credentials before implementing provider contracts.
- [x] EC-3: Add secure Mercado Pago Checkout Pro and webhook handling. Prices are loaded from the server's product catalog; client totals are ignored. Verify webhook signatures, retrieve payment state from Mercado Pago, and make repeated notifications idempotent. Each order may create at most one stable Checkout Pro preference, persisted with a `pending` transition and reused on repeated requests; payment-state updates use conditional compare-and-swap writes, reject overwriting conflicting approvals, and record a minimal conflict audit. Verified by 14 payment-preference tests, 13 webhook tests, and parent full suite 43/43; commits `c8cbd4e` and `3c81f5a`. No credentials or live API calls were used.
- [x] EC-4: Add a distinct Google-authenticated checkout shell and shipping address form while preserving the existing WhatsApp action. Keep address data in memory until a carrier quote is verified; only then create the draft order and enable payment. While carriers are unavailable, show an explicit unavailable state and keep payment disabled; never invent a shipping price. The UI renders the GIS button only after the public client-ID endpoint succeeds, verifies its ID token through the existing auth endpoint, and keeps address/token only in memory. No order or Mercado Pago request is made without a verified quote.
- [ ] EC-5: Add focused tests and configuration/setup documentation. Provide a sandbox verification path and list unavailable live checks accurately.

## Applicable Checks
- Initial baseline (before checkout implementation): `package.json` had no test script/test framework and no deterministic purchase-flow tests. Current coverage runs through `npm test`/`node --test` and includes purchase, order, and payment-concurrency cases.
- Per task: focused `npm test`/`node --test` tests; syntax checks for changed Netlify Functions; verify catalog read/write behavior remains isolated from order storage.
- Final: sandbox checkout/payment scenario and shipping API QA scenarios only when credentials and official documentation are available. No production deploy or live purchase without explicit authorization.

## EC-4 Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused checks | `node --check app.js`: passed; `node --test tests/*.test.js`: 43/43 passed; `git diff --check`: passed. |
| TDD applicability | No DOM test framework or meaningful deterministic RED exists for the GIS/browser flow; no brittle text-only tests were added. |
| Runtime harness | Opened the local `file://` page, added a product, and opened checkout. The dialog rendered, the empty-cart action remained disabled, WhatsApp remained available, and payment stayed disabled without a quote. GIS/Netlify calls returned 403 because `file://` cannot invoke the functions; `netlify dev` and a Google OAuth client ID are not available yet. |
| Rollback boundary | Revert only `index.html`, `app.js`, and `styles.css` to remove the EC-4 UI; existing WhatsApp checkout and server/catalog code are unchanged. |

## Progress and Evidence
- 2026-10-04: Confirmed current checkout is WhatsApp-only (`app.js:1851`); `package.json` only depends on `@netlify/blobs`; product catalog persists in `netlify/functions/store.js`.
- 2026-10-04: Confirmed Andreani has QA/production API credentials for customers; Correo Argentino public docs were not accessible from the available documentation tools.
- 2026-10-04: Selected Google Identity Services plus server-side Google ID-token verification; this fits the static Netlify site without introducing a separate Firebase project.
- 2026-10-04: Created branch `feat/ecommerce-checkout`; the EC-1 implementation is present in the auth/order functions, isolated tests, and package metadata. It does not change the catalog data.
- 2026-10-04: User authorized downloading the public `google-auth-library` and `mercadopago` packages from npmjs.com for this branch; no credentials or remote Netlify changes are authorized.
- 2026-10-04: User supplied store origin postal code 3265.
- 2026-10-04: User obtained Mercado Pago Checkout Pro test credentials and a buyer test account; the Access Token remains private and is not configured in Netlify.
- 2026-10-04: Writer observed RED then GREEN; parent reran `node --test tests/*.test.js` with 16/16 passing. Writer also reports both function syntax checks and `git diff --check` passed.
- 2026-10-04: User disabled RDD for this clone only and selected `feature-branch-chain`; global RDD remains on. Native review was not completed at the user's request; use ordinary focused tests for this feature.
- 2026-10-04: Auth slice committed as `13cce87` (`feat(auth): add Google customer identity`); `node --test tests/customer-auth.test.js` passed 5/5.
- 2026-10-04: Order slice committed as `a08a8e7` (`feat(orders): persist authenticated draft orders`); `node --test tests/orders.test.js` passed 11/11. Function syntax checks and `git diff --check` passed.
- 2026-10-04: EC-3 preference slice committed as `c8cbd4e` (`feat(payments): create idempotent checkout preferences`); `node --test tests/mercado-pago-payment.test.js` passed 14/14.
- 2026-10-04: EC-3 webhook/CAS slice committed as `3c81f5a` (`feat(payments): settle orders from signed webhooks`); full suite passed 43/43. Independent reviewer adapter was unavailable without immutable RDD binding; parent inspected the CAS path and no live provider calls were made.
- 2026-10-04: EC-3 completed in commits `c8cbd4e` (Checkout Pro preferences) and `3c81f5a` (signed webhooks and CAS settlement). Blobs 11.1.3 compare-and-swap prevents stale order overwrites; same-payment callbacks are idempotent and conflicting approvals create a separate minimal audit key. Parent `npm test` passed 43/43; all changed functions passed `node --check` and `git diff --check`. No credentials or live calls were used.
- 2026-10-04: Started EC-4 UI integration. Current `handleCheckout()` still opens WhatsApp. Google OAuth client ID and shipping rate APIs are not yet configured; checkout must fail closed until a carrier returns a verified rate.
- 2026-10-04: Completed EC-4 with a separate accessible checkout dialog, GIS-rendered sign-in backed by server verification, ephemeral address state, and explicit unavailable states for Correo Argentino and Andreani. WhatsApp remains unchanged; order creation and Mercado Pago are not called. `node --check app.js`, `node --test tests/*.test.js` (43/43), and `git diff --check` passed. Browser/GIS/Netlify runtime behavior remains unverified; no DOM tests were added because no meaningful deterministic RED was available. Engram apply-progress mirror could not be written because Engram tools were unavailable in this runtime.

## Next Step
EC-2 remains blocked pending official carrier contracts and credentials. Continue with EC-5 focused tests and setup documentation; sandbox verification remains pending until authorized configuration is available. Before creating any PR, resolve the EC-3 >400-line slice budget by one honest split or explicit size exception. No credentials, remote settings, commits, push, PR, or deployment were accessed or changed in this task.