# Modela3D.ar

Ecommerce de impresión 3D. Static storefront (Netlify) + Netlify Functions API
(Blobs, Mercado Pago Checkout Pro, customer identity).

## Knowledge map

Read first, then work:

| Read this | Before |
| --- | --- |
| `02-DOCS/wiki/sdd/constitution.md` | any code, spec or plan change — it holds the non-negotiables |
| `02-DOCS/wiki/sdd/config.yaml` | any build/test/verify command — it holds the calibrated runtime |
| `02-DOCS/wiki/sdd/decisions.md` | before re-litigating a past decision |
| `02-DOCS/wiki/index.md` | to locate any other article |

Full index: `02-DOCS/wiki/index.md`.

## Commands

```bash
npm test          # node:test suite — the only gate that exists today
```

## Ground rules

- Backend (Netlify Functions + Blobs + Mercado Pago) is production-grade and tested.
  A storefront rebuild does not touch it.
- Commits are authored by the human. Conventional Commits format.
- No secret in logs, no secret in the repo, no secret fingerprint either.
