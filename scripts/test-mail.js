const { notifyOrderPaid, sendMail } = require("../netlify/functions/lib/mailer");

async function main() {
  console.log("Iniciando prueba de envío con Brevo...");
  console.log(`- BREVO_API_KEY: ${process.env.BREVO_API_KEY ? "Configurada (OK)" : "NO ENCONTRADA"}`);
  console.log(`- MAIL_FROM: ${process.env.MAIL_FROM || "NO CONFIGURADO"}`);
  console.log(`- OWNER_EMAIL: ${process.env.OWNER_EMAIL || "NO CONFIGURADO"}\n`);

  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM || !process.env.OWNER_EMAIL) {
    console.error("ERROR: Faltan variables de entorno en el archivo .env.");
    console.error("Asegurate de tener definidas BREVO_API_KEY, MAIL_FROM y OWNER_EMAIL.");
    process.exit(1);
  }

  const mockOrder = {
    id: "test-" + Date.now().toString().slice(-6),
    customerEmail: process.env.OWNER_EMAIL, // enviamos el del cliente a la misma casilla para testear ambos
    total: 15400,
    currency: "ARS",
    items: [
      { name: "Soporte Auriculares 3D - PLA Negro", quantity: 1, lineTotal: 9400 },
      { name: "Llavero Personalizado", quantity: 2, lineTotal: 6000 }
    ]
  };

  console.log(`Enviando prueba de pedido ${mockOrder.id}...`);
  try {
    await notifyOrderPaid(mockOrder);
    console.log("\nProceso finalizado. Revisá tu casilla de correo (tanto bandeja de entrada como spam).");
  } catch (err) {
    console.error("\nError durante el envío:", err);
  }
}

main();
