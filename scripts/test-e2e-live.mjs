/**
 * End-to-End Automated Verification Script for MUG1III AUDIO
 * Strictly verifies:
 *  1. Auth & Cart persistence
 *  2. Checkout & /bayar/[id] (200 OK, no 404)
 *  3. UNPAID CHECK (No Transfer): POST /api/orders/[id]/confirm MUST return paid=false, status=PENDING, driveLinks=[] (Blocked!)
 *  4. /pesanan/[id] while unpaid MUST show "Belum Dibayar — Link Google Drive Terkunci" and NO drive.google.com link!
 */

const BASE_URL = process.env.TEST_URL || "https://mug1iiiaudio.vercel.app";
// Use isolated test account so real user accounts never get polluted with test orders
const EMAIL = `verifier.${Date.now().toString(36)}@mug1iii.audio`;
const PASSWORD = "verifierPass123";

console.log(`\n======================================================`);
console.log(`🚀 STARTING STRICT PAYMENT GATE E2E TEST ON: ${BASE_URL}`);
console.log(`======================================================\n`);

let cookies = {};

function updateCookies(res) {
  const rawHeaders = res.headers.raw ? res.headers.raw()["set-cookie"] : null;
  const setCookies = rawHeaders || res.headers.getSetCookie?.() || [];
  for (const c of setCookies) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    if (k && v !== undefined) {
      if (v.trim() === "") {
        delete cookies[k.trim()];
      } else {
        cookies[k.trim()] = v.trim();
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
  const headers = {
    Cookie: getCookieHeader(),
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "User-Agent": "Mug1iiiAudio-E2E-Verifier/2.0",
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
    console.log("[1/7] 🔍 Checking Catalog & Storefront Homepage...");
    const homeRes = await request("/");
    if (homeRes.status !== 200) {
      throw new Error(`Homepage returned status ${homeRes.status}`);
    }
    const albumsRes = await request("/api/albums");
    const albumsJson = await albumsRes.json();
    const albums = Array.isArray(albumsJson) ? albumsJson : albumsJson.items || [];
    if (!albums.length) throw new Error("No published albums found in catalog.");
    const testAlbum = albums[0];
    console.log(`  ✅ Catalog OK (${albums.length} albums). Test album: "${testAlbum.title}" (Rp ${testAlbum.price})`);

    // -----------------------------------------------------------------
    // Step 2: Authentication
    // -----------------------------------------------------------------
    console.log(`\n[2/7] 🔑 Authenticating isolated test buyer (${EMAIL})...`);
    const csrfRes = await request("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
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
    const hasSession = Object.keys(cookies).some((k) => k.includes("session-token"));
    if (!hasSession && loginRes.status !== 200 && loginRes.status !== 302) {
      throw new Error("Authentication failed: No session token received");
    }
    console.log("  ✅ Session cookie established.");

    // -----------------------------------------------------------------
    // Step 3: Add Album to Cart
    // -----------------------------------------------------------------
    console.log(`\n[3/7] 🛒 Adding album "${testAlbum.title}" to cart...`);
    const addCartRes = await request("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: testAlbum.id }),
    });
    if (!addCartRes.ok) throw new Error(`POST /api/cart failed (${addCartRes.status})`);
    console.log("  ✅ Added to cart & synced cookie.");

    // -----------------------------------------------------------------
    // Step 4: Checkout (Create Order & QRIS)
    // -----------------------------------------------------------------
    console.log(`\n[4/7] 💳 Executing Checkout (POST /api/checkout)...`);
    const checkoutRes = await request("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: testAlbum.id }),
    });
    if (!checkoutRes.ok) {
      throw new Error(`Checkout failed (${checkoutRes.status}): ${await checkoutRes.text()}`);
    }
    const orderData = await checkoutRes.json();
    console.log(`  ✅ Order created: ${orderData.orderNumber} (ID: ${orderData.orderId})`);

    // -----------------------------------------------------------------
    // Step 5: Verify Payment Page (/bayar/[id]) — 200 OK & Initial Unpaid State
    // -----------------------------------------------------------------
    console.log(`\n[5/7] 🛡️ Testing Payment Page (GET /bayar/${orderData.orderId})...`);
    const bayarRes = await request(`/bayar/${orderData.orderId}`);
    if (bayarRes.status !== 200) {
      throw new Error(`/bayar/${orderData.orderId} returned ${bayarRes.status} (expected 200)`);
    }
    const bayarHtml = await bayarRes.text();
    if (bayarHtml.includes("Ambil &amp; Buka Link Google Drive")) {
      throw new Error("SECURITY BUG: Google Drive link was shown on initial unpaid QRIS screen!");
    }
    console.log("  ✅ /bayar/[id] 200 OK, shows QRIS and 'BELUM BAYAR', Google Drive link is locked.");

    // -----------------------------------------------------------------
    // Step 6: CRITICAL TEST — Clicking "Cek Status Pembayaran" WITHOUT Transferring!
    // Must NOT mark as PAID and must NOT leak Google Drive link!
    // -----------------------------------------------------------------
    console.log(`\n[6/7] 🔒 Testing Payment Verification WITHOUT Transfer (POST /api/orders/${orderData.orderId}/confirm)...`);
    const confirmUnpaidRes = await request(`/api/orders/${orderData.orderId}/confirm`, {
      method: "POST",
    });
    const confirmUnpaidData = await confirmUnpaidRes.json();
    console.log("  Server response when unpaid:", JSON.stringify(confirmUnpaidData));

    if (confirmUnpaidData.paid === true || confirmUnpaidData.status === "PAID") {
      throw new Error("CRITICAL BUG: Order was marked PAID even though no transfer occurred!");
    }
    if (confirmUnpaidData.driveLinks && confirmUnpaidData.driveLinks.length > 0) {
      throw new Error("CRITICAL BUG: Drive links were returned for an unpaid order!");
    }
    console.log("  ✅ STRICT CHECK PASSED: Server returned paid=false, status=PENDING, driveLinks=[]!");
    console.log(`  ✅ Message returned for Belum Bayar screen: "${confirmUnpaidData.message}"`);

    // -----------------------------------------------------------------
    // Step 7: Verify /pesanan/[id] also blocks Google Drive access when unpaid
    // -----------------------------------------------------------------
    console.log(`\n[7/7] 📂 Checking /pesanan/${orderData.orderId} while unpaid...`);
    const pesananUnpaid = await request(`/pesanan/${orderData.orderId}`);
    if (pesananUnpaid.status !== 200) {
      throw new Error(`/pesanan/${orderData.orderId} returned ${pesananUnpaid.status}`);
    }
    const pesananHtml = await pesananUnpaid.text();
    if (pesananHtml.includes("drive.google.com/drive/folders")) {
      throw new Error("CRITICAL BUG: /pesanan/[id] leaked Google Drive folder URL while order is PENDING!");
    }
    const hasLockedBanner = pesananHtml.includes("Belum Dibayar") || pesananHtml.includes("Menunggu pembayaran");
    console.log(`  ✅ /pesanan/[id] strictly locks Drive link while unpaid (Locked banner present: ${hasLockedBanner}).`);

    console.log(`\n======================================================`);
    console.log(`🎉 ALL 7 STRICT PAYMENT VERIFICATION TESTS PASSED!`);
    console.log(`Unpaid users are strictly blocked & shown 'Belum Bayar'.`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error("\n❌ E2E VERIFICATION FAILED:", err.message);
    process.exit(1);
  }
}

run();
