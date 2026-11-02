const test = require("node:test");
const assert = require("node:assert/strict");

const { ensureBlobsContext, resolveStore } = require("../netlify/functions/store");

const ENV_KEYS = [
  "NETLIFY_BLOBS_CONTEXT",
  "NETLIFY_BLOBS_TOKEN",
  "NETLIFY_AUTH_TOKEN",
  "NETLIFY_SITE_ID",
  "SITE_ID",
];

function clearBlobsEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

function setRuntimeContext(token = "runtime-token") {
  process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(
    JSON.stringify({ edgeURL: "https://blobs.example.test", token, siteID: "site-1" })
  ).toString("base64");
}

test.beforeEach(clearBlobsEnv);
test.afterEach(clearBlobsEnv);

test("store resolution uses the Netlify runtime context without a manual token", () => {
  setRuntimeContext();

  const store = resolveStore();

  assert.ok(store);
  assert.equal(typeof store.get, "function");
});

test("store resolution falls back to explicit credentials outside the runtime", () => {
  process.env.NETLIFY_BLOBS_TOKEN = "manual-token";
  process.env.NETLIFY_SITE_ID = "site-1";

  const store = resolveStore();

  assert.ok(store);
  assert.equal(typeof store.get, "function");
});

test("store resolution returns null when nothing is configured", () => {
  assert.equal(resolveStore(), null);
});

test("lambda compatibility event hydrates the blobs context", () => {
  const event = {
    blobs: Buffer.from(
      JSON.stringify({ url: "https://blobs.example.test", token: "event-token" })
    ).toString("base64"),
    headers: { "x-nf-site-id": "site-1", "x-nf-deploy-id": "deploy-1" },
  };

  ensureBlobsContext(event);

  assert.ok(process.env.NETLIFY_BLOBS_CONTEXT);
  assert.ok(resolveStore());
});

test("event without a blobs payload leaves the configuration untouched", () => {
  ensureBlobsContext({ headers: {} });

  assert.equal(process.env.NETLIFY_BLOBS_CONTEXT, undefined);
  assert.equal(resolveStore(), null);
});

test("event payload wins over a stale manual token", () => {
  process.env.NETLIFY_BLOBS_TOKEN = "stale-token";
  process.env.NETLIFY_SITE_ID = "site-1";
  const event = {
    blobs: Buffer.from(
      JSON.stringify({ url: "https://blobs.example.test", token: "event-token" })
    ).toString("base64"),
    headers: { "x-nf-site-id": "site-1" },
  };

  ensureBlobsContext(event);

  const context = JSON.parse(
    Buffer.from(process.env.NETLIFY_BLOBS_CONTEXT, "base64").toString("utf8")
  );
  assert.equal(context.token, "event-token");
});
