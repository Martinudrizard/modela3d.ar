const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { PRODUCT_SUBSECTIONS, remapHogarProductsToLamparas } = require("../catalog-utils.js");

const APP_JS = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const INDEX_HTML = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("the catalog exposes Lamparas as a valid product subsection", () => {
  assert.ok(PRODUCT_SUBSECTIONS.includes("Lamparas"));
});

test("products in Hogar with lampara in the name are moved to Lamparas", () => {
  const products = [
    { id: "p1", name: "Lampara de mesa", category: "Hogar" },
    { id: "p2", name: "Lámpara de pared", category: "Hogar" },
    { id: "p3", name: "Maceta Geometrica", category: "Hogar" },
    { id: "p4", name: "Soporte de celular", category: "Soportes" },
  ];

  const normalized = remapHogarProductsToLamparas(products);

  assert.deepEqual(
    normalized.map((product) => ({ id: product.id, category: product.category })),
    [
      { id: "p1", category: "Lamparas" },
      { id: "p2", category: "Lamparas" },
      { id: "p3", category: "Hogar" },
      { id: "p4", category: "Soportes" },
    ]
  );
});

test("the landing page no longer renders the Piezas Destacadas block", () => {
  assert.doesNotMatch(INDEX_HTML, /PIEZAS DESTACADAS|landing-featured/iu);
  assert.doesNotMatch(APP_JS, /landing-featured|landingCtaFeatured|landingFeatured/iu);
});
