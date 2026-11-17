import { cookies } from "next/headers";
import type { DbShape, DriveLink, Order, OrderStatus, OrderView, Payment, PaymentStatus, AccessStatus, OrderItem } from "./types";

export const ORDER_COOKIE_NAME = "mug1iii_orders";
export const ACTIVE_ORDER_COOKIE_NAME = "mug1iii_active_order";

export interface StoredOrder {
  id: string;
  orderNumber: string;
  userId: string;
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

/**
 * Safely parses cookie value.
 */
function parseCookie<T>(value: string | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(value)) as T;
  } catch {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
}

/**
 * Reads all stored orders from request cookies.
 * Ensures orders persist across isolated Vercel Serverless Function containers.
 */
export function getOrdersFromCookies(): StoredOrder[] {
  try {
    const cookieStore = cookies();
    const listRaw = cookieStore.get(ORDER_COOKIE_NAME)?.value;
    const activeRaw = cookieStore.get(ACTIVE_ORDER_COOKIE_NAME)?.value;

    const list = parseCookie<StoredOrder[]>(listRaw) || [];
    const active = parseCookie<StoredOrder>(activeRaw);

    const map = new Map<string, StoredOrder>();
    for (const o of list) {
      if (o && o.id) map.set(o.id, o);
    }
    if (active && active.id) {
      const prev = map.get(active.id);
      map.set(active.id, {
        ...(prev || {}),
        ...active,
        status: (prev?.status === "PAID" || active.status === "PAID") ? "PAID" : active.status,
        paymentStatus: (prev?.paymentStatus === "SUCCESS" || active.paymentStatus === "SUCCESS") ? "SUCCESS" : active.paymentStatus,
        accessStatus: (prev?.accessStatus === "GRANTED" || active.accessStatus === "GRANTED") ? "GRANTED" : active.accessStatus,
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
 * Hydrates orders, payments, and drive links from cookies into the in-memory DbShape.
 * Strictly prevents final states (PAID, SUCCESS, GRANTED) from being clobbered by stale cookies.
 */
export function hydrateOrdersFromCookies(db: DbShape): void {
  try {
    const cookieOrders = getOrdersFromCookies();
    if (!cookieOrders.length) return;

    for (const co of cookieOrders) {
      // 1. Order
      const existingIdx = db.orders.findIndex((o) => o.id === co.id);
      const orderEntry: Order = {
        id: co.id,
        orderNumber: co.orderNumber,
        userId: co.userId,
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
        const isPaySuccess = existing.paymentStatus === "SUCCESS" || orderEntry.paymentStatus === "SUCCESS";
        const isGranted = existing.accessStatus === "GRANTED" || orderEntry.accessStatus === "GRANTED";

        db.orders[existingIdx] = {
          ...existing,
          ...orderEntry,
          status: isPaid ? "PAID" : existing.status,
          paymentStatus: isPaySuccess ? "SUCCESS" : existing.paymentStatus,
          accessStatus: isGranted
            ? "GRANTED"
            : (existing.accessStatus === "GRANTING" ? "GRANTING" : orderEntry.accessStatus),
          paidAt: existing.paidAt || orderEntry.paidAt || null,
        };
      }

      // 2. Payment
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

      // 3. Drive Links
      if (co.driveLinks && co.driveLinks.length) {
        for (const dl of co.driveLinks) {
          const dlIdx = db.driveLinks.findIndex((d) => d.orderId === co.id && d.albumId === dl.albumId);
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
 * Attaches updated order cookies to an HTTP response.
 */
export function attachOrderCookies(
  res: { cookies: { set: (name: string, value: string, options?: any) => void } },
  order: OrderView | Order,
  extra?: { payment?: Payment | null; driveLinks?: DriveLink[] },
): void {
  try {
    const existing = getOrdersFromCookies();
    const payment = "payment" in order ? order.payment : extra?.payment ?? null;
    const driveLinks = "driveLinks" in order ? order.driveLinks : extra?.driveLinks ?? [];

    const stored: StoredOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
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

    // Keep up to 8 recent orders
    const updatedList = Array.from(map.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    const cookieOptions = {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax" as const,
      httpOnly: false,
    };

    res.cookies.set(ACTIVE_ORDER_COOKIE_NAME, encodeURIComponent(JSON.stringify(stored)), cookieOptions);
    res.cookies.set(ORDER_COOKIE_NAME, encodeURIComponent(JSON.stringify(updatedList)), cookieOptions);
  } catch (err) {
    console.warn("[attachOrderCookies] Failed to set cookie:", err);
  }
}
