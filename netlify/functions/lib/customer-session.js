const { createHmac, timingSafeEqual } = require("node:crypto");
const { authenticateGoogleIdentity } = require("./google-auth");

const TOKEN_PREFIX = "m3d.";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const MIN_SECRET_LENGTH = 32;

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function createSessionToken(customer, options = {}) {
  const secret = options.secret ?? process.env.CUSTOMER_SESSION_SECRET ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    return "";
  }
  const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
  const payload = Buffer.from(
    JSON.stringify({ sub: customer.id, email: customer.email, name: customer.name, exp: nowSeconds + SESSION_TTL_SECONDS }),
  ).toString("base64url");
  return `${TOKEN_PREFIX}${payload}.${sign(payload, secret)}`;
}

function verifySessionToken(token, options = {}) {
  const secret = options.secret ?? process.env.CUSTOMER_SESSION_SECRET ?? "";
  if (secret.length < MIN_SECRET_LENGTH || !token.startsWith(TOKEN_PREFIX)) {
    return null;
  }
  const [payload, signature, extra] = token.slice(TOKEN_PREFIX.length).split(".");
  if (!payload || !signature || extra !== undefined) {
    return null;
  }
  const expected = Buffer.from(sign(payload, secret));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return null;
  }
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
    if (typeof claims.sub !== "string" || !claims.sub || !(claims.exp > nowSeconds)) {
      return null;
    }
    return {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : "",
      name: typeof claims.name === "string" ? claims.name : "",
      picture: "",
    };
  } catch {
    return null;
  }
}

async function authenticateCustomer(event, options = {}) {
  const authorization = Object.entries(event?.headers || {}).find(
    ([name]) => name.toLowerCase() === "authorization",
  )?.[1];
  const bearer = typeof authorization === "string" ? authorization.match(/^Bearer\s+(\S+)$/i)?.[1] : "";

  if (bearer && bearer.startsWith(TOKEN_PREFIX)) {
    const customer = verifySessionToken(bearer, { secret: options.sessionSecret, now: options.now });
    return customer
      ? { ok: true, customer }
      : { ok: false, statusCode: 401, error: "Unauthorized" };
  }

  return authenticateGoogleIdentity(event, options);
}

module.exports = { authenticateCustomer, createSessionToken, verifySessionToken };
