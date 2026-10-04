const { OAuth2Client } = require("google-auth-library");

async function verifyGoogleIdToken(token, audience) {
  const client = new OAuth2Client(audience);
  const ticket = await client.verifyIdToken({ idToken: token, audience });
  return ticket.getPayload();
}

async function authenticateGoogleIdentity(event, options = {}) {
  const clientId = options.clientId ?? process.env.GOOGLE_CLIENT_ID ?? "";
  if (!clientId) {
    return {
      ok: false,
      statusCode: 503,
      error: "Google authentication is not configured",
    };
  }

  const token = getBearerToken(event?.headers);
  if (!token) {
    return { ok: false, statusCode: 401, error: "Unauthorized" };
  }

  const verifyToken = options.verifyToken || verifyGoogleIdToken;
  try {
    const payload = await verifyToken(token, clientId);
    const id = typeof payload?.sub === "string" ? payload.sub.trim() : "";
    if (!id) {
      return { ok: false, statusCode: 401, error: "Unauthorized" };
    }

    return {
      ok: true,
      customer: {
        id,
        email: payload.email_verified === true && typeof payload.email === "string"
          ? payload.email
          : "",
        name: typeof payload.name === "string" ? payload.name : "",
        picture: typeof payload.picture === "string" ? payload.picture : "",
      },
    };
  } catch {
    return { ok: false, statusCode: 401, error: "Unauthorized" };
  }
}

function getBearerToken(headers) {
  if (!headers || typeof headers !== "object") {
    return "";
  }

  const authorization = Object.entries(headers).find(([name]) => name.toLowerCase() === "authorization")?.[1];
  if (typeof authorization !== "string") {
    return "";
  }

  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : "";
}

module.exports = { authenticateGoogleIdentity };