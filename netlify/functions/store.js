const { getStore } = require("@netlify/blobs");

const ALLOWED_KEYS = new Set(["products", "heroSlides", "waNumber"]);
const PRODUCT_MUTATION_KEY = "__products_mutation";
const PRODUCTS_IDS_KEY = "products_ids_v2";
const PRODUCT_KEY_PREFIX = "product_v2:";

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

      if (key === "products") {
        const productsV2 = await readProductsV2(store);
        if (productsV2.ok && productsV2.data) {
          return response(200, { ok: true, data: productsV2.data });
        }
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

      if (key === PRODUCT_MUTATION_KEY) {
        const applied = await applyProductMutation(store, data);
        if (!applied.ok) {
          return response(400, { ok: false, error: applied.error });
        }
        return response(200, { ok: true });
      }

      if (!ALLOWED_KEYS.has(key)) {
        return response(400, { ok: false, error: "Invalid key" });
      }

      if (key === "products") {
        const productsArray = Array.isArray(data) ? data : [];
        await writeProductsV2(store, productsArray);
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

async function applyProductMutation(store, payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid mutation payload" };
  }

  const action = String(payload.action || "").trim().toLowerCase();

  if (action === "upsert") {
    const product = payload.product;
    if (!product || typeof product !== "object") {
      return { ok: false, error: "Missing product" };
    }

    const productId = String(product.id || "").trim();
    if (!productId) {
      return { ok: false, error: "Missing product id" };
    }

    const ids = await readProductIds(store);
    const nextIds = ids.includes(productId) ? ids : [...ids, productId];
    await writeProductIds(store, nextIds);
    await store.set(`${PRODUCT_KEY_PREFIX}${productId}`, JSON.stringify(product));
    return { ok: true };
  }

  if (action === "delete") {
    const productId = String(payload.productId || "").trim();
    if (!productId) {
      return { ok: false, error: "Missing product id" };
    }

    const ids = await readProductIds(store);
    const nextIds = ids.filter((id) => id !== productId);
    await writeProductIds(store, nextIds);
    return { ok: true };
  }

  if (action === "set-ids") {
    const productIds = Array.isArray(payload.productIds) ? payload.productIds : [];
    const normalizedIds = [...new Set(productIds.map((id) => String(id || "").trim()).filter(Boolean))];
    await writeProductIds(store, normalizedIds);
    return { ok: true };
  }

  return { ok: false, error: "Unsupported mutation action" };
}

async function readProductsV2(store) {
  const ids = await readProductIds(store);
  if (!ids.length) {
    return { ok: true, data: null };
  }

  const rows = await Promise.all(ids.map((id) => store.get(`${PRODUCT_KEY_PREFIX}${id}`)));
  const products = rows
    .map((raw) => (raw ? safeJsonParse(raw).value : null))
    .filter((item) => item && typeof item === "object");

  return { ok: true, data: products };
}

async function writeProductsV2(store, products) {
  const safeProducts = Array.isArray(products) ? products : [];
  const ids = [];

  for (const product of safeProducts) {
    if (!product || typeof product !== "object") {
      continue;
    }

    const productId = String(product.id || "").trim();
    if (!productId) {
      continue;
    }

    ids.push(productId);
    await store.set(`${PRODUCT_KEY_PREFIX}${productId}`, JSON.stringify(product));
  }

  await writeProductIds(store, [...new Set(ids)]);
}

async function readProductIds(store) {
  const raw = await store.get(PRODUCTS_IDS_KEY);
  const parsed = raw ? safeJsonParse(raw).value : null;
  if (!Array.isArray(parsed)) {
    return [];
  }

  return [...new Set(parsed.map((id) => String(id || "").trim()).filter(Boolean))];
}

async function writeProductIds(store, ids) {
  const normalizedIds = [...new Set((Array.isArray(ids) ? ids : []).map((id) => String(id || "").trim()).filter(Boolean))];
  await store.set(PRODUCTS_IDS_KEY, JSON.stringify(normalizedIds));
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
