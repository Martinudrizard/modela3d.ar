const assert = require("node:assert/strict");
const test = require("node:test");
const { createHandler } = require("../netlify/functions/email-auth");
const { authenticateCustomer } = require("../netlify/functions/lib/customer-session");

const SECRET = "x".repeat(40);

function createStore() {
  const values = new Map();
  return {
    values,
    async get(key) {
      return values.get(key) ?? null;
    },
    async set(key, value, opts = {}) {
      if (opts.onlyIfNew && values.has(key)) {
        return { modified: false };
      }
      values.set(key, value);
      return { modified: true };
    },
  };
}

function call(handler, body) {
  return handler({ httpMethod: "POST", headers: {}, body: JSON.stringify(body) }, {});
}

test("register then login returns a session token accepted by authenticateCustomer", async () => {
  const store = createStore();
  const handler = createHandler({ store, sessionSecret: SECRET });

  const registered = await call(handler, { action: "register", email: "Buyer@Example.test", password: "correct-horse", name: "Ana" });
  assert.equal(registered.statusCode, 200);
  assert.ok(![...store.values.values()].some((v) => v.includes("correct-horse")));

  const login = await call(handler, { action: "login", email: "buyer@example.test", password: "correct-horse" });
  const { token, customer } = JSON.parse(login.body);
  assert.equal(login.statusCode, 200);
  assert.equal(customer.email, "buyer@example.test");

  const auth = await authenticateCustomer(
    { headers: { authorization: `Bearer ${token}` } },
    { sessionSecret: SECRET },
  );
  assert.equal(auth.ok, true);
  assert.equal(auth.customer.id, customer.id);
});

test("duplicate registration, wrong password and unknown email are rejected", async () => {
  const handler = createHandler({ store: createStore(), sessionSecret: SECRET });
  await call(handler, { action: "register", email: "a@b.co", password: "password1" });

  assert.equal((await call(handler, { action: "register", email: "a@b.co", password: "password2" })).statusCode, 409);
  assert.equal((await call(handler, { action: "login", email: "a@b.co", password: "wrong-pass" })).statusCode, 401);
  assert.equal((await call(handler, { action: "login", email: "none@b.co", password: "password1" })).statusCode, 401);
});

test("invalid input and missing secret fail closed", async () => {
  const handler = createHandler({ store: createStore(), sessionSecret: SECRET });
  assert.equal((await call(handler, { action: "register", email: "bad", password: "password1" })).statusCode, 400);
  assert.equal((await call(handler, { action: "register", email: "a@b.co", password: "short" })).statusCode, 400);

  const unconfigured = createHandler({ store: createStore(), sessionSecret: "" });
  assert.equal((await call(unconfigured, { action: "login", email: "a@b.co", password: "password1" })).statusCode, 503);
});

test("tampered or expired session tokens are rejected", async () => {
  const handler = createHandler({ store: createStore(), sessionSecret: SECRET, now: () => 1000 });
  const { token } = JSON.parse((await call(handler, { action: "register", email: "a@b.co", password: "password1" })).body);

  const tampered = `${token.slice(0, -2)}xx`;
  const bad = await authenticateCustomer({ headers: { authorization: `Bearer ${tampered}` } }, { sessionSecret: SECRET, now: 1000 });
  assert.equal(bad.ok, false);

  const expired = await authenticateCustomer({ headers: { authorization: `Bearer ${token}` } }, { sessionSecret: SECRET, now: 1000 + 8 * 24 * 3600 * 1000 });
  assert.equal(expired.ok, false);
});
