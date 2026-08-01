const { getStore } = require("@netlify/blobs");

const ALLOWED_KEYS = new Set(["products", "heroSlides", "waNumber"]);
const PRODUCT_MUTATION_KEY = "__products_mutation";
const PRODUCTS_IDS_KEY = "products_ids_v2";
const PRODUCT_KEY_PREFIX = "product_v2:";
const MAX_IMAGES_PER_PRODUCT_IN_CLOUD = 1;
const MAX_DATA_URL_LENGTH_IN_CLOUD = 260000;

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
        const mergedProducts = await readMergedProducts(store);
        if (mergedProducts.length) {
          const compactedProducts = compactProductsForCloud(mergedProducts);
          return response(200, { ok: true, data: compactedProducts });
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

    const products = await readMergedProducts(store);
    const nextProducts = products.filter((item) => String(item?.id || "").trim() !== productId);
    nextProducts.unshift(product);
    await writeProductsCollection(store, nextProducts);
    return { ok: true };
  }

  if (action === "delete") {
    const productId = String(payload.productId || "").trim();
    if (!productId) {
      return { ok: false, error: "Missing product id" };
    }

    const products = await readMergedProducts(store);
    const nextProducts = products.filter((item) => String(item?.id || "").trim() !== productId);
    await writeProductsCollection(store, nextProducts);
    return { ok: true };
  }

  if (action === "set-ids") {
    // El flujo usa este paso antes de upserts; no borramos aqui para evitar perder catalogo legacy durante migracion.
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

async function writeProductsCollection(store, products) {
  const safeProducts = compactProductsForCloud(
    Array.isArray(products) ? products.filter((item) => item && typeof item === "object") : []
  );
  await writeProductsV2(store, safeProducts);
  await store.set("products", JSON.stringify(safeProducts));
}

async function readLegacyProducts(store) {
  const raw = await store.get("products");
  const parsed = raw ? safeJsonParse(raw).value : null;
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((item) => item && typeof item === "object");
}

async function readMergedProducts(store) {
  const [legacyProducts, v2Result] = await Promise.all([
    readLegacyProducts(store),
    readProductsV2(store),
  ]);

  const v2Products = v2Result.ok && Array.isArray(v2Result.data) ? v2Result.data : [];
  const byId = new Map();

  legacyProducts.forEach((product) => {
    const id = String(product?.id || "").trim();
    if (!id) {
      return;
    }
    byId.set(id, product);
  });

  v2Products.forEach((product) => {
    const id = String(product?.id || "").trim();
    if (!id) {
      return;
    }
    byId.set(id, product);
  });

  return Array.from(byId.values());
}

function compactProductsForCloud(products) {
  const source = Array.isArray(products) ? products : [];

  return source.map((product) => {
    const images = Array.isArray(product?.images) ? product.images : [];
    const compactImages = images
      .filter((image) => typeof image === "string" && image.trim())
      .slice(0, MAX_IMAGES_PER_PRODUCT_IN_CLOUD)
      .filter((image) => {
        if (!image.startsWith("data:image/")) {
          return true;
        }
        return image.length <= MAX_DATA_URL_LENGTH_IN_CLOUD;
      });

    return {
      ...product,
      images: compactImages,
    };
  });
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
