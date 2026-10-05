const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ));
}

function formatArs(amount) {
  return `$ ${Number(amount).toLocaleString("es-AR")}`;
}

function buildOrderEmails(order, options = {}) {
  const rows = order.items
    .map((item) => `<li>${escapeHtml(item.name)} x ${item.quantity} - ${formatArs(item.lineTotal)}</li>`)
    .join("");
  const summary = `<ul>${rows}</ul><p><strong>Total: ${formatArs(order.total)}</strong></p>`;
  const reference = `Pedido ${escapeHtml(order.id)}`;
  const emails = [];

  if (order.customerEmail) {
    emails.push({
      to: order.customerEmail,
      subject: "Recibimos tu pago - Modela3D.ar",
      html: `<p>Gracias por tu compra. Tu pago fue aprobado.</p><p>${reference}</p>${summary}` +
        "<p>Nos vamos a comunicar con vos para coordinar el env\u00edo.</p>",
    });
  }
  if (options.ownerEmail) {
    emails.push({
      to: options.ownerEmail,
      subject: `Nueva venta - ${formatArs(order.total)}`,
      html: `<p>Nueva venta pagada.</p><p>${reference}</p><p>Cliente: ${escapeHtml(order.customerEmail || "sin email")}</p>${summary}`,
    });
  }
  return emails;
}

async function sendMail(message, options = {}) {
  const apiKey = options.apiKey ?? process.env.BREVO_API_KEY ?? "";
  const from = options.from ?? process.env.MAIL_FROM ?? "";
  if (!apiKey || !from) {
    return { sent: false, skipped: true };
  }

  const response = await (options.fetch || fetch)(BREVO_ENDPOINT, {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Modela3D.ar", email: from },
      to: [{ email: message.to }],
      subject: message.subject,
      htmlContent: message.html,
    }),
  });
  if (!response.ok) {
    throw new Error(`Mail provider responded ${response.status}`);
  }
  return { sent: true };
}

async function notifyOrderPaid(order, options = {}) {
  const ownerEmail = options.ownerEmail ?? process.env.OWNER_EMAIL ?? options.from ?? process.env.MAIL_FROM ?? "";
  const send = options.sendMail || sendMail;
  for (const email of buildOrderEmails(order, { ownerEmail })) {
    try {
      await send(email, options);
    } catch (error) {
      console.error("Order email failed:", error?.message);
    }
  }
}

module.exports = { buildOrderEmails, notifyOrderPaid, sendMail };
