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

## Delivery and Routing
- Feature branch: `feat/ecommerce-checkout` (created from `main`).
- Route: delegated direct for multi-file implementation; mapping trigger satisfied by checkout and storage exploration; writer trigger applies because each behavior spans UI, server functions, and tests.
- Delivery strategy: `feature-branch-chain` (chosen by the user); forecast approximately 900-1,400 authored changed lines, excluding generated files. Planned slices: EC-1 identity/orders; EC-2 carrier quotes; EC-3 Mercado Pago; EC-4 checkout UI; EC-5 docs and end-to-end checks. No tracker PR, child PR, push, or deploy without the required remote authorization.
- No repository skill registry exists. Loaded applicable user skills: `work-unit-commits` and `chained-pr`.

## Tasks and Acceptance Criteria
- [ ] EC-1 (in progress): Add isolated order storage and Google-authenticated customer identity. Orders are stored under a dedicated namespace; current products and admin mutations remain unchanged. Server endpoints reject missing/invalid Google ID tokens with an audience check.
- [ ] EC-2: Add carrier rate adapters and package/origin data. Rates are generated from validated server-side package and postal-code inputs. Carrier errors or missing configuration are explicit; no guessed/fallback prices. The origin postal code is 3265; block final API verification until official Correo Argentino docs and carrier credentials are available.
- [ ] EC-3: Add secure Mercado Pago Checkout Pro and webhook handling. Prices are loaded from the server's product catalog; client totals are ignored. Verify webhook signatures, retrieve payment state from Mercado Pago, and make repeated notifications idempotent.
- [ ] EC-4: Connect authenticated checkout UI, address capture, carrier-choice display, and payment redirect. Existing catalog/admin/product data and WhatsApp quote behavior continue working.
- [ ] EC-5: Add focused tests and configuration/setup documentation. Provide a sandbox verification path and list unavailable live checks accurately.

## Applicable Checks
- Baseline: `package.json` currently has no test script/test framework; no deterministic purchase-flow tests exist. Add a focused `node --test` suite and package script as part of behavior tasks.
- Per task: focused `npm test`/`node --test` tests; syntax checks for changed Netlify Functions; verify catalog read/write behavior remains isolated from order storage.
- Final: sandbox checkout/payment scenario and shipping API QA scenarios only when credentials and official documentation are available. No production deploy or live purchase without explicit authorization.

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
- 2026-10-04: Order slice `node --test tests/orders.test.js` passed 11/11; function syntax checks and `git diff --check` passed. Order slice remains uncommitted.

## Next Step
Finish EC-1 with the draft-order work-unit commit. Then implement EC-2 with mocked provider tests while carrier contracts remain unavailable; do not claim live quotes until official docs and credentials arrive.