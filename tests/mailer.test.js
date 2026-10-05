const assert = require("node:assert/strict");
const test = require("node:test");
const { buildOrderEmails, notifyOrderPaid, sendMail } = require("../netlify/functions/lib/mailer");

const order = {
  id: "order-1",
  customerEmail: "buyer@example.test",
  total: 2500,
  items: [{ name: "<b>Lamp</b>", quantity: 2, lineTotal: 2500 }],
};

test("order emails go to buyer and owner and escape product names", () => {
  const emails = buildOrderEmails(order, { ownerEmail: "owner@example.test" });

  assert.deepEqual(emails.map((email) => email.to), ["buyer@example.test", "owner@example.test"]);
  assert.ok(emails.every((email) => !email.html.includes("<b>Lamp</b>")));
  assert.ok(emails[0].html.includes("&lt;b&gt;Lamp&lt;/b&gt;"));
});

test("sendMail skips without credentials and posts to the provider with them", async () => {
  assert.deepEqual(await sendMail({ to: "a@b.co", subject: "s", html: "h" }, { apiKey: "", from: "" }), { sent: false, skipped: true });

  let request;
  const result = await sendMail(
    { to: "a@b.co", subject: "s", html: "h" },
    { apiKey: "key", from: "shop@example.test", fetch: async (url, init) => { request = { url, init }; return { ok: true }; } },
  );
  assert.equal(result.sent, true);
  assert.equal(request.init.headers["api-key"], "key");
  assert.equal(JSON.parse(request.init.body).to[0].email, "a@b.co");
});

test("a failing provider never throws out of notifyOrderPaid", async () => {
  const attempts = [];
  await notifyOrderPaid(order, {
    ownerEmail: "owner@example.test",
    sendMail: async (email) => {
      attempts.push(email.to);
      throw new Error("provider down");
    },
  });
  assert.equal(attempts.length, 2);
});
