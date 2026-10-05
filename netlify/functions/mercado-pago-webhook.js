const {
  MercadoPagoConfig,
  Payment,
  WebhookSignatureValidator,
} = require("mercadopago");
const {
  createPaymentConflictIfNew,
  readOrderWithEtag,
  resolveStore,
  updateOrderIfMatch,
} = require("./store");

const ORDER_KEY_PREFIX = "order_v1:";
const PAYMENT_CONFLICT_KEY_PREFIX = "payment_conflict_v1:";
const SIGNATURE_TOLERANCE_SECONDS = 300;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-signature, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function createHandler(options = {}) {
  return async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
      return response(204, "");
    }
    if (event.httpMethod !== "POST") {
      return response(405, { ok: false, error: "Method not allowed" });
    }

    const dataId = event.queryStringParameters?.["data.id"];
    const requestId = getHeader(event, "x-request-id");
    const signature = getHeader(event, "x-signature");
    const webhookSecret = options.webhookSecret ?? process.env.MP_WEBHOOK_SECRET ?? "";
    if (!webhookSecret) {
      return response(503, { ok: false, error: "Webhook signature is not configured" });
    }
    if (typeof dataId !== "string" || !dataId.trim()) {
      return response(400, { ok: false, error: "Missing payment notification id" });
    }

    try {
      WebhookSignatureValidator.validate({
        xSignature: signature,
        xRequestId: requestId,
        dataId,
        secret: webhookSecret,
        toleranceSeconds: SIGNATURE_TOLERANCE_SECONDS,
        ...(options.now ? { now: options.now } : {}),
      });
    } catch {
      return response(401, { ok: false, error: "Invalid webhook signature" });
    }

    const parsed = safeJsonParse(event.body || "");
    if (!parsed.ok) {
      return response(400, { ok: false, error: "Invalid webhook notification" });
    }
    const action = parsed.value?.action;
    if (parsed.value?.type !== "payment" && !(typeof action === "string" && action.startsWith("payment."))) {
      return response(200, { ok: true, ignored: true });
    }
    if (!options.paymentClient && !(options.accessToken ?? process.env.MP_ACCESS_TOKEN)) {
      return response(503, { ok: false, error: "Mercado Pago access token is not configured" });
    }

    const store = options.store || resolveStore(context);
    if (!store) {
      return response(500, { ok: false, error: "Order storage unavailable" });
    }

    try {
      const paymentClient = options.paymentClient || createPaymentClient(options);
      const payment = await paymentClient.get({ id: dataId });
      if (!payment || String(payment.id) !== dataId || payment.status !== "approved") {
        return response(200, { ok: true, updated: false });
      }

      const orderId = typeof payment.external_reference === "string"
        ? payment.external_reference
        : "";
      if (!orderId || orderId.length > 128 || /[\u0000-\u001f\u007f]/.test(orderId)) {
        return response(200, { ok: true, updated: false });
      }

      const orderKey = `${ORDER_KEY_PREFIX}${orderId}`;
      const storedOrder = await readOrderWithEtag(store, orderKey);
      const order = storedOrder?.order || null;
      if (
        !order ||
        order.id !== orderId ||
        payment.external_reference !== order.id ||
        payment.transaction_amount !== order.total ||
        payment.currency_id !== order.currency ||
        order.currency !== "ARS"
      ) {
        return response(200, { ok: true, updated: false });
      }

      if (order.status === "paid") {
        if (String(order.paymentId) === dataId) {
          return response(200, { ok: true, updated: false, duplicate: true });
        }
        await recordPaymentConflict(store, orderId, String(order.paymentId), dataId);
        return response(200, { ok: true, updated: false, conflict: true });
      }
      if (order.status !== "draft" && order.status !== "pending") {
        return response(200, { ok: true, updated: false });
      }

      const now = (options.now || Date.now)();
      const updatedOrder = {
        ...order,
        status: "paid",
        paymentId: dataId,
        paymentStatus: "approved",
        paidAt: new Date(now).toISOString(),
      };
      const writeResult = await updateOrderIfMatch(store, orderKey, updatedOrder, storedOrder.etag);
      if (!writeResult.modified) {
        const latest = await readOrderWithEtag(store, orderKey);
        if (latest?.order?.status === "paid") {
          if (String(latest.order.paymentId) === dataId) {
            return response(200, { ok: true, updated: false, duplicate: true });
          }
          await recordPaymentConflict(store, orderId, String(latest.order.paymentId), dataId);
          return response(200, { ok: true, updated: false, conflict: true });
        }
        return response(200, { ok: true, updated: false });
      }
      return response(200, { ok: true, updated: true });
    } catch {
      return response(502, { ok: false, error: "Payment notification processing failed" });
    }
  };
}

async function recordPaymentConflict(store, orderId, winningPaymentId, conflictingPaymentId) {
  const conflict = {
    orderId,
    winningPaymentId,
    conflictingPaymentId,
  };
  const key = `${PAYMENT_CONFLICT_KEY_PREFIX}${orderId}:${conflictingPaymentId}`;
  await createPaymentConflictIfNew(store, key, conflict);
}

function createPaymentClient(options) {
  const accessToken = options.accessToken ?? process.env.MP_ACCESS_TOKEN ?? "";
  if (!accessToken) {
    throw new Error("Mercado Pago access token is not configured");
  }
  return new Payment(new MercadoPagoConfig({ accessToken }));
}

function getHeader(event, name) {
  const headers = event.headers || {};
  const key = Object.keys(headers).find((header) => header.toLowerCase() === name);
  return key ? headers[key] : undefined;
}

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: null };
  }
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