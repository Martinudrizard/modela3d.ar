const assert = require("node:assert/strict");
const test = require("node:test");
const { createHandler } = require("../netlify/functions/mercado-pago-payment");

function createStore(order) {
  const values = new Map([[`order_v1:${order.id}`, JSON.stringify(order)]]);
  const etags = new Map([[`order_v1:${order.id}`, 1]]);
  const writes = [];
  return {
    values,
    writes,
    async get(key) {
      return values.get(key) ?? null;
    },
    async set(key, value, options = {}) {
      if (options.onlyIfMatch !== undefined && String(etags.get(key)) !== options.onlyIfMatch) {
        return { modified: false };
      }
      if (options.onlyIfNew && values.has(key)) {
        return { modified: false };
      }
      writes.push(key);
      values.set(key, value);
      etags.set(key, (etags.get(key) || 0) + 1);
      return { modified: true, etag: String(etags.get(key)) };
    },
    async getWithMetadata(key) {
      const raw = values.get(key);
      return raw === undefined ? null : {
        data: JSON.parse(raw),
        etag: String(etags.get(key)),
        metadata: {},
      };
    },
  };
}

function createReadBarrierStore(order) {
  const store = createStore(order);
  const read = store.getWithMetadata.bind(store);
  let arrivals = 0;
  let release;
  const barrier = new Promise((resolve) => { release = resolve; });
  store.getWithMetadata = async (...args) => {
    const result = await read(...args);
    arrivals += 1;
    if (arrivals === 2) {
      release();
    }
    if (arrivals <= 2) {
      await barrier;
    }
    return result;
  };
  return store;
}

