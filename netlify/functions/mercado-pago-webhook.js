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
const { notifyOrderPaid } = require("./lib/mailer");

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
    console.log(`[Webhook] Incoming notification - dataId: ${dataId}, requestId: ${requestId}, hasSignature: ${Boolean(signature)}, hasSecret: ${Boolean(webhookSecret)}`);

    if (!webhookSecret) {
      console.warn("[Webhook] MP_WEBHOOK_SECRET is not configured in environment variables");
      return response(503, { ok: false, error: "Webhook signature is not configured" });
    }
    if (typeof dataId !== "string" || !dataId.trim()) {
      console.warn("[Webhook] Missing payment notification id (data.id query param)");
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
    } catch (sigErr) {
      console.error("[Webhook] Invalid signature:", sigErr?.message);
      return response(401, { ok: false, error: "Invalid webhook signature" });
    }

    const parsed = safeJsonParse(event.body || "");
    if (!parsed.ok) {
      console.warn("[Webhook] Invalid JSON body");
      return response(400, { ok: false, error: "Invalid webhook notification" });
    }
    const action = parsed.value?.action;
    if (parsed.value?.type !== "payment" && !(typeof action === "string" && action.startsWith("payment."))) {
      console.log(`[Webhook] Ignored non-payment event: type=${parsed.value?.type}, action=${action}`);
      return response(200, { ok: true, ignored: true });
    }
    if (!options.paymentClient && !(options.accessToken ?? process.env.MP_ACCESS_TOKEN)) {
      console.warn("[Webhook] MP_ACCESS_TOKEN is not configured");
      return response(503, { ok: false, error: "Mercado Pago access token is not configured" });
    }

    const store = options.store || resolveStore(context);
    if (!store) {
      console.error("[Webhook] Order storage unavailable");
      return response(500, { ok: false, error: "Order storage unavailable" });
    }

    try {
      const paymentClient = options.paymentClient || createPaymentClient(options);
      const payment = await paymentClient.get({ id: dataId });
      console.log(`[Webhook] Mercado Pago payment ${dataId} status: ${payment?.status}, external_reference: ${payment?.external_reference}`);
      if (!payment || String(payment.id) !== dataId || payment.status !== "approved") {
        console.log(`[Webhook] Payment not approved or not found (status=${payment?.status})`);
        return response(200, { ok: true, updated: false });
      }

      const orderId = typeof payment.external_reference === "string"
        ? payment.external_reference
        : "";
      if (!orderId || orderId.length > 128 || /[\u0000-\u001f\u007f]/.test(orderId)) {
        console.warn(`[Webhook] Invalid external_reference in payment: ${orderId}`);
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
        console.warn(`[Webhook] Order mismatch or not found: orderId=${orderId}, found=${Boolean(order)}, amountMatch=${payment.transaction_amount === order?.total}`);
        return response(200, { ok: true, updated: false });
      }

      if (order.status === "paid") {
        if (String(order.paymentId) === dataId) {
          console.log(`[Webhook] Order ${orderId} already paid with paymentId ${dataId}`);
          return response(200, { ok: true, updated: false, duplicate: true });
        }
        await recordPaymentConflict(store, orderId, String(order.paymentId), dataId);
        return response(200, { ok: true, updated: false, conflict: true });
      }
      if (order.status !== "draft" && order.status !== "pending") {
        console.log(`[Webhook] Order ${orderId} status is ${order.status}, ignoring`);
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
      console.log(`[Webhook] Order ${orderId} marked as PAID. Dispatching email notifications...`);
      await (options.notifyOrderPaid || notifyOrderPaid)(updatedOrder);
      return response(200, { ok: true, updated: true });
    } catch (err) {
      console.error("[Webhook] Payment notification processing failed:", err?.message);
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