const { MercadoPagoConfig, Preference } = require("mercadopago");
const { authenticateCustomer } = require("./lib/customer-session");
const { readOrderWithEtag, resolveStore, updateOrderIfMatch } = require("./store");

const ORDER_KEY_PREFIX = "order_v1:";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function createHandler(options = {}) {
  const clientId = options.clientId ?? process.env.GOOGLE_CLIENT_ID ?? "";

  return async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
      return response(204, "");
    }
    if (event.httpMethod !== "POST") {
      return response(405, { ok: false, error: "Method not allowed" });
    }

    const auth = await (options.authenticate || authenticateCustomer)(event, {
      clientId,
      verifyToken: options.verifyToken,
    });
    if (!auth.ok) {
      return response(auth.statusCode, { ok: false, error: auth.error });
    }

    const parsed = safeJsonParse(event.body || "");
    const orderId = typeof parsed.value?.orderId === "string" ? parsed.value.orderId.trim() : "";
    if (!parsed.ok || !orderId || orderId.length > 128 || /[\u0000-\u001f\u007f]/.test(orderId)) {
      return response(400, { ok: false, error: "Invalid order" });
    }

    const store = options.store || resolveStore(context);
    if (!store) {
      return response(500, { ok: false, error: "Order storage unavailable" });
    }

    try {
      const orderKey = `${ORDER_KEY_PREFIX}${orderId}`;
      const storedOrder = await readOrderWithEtag(store, orderKey);
      const order = storedOrder?.order || null;
      if (!order || order.id !== orderId || order.customerId !== auth.customer.id) {
        return response(404, { ok: false, error: "Order not found" });
      }
      if (order.status === "pending") {
        const preference = getStoredPreference(order);
        if (!preference) {
          return response(409, { ok: false, error: "Order is not payable" });
        }
        return response(200, preference);
      }
      if (order.status !== "draft") {
        return response(409, { ok: false, error: "Order is not payable" });
      }
      if (order.preferenceId !== undefined || order.initPoint !== undefined) {
        return response(409, { ok: false, error: "Order is not payable" });
      }

      const preferenceItems = getPreferenceItems(order);
      if (!preferenceItems) {
        return response(409, { ok: false, error: "Order is not payable" });
      }

      const notificationUrl = options.notificationUrl ?? process.env.MP_NOTIFICATION_URL ?? "";
      if (!isHttpsUrl(notificationUrl)) {
        return response(503, { ok: false, error: "Mercado Pago notification URL is not configured" });
      }
      if (!options.preferenceClient && !(options.accessToken ?? process.env.MP_ACCESS_TOKEN)) {
        return response(503, { ok: false, error: "Mercado Pago access token is not configured" });
      }

      const preferenceClient = options.preferenceClient || createPreferenceClient(
        options,
        `checkout-preference:${order.id}`,
      );
      const body = {
        items: preferenceItems,
        external_reference: order.id,
        notification_url: notificationUrl,
      };

      const preference = await preferenceClient.create({ body });
      if (!preference?.id || !String(preference.id).trim() || !isHttpsUrl(preference.init_point)) {
        return response(502, { ok: false, error: "Mercado Pago returned an invalid preference" });
      }
      const updatedOrder = {
        ...order,
        status: "pending",
        preferenceId: String(preference.id),
        initPoint: preference.init_point,
      };
      const writeResult = await updateOrderIfMatch(store, orderKey, updatedOrder, storedOrder.etag);
      if (!writeResult.modified) {
        const latest = await readOrderWithEtag(store, orderKey);
        const savedPreference = latest?.order?.id === orderId &&
          latest.order.customerId === auth.customer.id &&
          latest.order.status === "pending"
          ? getStoredPreference(latest.order)
          : null;
        if (savedPreference) {
          return response(200, savedPreference);
        }
        return response(409, {
          ok: false,
          error: "Order changed while creating payment preference",
          conflict: true,
        });
      }
      return response(200, {
        ok: true,
        preferenceId: updatedOrder.preferenceId,
        initPoint: preference.init_point,
      });
    } catch (error) {
      console.error("Mercado Pago preference creation failed:", error?.message, error?.cause ?? "");
      return response(502, { ok: false, error: "Mercado Pago preference creation failed" });
    }
  };
}

function getStoredPreference(order) {
  if (
    typeof order.preferenceId !== "string" ||
    !order.preferenceId.trim() ||
    !isHttpsUrl(order.initPoint)
  ) {
    return null;
  }
  return {
    ok: true,
    preferenceId: order.preferenceId,
    initPoint: order.initPoint,
  };
}

function getPreferenceItems(order) {
  if (!Array.isArray(order.items) || order.items.length === 0 || order.currency !== "ARS") {
    return null;
  }

  let total = 0;
  const items = [];
  for (const item of order.items) {
    if (
      !item ||
      typeof item.productId !== "string" ||
      !item.productId ||
      typeof item.name !== "string" ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      !Number.isSafeInteger(item.unitPrice) ||
      item.unitPrice < 0 ||
      !Number.isSafeInteger(item.lineTotal) ||
      item.lineTotal !== item.unitPrice * item.quantity
    ) {
      return null;
    }
    total += item.lineTotal;
    if (!Number.isSafeInteger(total)) {
      return null;
    }
    items.push({
      id: item.productId,
      title: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      currency_id: order.currency,
    });
  }

  return total === order.total ? items : null;
}

function createPreferenceClient(options, idempotencyKey) {
  const accessToken = options.accessToken ?? process.env.MP_ACCESS_TOKEN ?? "";
  if (!accessToken) {
    throw new Error("Mercado Pago access token is not configured");
  }
  const Config = options.MercadoPagoConfig ?? MercadoPagoConfig;
  const PreferenceClient = options.Preference ?? Preference;
  return new PreferenceClient(new Config({
    accessToken,
    options: { idempotencyKey },
  }));
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
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