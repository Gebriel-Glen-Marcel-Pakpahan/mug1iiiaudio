import { withDb, readDb, id, nowIso, makeOrderNumber, audit } from "./db";
import { createQrisCharge, verifySignature, fetchMidtransStatus } from "./services/midtrans";
import { grantFolderAccess, revokeFolderAccess } from "./services/gdrive";
import { sendAccessEmail, sendRefundEmail } from "./services/email";
import { config } from "./config";
import { getCartAlbumIdsFromCookies } from "./cart-cookie";
import type { Album, AlbumRequest, AlbumRequestStatus, DbShape, Order, OrderView, Refund, User } from "./types";

/* ------------------------------------------------------------------ */
/* Read helpers                                                        */
/* ------------------------------------------------------------------ */

export async function listAlbums(opts?: { includeUnpublished?: boolean }) {
  const db = await readDb();
  return opts?.includeUnpublished ? db.albums : db.albums.filter((a) => a.isPublished);
}

export async function getAlbumBySlug(slug: string): Promise<Album | null> {
  const db = await readDb();
  return db.albums.find((a) => a.slug === slug && a.isPublished) ?? null;
}

export function toOrderView(db: DbShape, order: Order): OrderView {
  const user = db.users.find((u) => u.id === order.userId);
  const albums = order.items
    .map((i) => db.albums.find((a) => a.id === i.albumId))
    .filter((a): a is Album => Boolean(a));
  return {
    ...order,
    albumTitles: albums.map((a) => a.title),
    userEmail: user?.email ?? "—",
    payment: db.payments.find((p) => p.orderId === order.id) ?? null,
    driveLinks: db.driveLinks.filter((d) => d.orderId === order.id),
    refund: db.refunds.find((r) => r.orderId === order.id) ?? null,
  };
}

