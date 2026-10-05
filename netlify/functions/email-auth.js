const { createHash, randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const { createSessionToken } = require("./lib/customer-session");
const { resolveStore } = require("./store");

const scryptAsync = promisify(scrypt);
const CUSTOMER_KEY_PREFIX = "customer_v1:";
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const KEY_LENGTH = 64;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function hashPassword(password, salt) {
  return (await scryptAsync(password, salt, KEY_LENGTH)).toString("base64");
}

function customerKey(email) {
  return `${CUSTOMER_KEY_PREFIX}${createHash("sha256").update(email).digest("hex")}`;
}

function createHandler(options = {}) {
  const dummySalt = randomBytes(16).toString("base64");

  return async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
      return response(204, "");
    }
    if (event.httpMethod !== "POST") {
      return response(405, { ok: false, error: "Method not allowed" });
    }

    const secret = options.sessionSecret ?? process.env.CUSTOMER_SESSION_SECRET ?? "";
    if (secret.length < 32) {
      return response(503, { ok: false, error: "Email authentication is not configured" });
    }

    let body;
    try {
      body = JSON.parse(event.body || "");
    } catch {
      return response(400, { ok: false, error: "Invalid request" });
    }

    const action = body?.action;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!["register", "login"].includes(action) || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return response(400, { ok: false, error: "Invalid email" });
    }
    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      return response(400, { ok: false, error: "Invalid password" });
    }

    const store = options.store || resolveStore(context);
    if (!store) {
      return response(500, { ok: false, error: "Customer storage unavailable" });
    }

    const key = customerKey(email);
    try {
      if (action === "register") {
        const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
        const salt = randomBytes(16).toString("base64");
        const record = {
          id: `email:${key.slice(CUSTOMER_KEY_PREFIX.length)}`,
          email,
          name,
          salt,
          hash: await hashPassword(password, salt),
        };
        const result = await store.set(key, JSON.stringify(record), { onlyIfNew: true });
        if (result?.modified === false) {
          return response(409, { ok: false, error: "Email already registered" });
        }
        return respondWithSession(record, secret, options);
      }

      const raw = await store.get(key);
      const record = raw ? JSON.parse(raw) : null;
      const actual = Buffer.from(await hashPassword(password, record?.salt || dummySalt));
      const expected = Buffer.from(record?.hash || "");
      if (!record || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        return response(401, { ok: false, error: "Invalid credentials" });
      }
      return respondWithSession(record, secret, options);
    } catch {
      return response(500, { ok: false, error: "Authentication failed" });
    }
  };
}

function respondWithSession(record, secret, options) {
  const customer = { id: record.id, email: record.email, name: record.name, picture: "" };
  const token = createSessionToken(customer, { secret, now: options.now });
  return response(200, { ok: true, customer, token });
}

function response(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  };
}

exports.handler = createHandler();
exports.createHandler = createHandler;
