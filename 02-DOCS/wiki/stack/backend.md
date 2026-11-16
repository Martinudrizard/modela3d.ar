# Stack — Backend

The mechanics behind constitution principle 1. This stack is **fixed**: a storefront
rebuild does not touch it.

## Runtime

- Netlify Functions, Node 24, CommonJS.
- `@netlify/blobs` as the only datastore.
- Mercado Pago Checkout Pro for payments.
- Google + email (scrypt) for customer identity.

## Functions

| Function | Role |
| --- | --- |
| `store.js` | The catalog. Reads and writes products, the product list and the hero slides. Public reads; writes require the admin key. |
| `orders.js` | Order records and order status. |
| `mercado-pago-payment.js` | Creates the Checkout Pro preference for an order. |
| `mercado-pago-webhook.js` | Receives payment notifications, verifies the signature, applies the order state. |
| `email-auth.js` | Customer sign-in and sign-up: scrypt password hashing, constant-time comparison, session token issuing. |
| `lib/customer-session.js` | Session token creation and verification. |
| `lib/google-auth.js` | Google identity verification. |
| `lib/mailer.js` | Transactional email delivery. |

## Contracts the storefront depends on

These names and shapes are the storefront's contract with the backend. Changing one
is a breaking change to the storefront, not a backend detail.

- Blob keys: `products`, `products_ids_v2`, `product_v2:{id}`, `heroSlides`,
  `waNumber`.
- Product shape: `id`, `name`, `description`, `price`, `image`, and the
  product-specific fields the storefront reads.
- Local storage keys: `modela3d_products_v1`, `modela3d_cart_v1`, and the other
  `modela3d_*` keys the storefront already uses.
- Response envelope: `{ ok: boolean, error?: string, data?: unknown }` with a
  correct HTTP status.

## Known gaps

Recorded, not fixed, because they belong to the backend and are out of the storefront
rebuild's scope:

- `email-auth.js` has no rate limiting.
- `.env.example` does not yet document `ADMIN_PANEL_KEY`, `NETLIFY_BLOBS_TOKEN` or
  `NETLIFY_SITE_ID`.
- `mercado-pago-webhook.js` logs part of the signing secret and the full signature
  header. Constitution principle 16 forbids it; the fix is a backend change.
