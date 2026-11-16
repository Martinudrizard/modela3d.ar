---
type: spec
title: Spec — Storefront rebuild (program)
description: WHAT and WHY for rebuilding the Modela3D.ar storefront into a professional, modern, complete and credible sales surface — program goals, the decomposition into sub-specs, and the program-level acceptance criteria.
tags: [sdd, spec]
timestamp: 2026-10-22T10:58:21Z
topic: sdd
slug: frontend-rebuild
status: draft
---

# Spec — Storefront rebuild (program)

> Slug: `frontend-rebuild` · Status: draft · Created: 2026-10-22
> Inherits: [constitution](../constitution.md)

## Problem & why

Modela3D.ar sells 3D printing — a craft business whose value is precision, material
knowledge and finish — through a storefront that still looks and behaves like a
prototype: one oversized script where every piece of the page shares the same global
scope, a duplicated hero section, a product configurator that was written and then
hidden, a catalog that reloads itself once per product image, and not a single
executable test of the storefront's own behaviour. The backend is solid and the
business transacts; what is missing is a sales surface that earns trust on the first
screen and carries the visitor to a decision. The knowledge that actually wins the
sale — material, tolerance, finish, lead time, price band — is nowhere on the page, so
every visitor falls back to WhatsApp to ask questions the page should have answered,
and the business pays in manual conversation time for what should have been
self-service.

## Cost of not building it

The site keeps working, so the cost is invisible and cumulative. The storefront keeps
under-performing the brand on every channel that is not a human conversation. Search
engines and social previews stay effectively absent, so organic discovery never
starts. The mobile experience — the primary one, since most traffic arrives from
Instagram on a phone — is never judged, because nobody built it to be judged. And the
rebuild the business actually asked for becomes riskier the longer it waits: with no
behavioural tests, any change that touches catalog rendering, price calculation or
cart contents can silently break live prices and live images, which is precisely the
outcome that must not happen.

## The cheapest alternative

Restyle the existing pages: new colours, a new font, a better hero, and leave the
scripts alone. That is genuinely cheap, visible in days, and it is the right first
slice of this program. It is not the program, because a reskin cannot express what
this business actually sells: a live 3D preview of the piece being bought, a printed
cost calculator, a material and finish comparison, delivery expectations. A reskin also
leaves the duplicated hero, the per-product image reload, the hidden configurator, the
missing search-engine surface and the absence of any measurement untouched. So the
cheapest alternative is planned here as a slice, not as the answer.

## Goals

- A visitor on a 390 px phone understands within seconds what Modela3D makes, sees a
  real product, and reaches either a purchase or a qualified WhatsApp inquiry without
  needing instructions.
- The storefront states the differentiators in the buyer's terms — material, tolerance,
  finish, lead time, expected price band — instead of hiding them behind a chat.
- The differentiator is demonstrated, not asserted: the visitor sees the product they
  are about to buy before committing to it.
- The visitor can find the right product by their own criteria (type, material, size,
  price) instead of scrolling an undifferentiated grid.
- Every surface of the storefront has an explicit loading, empty and error state.
  Nothing ever fails silently into a dead button.
- Live prices, live images, the live cart and the admin upload flow are provably
  unchanged by the rebuild — proven by tests that execute, not by inspection.
- The storefront becomes discoverable: a catalog page can be indexed, and a shared link
  renders a rich preview instead of a bare link.
- The business can see, per page, how many people viewed, opened a product, added to
  the cart, and started a WhatsApp inquiry — so "it looks better" can be replaced by
  "it converts better".
- The storefront loads fast on a throttled phone: one catalog request, not one per
  product.

## Non-goals / out of scope

- Changing the backend, the data store, the shape of a product, the price of anything,
  stock rules, the Mercado Pago flow or customer identity. The rebuild reads the same
  contracts it reads today.
- Rewriting the storefront onto a different framework, bundler or build system.
- A content management system, a blog, or an editorial workflow for the technical
  content. That content ships with the code; see the open point on who edits it.
- A redesign of the admin beyond making the existing screens usable and consistent.
  The admin keeps its current capabilities and its current data.
- Shipping integrations with carriers, live quotes to shipping, or anything that
  needs carrier credentials that are not available.
- A loyalty programme, a members area, a native app.
- More than one language and more than one currency. The storefront is Argentinian
  Spanish and Argentine pesos.
