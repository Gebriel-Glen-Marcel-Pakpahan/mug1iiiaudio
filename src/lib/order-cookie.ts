import crypto from "node:crypto";
import { cookies } from "next/headers";
import type {
  AccessStatus,
  DbShape,
  DriveLink,
  Order,
  OrderItem,
  OrderStatus,
  OrderView,
  Payment,
  PaymentStatus,
  User,
} from "./types";

export const ORDER_COOKIE_NAME = "mug1iii_orders_v2";
export const ACTIVE_ORDER_COOKIE_NAME = "mug1iii_active_order_v2";
export const REG_USER_COOKIE_NAME = "mug1iii_reg_user_v2";

const LEGACY_ORDER_COOKIE = "mug1iii_orders";
const LEGACY_ACTIVE_COOKIE = "mug1iii_active_order";

const COOKIE_SECRET =
  process.env.NEXTAUTH_SECRET?.trim() ||
  "mug1iii-audio-production-secret-key-2026-lossless-archive";

export interface StoredOrder {
  id: string;
  orderNumber: string;
  userId: string;
  userEmail?: string;
  totalAmount: number;
  taxAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  accessStatus: AccessStatus;
  items: OrderItem[];
  createdAt: string;
  paidAt: string | null;
  payment?: Payment | null;
  driveLinks?: DriveLink[];
}

function signPayload(json: string): string {
  const sig = crypto.createHmac("sha256", COOKIE_SECRET).update(json).digest("base64url");
  return `${encodeURIComponent(json)}.${sig}`;
}

function verifyAndParse<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    const lastDot = raw.lastIndexOf(".");
    if (lastDot === -1) return null;
    const encoded = raw.slice(0, lastDot);
    const sig = raw.slice(lastDot + 1);
    const json = decodeURIComponent(encoded);
    const expected = crypto.createHmac("sha256", COOKIE_SECRET).update(json).digest("base64url");
    if (sig !== expected) return null;
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Reads all HMAC-verified stored orders from request cookies.
 * Ensures orders persist across isolated Vercel Serverless Function containers.
 */