function createOrder(overrides = {}) {
  return {
    id: "order-123",
    customerId: "customer-1",
    customerEmail: "buyer@example.test",
    items: [{
      productId: "lamp",
      name: "Desk lamp",
      quantity: 2,
      unitPrice: 1250,
      lineTotal: 2500,
    }],
    total: 2500,
    currency: "ARS",
    status: "draft",
    ...overrides,
  };
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

function createSdkMocks() {
  const configurations = [];
  const preferenceCalls = [];
  class MockMercadoPagoConfig {
    constructor(configuration) {
      this.configuration = configuration;
      configurations.push(configuration);
    }
  }
  class MockPreference {
    constructor(configuration) {
      this.configuration = configuration;
    }
    async create(requestOptions) {
      preferenceCalls.push({ configuration: this.configuration.configuration, requestOptions });
      return { id: "preference-1", init_point: "https://checkout.example.test/pay" };
    }
  }
  return { configurations, preferenceCalls, MercadoPagoConfig: MockMercadoPagoConfig, Preference: MockPreference };
}

test("payment preference uses only the authenticated draft order values", async () => {
  const order = createOrder();
  const store = createStore(order);
  let preferenceRequest;
  const handler = createHandler({
    store,
    authenticate: async () => ({ ok: true, customer: { id: "customer-1" } }),
    preferenceClient: { create: async (requestOptions) => {
      preferenceRequest = requestOptions.body;
      return { id: "preference-1", init_point: "https://checkout.example.test/pay" };
    } },
    notificationUrl: "https://shop.example.test/.netlify/functions/mercado-pago-webhook",
  });

  const response = await handler(request({ orderId: order.id, total: 1, items: [] }), {});

  assert.equal(response.statusCode, 200);
  assert.equal(parseBody(response).preferenceId, "preference-1");
  assert.equal(parseBody(response).initPoint, "https://checkout.example.test/pay");
  assert.deepEqual(preferenceRequest.items, [{
    id: "lamp",
    title: "Desk lamp",
    quantity: 2,
    unit_price: 1250,
    currency_id: "ARS",
  }]);
  assert.equal(preferenceRequest.external_reference, "order-123");
  assert.equal(preferenceRequest.notification_url, "https://shop.example.test/.netlify/functions/mercado-pago-webhook");
  assert.equal(preferenceRequest.payer.email, "buyer@example.test");
  assert.deepEqual(store.writes, ["order_v1:order-123"]);
  const updatedOrder = JSON.parse(store.values.get("order_v1:order-123"));
  assert.equal(updatedOrder.status, "pending");
  assert.equal(updatedOrder.preferenceId, "preference-1");
  assert.equal(updatedOrder.initPoint, "https://checkout.example.test/pay");
});

test("repeated checkout reuses the stored preference and one stable SDK idempotency key", async () => {
  const order = createOrder();
  const store = createStore(order);
  const sdk = createSdkMocks();
  const handler = createHandler({
    store,
    accessToken: "test-access-token",
    MercadoPagoConfig: sdk.MercadoPagoConfig,
    Preference: sdk.Preference,
    authenticate: async () => ({ ok: true, customer: { id: "customer-1" } }),
    notificationUrl: "https://shop.example.test/.netlify/functions/mercado-pago-webhook",
  });

  const firstResponse = await handler(request({ orderId: order.id }), {});
  const repeatedResponse = await handler(request({ orderId: order.id }), {});

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(repeatedResponse.statusCode, 200);
  assert.equal(parseBody(repeatedResponse).preferenceId, "preference-1");
  assert.equal(parseBody(repeatedResponse).initPoint, "https://checkout.example.test/pay");
  assert.equal(sdk.preferenceCalls.length, 1);
  assert.deepEqual(store.writes, ["order_v1:order-123"]);
  assert.deepEqual(sdk.configurations, [{
    accessToken: "test-access-token",
    options: { idempotencyKey: "checkout-preference:order-123" },
  }]);
});

test("preference retry after persistence failure uses the same provider idempotency key", async () => {
  const order = createOrder();
  const values = new Map([[`order_v1:${order.id}`, JSON.stringify(order)]]);
  const etags = new Map([[`order_v1:${order.id}`, 1]]);
  let persistenceAttempts = 0;
  const store = {
    values,
    async get(key) {
      return values.get(key) ?? null;
    },
    async getWithMetadata(key) {
      const raw = values.get(key);
      return raw === undefined ? null : {
        data: JSON.parse(raw),
        etag: String(etags.get(key)),
        metadata: {},
      };
    },
    async set(key, value, options = {}) {
      persistenceAttempts += 1;
      if (persistenceAttempts === 1) {
        throw new Error("temporary storage failure");
      }
      if (options.onlyIfMatch !== undefined && String(etags.get(key)) !== options.onlyIfMatch) {
        return { modified: false };
      }
      values.set(key, value);
      etags.set(key, etags.get(key) + 1);
      return { modified: true, etag: String(etags.get(key)) };
    },
  };
  const sdk = createSdkMocks();
  const handler = createHandler({
    store,
    accessToken: "test-access-token",
    MercadoPagoConfig: sdk.MercadoPagoConfig,
    Preference: sdk.Preference,
    authenticate: async () => ({ ok: true, customer: { id: "customer-1" } }),
    notificationUrl: "https://shop.example.test/.netlify/functions/mercado-pago-webhook",
  });

  const failedResponse = await handler(request({ orderId: order.id }), {});
  const retryResponse = await handler(request({ orderId: order.id }), {});

  assert.equal(failedResponse.statusCode, 502);
  assert.equal(retryResponse.statusCode, 200);
  assert.equal(sdk.preferenceCalls.length, 2);
  assert.deepEqual(sdk.configurations.map((configuration) => configuration.options.idempotencyKey), [
    "checkout-preference:order-123",
    "checkout-preference:order-123",
  ]);
  assert.equal(JSON.parse(values.get("order_v1:order-123")).status, "pending");
});

test("payment preference fails closed for inconsistent stored preference fields", async () => {
  const cases = [
    { name: "pending without preference id", order: createOrder({ status: "pending", initPoint: "https://checkout.example.test/pay" }) },
    { name: "pending with blank preference id", order: createOrder({ status: "pending", preferenceId: " ", initPoint: "https://checkout.example.test/pay" }) },
    { name: "pending with non-HTTPS URL", order: createOrder({ status: "pending", preferenceId: "preference-1", initPoint: "http://checkout.example.test/pay" }) },
    { name: "draft with an existing preference id", order: createOrder({ preferenceId: "preference-1" }) },
  ];

  for (const scenario of cases) {
    await test(scenario.name, async () => {
      const store = createStore(scenario.order);
      let providerCalls = 0;
      const handler = createHandler({
        store,
        authenticate: async () => ({ ok: true, customer: { id: "customer-1" } }),
        preferenceClient: { create: async () => {
          providerCalls += 1;
          return { id: "preference-2", init_point: "https://checkout.example.test/other" };
        } },
        notificationUrl: "https://shop.example.test/.netlify/functions/mercado-pago-webhook",
      });

      const response = await handler(request({ orderId: scenario.order.id }), {});

      assert.equal(response.statusCode, 409);
      assert.equal(providerCalls, 0);
      assert.deepEqual(store.writes, []);
    });
  }
});

test("payment preference rejects missing, foreign, and non-draft orders", async (t) => {
  const cases = [
    { name: "missing", order: null, orderId: "missing-order", customerId: "customer-1", statusCode: 404 },
    { name: "foreign", order: createOrder(), orderId: "order-123", customerId: "customer-2", statusCode: 404 },
    { name: "paid", order: createOrder({ status: "paid" }), orderId: "order-123", customerId: "customer-1", statusCode: 409 },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const store = scenario.order ? createStore(scenario.order) : createStore(createOrder());
      let providerCalls = 0;
      const handler = createHandler({
        store,
        authenticate: async () => ({ ok: true, customer: { id: scenario.customerId } }),
        preferenceClient: { create: async () => {
          providerCalls += 1;
          return {};
        } },
      });

      const response = await handler(request({ orderId: scenario.orderId }), {});

      assert.equal(response.statusCode, scenario.statusCode);
      assert.equal(providerCalls, 0);
      assert.deepEqual(store.writes, []);
    });
  }
});

