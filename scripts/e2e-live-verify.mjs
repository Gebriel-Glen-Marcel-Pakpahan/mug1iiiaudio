// Full End-to-End & Sequence Verification Script for MUG1III AUDIO
import assert from "node:assert/strict";

const BASE_URL = process.argv[2] || "https://mug1iiiaudio.vercel.app";
const DANA_SECRET = "mug1iii-dana-secret-2026";

console.log(`\n======================================================`);
console.log(`MUG1III AUDIO — END-TO-END & SEQUENCE VERIFICATION`);
console.log(`Target: ${BASE_URL}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log(`======================================================\n`);

async function createClient() {
  let cookies = "";
  async function request(path, init = {}) {
    const res = await fetch(BASE_URL + path, {
      ...init,
      headers: {
        ...(cookies ? { Cookie: cookies } : {}),
        ...(init.headers || {}),
      },
      redirect: "manual",
    });
    const setCookies = res.headers.getSetCookie();
    for (const sc of setCookies) {
      const pair = sc.split(";")[0];
      cookies = cookies ? `${cookies}; ${pair}` : pair;
    }
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, data: json, text, headers: res.headers };
  }

  async function login(email, password = "admin123") {
    const csrfRes = await request("/api/auth/csrf");
    const csrfToken = csrfRes.data?.csrfToken;
    assert.ok(csrfToken, "CSRF token should be returned");
    const loginRes = await request("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        csrfToken,
        email,
        password,
        json: "true",
      }),
    });
    return loginRes;
  }

  return { request, login };
}

async function runSequenceTests() {
  const results = [];

  function record(seqNumber, name, status, detail) {
    results.push({ seqNumber, name, status, detail });
    const mark = status === "PASS" ? "✅" : "❌";
    console.log(`${mark} [SEQ-${seqNumber}] ${name}: ${detail}`);
  }

  try {
    // -------------------------------------------------------------------------
    // SEQUENCE 1: Sistem & Autentikasi Admin & Buyer
    // -------------------------------------------------------------------------
    console.log(`\n--- [1] Memverifikasi Autentikasi Pengguna & Admin ---`);
    const adminClient = await createClient();
    const adminLogin = await adminClient.login("admin@mug1iii.audio", "admin123");
    assert.ok([200, 302].includes(adminLogin.status), "Admin login should succeed");
    record(1, "Autentikasi Admin (admin@mug1iii.audio)", "PASS", `HTTP ${adminLogin.status} login sukses & session token terpasang`);

    const storeOwnerClient = await createClient();
    const storeOwnerLogin = await storeOwnerClient.login("mugiiistore@gmail.com", "admin123");
    assert.ok([200, 302].includes(storeOwnerLogin.status), "Store owner admin login should succeed");
    record(1, "Autentikasi Pemilik Toko (mugiiistore@gmail.com)", "PASS", `HTTP ${storeOwnerLogin.status} akun admin pemilik toko aktif`);

    // Buyer client
    const testBuyerEmail = `buyer.e2e.${Date.now()}@gmail.com`;
    const buyerClient = await createClient();
    const buyerLogin = await buyerClient.login(testBuyerEmail, "buyer123");
    assert.ok([200, 302].includes(buyerLogin.status), "Buyer login should succeed");
    record(1, "Autentikasi Pembeli Baru", "PASS", `Akun pembeli ${testBuyerEmail} berhasil login`);

    // -------------------------------------------------------------------------
    // SEQUENCE 2: Katalog Audio & Format Lossless
    // -------------------------------------------------------------------------
    console.log(`\n--- [2] Memverifikasi Katalog & Format Audio Lossless ---`);
    const albumsRes = await buyerClient.request("/api/albums");
    assert.equal(albumsRes.status, 200, "Albums API should return 200");
    const albumsList = albumsRes.data?.items || albumsRes.data?.albums || albumsRes.data;
    assert.ok(Array.isArray(albumsList) && albumsList.length >= 10, "Should have at least 10 FLAC albums");
    const sampleAlbum = albumsList[0];
    assert.ok(sampleAlbum.price > 0, "Album price must be positive");
    assert.ok(sampleAlbum.gdriveFolderId, "Album must have Google Drive folder ID");
    record(2, "Katalog Master FLAC", "PASS", `Ditemukan ${albumsList.length} album master Hi-Res FLAC (Sample: ${sampleAlbum.title} - ${sampleAlbum.artist}, ${sampleAlbum.sampleRate}/${sampleAlbum.bitDepth})`);

    // -------------------------------------------------------------------------
    // SEQUENCE 3: Keranjang & Checkout Pesanan
    // -------------------------------------------------------------------------
    console.log(`\n--- [3] Memverifikasi Keranjang & Checkout Transaksi ---`);
    const cartRes = await buyerClient.request("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: sampleAlbum.id }),
    });
    assert.equal(cartRes.status, 200, "Add to cart should return 200");

    const checkoutRes = await buyerClient.request("/api/checkout", { method: "POST" });
    assert.equal(checkoutRes.status, 200, "Checkout should return 200");
    const orderData = checkoutRes.data;
    assert.ok(orderData.orderId, "Order ID must exist");
    assert.ok(orderData.orderNumber?.startsWith("ORD-"), "Order Number must format ORD-YYYYMMDD-XXXX");
    assert.ok(orderData.qrString, "QRIS string must be generated");
    assert.ok(orderData.totalAmount > 0, "Total amount must be positive");
    record(3, "Checkout Pesanan Baru", "PASS", `Pesanan ${orderData.orderNumber} senilai Rp ${orderData.totalAmount.toLocaleString("id-ID")} dibuat dengan QRIS DANA Bisnis`);

    // Idempotency check: duplicate checkout call returns the same active order
    const checkoutAgain = await buyerClient.request("/api/checkout", { method: "POST" });
    assert.equal(checkoutAgain.data.orderId, orderData.orderId, "Checkout must be idempotent");
    record(3, "Idempotensi Checkout", "PASS", "Checkout berulang mengembalikan pesanan yang sama tanpa duplikasi");

    // -------------------------------------------------------------------------
    // SEQUENCE 4: Proteksi Keamanan Sebelum Bayar
    // -------------------------------------------------------------------------
    console.log(`\n--- [4] Memverifikasi Proteksi Akses Sebelum Bayar ---`);
    const statusBefore = await buyerClient.request(`/api/orders/${orderData.orderId}/status`);
    assert.equal(statusBefore.status, 200);
    assert.equal(statusBefore.data.paid, false, "Order must NOT be marked paid yet");
    assert.equal(statusBefore.data.driveLinks.length, 0, "Drive links must be empty before payment");

    const confirmBefore = await buyerClient.request(`/api/orders/${orderData.orderId}/confirm`, {
      method: "POST",
    });
    assert.equal(confirmBefore.status, 200);
    assert.equal(confirmBefore.data.paid, false, "Confirm must reject unpaid order");
    record(4, "Proteksi File Google Drive", "PASS", "Tautan Google Drive terkunci ketat sebelum pembayaran tervalidasi");

    // -------------------------------------------------------------------------
    // SEQUENCE 5: Webhook DANA Otomatisasi (Notifikasi HP & Nominal Matcher)
    // -------------------------------------------------------------------------
    console.log(`\n--- [5] Memverifikasi Webhook Otomatisasi DANA ---`);
    // 5a. Spoof test (invalid secret)
    const spoofWebhook = await buyerClient.request(`/api/webhooks/dana?secret=wrong_secret&amount=${orderData.totalAmount}`, {
      method: "POST",
    });
    assert.equal(spoofWebhook.status, 401, "Spoofed webhook must be rejected with 401");
    record(5, "Keamanan Token Webhook DANA", "PASS", "Permintaan tanpa secret token valid ditolak tegas (HTTP 401)");

    // 5b. Valid webhook with Indonesian notification text
    const notifText = `Kamu menerima pembayaran sebesar Rp ${orderData.totalAmount.toLocaleString("id-ID")} dari QRIS MUG1III STORE`;
    const danaWebhook = await buyerClient.request(`/api/webhooks/dana?secret=${DANA_SECRET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notification: notifText,
        orderNumber: orderData.orderNumber,
      }),
    });
    assert.equal(danaWebhook.status, 200, "Valid DANA webhook should return 200");
    assert.equal(danaWebhook.data.ok, true, "Webhook outcome must be ok");
    record(5, "Otomatisasi Webhook DANA (Push Notif HP)", "PASS", `Webhook memproses notifikasi "${notifText}" -> Pesanan ${orderData.orderNumber} LUNAS otomatis!`);

    // 5c. Idempotency test (replay same payment webhook)
    const replayWebhook = await buyerClient.request(`/api/webhooks/dana?secret=${DANA_SECRET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notification: notifText,
        orderNumber: orderData.orderNumber,
      }),
    });
    assert.equal(replayWebhook.status, 200);
    assert.ok(replayWebhook.data.message.includes("idempotent") || replayWebhook.data.ok, "Replay must be idempotent");
    record(5, "Idempotensi Webhook DANA", "PASS", "Panggilan duplikat ditangani aman tanpa mengirimkan email ganda");

    // -------------------------------------------------------------------------
    // SEQUENCE 6: Verifikasi Akses Google Drive Setelah Bayar
    // -------------------------------------------------------------------------
    console.log(`\n--- [6] Memverifikasi Pembukaan Akses Google Drive Pasca-Bayar ---`);
    const statusAfter = await buyerClient.request(`/api/orders/${orderData.orderId}/status`);
    assert.equal(statusAfter.status, 200);
    assert.equal(statusAfter.data.paid, true, "Order must now be PAID");
    assert.ok(["GRANTED", "GRANTING"].includes(statusAfter.data.accessStatus), "Access must be granted");
    assert.ok(statusAfter.data.driveLinks.length > 0, "Drive links must now be present");
    const driveFolder = statusAfter.data.driveLinks[0];
    assert.ok(driveFolder.linkUrl.includes("drive.google.com"), "Must contain Google Drive folder URL");
    record(6, "Pengiriman Akses Google Drive", "PASS", `Akses Google Drive terbuka: ${driveFolder.linkUrl} (Status: ${statusAfter.data.accessStatus})`);

    // -------------------------------------------------------------------------
    // SEQUENCE 7: Database PostgreSQL & Monitoring Visual Storage
    // -------------------------------------------------------------------------
    console.log(`\n--- [7] Memverifikasi Database PostgreSQL & Visual Storage Monitor ---`);
    const storageRes = await adminClient.request("/api/admin/database/storage");
    assert.equal(storageRes.status, 200, "Database storage API must return 200");
    const storage = storageRes.data;
    assert.equal(storage.maxStorageMb, 500, "Max storage must be 500 MB (Supabase Free Tier)");
    assert.ok(storage.remainingMb > 0, "Remaining storage must be positive");
    assert.ok(storage.tables.length >= 8, "Must report table metrics");
    record(7, "Monitoring Storage Database", "PASS", `Kapasitas: ${storage.maxStorageMb} MB, Terpakai: ${storage.usedMb} MB, Sisa: ${storage.remainingMb} MB (${storage.remainingPercentage}%)`);

    // -------------------------------------------------------------------------
    // SEQUENCE 8: Kompresi Data Pelanggan & Optimasi Database
    // -------------------------------------------------------------------------
    console.log(`\n--- [8] Memverifikasi Kompresi Data Pelanggan ---`);
    const compactRes = await adminClient.request("/api/admin/database/compact", { method: "POST" });
    assert.equal(compactRes.status, 200, "Database compact API must return 200");
    assert.equal(compactRes.data.ok, true, "Compaction must succeed");
    record(8, "Kompresi Data Pelanggan", "PASS", `Sistem kompresi berhasil dijalankan: ${compactRes.data.message}`);

    // -------------------------------------------------------------------------
    // SEQUENCE 9: Diagnostik Integrasi Sistem
    // -------------------------------------------------------------------------
    console.log(`\n--- [9] Memverifikasi Status Diagnostik Seluruh Integrasi ---`);
    const diagRes = await adminClient.request("/api/admin/diagnostics");
    assert.equal(diagRes.status, 200, "Diagnostics API must return 200");
    const diag = diagRes.data;
    assert.ok(diag.email, "Email diagnostics must be present");
    assert.ok(diag.danaWebhook, "DANA Webhook diagnostics must be present");
    record(9, "Diagnostik Integrasi Keseluruhan", "PASS", `Email: ${diag.email.from}, DANA Webhook: ${diag.danaWebhook.status}, Database: ${diag.database.type}`);

    console.log(`\n======================================================`);
    console.log(`HASIL: SEMUA 9 SEQUENCE LULUS VERIFIKASI (100% PASS)`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error("\n❌ VERIFIKASI GAGAL DI SALAH SATU SEQUENCE:", err);
    process.exit(1);
  }
}

runSequenceTests();
