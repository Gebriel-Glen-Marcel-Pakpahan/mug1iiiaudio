// Test payment confirmation and Drive unlock on localhost:3000
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
  console.log("=== Testing Checkout, Dynamic QRIS, and Payment Confirmation on Localhost ===");

  // 1. Get CSRF & Authenticate
  const csrfRes = await request("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();

  const testEmail = `verifier.${Date.now()}@mug1iii.audio`;
  const loginRes = await request("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken,
      email: testEmail,
      password: "password123",
      callbackUrl: `${BASE_URL}/`,
      json: "true",
    }),
  });
  console.log(`1. Authenticated as ${testEmail}. Session cookies:`, Object.keys(cookies));

  // 2. Add album to cart
  const albumsRes = await request("/api/albums");
  const albumsJson = await albumsRes.json();
  const album = albumsJson.items[0];
  console.log(`2. Picked album: ${album.title} (Rp ${album.price})`);

  const cartRes = await request("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ albumId: album.id }),
  });
  const cartJson = await cartRes.json();
  console.log("3. Added to cart. Items in cart:", cartJson.count);

  // 3. Checkout
  const checkoutRes = await request("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const checkoutData = await checkoutRes.json();
  console.log(`4. Checkout successful: Order ${checkoutData.orderNumber} (ID: ${checkoutData.orderId}), total Rp ${checkoutData.totalAmount}`);
  assert(checkoutData.orderId, "Expected orderId");
  assert(checkoutData.qrString, "Expected qrString");
  assert(checkoutData.qrString.includes("540"), "Expected QR payload to contain tag 54 (amount)");

  // 4. Check QR endpoint
  const qrRes = await request(`/api/orders/${checkoutData.orderId}/qr`);
  const qrData = await qrRes.json();
  assert(qrData.qrDataUrl, "Expected qrDataUrl");
  assert(qrData.qrDataUrl.startsWith("data:image/png;base64,"), "Expected base64 data URL for QR");
  console.log("5. QR endpoint returns dynamic QR image with amount");

  // 5. Test unpaid check (should return paid: false)
  const unpaidCheck = await request(`/api/orders/${checkoutData.orderId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ manualConfirm: false }),
  });
  const unpaidData = await unpaidCheck.json();
  assert.strictEqual(unpaidData.paid, false);
  assert.strictEqual(unpaidData.status, "PENDING");
  assert.strictEqual(unpaidData.driveLinks.length, 0);
  console.log("6. Unpaid check correctly returns paid=false, Drive links locked");

  // 6. Test manual transfer confirmation (user transferred to MUG1III STORE)
  const confirmRes = await request(`/api/orders/${checkoutData.orderId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ manualConfirm: true, transferReference: "DANA-10K" }),
  });
  const confirmData = await confirmRes.json();
  assert.strictEqual(confirmData.paid, true);
  assert.strictEqual(confirmData.status, "PAID");
  assert(confirmData.driveLinks.length > 0, "Expected driveLinks to be unlocked");
  console.log("7. Confirmation successful: Order PAID, Drive links unlocked:", confirmData.driveLinks[0]?.linkUrl);

  console.log("\n=== ALL LOCAL TESTS PASSED SUCCESSFULLY! ===");
}

test().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