test("payment preference reports missing provider configuration", async () => {
  const store = createStore(createOrder());
  const handler = createHandler({
    store,
    accessToken: "",
    notificationUrl: "https://shop.example.test/.netlify/functions/mercado-pago-webhook",
    authenticate: async () => ({ ok: true, customer: { id: "customer-1" } }),
  });

  const response = await handler(request({ orderId: "order-123" }), {});

  assert.equal(response.statusCode, 503);
  assert.deepEqual(store.writes, []);
});

test("concurrent preference creation persists one pending order and reuses the winner", async () => {
  const order = createOrder();
  const store = createReadBarrierStore(order);
  let providerCalls = 0;
  const handler = createHandler({
    store,
    authenticate: async () => ({ ok: true, customer: { id: "customer-1" } }),
    preferenceClient: { create: async () => {
      providerCalls += 1;
      return {
        id: `preference-${providerCalls}`,
        init_point: `https://checkout.example.test/pay/${providerCalls}`,
      };
    } },
    notificationUrl: "https://shop.example.test/.netlify/functions/mercado-pago-webhook",
  });

  const responses = await Promise.all([
    handler(request({ orderId: order.id }), {}),
    handler(request({ orderId: order.id }), {}),
  ]);

  assert.deepEqual(responses.map((response) => response.statusCode), [200, 200]);
  const persistedOrder = JSON.parse(store.values.get("order_v1:order-123"));
  assert.equal(persistedOrder.status, "pending");
  assert.ok(responses.every((response) => parseBody(response).preferenceId === persistedOrder.preferenceId));
  assert.equal(store.writes.filter((key) => key === "order_v1:order-123").length, 1);
});