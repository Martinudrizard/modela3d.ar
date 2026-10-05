const { randomUUID } = require("node:crypto");
const { authenticateCustomer } = require("./lib/customer-session");
const { readCatalogProducts, resolveStore } = require("./store");

const ORDER_KEY_PREFIX = "order_v1:";
const MAX_CART_ITEMS = 50;
const MAX_ITEM_QUANTITY = 99;

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

    const body = safeJsonParse(event.body || "");
    if (!body.ok) {
      return response(400, { ok: false, error: "Invalid cart" });
    }

    const store = options.store || resolveStore(context);
    if (!store) {
      return response(500, { ok: false, error: "Order storage unavailable" });
    }

    try {
      const products = await (options.getProducts || readCatalogProducts)(store);
      const order = buildDraftOrder(body.value, products, auth.customer, {
        id: (options.createOrderId || randomUUID)(),
        createdAt: (options.now || (() => new Date().toISOString()))(),
      });
      await store.set(`${ORDER_KEY_PREFIX}${order.id}`, JSON.stringify(order));
      return response(201, { ok: true, order });
    } catch (error) {
      if (error instanceof InvalidCartError) {
        return response(400, { ok: false, error: "Invalid cart" });
      }
      return response(500, { ok: false, error: "Order creation failed" });
    }
  };
}

function buildDraftOrder(cart, products, customer, metadata) {
  if (!cart || typeof cart !== "object" || Array.isArray(cart) || !Array.isArray(cart.items)) {
    throw new InvalidCartError();
  }
  if (cart.items.length === 0 || cart.items.length > MAX_CART_ITEMS) {
    throw new InvalidCartError();
  }

  const productById = new Map(
    (Array.isArray(products) ? products : [])
      .filter((product) => product && typeof product === "object")
      .map((product) => [String(product.id || "").trim(), product]),
  );
  const seenProductIds = new Set();
  let total = 0;
  const items = cart.items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new InvalidCartError();
    }

    const productId = typeof item.productId === "string" ? item.productId.trim() : "";
    const quantity = item.quantity;
    if (
      !productId ||
      productId.length > 128 ||
      /[\u0000-\u001f\u007f]/.test(productId) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_ITEM_QUANTITY ||
      seenProductIds.has(productId)
    ) {
      throw new InvalidCartError();
    }
    seenProductIds.add(productId);

    const product = productById.get(productId);
    if (!product || !Number.isSafeInteger(product.price) || product.price < 0) {
      throw new InvalidCartError();
    }

    const lineTotal = product.price * quantity;
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(total + lineTotal)) {
      throw new InvalidCartError();
    }
    total += lineTotal;

    return {
      productId,
      name: typeof product.name === "string" ? product.name : productId,
      quantity,
      unitPrice: product.price,
      lineTotal,
    };
  });

  return {
    id: metadata.id,
    customerId: customer.id,
    customerEmail: customer.email || "",
    items,
    total,
    currency: "ARS",
    status: "draft",
    createdAt: metadata.createdAt,
  };
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

class InvalidCartError extends Error {}

exports.handler = createHandler();
exports.createHandler = createHandler;
exports.buildDraftOrder = buildDraftOrder;