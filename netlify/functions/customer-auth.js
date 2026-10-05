const { authenticateCustomer } = require("./lib/customer-session");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function createHandler(options = {}) {
  const clientId = options.clientId ?? process.env.GOOGLE_CLIENT_ID ?? "";

  return async (event) => {
    if (event.httpMethod === "OPTIONS") {
      return response(204, "");
    }

    if (event.httpMethod === "GET") {
      if (!clientId) {
        return response(503, { ok: false, error: "Google authentication is not configured" });
      }
      return response(200, { ok: true, clientId });
    }

    if (event.httpMethod !== "POST") {
      return response(405, { ok: false, error: "Method not allowed" });
    }

    const result = await (options.authenticate || authenticateCustomer)(event, {
      clientId,
      verifyToken: options.verifyToken,
    });
    if (!result.ok) {
      return response(result.statusCode, { ok: false, error: result.error });
    }

    return response(200, { ok: true, customer: result.customer });
  };
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