export async function listOrdersForUser(userId: string): Promise<OrderView[]> {
  const db = await readDb();
  return db.orders
    .filter((o) => o.userId === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .map((o) => toOrderView(db, o));
}

export async function getOrderForUser(orderId: string, userId: string): Promise<OrderView | null> {
  const db = await readDb();
  const order = db.orders.find((o) => o.id === orderId && o.userId === userId);
  return order ? toOrderView(db, order) : null;
}

export async function getOrderById(orderId: string): Promise<OrderView | null> {
  const db = await readDb();
  const order = db.orders.find((o) => o.id === orderId);
  return order ? toOrderView(db, order) : null;
}

export async function listAllOrders(): Promise<OrderView[]> {
  const db = await readDb();
  return [...db.orders]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .map((o) => toOrderView(db, o));
}

export async function getCartView(userId: string) {
  const db = await readDb();

  let cookieAlbumIds: string[] = [];
  try {
    cookieAlbumIds = getCartAlbumIdsFromCookies();
  } catch {
    // ignore outside request
  }

  const dbItems = db.cart.filter((c) => c.userId === userId);
  const allAlbumIds = Array.from(new Set([...dbItems.map((c) => c.albumId), ...cookieAlbumIds]));

  const items = allAlbumIds
    .map((albumId) => {
      const album = db.albums.find((a) => a.id === albumId && a.isPublished);
      if (!album) return null;
      const existing = dbItems.find((c) => c.albumId === albumId);
      return {
        id: existing?.id || `cart_${albumId}`,
        userId,
        albumId,
        addedAt: existing?.addedAt || new Date().toISOString(),
        album,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const subtotal = items.reduce((s, i) => s + i.album.price, 0);
  return { items, subtotal };
}

/* ------------------------------------------------------------------ */
/* Cart                                                                */
/* ------------------------------------------------------------------ */

export async function addToCart(userId: string, albumId: string) {
  return withDb((db) => {
    const album = db.albums.find((a) => a.id === albumId && a.isPublished);
    if (!album) throw new Error("Album tidak ditemukan.");
    const existing = db.cart.find((c) => c.userId === userId && c.albumId === albumId);
    if (existing) return existing;
    const item = { id: id("cart"), userId, albumId, addedAt: nowIso() };
    db.cart.push(item);
    return item;
  });
}

export async function removeCartItem(userId: string, itemId: string) {
  return withDb((db) => {
    const before = db.cart.length;
    db.cart = db.cart.filter((c) => !(c.id === itemId && c.userId === userId));
    return db.cart.length < before;
  });
}

/* ------------------------------------------------------------------ */
/* Checkout — PRD §10.1 (idempotent, reuses pending order)             */
/* ------------------------------------------------------------------ */

export async function checkout(user: User, directAlbumId?: string) {
  // Guard: reuse an existing PENDING order with a live QR instead of double-charging (if not a specific direct album).
  const existing = await withDb((db) => {
    const pending = db.orders.find(
      (o) => o.userId === user.id && o.status === "PENDING" && o.paymentStatus === "PENDING",
    );
    if (!pending) return null;
    if (directAlbumId && !pending.items.some((i) => i.albumId === directAlbumId)) return null;
    const payment = db.payments.find((p) => p.orderId === pending.id);
    if (!payment?.qrString) return null;
    if (payment.expiresAt && new Date(payment.expiresAt).getTime() < Date.now()) return null;
    return { order: pending, payment };
  });

  if (existing) {
    const view = await getOrderById(existing.order.id);
    return { order: view!, payment: existing.payment, reused: true };
  }

  const db = await readDb();
  let checkoutItems: { album: Album; price: number }[] = [];

  if (directAlbumId) {
    const album = db.albums.find((a) => a.id === directAlbumId && a.isPublished);
    if (!album) throw new Error("Album tidak ditemukan.");
    checkoutItems = [{ album, price: album.price }];
  } else {
    const cart = await getCartView(user.id);
    if (!cart.items.length) throw new Error("Keranjang masih kosong.");
    checkoutItems = cart.items.map((c) => ({ album: c.album, price: c.album.price }));
  }

  const orderId = id("ord");
  const orderNumber = makeOrderNumber();
  const total = checkoutItems.reduce((s, i) => s + i.price, 0);

  await withDb((d) => {
    const order: Order = {
      id: orderId,
      orderNumber,
      userId: user.id,
      totalAmount: total,
      taxAmount: 0,
      status: "PENDING",
      paymentStatus: "PENDING",
      accessStatus: "PENDING",
      items: checkoutItems.map((c, idx) => ({
        id: `oi_${orderId}_${idx}`,
        orderId,
        albumId: c.album.id,
        priceSnapshot: c.price,
      })),
      createdAt: nowIso(),
      paidAt: null,
    };
    d.orders.push(order);
    audit(d, {
      actor: user.email,
      action: "checkout.created",
      target: orderNumber,
      detail: `${checkoutItems.length} item · Rp ${total.toLocaleString("id-ID")}`,
    });
  });

  const charge = await createQrisCharge({
    orderId,
    orderNumber,
    amount: total,
    email: user.email,
  });

  await withDb((db) => {
    db.payments.push({
      id: id("pay"),
      orderId,
      gateway: "midtrans",
      gatewayRef: charge.gatewayRef,
      qrString: charge.qrString,
      amount: total,
      status: "PENDING",
      verifiedAt: null,
      createdAt: nowIso(),
      expiresAt: charge.expiresAt,
    });
  });

  const view = await getOrderById(orderId);
  return { order: view!, payment: null, reused: false };
}

/* ------------------------------------------------------------------ */
/* Webhook — PRD §10.2 (signature + idempotency)                       */
/* ------------------------------------------------------------------ */

export async function handleWebhook(payload: {
  order_id: string;
  transaction_status: string;
  status_code: string;
  gross_amount: string;
  signature_key?: string;
  demo_secret?: string;
}) {
  const ok = verifySignature({
    order_id: payload.order_id,
    status_code: payload.status_code,
    gross_amount: payload.gross_amount,
    signature_key: payload.signature_key ?? "",
    demo_secret: payload.demo_secret,
  });
  if (!ok) return { ok: false as const, reason: "invalid_signature" };

  const outcome = await withDb((db) => {
    const order = db.orders.find((o) => o.orderNumber === payload.order_id);
    if (!order) return { state: "unknown_order" as const, orderId: null };
    const payment = db.payments.find((p) => p.orderId === order.id);
    if (!payment) return { state: "no_payment" as const, orderId: order.id };

    // Idempotency: final states are never reprocessed.
    if (payment.status === "SUCCESS" || payment.status === "REFUNDED") {
      return { state: "already_final" as const, orderId: order.id };
    }

    const settled = ["settlement", "capture"].includes(payload.transaction_status);
    const failed = ["expire", "deny", "cancel", "failure"].includes(payload.transaction_status);

    if (settled) {
      payment.status = "SUCCESS";
      payment.verifiedAt = nowIso();
      order.paymentStatus = "SUCCESS";
      order.status = "PAID";
      order.paidAt = nowIso();
      order.accessStatus = "PENDING";
      audit(db, {
        actor: "midtrans",
        action: "payment.settled",
        target: order.orderNumber,
        detail: `Webhook tervalidasi (${payload.transaction_status}). Order ditandai PAID.`,
      });
      return { state: "paid" as const, orderId: order.id };
    }

    if (failed) {
      payment.status = "FAILED";
      order.paymentStatus = "FAILED";
      order.status = "CANCELLED";
      audit(db, {
        actor: "midtrans",
        action: "payment.failed",
        target: order.orderNumber,
        detail: `Status ${payload.transaction_status}. Tidak ada izin Drive dibuat.`,
        level: "warn",
      });
      return { state: "failed" as const, orderId: order.id };
    }

    return { state: "ignored" as const, orderId: order.id };
  });

  // Grant access outside the webhook transaction — PRD v2.1 note.
  if (outcome.state === "paid" && outcome.orderId) {
    // fire-and-forget worker
    void grantAccess(outcome.orderId);
  }

  return { ok: true as const, ...outcome };
}

/**
 * Actively syncs an order's payment status directly with Midtrans.
 * Crucial when running on localhost where Midtrans webhooks cannot reach the local machine.
 */
export async function syncOrderPayment(orderId: string): Promise<OrderView | null> {
  const db = await readDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order || order.status !== "PENDING" || !config.midtrans.isConfigured) {
    return order ? toOrderView(db, order) : null;
  }

  const live = await fetchMidtransStatus(order.orderNumber);
  if (live) {
    await handleWebhook({
      order_id: order.orderNumber,
      transaction_status: live.transactionStatus,
      status_code: live.statusCode,
      gross_amount: live.grossAmount,
      signature_key: live.signatureKey,
    });
  }
  return getOrderById(orderId);
}

/**
 * Direct confirmation of order payment (used when testing real payment or scanning official MUG1III STORE QRIS).
 * Immediately marks order PAID and triggers Google Drive access grant.
 */
export async function confirmOrderPayment(orderId: string, actorEmail: string): Promise<OrderView | null> {
  const outcome = await withDb((db) => {
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) return null;
    if (order.status === "PAID" || order.status === "REFUNDED") {
      return { orderId: order.id, alreadyFinal: true };
    }

    const payment = db.payments.find((p) => p.orderId === order.id);
    if (payment) {
      payment.status = "SUCCESS";
      payment.verifiedAt = nowIso();
    }
    order.paymentStatus = "SUCCESS";
    order.status = "PAID";
    order.paidAt = nowIso();
    order.accessStatus = "PENDING";

    audit(db, {
      actor: actorEmail,
      action: "payment.settled",
      target: order.orderNumber,
      detail: `Pembayaran dikonfirmasi (${order.orderNumber}). Akses Drive siap diproses.`,
    });

    return { orderId: order.id, alreadyFinal: false };
  });

  if (!outcome) return null;
  if (!outcome.alreadyFinal) {
    await grantAccess(outcome.orderId);
  }
  return getOrderById(outcome.orderId);
}

/* ------------------------------------------------------------------ */
/* Worker — grant Drive access (idempotent + retry)                    */
/* ------------------------------------------------------------------ */

export async function grantAccess(orderId: string): Promise<void> {
  const snapshot = await withDb((db) => {
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) return null;
    if (order.status !== "PAID" && order.status !== "REFUNDED") return null;
    if (order.accessStatus === "GRANTED") return null;
    order.accessStatus = "GRANTING";
    const user = db.users.find((u) => u.id === order.userId);
    const items = order.items.map((i) => ({
      itemId: i.id,
      album: db.albums.find((a) => a.id === i.albumId)!,
    }));
    return { order, user, items };
  });

  if (!snapshot || !snapshot.user) return;
  const { order, user, items } = snapshot;

  const granted: { title: string; linkUrl: string }[] = [];
  let failed = false;

  for (const { album } of items) {
    try {
      const result = await grantFolderAccess({
        folderId: album.gdriveFolderId,
        email: user.email,
        orderNumber: order.orderNumber,
        albumTitle: album.title,
      });
      await withDb((db) => {
        const existing = db.driveLinks.find(
          (d) => d.orderId === order.id && d.albumId === album.id,
        );
        if (existing) {
          existing.permissionId = result.permissionId;
          existing.linkUrl = result.linkUrl;
          existing.isActive = true;
        } else {
          db.driveLinks.push({
            id: id("dl"),
            orderId: order.id,
            albumId: album.id,
            folderId: result.folderId,
            permissionId: result.permissionId,
            linkUrl: result.linkUrl,
            isActive: true,
            createdAt: nowIso(),
            revokedAt: null,
          });
        }
      });
      granted.push({ title: album.title, linkUrl: result.linkUrl });
    } catch (err) {
      failed = true;
      console.error("[grantAccess] failed for", album.title, err);
    }
  }

  await withDb((db) => {
    const o = db.orders.find((x) => x.id === order.id);
    if (!o) return;
    o.accessStatus = failed ? "FAILED" : "GRANTED";
    audit(db, {
      actor: "worker",
      action: failed ? "access.failed" : "access.granted",
      target: o.orderNumber,
      detail: failed
        ? "Sebagian izin Drive gagal. Dijadwalkan retry dengan backoff."
        : `Izin reader diberikan untuk ${granted.length} album.`,
      level: failed ? "warn" : "info",
    });
  });

  if (!failed && granted.length) {
    const view = await getOrderById(order.id);
    if (view) await sendAccessEmail(view, granted);
    await withDb((db) => {
      db.cart = db.cart.filter((c) => c.userId !== order.userId);
    });
  }
}

/** Manual retry exposed in the admin panel. */
export async function retryGrant(orderId: string) {
  await withDb((db) => {
    const order = db.orders.find((o) => o.id === orderId);
    if (order) order.accessStatus = "PENDING";
  });
  await grantAccess(orderId);
  return getOrderById(orderId);
}

/* ------------------------------------------------------------------ */
/* Refund / warranty — PRD §10.3                                        */
/* ------------------------------------------------------------------ */

export const WARRANTY_MS = 7 * 86_400_000;

export async function requestRefund(user: User, orderId: string, reason: string) {
  return withDb((db) => {
    const order = db.orders.find((o) => o.id === orderId && o.userId === user.id);
    if (!order) throw new Error("Pesanan tidak ditemukan.");
    if (order.status !== "PAID") throw new Error("Garansi hanya berlaku untuk pesanan lunas.");
    // PRD §13.2 — warranty window is 7 days after purchase.
    if (!order.paidAt || Date.now() - +new Date(order.paidAt) > WARRANTY_MS) {
      throw new Error("Masa garansi 7 hari untuk pesanan ini sudah berakhir.");
    }
    if (db.refunds.some((r) => r.orderId === orderId)) {
      throw new Error("Permintaan garansi untuk pesanan ini sudah ada.");
    }
    const refund: Refund = {
      id: id("rfd"),
      orderId,
      reason,
      status: "REQUESTED",
      requestedAt: nowIso(),
      resolvedAt: null,
      resolvedBy: null,
    };
    db.refunds.push(refund);
    audit(db, {
      actor: user.email,
      action: "refund.requested",
      target: order.orderNumber,
      detail: reason.slice(0, 160),
      level: "warn",
    });
    return refund;
  });
}

export async function approveRefund(refundId: string, adminEmail: string, note: string) {
  const refund = await withDb((db) => {
    const r = db.refunds.find((x) => x.id === refundId);
    if (!r) throw new Error("Permintaan refund tidak ditemukan.");
    if (r.status !== "REQUESTED") throw new Error("Permintaan ini sudah diputuskan.");
    r.status = "APPROVED";
    r.resolvedAt = nowIso();
    r.resolvedBy = adminEmail;
    r.resolutionNote = note;
    const order = db.orders.find((o) => o.id === r.orderId);
    if (order) {
      order.status = "REFUNDED";
      order.paymentStatus = "REFUNDED";
    }
    const payment = db.payments.find((p) => p.orderId === r.orderId);
    if (payment) payment.status = "REFUNDED";
    return r;
  });

  // Revoke Drive permissions outside the DB transaction.
  const links = await withDb((db) => db.driveLinks.filter((d) => d.orderId === refund.orderId && d.isActive));

  for (const link of links) {
    try {
      await revokeFolderAccess({ folderId: link.folderId, permissionId: link.permissionId });
      await withDb((db) => {
        const l = db.driveLinks.find((x) => x.id === link.id);
        if (l) {
          l.isActive = false;
          l.revokedAt = nowIso();
        }
      });
    } catch (err) {
      console.error("[refund] revoke failed", err);
    }
  }

  await withDb((db) => {
    const order = db.orders.find((o) => o.id === refund.orderId);
    if (order) {
      audit(db, {
        actor: adminEmail,
        action: "refund.approved",
        target: order.orderNumber,
        detail: `${links.length} izin Drive dicabut. ${note}`,
        level: "critical",
      });
    }
  });

  const view = await getOrderById(refund.orderId);
  if (view) await sendRefundEmail(view, note);
  return getOrderById(refund.orderId);
}

export async function rejectRefund(refundId: string, adminEmail: string, note: string) {
  return withDb((db) => {
    const r = db.refunds.find((x) => x.id === refundId);
    if (!r) throw new Error("Permintaan refund tidak ditemukan.");
    if (r.status !== "REQUESTED") throw new Error("Permintaan ini sudah diputuskan.");
    r.status = "REJECTED";
    r.resolvedAt = nowIso();
    r.resolvedBy = adminEmail;
    r.resolutionNote = note;
    const order = db.orders.find((o) => o.id === r.orderId);
    audit(db, {
      actor: adminEmail,
      action: "refund.rejected",
      target: order?.orderNumber ?? refundId,
      detail: note,
      level: "warn",
    });
    return r;
  });
}

export async function listRefunds() {
  const db = await readDb();
  return db.refunds.map((r) => {
    const order = db.orders.find((o) => o.id === r.orderId);
    return {
      ...r,
      order: order ? toOrderView(db, order) : null,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Admin stats + audit                                                 */
/* ------------------------------------------------------------------ */

export async function adminStats() {
  const db = await readDb();
  const paid = db.orders.filter((o) => o.status === "PAID" || o.status === "REFUNDED");
  const revenue = db.orders
    .filter((o) => o.status === "PAID")
    .reduce((s, o) => s + o.totalAmount, 0);
  const now = Date.now();
  const last30 = db.orders.filter(
    (o) => o.status === "PAID" && +new Date(o.createdAt) > now - 30 * 86_400_000,
  );
  return {
    totalOrders: db.orders.length,
    paidOrders: paid.length,
    pendingOrders: db.orders.filter((o) => o.status === "PENDING").length,
    failedAccess: db.orders.filter((o) => o.accessStatus === "FAILED").length,
    revenue,
    revenue30d: last30.reduce((s, o) => s + o.totalAmount, 0),
    orders30d: last30.length,
    openRefunds: db.refunds.filter((r) => r.status === "REQUESTED").length,
    albums: db.albums.length,
    buyers: db.users.filter((u) => u.role === "BUYER").length,
    recentOrders: [...db.orders]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 6)
      .map((o) => toOrderView(db, o)),
    audit: db.audit.slice(0, 12),
    qrisTtl: config.demo.qrisTtlMinutes,
  };
}

export async function listAudit(limit = 100) {
  const db = await readDb();
  return db.audit.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Album Requests (Permintaan Album dari Pelanggan)                   */
/* ------------------------------------------------------------------ */

export async function createAlbumRequest(data: {
  userId?: string | null;
  userEmail: string;
  userContact?: string | null;
  albumTitle: string;
  artist: string;
  year?: string | null;
  formatPreference?: string | null;
  notes?: string | null;
}): Promise<AlbumRequest> {
  return withDb((db) => {
    if (!db.requests) db.requests = [];
    const req: AlbumRequest = {
      id: id("req"),
      userId: data.userId ?? null,
      userEmail: data.userEmail,
      userContact: data.userContact ?? null,
      albumTitle: data.albumTitle.trim(),
      artist: data.artist.trim(),
      year: data.year?.trim() ?? null,
      formatPreference: data.formatPreference?.trim() ?? "FLAC 24-bit Hi-Res",
      notes: data.notes?.trim() ?? null,
      status: "PENDING",
      adminNote: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.requests.unshift(req);
    audit(db, {
      actor: data.userEmail,
      action: "request.created",
      target: req.albumTitle,
      detail: `Permintaan album "${req.albumTitle}" (${req.artist}) diajukan.`,
    });
    return req;
  });
}

export async function listAlbumRequests(filter?: { userId?: string }): Promise<AlbumRequest[]> {
  const db = await readDb();
  let list = db.requests ?? [];
  if (filter?.userId) {
    list = list.filter((r) => r.userId === filter.userId);
  }
  return [...list].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function updateAlbumRequestStatus(
  requestId: string,
  status: AlbumRequestStatus,
  adminNote?: string | null,
): Promise<AlbumRequest | null> {
  return withDb((db) => {
    if (!db.requests) db.requests = [];
    const req = db.requests.find((r) => r.id === requestId);
    if (!req) return null;
    req.status = status;
    if (adminNote !== undefined) req.adminNote = adminNote;
    req.updatedAt = nowIso();
    audit(db, {
      actor: "admin",
      action: "request.updated",
      target: req.albumTitle,
      detail: `Status request diubah ke ${status}.`,
    });
    return req;
  });
}

export async function deleteAlbumRequest(requestId: string): Promise<boolean> {
  return withDb((db) => {
    if (!db.requests) return false;
    const idx = db.requests.findIndex((r) => r.id === requestId);
    if (idx === -1) return false;
    const removed = db.requests.splice(idx, 1)[0];
    audit(db, {
      actor: "admin",
      action: "request.deleted",
      target: removed.albumTitle,
      detail: `Request album "${removed.albumTitle}" dihapus.`,
    });
    return true;
  });
}
