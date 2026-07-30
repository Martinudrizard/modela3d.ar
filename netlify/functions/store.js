const { getStore } = require("@netlify/blobs");

const ALLOWED_KEYS = new Set(["products", "heroSlides", "waNumber"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  try {
    const store = getStore("modela3d");

    if (event.httpMethod === "GET") {
      const key = event.queryStringParameters?.key;
      if (!ALLOWED_KEYS.has(key)) {
        return response(400, { ok: false, error: "Invalid key" });
      }

      const data = await store.get(key, { type: "json" });
      return response(200, { ok: true, data });
    }

    if (event.httpMethod === "POST" || event.httpMethod === "PUT") {
      const parsed = safeJsonParse(event.body || "{}");
      if (!parsed.ok) {
        return response(400, { ok: false, error: "Invalid JSON body" });
      }

      const { key, data } = parsed.value;
      if (!ALLOWED_KEYS.has(key)) {
        return response(400, { ok: false, error: "Invalid key" });
      }

      await store.setJSON(key, data);
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
