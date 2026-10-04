const assert = require("node:assert/strict");
const test = require("node:test");
const { createHandler } = require("../netlify/functions/customer-auth");

function parseBody(response) {
  return JSON.parse(response.body);
}

test("customer auth rejects missing Google client configuration", async () => {
  let verifierCalled = false;
  const handler = createHandler({
    clientId: "",
    verifyToken: async () => {
      verifierCalled = true;
      return { sub: "customer-1", email_verified: true };
    },
  });

  const response = await handler({ httpMethod: "POST", headers: {} }, {});

  assert.equal(response.statusCode, 503);
  assert.equal(verifierCalled, false);
  assert.equal(parseBody(response).error, "Google authentication is not configured");
});

test("customer auth rejects a missing bearer token", async () => {
  const handler = createHandler({
    clientId: "public-client-id",
    verifyToken: async () => assert.fail("Verifier must not run without a token"),
  });

  const response = await handler({ httpMethod: "POST", headers: {} }, {});

  assert.equal(response.statusCode, 401);
  assert.equal(parseBody(response).error, "Unauthorized");
});

test("customer auth verifies the configured audience and returns safe identity claims", async () => {
  const identity = {
    sub: "google-user-42",
    email: "buyer@example.test",
    email_verified: true,
    name: "Buyer",
    picture: "https://example.test/avatar.png",
    aud: "public-client-id",
    private_claim: "must-not-be-returned",
  };
  let observedToken;
  let observedAudience;
  const handler = createHandler({
    clientId: "public-client-id",
    verifyToken: async (token, audience) => {
      observedToken = token;
      observedAudience = audience;
      if (audience !== identity.aud) {
        throw new Error("Invalid audience");
      }
      return identity;
    },
  });

  const response = await handler({
    httpMethod: "POST",
    headers: { authorization: "Bearer signed-id-token" },
  }, {});
  const body = parseBody(response);

  assert.equal(response.statusCode, 200);
  assert.equal(observedToken, "signed-id-token");
  assert.equal(observedAudience, "public-client-id");
  assert.deepEqual(body.customer, {
    id: "google-user-42",
    email: "buyer@example.test",
    name: "Buyer",
    picture: "https://example.test/avatar.png",
  });
  assert.equal(JSON.stringify(body).includes("must-not-be-returned"), false);
});

test("customer auth rejects verifier failures without reflecting the token", async () => {
  const handler = createHandler({
    clientId: "public-client-id",
    verifyToken: async () => {
      throw new Error("Invalid audience for signed-id-token");
    },
  });

  const response = await handler({
    httpMethod: "POST",
    headers: { authorization: "Bearer signed-id-token" },
  }, {});

  assert.equal(response.statusCode, 401);
  assert.equal(JSON.stringify(parseBody(response)).includes("signed-id-token"), false);
});

test("customer auth exposes only the public Google client ID", async () => {
  const handler = createHandler({
    clientId: "public-client-id",
    verifyToken: async () => assert.fail("GET must not verify an identity token"),
  });

  const response = await handler({ httpMethod: "GET", headers: {} }, {});

  assert.equal(response.statusCode, 200);
  assert.deepEqual(parseBody(response), { ok: true, clientId: "public-client-id" });
});