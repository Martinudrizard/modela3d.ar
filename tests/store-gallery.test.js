const test = require("node:test");
const assert = require("node:assert/strict");

const {
  compactProductsForResponse,
  readProductImages,
} = require("../netlify/functions/store");

test("catalog response exposes how many photos a product has without leaking data urls", () => {
  const products = compactProductsForResponse([
    {
      id: "p1",
      name: "Jarra personalizada",
      images: [
        "data:image/jpeg;base64,AAAA",
        "https://cdn.example.com/jarra-2.jpg",
        "data:image/jpeg;base64,BBBB",
      ],
    },
  ]);

  assert.equal(products.length, 1);
  assert.equal(products[0].imageCount, 3);
  assert.deepEqual(products[0].images, ["https://cdn.example.com/jarra-2.jpg"]);
});

test("product gallery returns every stored image from the v2 product", async () => {
  const images = [
    "data:image/jpeg;base64,AAAA",
    "data:image/jpeg;base64,BBBB",
  ];
  const store = {
    get: async (key) =>
      key === "product_v2:p1"
        ? JSON.stringify({ id: "p1", images })
        : null,
  };

  assert.deepEqual(await readProductImages(store, "p1"), images);
});

test("product gallery falls back to the legacy product collection", async () => {
  const images = ["data:image/jpeg;base64,CCCC"];
  const store = {
    get: async (key) =>
      key === "products"
        ? JSON.stringify([{ id: "p2", images }])
        : null,
  };

  assert.deepEqual(await readProductImages(store, "p2"), images);
});
