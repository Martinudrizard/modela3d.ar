const assert = require("node:assert/strict");
const test = require("node:test");
const { createHandler } = require("../netlify/functions/orders");
const { readCatalogProducts } = require("../netlify/functions/store");

function createStore(initialEntries = {}) {
  const values = new Map(Object.entries(initialEntries));
  const writes = [];
  return {
    values,
    writes,
    async get(key) {
      return values.get(key) ?? null;
    },
    async set(key, value) {
      writes.push(key);
      values.set(key, value);
    },
  };
}

function createProductsStore() {
  return createStore({
    products: JSON.stringify([{ id: "lamp", name: "Legacy lamp", price: 800 }]),
    products_ids_v2: JSON.stringify(["lamp"]),
    "product_v2:lamp": JSON.stringify({ id: "lamp", name: "Desk lamp", price: 1250 }),
  });
}

function createOrdersHandler(store, verifyToken = async () => ({
  sub: "google-user-42",
  email: "buyer@example.test",
  email_verified: true,
})) {
  return createHandler({
    clientId: "public-client-id",
    store,
    getProducts: readCatalogProducts,
    verifyToken,
    createOrderId: () => "order-test-1",
    now: () => "2026-10-04T00:00:00.000Z",
  });
}

function request(body) {
  return {
    httpMethod: "POST",
    headers: { authorization: "Bearer signed-id-token" },
    body: JSON.stringify(body),
  };
}

function parseBody(response) {
  return JSON.parse(response.body);
}

test("orders reject missing or invalid Google credentials", async () => {
  const store = createProductsStore();
  const handler = createOrdersHandler(store, async () => {
    throw new Error("Invalid audience");
  });

  const response = await handler(request({ items: [{ productId: "lamp", quantity: 1 }] }), {});

  assert.equal(response.statusCode, 401);
  assert.deepEqual(store.writes, []);
});

test("orders reject malformed and untrusted cart input without writing", async (t) => {
  const invalidCarts = [
    null,
    { items: "lamp" },
    { items: [{ productId: "lamp", quantity: "2" }] },
    { items: [{ productId: "lamp", quantity: 0 }] },
    { items: [{ productId: "", quantity: 1 }] },
    { items: [{ productId: "missing", quantity: 1 }] },
    { items: [{ productId: "lamp", quantity: Number.MAX_SAFE_INTEGER }] },
  ];

  for (const [index, cart] of invalidCarts.entries()) {
    await t.test(`invalid cart ${index + 1}`, async () => {
      const store = createProductsStore();
      const response = await createOrdersHandler(store)(request(cart), {});

      assert.equal(response.statusCode, 400);
      assert.deepEqual(store.writes, []);
    });
  }
});

test("draft order totals use current server catalog prices, not client amounts", async () => {
  const store = createProductsStore();
  const handler = createOrdersHandler(store);

  const response = await handler(request({
    items: [{ productId: "lamp", quantity: 2, price: 1, unitPrice: 1 }],
    total: 2,
    currency: "USD",
  }), {});

  assert.equal(response.statusCode, 201);
  assert.equal(parseBody(response).order.total, 2500);
  assert.equal(parseBody(response).order.currency, "ARS");
  assert.deepEqual(parseBody(response).order.items, [{
    productId: "lamp",
    name: "Desk lamp",
    quantity: 2,
    unitPrice: 1250,
    lineTotal: 2500,
  }]);
});

test("order persistence uses dedicated keys and leaves catalog keys unchanged", async () => {
  const store = createProductsStore();
  const before = new Map(store.values);
  const response = await createOrdersHandler(store)(request({
    items: [{ productId: "lamp", quantity: 1 }],
  }), {});

  assert.equal(response.statusCode, 201);
  assert.deepEqual(store.writes, ["order_v1:order-test-1"]);
  assert.deepEqual(
    [...store.values.entries()].filter(([key]) => !key.startsWith("order_v1:")),
    [...before.entries()],
  );
  assert.equal(JSON.parse(store.values.get("order_v1:order-test-1")).customerId, "google-user-42");
});