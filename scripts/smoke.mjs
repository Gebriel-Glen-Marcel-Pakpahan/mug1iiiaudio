// End-to-end smoke test of the purchase flow (PRD §8.1, §8.2, §21) against a running server.
// Usage: npm run dev   (in another terminal)  →  node scripts/smoke.mjs [baseUrl]
import assert from "node:assert/strict";

const BASE = process.argv[2] ?? "http://localhost:3000";
const SECRET = process.env.DEMO_WEBHOOK_SECRET ?? "demo-settle";
let cookie = "";

async function call(path, init = {}) {
  const res = await fetch(BASE + path, {
    redirect: "manual",
    ...init,
    headers: { cookie, ...(init.headers ?? {}) },
  });
  for (const c of res.headers.getSetCookie()) cookie += `${c.split(";")[0]}; `;
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}
const json = (data) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
const webhook = (order_id, transaction_status, demo_secret) =>
  call("/api/webhooks/midtrans", json({ order_id, transaction_status, status_code: "200", gross_amount: "0", demo_secret }));

// 1. Demo Google sign-in
const { body: csrf } = await call("/api/auth/csrf");
await call("/api/auth/callback/demo-google", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: `smoke${Date.now()}@gmail.com`, name: "Smoke", json: "true" }),
});
assert.equal((await call("/api/cart")).status, 200, "login failed");

// 2. Cart → checkout (idempotent)
const { body: list } = await call("/api/albums");
const albums = list.albums ?? list.items ?? list;
await call("/api/cart", json({ albumId: albums[0].id }));
const first = await call("/api/checkout", { method: "POST" });
assert.equal(first.status, 200, JSON.stringify(first.body));
assert.ok(first.body.qrString, "QRIS string missing");
const again = await call("/api/checkout", { method: "POST" });
assert.equal(again.body.orderId, first.body.orderId, "checkout not idempotent");

// 3. Spoofed webhook rejected, real one accepted, replay ignored
assert.equal((await webhook(first.body.orderNumber, "settlement", "wrong")).status, 401);
const ok = await webhook(first.body.orderNumber, "settlement", SECRET);
assert.equal(ok.body.state, "paid");
assert.equal((await webhook(first.body.orderNumber, "settlement", SECRET)).body.state, "already_final");

// 4. Drive access granted by the worker
let order;
for (let i = 0; i < 20; i++) {
  order = (await call(`/api/orders/${first.body.orderId}`)).body.order;
  if (order?.accessStatus === "GRANTED") break;
  await new Promise((r) => setTimeout(r, 250));
}
assert.equal(order.status, "PAID");
assert.equal(order.accessStatus, "GRANTED");

// 5. Warranty request -> admin approve -> Drive access revoked (PRD §8.3)
const rfd = await call("/api/refunds", json({ orderId: first.body.orderId, reason: "File track 6 korup pada folder Drive" }));
assert.equal(rfd.status, 200);
await call("/api/auth/callback/demo-google", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: "admin@mug1iii.audio", name: "Admin", json: "true" }),
});
const approved = await call(`/api/admin/refunds/${rfd.body.refund.id}/approve`, json({ note: "Refund garansi disetujui" }));
assert.equal(approved.status, 200);
assert.equal(approved.body.order.status, "REFUNDED");
assert.ok(approved.body.order.driveLinks.every((d) => !d.isActive), "Drive access not revoked");

// 6. Expired payment cancels a new order without access
await call("/api/cart", json({ albumId: albums[1].id }));
const second = await call("/api/checkout", { method: "POST" });
assert.equal((await webhook(second.body.orderNumber, "expire", SECRET)).body.state, "failed");

console.log("✓ smoke test passed:", first.body.orderNumber, second.body.orderNumber);
