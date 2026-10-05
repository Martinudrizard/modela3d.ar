const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const test = require("node:test");
const { createHandler } = require("../netlify/functions/mercado-pago-webhook");

const WEBHOOK_SECRET = "test-webhook-secret";
const PAYMENT_ID = "123456789";
const REQUEST_ID = "request-test-1";
const TIMESTAMP = "1791072000";

function createOrder(overrides = {}) {
  return {
    id: "order-123",
    customerId: "customer-1",
    items: [{ productId: "lamp", quantity: 2, unitPrice: 1250, lineTotal: 2500 }],
    total: 2500,
    currency: "ARS",
    status: "draft",
    ...overrides,
  };
}

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

function createReadBarrierStore(order, readCount = 2) {
  const store = createStore(order);
  const read = store.getWithMetadata.bind(store);
  let arrivals = 0;
  let release;
  const barrier = new Promise((resolve) => { release = resolve; });
  store.getWithMetadata = async (...args) => {
    const result = await read(...args);
    arrivals += 1;
    if (arrivals === readCount) {
      release();
    }
    if (arrivals <= readCount) {
      await barrier;
    }
    return result;
  };
  return store;
}

function signedEvent(paymentId = PAYMENT_ID, signatureOverride) {
  const manifest = `id:${paymentId};request-id:${REQUEST_ID};ts:${TIMESTAMP};`;
  const hash = createHmac("sha256", WEBHOOK_SECRET).update(manifest).digest("hex");
  return {
    httpMethod: "POST",
    headers: {
      "x-request-id": REQUEST_ID,
      "x-signature": signatureOverride || `ts=${TIMESTAMP},v1=${hash}`,
    },
    queryStringParameters: { "data.id": paymentId },
    body: JSON.stringify({ type: "payment", data: { id: paymentId } }),
  };
}

function createWebhookHandler(store, payment, options = {}) {
  const paymentCalls = [];
  const handler = createHandler({
    store,
    webhookSecret: WEBHOOK_SECRET,
    paymentClient: { get: async ({ id }) => {
      paymentCalls.push(id);
      return payment;
    } },
    now: () => Number(TIMESTAMP) * 1000,
    ...options,
  });
  return { handler, paymentCalls };
}

function parseBody(response) {
  return JSON.parse(response.body);
}

test("webhook rejects invalid signatures before retrieving payment", async () => {
  const store = createStore(createOrder());
  const { handler, paymentCalls } = createWebhookHandler(store, {});

  const response = await handler(signedEvent(PAYMENT_ID, `ts=${TIMESTAMP},v1=${"0".repeat(64)}`), {});

  assert.equal(response.statusCode, 401);
  assert.equal(paymentCalls.length, 0);
  assert.deepEqual(store.writes, []);
});

test("webhook reports missing Mercado Pago access token", async () => {
  const store = createStore(createOrder());
  const handler = createHandler({
    store,
    webhookSecret: WEBHOOK_SECRET,
    accessToken: "",
    now: () => Number(TIMESTAMP) * 1000,
  });

  const response = await handler(signedEvent(), {});

  assert.equal(response.statusCode, 503);
  assert.deepEqual(store.writes, []);
});

test("approved matching payment marks the owned draft order paid", async () => {
  const store = createStore(createOrder());
  const { handler, paymentCalls } = createWebhookHandler(store, {
    id: PAYMENT_ID,
    status: "approved",
    external_reference: "order-123",
    transaction_amount: 2500,
    currency_id: "ARS",
  });

  const response = await handler(signedEvent(), {});

  assert.equal(response.statusCode, 200);
  assert.deepEqual(paymentCalls, [PAYMENT_ID]);
  const updatedOrder = JSON.parse(store.values.get("order_v1:order-123"));
  assert.equal(updatedOrder.status, "paid");
  assert.equal(updatedOrder.paymentId, PAYMENT_ID);
  assert.equal(updatedOrder.paymentStatus, "approved");
  assert.equal(store.writes.length, 1);
});

test("webhook leaves orders unchanged for unapproved, mismatched, or ineligible orders", async (t) => {
  const cases = [
    { name: "pending", payment: { status: "pending" } },
    { name: "wrong order", payment: { status: "approved", external_reference: "other-order", transaction_amount: 2500, currency_id: "ARS" } },
    { name: "wrong total", payment: { status: "approved", external_reference: "order-123", transaction_amount: 1, currency_id: "ARS" } },
    { name: "wrong currency", payment: { status: "approved", external_reference: "order-123", transaction_amount: 2500, currency_id: "USD" } },
    { name: "cancelled order", orderStatus: "cancelled", payment: { status: "approved", external_reference: "order-123", transaction_amount: 2500, currency_id: "ARS" } },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const initialStatus = scenario.orderStatus || "draft";
      const store = createStore(createOrder({ status: initialStatus }));
      const { handler } = createWebhookHandler(store, { id: PAYMENT_ID, ...scenario.payment });

      const response = await handler(signedEvent(), {});

      assert.equal(response.statusCode, 200);
      assert.equal(JSON.parse(store.values.get("order_v1:order-123")).status, initialStatus);
      assert.deepEqual(store.writes, []);
    });
  }
});

