const { createHmac } = require("node:crypto");
const { createHandler } = require("../netlify/functions/mercado-pago-webhook");

async function runSimulation() {
  console.log("=== SIMULANDO FLUJO COMPLETO DE VENTA Y NOTIFICACIONES ===\n");

  const customerEmail = process.env.OWNER_EMAIL || "marudri58@gmail.com";
  const orderId = "order-" + Date.now().toString().slice(-6);
  const paymentId = "pay-" + Math.floor(Math.random() * 1000000000);

  // 1. Simular la orden guardada previamente cuando el usuario hizo checkout
  const mockOrder = {
    id: orderId,
    customerId: "cust-12345",
    customerEmail: customerEmail,
    items: [
      { productId: "art-01", name: "Maceta Geométrica 3D", quantity: 2, unitPrice: 4500, lineTotal: 9000 },
      { productId: "art-02", name: "Lámpara Luna LED 15cm", quantity: 1, unitPrice: 18500, lineTotal: 18500 }
    ],
    total: 27500,
    currency: "ARS",
    status: "draft",
    createdAt: new Date().toISOString()
  };

  console.log(`1. Orden en borrador creada: ID ${orderId}`);
  console.log(`   Cliente: ${customerEmail}`);
  console.log(`   Items: 2x Maceta Geométrica ($9.000) + 1x Lámpara Luna ($18.500)`);
  console.log(`   Total: $27.500 ARS\n`);

  // Mock Store en memoria (emula Netlify Blobs)
  const storeMap = new Map();
  storeMap.set(`order_v1:${orderId}`, JSON.stringify(mockOrder));
  let storeEtag = "1";

  const mockStore = {
    async get(key) { return storeMap.get(key) || null; },
    async getWithMetadata(key) {
      const data = storeMap.get(key);
      if (!data) return null;
      return { data: JSON.parse(data), etag: storeEtag, metadata: {} };
    },
    async set(key, value, options = {}) {
      if (options.onlyIfMatch && options.onlyIfMatch !== storeEtag) {
        return { modified: false };
      }
      storeMap.set(key, value);
      storeEtag = String(Number(storeEtag) + 1);
      return { modified: true, etag: storeEtag };
    }
  };

  // Mock Mercado Pago Client que devuelve el pago aprobado
  const mockPaymentClient = {
    async get({ id }) {
      console.log(`2. Webhook consultó a Mercado Pago por el pago ID: ${id}`);
      return {
        id: id,
        status: "approved",
        external_reference: orderId,
        transaction_amount: 27500,
        currency_id: "ARS"
      };
    }
  };

  // 2. Preparar el webhook con firma criptográfica válida
  const webhookSecret = "test-secret";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const manifest = `id:${paymentId};request-id:req-sim-1;ts:${timestamp};`;
  const hash = createHmac("sha256", webhookSecret).update(manifest).digest("hex");
  const signature = `ts=${timestamp},v1=${hash}`;

  const webhookHandler = createHandler({
    webhookSecret,
    store: mockStore,
    paymentClient: mockPaymentClient
  });

  const event = {
    httpMethod: "POST",
    queryStringParameters: { "data.id": paymentId },
    headers: {
      "x-signature": signature,
      "x-request-id": "req-sim-1",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      action: "payment.created",
      type: "payment",
      data: { id: paymentId }
    })
  };

  console.log("3. Disparando Webhook de Mercado Pago a /.netlify/functions/mercado-pago-webhook...");
  const res = await webhookHandler(event, {});
  console.log("   Respuesta del Webhook:", res.statusCode, res.body);

  const updatedOrder = JSON.parse(storeMap.get(`order_v1:${orderId}`));
  console.log(`\n4. Estado final de la orden en base de datos: status = "${updatedOrder.status}"`);
  console.log(`   ID de Pago asociado: ${updatedOrder.paymentId}`);
  console.log(`   Fecha de pago: ${updatedOrder.paidAt}`);
  console.log("\n=== SIMULACIÓN COMPLETADA EXITOSAMENTE ===");
}

runSimulation().catch(console.error);