- Rewriting the store copy in English.
- Server-side rendering. The storefront stays a static site.

## Users & context

- **Comprador hobby.** Arrives from an Instagram story or a shared link, on a phone,
  usually with no file and a vague idea ("quiero una figura de mi perro"). They decide
  in minutes and need price clarity, not a technical conversation.
- **Cliente técnico.** Already has a model or a drawing, needs to know tolerance,
  material and delivery date, and wants to qualify themselves before opening a chat.
- **Cliente que ya compró.** Comes back to reorder, wants to find the previous item
  fast and repeat the order.
- **El dueño.** Loads products, edits prices, sees incoming orders. Every admin
  capability and every existing screen keeps working exactly as it does today.

## Behaviour

- Main path: a visitor lands on a curated entry, sees what is offered, narrows the
  catalog by their own criteria, opens a product, understands its price and its
  production details, adds it to the cart, and completes the order through WhatsApp
  or through Mercado Pago. Every step of that path has a visible loading state, a
  visible empty state and a visible error state.
- The product detail tells the buyer what the piece will be made of, how accurate it
  will be, how it will look finished, when it will arrive, and what it will cost
  before any commitment.
- The catalog shows every product that exists in the store, with its real image and
  its real price, and shows a price range when the price depends on the configuration
  the visitor picks.
- Edge cases: a store with zero products; a product with no image; a product with a
  price range instead of a fixed price; a very long product name; a cart with many
  items; a slow or unreachable connection; a visitor whose session expired; a
  repeated tap on the same primary action; a browser with motion preferences set to
  reduce motion.
- Error paths: when something fails, the visitor is told, in the page, what failed and
  what they can do next. No stack traces, no silent no-op, no dead control. The
  checkout never shows a total that differs from the one the server charges.

## Acceptance criteria

- Given the storefront is opened on a 390 px wide phone, When the entry section is
  visible, Then the page does not scroll sideways, the viewport is not scaled down,
  and the primary action, the business name and one real product are all reachable.
- Given a visitor opens the catalog, When products are present, Then every product in
  the store appears with its image and its price, and the catalog was obtained without
  one request per product.
- Given the store contains no products, When the catalog is opened, Then the page says
  so in plain language and offers a next action, rather than showing an empty grid.
- Given the product service is unreachable, When any part of the page needs it, Then
  the affected section shows an error with a retry, and the rest of the page stays
  usable.
- Given a visitor opens a product, When the page settles, Then the material, the
  tolerance, the finish options, the expected lead time and the price are all visible
  on the same screen.
- Given a product's price depends on a configuration choice, When the visitor changes
  the choice, Then the displayed price changes accordingly and the price shown is the
  price that will be charged.
- Given a visitor adds a product to the cart, When the action completes, Then the cart
  shows the item, its quantity and its contribution to the total, and the cart
  survives a page reload.
- Given a visitor completes the purchase, When the payment provider returns, Then the
  order exists, the confirmation identifies the order, and the price charged equals
  the price displayed before payment.
- Given the owner edits a product in the admin, When the change is saved, Then the
  product changes in the public storefront on the next load, with its image intact.
- Given any page of the storefront, When it is crawled or shared, Then it presents a
  title, a description, a preview image and a canonical address, and the catalog is
  reachable from a machine-readable map of the store.
- Given the business opens the storefront's reporting view, When it loads, Then it
  shows, per page, how many visitors, product views, cart additions and WhatsApp
  inquiries were recorded, and the counts survive a reload.
- Given the whole rebuild, When it is compared against the pre-rebuild storefront,
  Then the set of products, the price of every product, the image of every product and
  the behaviour of the cart are identical, and that identity is demonstrated by tests
  that execute against the storefront.

## Decomposition

This is a program, not a single change. It ships as an ordered set of sub-specs, each
one with its own plan, tasks and verification. The order is a dependency order, not a
priority order: the slices that make the rest safe come first.