test("repeated approved notifications are idempotent", async () => {
  const store = createStore(createOrder({
    status: "pending",
    preferenceId: "preference-1",
    initPoint: "https://checkout.example.test/pay",
  }));
  const { handler } = createWebhookHandler(store, {
    id: PAYMENT_ID,
    status: "approved",
    external_reference: "order-123",
    transaction_amount: 2500,
    currency_id: "ARS",
  });

  const firstResponse = await handler(signedEvent(), {});
  const duplicateResponse = await handler(signedEvent(), {});

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(duplicateResponse.statusCode, 200);
  assert.deepEqual(store.writes, ["order_v1:order-123"]);
  assert.equal(parseBody(duplicateResponse).duplicate, true);
});

test("webhook ignores an unrelated event with a non-string action", async () => {
  const store = createStore(createOrder());
  const event = signedEvent();
  event.body = JSON.stringify({ type: "merchant_order", action: 12, data: { id: PAYMENT_ID } });
  const { handler, paymentCalls } = createWebhookHandler(store, {});

  const response = await handler(event, {});

  assert.equal(response.statusCode, 200);
  assert.equal(parseBody(response).ignored, true);
  assert.deepEqual(paymentCalls, []);
  assert.deepEqual(store.writes, []);
});

test("concurrent same-payment notifications perform one conditional order write", async () => {
  const store = createReadBarrierStore(createOrder({ status: "pending" }));
  const payment = {
    id: PAYMENT_ID,
    status: "approved",
    external_reference: "order-123",
    transaction_amount: 2500,
    currency_id: "ARS",
  };
  const { handler } = createWebhookHandler(store, payment);

  const responses = await Promise.all([handler(signedEvent(), {}), handler(signedEvent(), {})]);

  assert.deepEqual(responses.map(parseBody).map(({ updated, duplicate }) => ({ updated, duplicate })).sort((a, b) => Number(b.updated) - Number(a.updated)), [
    { updated: true, duplicate: undefined },
    { updated: false, duplicate: true },
  ]);
  const updatedOrder = JSON.parse(store.values.get("order_v1:order-123"));
  assert.equal(updatedOrder.status, "paid");
  assert.equal(updatedOrder.paymentId, PAYMENT_ID);
  assert.deepEqual(store.writes, ["order_v1:order-123"]);
});

test("concurrent different approved payments preserve winner and create minimal conflict record", async () => {
  const store = createReadBarrierStore(createOrder({ status: "pending" }));
  const payments = new Map([
    [PAYMENT_ID, {
      id: PAYMENT_ID,
      status: "approved",
      external_reference: "order-123",
      transaction_amount: 2500,
      currency_id: "ARS",
    }],
    ["987654321", {
      id: "987654321",
      status: "approved",
      external_reference: "order-123",
      transaction_amount: 2500,
      currency_id: "ARS",
    }],
  ]);
  const handler = createHandler({
    store,
    webhookSecret: WEBHOOK_SECRET,
    paymentClient: { get: async ({ id }) => payments.get(id) },
    now: () => Number(TIMESTAMP) * 1000,
  });

  const responses = await Promise.all([
    handler(signedEvent(PAYMENT_ID), {}),
    handler(signedEvent("987654321"), {}),
  ]);

  const responseBodies = responses.map(parseBody);
  assert.equal(responseBodies.filter((body) => body.updated).length, 1);
  assert.equal(responseBodies.filter((body) => body.conflict).length, 1);
  const winningOrder = JSON.parse(store.values.get("order_v1:order-123"));
  const losingPaymentId = winningOrder.paymentId === PAYMENT_ID ? "987654321" : PAYMENT_ID;
  assert.equal(winningOrder.status, "paid");
  assert.ok(payments.has(winningOrder.paymentId));
  const conflicts = [...store.values.entries()].filter(([key]) => key.startsWith("payment_conflict_v1:"));
  assert.equal(conflicts.length, 1);
  const [conflictKey, conflictValue] = conflicts[0];
  assert.equal(conflictKey, `payment_conflict_v1:order-123:${losingPaymentId}`);
  assert.deepEqual(JSON.parse(conflictValue), {
    orderId: "order-123",
    winningPaymentId: winningOrder.paymentId,
    conflictingPaymentId: losingPaymentId,
  });
  assert.equal(store.writes.filter((key) => key === "order_v1:order-123").length, 1);
  assert.equal(store.writes.filter((key) => key === conflictKey).length, 1);

  const replayResponse = await handler(signedEvent(losingPaymentId), {});
  assert.equal(parseBody(replayResponse).conflict, true);
  assert.equal(store.writes.filter((key) => key === conflictKey).length, 1);
});