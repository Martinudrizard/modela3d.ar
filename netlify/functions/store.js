const { getStore } = require("@netlify/blobs");

const ALLOWED_KEYS = new Set(["products", "heroSlides", "waNumber"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
};

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  try {
    const store = resolveStore(context);
    if (!store) {
      return response(500, {
        ok: false,
        error: "Blob store unavailable",
        details:
          "No runtime blobs context and no token fallback configured. Set NETLIFY_BLOBS_TOKEN in site env vars.",
      });
    }

    if (event.httpMethod === "GET") {
      const key = event.queryStringParameters?.key;
      if (!ALLOWED_KEYS.has(key)) {
        return response(400, { ok: false, error: "Invalid key" });
      }

      const raw = await store.get(key);
      const data = raw ? safeJsonParse(raw).value : null;
      return response(200, { ok: true, data });
    }

    if (event.httpMethod === "POST" || event.httpMethod === "PUT") {
      if (!isAuthorized(event)) {
        return response(401, { ok: false, error: "Unauthorized" });
      }

      const parsed = safeJsonParse(event.body || "{}");
      if (!parsed.ok) {
        return response(400, { ok: false, error: "Invalid JSON body" });
      }

      const { key, data } = parsed.value;
      if (key === "__auth") {
        return response(200, { ok: true });
      }

      if (!ALLOWED_KEYS.has(key)) {
        return response(400, { ok: false, error: "Invalid key" });
      }

      await store.set(key, JSON.stringify(data));
      return response(200, { ok: true });
    }

    return response(405, { ok: false, error: "Method not allowed" });
  } catch (error) {
    return response(500, {
      ok: false,
      error: "Store operation failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

function response(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
    body: JSON.stringify(payload),
  };
}

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: null };
  }
}

function resolveStore(context) {
  const runtimeStore = context?.blobs?.getStore?.("modela3d");
  if (runtimeStore) {
    return runtimeStore;
  }

  const token = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN || "";
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID || "";

  if (!token || !siteID) {
    return null;
  }

  return getStore({
    name: "modela3d",
    token,
    siteID,
  });
}

function isAuthorized(event) {
  const expected = process.env.ADMIN_PANEL_KEY || "";
  if (!expected) {
    return false;
  }

  const provided =
    event?.headers?.["x-admin-key"] ||
    event?.headers?.["X-Admin-Key"] ||
    "";

  return String(provided).trim() === String(expected).trim();
}