| Sub-spec | Outcome it delivers | Depends on |
| --- | --- | --- |
| `frontend-test-harness` | The storefront's own behaviour becomes executable and provable; one command runs lint, types and tests | — |
| `design-system` | One visual language: colour, type, spacing, components, motion — used by every later slice | `frontend-test-harness` |
| `app-shell` | Header, navigation, footer, view transitions, mobile navigation — the frame every page sits in | `design-system` |
| `catalog-experience` | Browsing, filtering, searching, sorting, product detail, and an image pipeline that loads once | `app-shell` |
| `cart-checkout-experience` | Cart drawer, order summary, checkout states, payment handoff, order confirmation | `catalog-experience` |
| `trust-and-content` | The business's real knowledge on the page: materials, tolerances, finishes, lead times, guarantees, and the store copy rewritten to say them | `catalog-experience` |
| `configurator-3d` | A live 3D preview of the piece being bought, with configurable options feeding the price | `design-system`, `catalog-experience` |
| `pricing-tools` | A printed-cost calculator and a material/printer comparison that end in a quote request | `trust-and-content`, `cart-checkout-experience` |
| `seo-and-discovery` | Indexable catalog, rich link previews, structured data, sitemap, and the store's own search visibility | `catalog-experience` |
| `measurement` | Counting of views, product opens, cart additions and WhatsApp inquiries, readable by the owner | `cart-checkout-experience` |
| `admin-experience` | The existing admin screens made consistent and usable, without changing what they do | `design-system` |
| `performance-budget` | Enforced load budgets: one catalog request, sized images, and the target time-to-first-render on a throttled phone | `catalog-experience`, `seo-and-discovery` |

## Points to clarify

- **suposición tomada** — The storefront stays in Spanish (Argentinian) and in pesos,
  and stays a static site. *Base:* the business is Argentinian and the backend is
  already built for it. *Riesgo:* if international sales are a real goal, the copy and
  the currency layer become a later slice rather than a rewrite.
- **suposición tomada** — The rebuild is a sequence of independently shippable slices
  rather than one big-bang relaunch, and the current storefront keeps serving traffic
  until a slice is verified. *Base:* a single relaunch of an untested storefront risks
  taking down the only channel that currently works. *Riesgo:* if the owner expects a
  single visible "new site" moment, the slices need a shared visual debut date and a
  flag to switch over.
- **suposición tomada** — "Attractive" is measured as a rise in qualified WhatsApp
  inquiries and completed checkouts, not as a visual impression, and the baseline is
  read from the current storefront before the first slice merges. *Base:* those are
  the two actions the business already monetises and they are countable. *Riesgo:* if
  the real goal is brand perception or press, the measurement slice measures the
  wrong thing and needs an additional signal.
- **suposición tomada** — Recording and reading page events may add a new read-only
  endpoint; the existing commerce functions stay untouched. *Base:* the constitution
  fixes the backend's behaviour, and a new endpoint that only counts events changes
  no commerce behaviour, no data shape and no money. *Riesgo:* if "the backend is
  fixed" is read strictly as "no new endpoints at all", measurement moves to an
  external service or is dropped, and the business keeps flying blind.
- **suposición tomada** — The storefront is anchored on the catalog that is already
  loaded and sold, curated for the entry section; no new products are invented for
  this program. *Base:* the hard constraint is that the loaded catalog keeps working,
  and inventing products would mean inventing prices. *Riesgo:* if some of the loaded
  products are outdated or badly photographed, the entry experience has to work
  around them — possibly by promoting fewer products than expected.
- **suposición tomada** — The WhatsApp handoff carries the cart contents and the
  agreed total, which is what the storefront already does today. *Base:* it turns a
  chat into a pre-filled order and it is the one action the business can count
  without a new payment path. *Riesgo:* if the owner wants a free-form contact
  instead, the end of every path changes and the inquiry count becomes less
  meaningful.
- **pregunta abierta** — Who edits the technical content — materials, tolerances,
  finishes, lead times — after launch: the owner without a developer, or a developer
  in the same deploy cycle as the code? clarify asks this, because a "yes, the owner"
  answer turns a content slice into a managed-content slice and changes the scope of
  more than one slice in the roadmap.
- **decisión diferida** — Carrier integrations and shipping quotes. clarify leaves it
  out of this cycle; it is blocked on credentials and is not a front-end concern.
- **decisión diferida** — Replacing the checkout provider. clarify leaves it; the
  existing Mercado Pago flow works and is out of scope for a storefront rebuild.
- **área no formulable** — What the owner considers the single most valuable thing the
  site must do that has not been named yet. clarify notes it and it graduates into the
  roadmap when it sharpens.
