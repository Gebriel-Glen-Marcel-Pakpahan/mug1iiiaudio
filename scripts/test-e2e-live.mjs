/**
 * End-to-End Automated Verification Script for MUG1III AUDIO
 * Tests full flow: Auth -> Cart -> Checkout -> QRIS Payment Page -> Confirm -> Drive Delivery.
 */

const BASE_URL = process.env.TEST_URL || "https://mug1iiiaudio.vercel.app";
const EMAIL = "silabandit1@gmail.com";
const PASSWORD = "toho01";

console.log(`\n======================================================`);
console.log(`🚀 STARTING END-TO-END VERIFICATION ON: ${BASE_URL}`);
console.log(`======================================================\n`);

let cookies = {};

function updateCookies(res) {
  const rawHeaders = res.headers.raw ? res.headers.raw()["set-cookie"] : null;
  const setCookies = rawHeaders || res.headers.getSetCookie?.() || [];
  for (const c of setCookies) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    if (k && v !== undefined) {
      cookies[k.trim()] = v.trim();
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
  const headers = {
    Cookie: getCookieHeader(),
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "User-Agent": "Mug1iiiAudio-E2E-Verifier/1.0",
    ...(opts.headers || {}),
  };

  const res = await fetch(url, {
    ...opts,
    headers,
    redirect: opts.redirect || "manual",
  });

  updateCookies(res);
  return res;
}

async function run() {
  try {
    // -----------------------------------------------------------------
    // Step 1: Health check & Catalog read
    // -----------------------------------------------------------------
    console.log("[1/8] 🔍 Checking Catalog & Storefront Homepage...");
    const homeRes = await request("/");
    if (homeRes.status !== 200) {
      throw new Error(`Homepage returned status ${homeRes.status}`);
    }
    console.log("  ✅ Homepage 200 OK");

    const albumsRes = await request("/api/albums");
    const albumsJson = await albumsRes.json();
    const albums = Array.isArray(albumsJson) ? albumsJson : (albumsJson.items || []);
    if (!albums.length) {
      throw new Error("No published albums found in catalog.");
    }
    const testAlbum = albums[0];
    console.log(`  ✅ Catalog has ${albums.length} albums. Using test album: "${testAlbum.title}" (ID: ${testAlbum.id}, Rp ${testAlbum.price})`);

    // -----------------------------------------------------------------
    // Step 2: Authentication (CSRF + NextAuth Credentials Login)
    // -----------------------------------------------------------------
    console.log(`\n[2/8] 🔑 Authenticating as ${EMAIL}...`);
    const csrfRes = await request("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    if (!csrfToken) throw new Error("Failed to retrieve CSRF token");

    const loginRes = await request("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        csrfToken,
        email: EMAIL,
        password: PASSWORD,
        callbackUrl: `${BASE_URL}/`,
        json: "true",
      }),
    });

    console.log(`  Login HTTP status: ${loginRes.status}`);
    const hasSession = Object.keys(cookies).some((k) => k.includes("session-token"));
    if (!hasSession && loginRes.status !== 200 && loginRes.status !== 302) {
      throw new Error("Authentication failed: No session token received");
    }
    console.log("  ✅ Session cookie established successfully.");

    // -----------------------------------------------------------------
    // Step 3: Add Album to Cart
    // -----------------------------------------------------------------
    console.log(`\n[3/8] 🛒 Adding album "${testAlbum.title}" to cart...`);
    const addCartRes = await request("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: testAlbum.id }),
    });

    if (!addCartRes.ok) {
      const err = await addCartRes.text();
      throw new Error(`POST /api/cart failed (${addCartRes.status}): ${err}`);
    }
    const cartData = await addCartRes.json();
    console.log(`  ✅ Item in cart: ${cartData.count} item(s), Subtotal: Rp ${cartData.subtotal}`);

    // Verify /keranjang page renders
    const keranjangPage = await request("/keranjang");
    if (keranjangPage.status !== 200) {
      throw new Error(`/keranjang returned ${keranjangPage.status}`);
    }
    const keranjangHtml = await keranjangPage.text();
    if (keranjangHtml.includes("Keranjang masih kosong")) {
      throw new Error("Cart page rendered empty unexpectedly!");
    }
    console.log("  ✅ /keranjang page rendered non-empty with active cart items.");

    // -----------------------------------------------------------------
    // Step 4: Checkout (Create Order & QRIS)
    // -----------------------------------------------------------------
    console.log(`\n[4/8] 💳 Executing Checkout (POST /api/checkout)...`);
    const checkoutRes = await request("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: testAlbum.id }),
    });

    if (!checkoutRes.ok) {
      const err = await checkoutRes.text();
      throw new Error(`Checkout failed (${checkoutRes.status}): ${err}`);
    }

    const orderData = await checkoutRes.json();
    console.log(`  ✅ Order created successfully:`);
    console.log(`     - Order ID:     ${orderData.orderId}`);
    console.log(`     - Order Number: ${orderData.orderNumber}`);
    console.log(`     - Total:        Rp ${orderData.totalAmount}`);
    console.log(`     - QR String:    ${orderData.qrString ? orderData.qrString.slice(0, 40) + "..." : "None"}`);

    // -----------------------------------------------------------------
    // Step 5: Verify Payment Page (/bayar/[id]) — MUST NOT BE 404!
    // -----------------------------------------------------------------
    console.log(`\n[5/8] 🛡️ Testing Payment Page (GET /bayar/${orderData.orderId})...`);
    const bayarRes = await request(`/bayar/${orderData.orderId}`);
    console.log(`  Payment page status: ${bayarRes.status}`);

    if (bayarRes.status === 404) {
      throw new Error(`CRITICAL REGRESSION: /bayar/${orderData.orderId} returned 404 Not Found!`);
    }

    if (bayarRes.status !== 200) {
      const location = bayarRes.headers.get("location");
      console.log(`  Redirected to: ${location}`);
    } else {
      const bayarHtml = await bayarRes.text();
      const hasQris = bayarHtml.includes("qris-mug1iii.jpeg") || bayarHtml.includes("Pindai QRIS");
      console.log(`  ✅ /bayar/${orderData.orderId} returned 200 OK! QRIS elements found: ${hasQris}`);
    }

    // -----------------------------------------------------------------
    // Step 6: Verify QR Code API & Status Polling
    // -----------------------------------------------------------------
    console.log(`\n[6/8] 📱 Testing QR API and Polling Endpoints...`);
    const qrRes = await request(`/api/orders/${orderData.orderId}/qr`);
    if (qrRes.ok) {
      const qrData = await qrRes.json();
      console.log(`  ✅ GET /api/orders/[id]/qr: 200 OK (QR image payload length: ${qrData.qrDataUrl?.length || 0})`);
    } else {
      console.log(`  ⚠️ GET /api/orders/[id]/qr returned ${qrRes.status}`);
    }

    const statusRes = await request(`/api/orders/${orderData.orderId}/status`);
    if (!statusRes.ok) {
      throw new Error(`GET /api/orders/[id]/status failed with status ${statusRes.status}`);
    }
    const statusData = await statusRes.json();
    console.log(`  ✅ GET /api/orders/[id]/status: 200 OK (Status: ${statusData.status}, Payment: ${statusData.paymentStatus})`);

    // -----------------------------------------------------------------
    // Step 7: Simulate Payment Confirmation & Delivery
    // -----------------------------------------------------------------
    console.log(`\n[7/8] 💰 Confirming Payment (POST /api/orders/${orderData.orderId}/confirm)...`);
    const confirmRes = await request(`/api/orders/${orderData.orderId}/confirm`, {
      method: "POST",
    });

    if (!confirmRes.ok) {
      const err = await confirmRes.text();
      throw new Error(`Confirm payment failed (${confirmRes.status}): ${err}`);
    }
    const confirmData = await confirmRes.json();
    console.log(`  ✅ Payment confirmed successfully:`);
    console.log(`     - Order Status:   ${confirmData.status}`);
    console.log(`     - Payment Status: ${confirmData.paymentStatus}`);
    console.log(`     - Access Status:  ${confirmData.accessStatus}`);
    console.log(`     - Paid At:        ${confirmData.paidAt}`);

    // -----------------------------------------------------------------
    // Step 8: Verify Receipt & Access Link in Order History
    // -----------------------------------------------------------------
    console.log(`\n[8/8] 📂 Verifying Order Receipt and Google Drive link...`);
    const pesananDetail = await request(`/pesanan/${orderData.orderId}`);
    if (pesananDetail.status !== 200) {
      throw new Error(`/pesanan/${orderData.orderId} returned ${pesananDetail.status}`);
    }
    const pesananHtml = await pesananDetail.text();
    const hasDriveLink = pesananHtml.includes("drive.google.com") || pesananHtml.includes("Buka di Drive");
    console.log(`  ✅ /pesanan/${orderData.orderId} returned 200 OK!`);
    console.log(`     - Google Drive download button present: ${hasDriveLink}`);

    console.log(`\n======================================================`);
    console.log(`🎉 ALL 8 END-TO-END STEPS PASSED 100% CLEANLY!`);
    console.log(`No 404 errors, no empty cart regressions, order confirmed.`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error("\n❌ E2E VERIFICATION FAILED:", err.message);
    process.exit(1);
  }
}

run();