export function getOrdersFromCookies(): StoredOrder[] {
  try {
    const cookieStore = cookies();
    const listRaw = cookieStore.get(ORDER_COOKIE_NAME)?.value;
    const activeRaw = cookieStore.get(ACTIVE_ORDER_COOKIE_NAME)?.value;

    const list = verifyAndParse<StoredOrder[]>(listRaw) || [];
    const active = verifyAndParse<StoredOrder>(activeRaw);

    const map = new Map<string, StoredOrder>();
    for (const o of list) {
      if (o && o.id) map.set(o.id, o);
    }
    if (active && active.id) {
      const prev = map.get(active.id);
      map.set(active.id, {
        ...(prev || {}),
        ...active,
        status: prev?.status === "PAID" || active.status === "PAID" ? "PAID" : active.status,
        paymentStatus:
          prev?.paymentStatus === "SUCCESS" || active.paymentStatus === "SUCCESS"
            ? "SUCCESS"
            : active.paymentStatus,
        accessStatus:
          prev?.accessStatus === "GRANTED" || active.accessStatus === "GRANTED"
            ? "GRANTED"
            : active.accessStatus,
      });
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

/**
 * Finds a specific stored order from cookies.
 */
export function getStoredOrderById(orderId: string): StoredOrder | null {
  const orders = getOrdersFromCookies();
  return orders.find((o) => o.id === orderId) || null;
}

/**
 * Hydrates registered users, orders, payments, and drive links from verified cookies into the in-memory DbShape.
 */
export function hydrateOrdersFromCookies(db: DbShape): void {
  try {
    const cookieStore = cookies();
    const regUserRaw = cookieStore.get(REG_USER_COOKIE_NAME)?.value;
    const regUser = verifyAndParse<User>(regUserRaw);
    if (regUser && regUser.email) {
      const idx = db.users.findIndex(
        (u) => u.id === regUser.id || u.email.toLowerCase() === regUser.email.toLowerCase(),
      );
      if (idx === -1) {
        db.users.push(regUser);
      } else {
        db.users[idx] = { ...db.users[idx], ...regUser };
      }
    }

    const cookieOrders = getOrdersFromCookies();
    if (!cookieOrders.length) return;

    for (const co of cookieOrders) {
      if (co.userEmail && co.userEmail !== "—") {
        const hasUser = db.users.some(
          (u) => u.id === co.userId || u.email.toLowerCase() === co.userEmail!.toLowerCase(),
        );
        if (!hasUser) {
          db.users.push({
            id: co.userId,
            email: co.userEmail,
            name: co.userEmail.split("@")[0],
            avatarUrl: null,
            role: "BUYER",
            createdAt: co.createdAt,
          });
        }
      }

      const existingIdx = db.orders.findIndex((o) => o.id === co.id);
      const orderEntry: Order = {
        id: co.id,
        orderNumber: co.orderNumber,
        userId: co.userId,
        userEmail: co.userEmail,
        totalAmount: co.totalAmount,
        taxAmount: co.taxAmount ?? 0,
        status: co.status,
        paymentStatus: co.paymentStatus,
        accessStatus: co.accessStatus,
        items: co.items || [],
        createdAt: co.createdAt,
        paidAt: co.paidAt ?? null,
      };

      if (existingIdx === -1) {
        db.orders.push(orderEntry);
      } else {
        const existing = db.orders[existingIdx];
        const isPaid = existing.status === "PAID" || orderEntry.status === "PAID";
        const isPaySuccess =
          existing.paymentStatus === "SUCCESS" || orderEntry.paymentStatus === "SUCCESS";
        const isGranted =
          existing.accessStatus === "GRANTED" || orderEntry.accessStatus === "GRANTED";

        db.orders[existingIdx] = {
          ...existing,
          ...orderEntry,
          userEmail: existing.userEmail || orderEntry.userEmail,
          status: isPaid ? "PAID" : existing.status,
          paymentStatus: isPaySuccess ? "SUCCESS" : existing.paymentStatus,
          accessStatus: isGranted
            ? "GRANTED"
            : existing.accessStatus === "GRANTING"
              ? "GRANTING"
              : orderEntry.accessStatus,
          paidAt: existing.paidAt || orderEntry.paidAt || null,
        };
      }

      if (co.payment) {
        const payIdx = db.payments.findIndex((p) => p.orderId === co.id);
        if (payIdx === -1) {
          db.payments.push(co.payment);
        } else {
          const existingPay = db.payments[payIdx];
          const isSuccess = existingPay.status === "SUCCESS" || co.payment.status === "SUCCESS";
          db.payments[payIdx] = {
            ...existingPay,
            ...co.payment,
            status: isSuccess ? "SUCCESS" : existingPay.status,
            verifiedAt: existingPay.verifiedAt || co.payment.verifiedAt || null,
          };
        }
      }

      // Only hydrate driveLinks if the order is genuinely PAID
      const currentOrder = db.orders.find((o) => o.id === co.id);
      if (currentOrder?.status === "PAID" && co.driveLinks && co.driveLinks.length) {
        for (const dl of co.driveLinks) {
          const dlIdx = db.driveLinks.findIndex(
            (d) => d.orderId === co.id && d.albumId === dl.albumId,
          );
          if (dlIdx === -1) {
            db.driveLinks.push(dl);
          } else {
            db.driveLinks[dlIdx] = {
              ...db.driveLinks[dlIdx],
              ...dl,
              isActive: db.driveLinks[dlIdx].isActive || dl.isActive,
            };
          }
        }
      }
    }
  } catch {
    // Outside request context
  }
}

/**
 * Attaches HMAC-signed registered user cookie so new registrations persist across serverless containers.
 */
export function attachRegisteredUserCookie(
  res: { cookies: { set: (name: string, value: string, options?: any) => void } },
  user: User,
): void {
  try {
    res.cookies.set(REG_USER_COOKIE_NAME, signPayload(JSON.stringify(user)), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax" as const,
      httpOnly: true,
    });
  } catch (err) {
    console.warn("[attachRegisteredUserCookie] Failed:", err);
  }
}

/**
 * Attaches HMAC-signed order cookies to an HTTP response and clears any legacy unsigned cookies.
 */
export function attachOrderCookies(
  res: { cookies: { set: (name: string, value: string, options?: any) => void } },
  order: OrderView | Order,
  extra?: { payment?: Payment | null; driveLinks?: DriveLink[] },
): void {
  try {
    const existing = getOrdersFromCookies();
    const payment = "payment" in order ? order.payment : (extra?.payment ?? null);
    const rawLinks = "driveLinks" in order ? order.driveLinks : (extra?.driveLinks ?? []);
    // Never store driveLinks in cookie unless order is PAID
    const driveLinks = order.status === "PAID" ? rawLinks : [];

    const stored: StoredOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      userEmail: order.userEmail,
      totalAmount: order.totalAmount,
      taxAmount: order.taxAmount ?? 0,
      status: order.status,
      paymentStatus: order.paymentStatus,
      accessStatus: order.accessStatus,
      items: order.items || [],
      createdAt: order.createdAt,
      paidAt: order.paidAt ?? null,
      payment,
      driveLinks,
    };

    const map = new Map<string, StoredOrder>();
    for (const o of existing) {
      if (o && o.id) map.set(o.id, o);
    }
    map.set(stored.id, stored);

    const updatedList = Array.from(map.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    const cookieOptions = {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax" as const,
      httpOnly: true,
    };

    res.cookies.set(ACTIVE_ORDER_COOKIE_NAME, signPayload(JSON.stringify(stored)), cookieOptions);
    res.cookies.set(ORDER_COOKIE_NAME, signPayload(JSON.stringify(updatedList)), cookieOptions);

    // Expire legacy unsigned v1 cookies so old test orders disappear immediately
    res.cookies.set(LEGACY_ACTIVE_COOKIE, "", { path: "/", maxAge: 0 });
    res.cookies.set(LEGACY_ORDER_COOKIE, "", { path: "/", maxAge: 0 });
  } catch (err) {
    console.warn("[attachOrderCookies] Failed to set cookie:", err);
  }
}
