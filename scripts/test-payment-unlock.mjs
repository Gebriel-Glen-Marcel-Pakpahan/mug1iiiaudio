// End-to-End Verification: Registration (Any Email), Dynamic QRIS, Strict Unpaid Gate, and Verified Settlement
import assert from "node:assert";

const BASE_URL = "http://localhost:3000";
const cookies = {};

function updateCookies(res) {
  const raw = res.headers.get("set-cookie");
  if (!raw) return;
  const parts = raw.split(/,(?=[^;]+=[^;]+)/);
  for (const p of parts) {
    const [pair] = p.split(";");
    const eqIdx = pair.indexOf("=");
    if (eqIdx !== -1) {
      const k = pair.slice(0, eqIdx).trim();
      const v = pair.slice(eqIdx + 1).trim();
      if (!v || v === "deleted") {
        delete cookies[k];
      } else {
        cookies[k] = v;
      }
    }
  }
}

function getCookieHeader() {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function request(path, opts = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      Cookie: getCookieHeader(),
      Accept: "application/json",
      ...(opts.headers || {}),
    },
    redirect: opts.redirect || "manual",
  });
  updateCookies(res);
  return res;
}

async function test() {
  console.log("=== Testing Registration (Any Email), Strict Unpaid Gate, and Verified Settlement ===");

  // 1. Register a brand new buyer via /api/auth/register
  const buyerEmail = `pembeli.${Date.now()}@gmail.com`;
  const regRes = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Pembeli Baru",
      email: buyerEmail,
      password: "password123",
    }),
  });
  const regData = await regRes.json();
  assert.strictEqual(regRes.status, 200, `Register failed: ${JSON.stringify(regData)}`);
  assert.strictEqual(regData.user.email, buyerEmail);
  assert.strictEqual(regData.user.role, "BUYER");
  console.log(`1. Registered new buyer via Daftar Akun: ${buyerEmail} (role: ${regData.user.role})`);

  // 2. Login as that registered buyer
  const csrfRes = await request("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();
  await request("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken,
      email: buyerEmail,
      password: "password123",
      callbackUrl: `${BASE_URL}/`,
      json: "true",
    }),
  });
  console.log("2. Logged in as registered buyer.");

  // 3. Add album & Checkout
  const albumsRes = await request("/api/albums");
  const { items } = await albumsRes.json();
  const album = items[0];

  await request("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ albumId: album.id }),
  });

  const checkoutRes = await request("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const checkoutData = await checkoutRes.json();
  assert(checkoutData.orderId, "Expected orderId");
  assert(checkoutData.qrString.includes("540"), "Expected Tag 54 nominal in QRIS");
  console.log(`3. Order created: ${checkoutData.orderNumber} (Total: Rp ${checkoutData.totalAmount})`);

  // 4. Test confirm WITHOUT paying (even if passing manualConfirm: true) -> MUST BE BLOCKED!
  const unpaidRes = await request(`/api/orders/${checkoutData.orderId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ manualConfirm: true }),
  });
  const unpaidData = await unpaidRes.json();
  assert.strictEqual(unpaidData.paid, false, "Unpaid order MUST NOT be marked paid!");
  assert.strictEqual(unpaidData.status, "PENDING", "Unpaid order status MUST remain PENDING!");
  assert.strictEqual(unpaidData.driveLinks.length, 0, "Unpaid order MUST NOT expose driveLinks!");
  console.log("4. STRICT UNPAID CHECK PASSED: manualConfirm bypass rejected, status remains PENDING, Drive locked.");

  // 5. Simulate verified Midtrans webhook settlement for this order
  const webhookRes = await request("/api/webhooks/midtrans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: checkoutData.orderNumber,
      transaction_status: "settlement",
      status_code: "200",
      gross_amount: String(checkoutData.totalAmount),
      signature_key: "demo",
      demo_secret: "demo-settle",
    }),
  });
  assert.strictEqual(webhookRes.status, 200, "Webhook settlement should succeed");

  // 6. Now check confirm after genuine settlement -> MUST unlock Drive links for buyerEmail!
  const paidRes = await request(`/api/orders/${checkoutData.orderId}/confirm`, {
    method: "POST",
  });
  const paidData = await paidRes.json();
  assert.strictEqual(paidData.paid, true, "Paid order must return paid=true");
  assert.strictEqual(paidData.status, "PAID", "Paid order status must be PAID");
  assert(paidData.driveLinks.length > 0, "Paid order must return driveLinks");
  assert(
    paidData.driveLinks[0].linkUrl.includes(encodeURIComponent(buyerEmail)),
    `Drive link should target buyer email ${buyerEmail}, got ${paidData.driveLinks[0].linkUrl}`,
  );
  console.log(`5. Verified settlement unlocked Drive link specifically for ${buyerEmail}: ${paidData.driveLinks[0].linkUrl}`);

  console.log("\n=== ALL TESTS PASSED! ===");
}

test().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
