import crypto from "node:crypto";
import QRCode from "qrcode";
import { config, isDemo } from "../config";

export interface QrisCharge {
  gatewayRef: string;
  qrString: string;
  qrDataUrl: string;
  expiresAt: string;
  /** true when the response came from the demo simulator */
  simulated: boolean;
}

export const MUG1III_OFFICIAL_QRIS_STRING =
  "00020101021126570011ID.DANA.WWW011893600915387109409302098710940930303UMI51440014ID.CO.QRIS.WWW0215ID10254013974980303UMI5204654053033605802ID5913MUG1III STORE6015Kab. Humbang Ha61052245763040FA2";

/**
 * Midtrans QRIS charge (PRD §9.2 POST /checkout).
 * Fallback to official MUG1III STORE QRIS payload so testing with real mobile banking works.
 */
export async function createQrisCharge(params: {
  orderId: string;
  orderNumber: string;
  amount: number;
  email: string;
}): Promise<QrisCharge> {
  const expiresAt = new Date(
    Date.now() + config.demo.qrisTtlMinutes * 60_000,
  ).toISOString();

  if (isDemo() || !config.midtrans.isConfigured) {
    const gatewayRef = `qris-${params.orderNumber}-${crypto.randomBytes(3).toString("hex")}`;
    // Use the official store QRIS registered at Bank Indonesia / ASPI (MUG1III STORE)
    const qrString = MUG1III_OFFICIAL_QRIS_STRING;
    const qrDataUrl = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 560,
      color: { dark: "#0B0B0F", light: "#FFFFFF" },
    });
    return { gatewayRef, qrString, qrDataUrl, expiresAt, simulated: true };
  }

  const res = await fetch(config.midtrans.chargeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${config.midtrans.serverKey}:`).toString("base64")}`,
    },
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: {
        order_id: params.orderNumber,
        gross_amount: params.amount,
      },
      item_details: [
        {
          id: params.orderNumber,
          price: params.amount,
          quantity: 1,
          name: `Akses Arsip Digital [${params.orderNumber}]`,
        },
      ],
      qris: { acquirer: "gopay" },
      customer_details: { email: params.email },
      custom_expiry: {
        expiry_duration: config.demo.qrisTtlMinutes,
        unit: "minute",
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Midtrans charge failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as {
    transaction_id?: string;
    qr_string?: string;
    expiry_time?: string;
  };

  // Midtrans returns the raw EMVCo payload in `qr_string`; we render it ourselves.
  const qrString = data.qr_string;
  if (!qrString) throw new Error("Midtrans response did not include qr_string");

  return {
    gatewayRef: data.transaction_id ?? params.orderNumber,
    qrString,
    qrDataUrl: await renderQr(qrString),
    expiresAt: data.expiry_time ?? expiresAt,
    simulated: false,
  };
}

/** Re-render a stored QRIS string (page refresh before payment). */
export async function renderQr(qrString: string): Promise<string> {
  return QRCode.toDataURL(qrString, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 560,
    color: { dark: "#0B0B0F", light: "#FFFFFF" },
  });
}

/**
 * Active status polling from Midtrans API (essential when running on localhost where Midtrans cannot push webhooks).
 */
export async function fetchMidtransStatus(orderNumber: string): Promise<{
  transactionStatus: string;
  statusCode: string;
  grossAmount: string;
  signatureKey?: string;
} | null> {
  if (!config.midtrans.isConfigured) return null;
  try {
    const baseUrl = config.midtrans.chargeUrl.replace("/charge", "");
    const res = await fetch(`${baseUrl}/${encodeURIComponent(orderNumber)}/status`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${config.midtrans.serverKey}:`).toString("base64")}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      transaction_status?: string;
      status_code?: string;
      gross_amount?: string;
      signature_key?: string;
    };
    if (!data.transaction_status) return null;
    return {
      transactionStatus: data.transaction_status,
      statusCode: data.status_code ?? "200",
      grossAmount: data.gross_amount ?? "0.00",
      signatureKey: data.signature_key,
    };
  } catch {
    return null;
  }
}

/**
 * Signature check per Midtrans spec: SHA512(order_id + status_code + gross_amount + serverKey).
 * Demo mode uses a shared secret so the flow is testable without credentials.
 */
export function verifySignature(payload: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  demo_secret?: string;
}): boolean {
  if (isDemo() && !config.midtrans.isConfigured) {
    return payload.demo_secret === config.demo.webhookSecret;
  }
  const expected = crypto
    .createHash("sha512")
    .update(
      `${payload.order_id}${payload.status_code}${payload.gross_amount}${config.midtrans.serverKey}`,
    )
    .digest("hex");
  return timingSafeEqual(expected, payload.signature_key);
}

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** Builds a plausible EMVCo QRIS string for the demo QR render. */
function buildDemoQrisPayload(orderNumber: string, amount: number): string {
  const amountStr = String(amount);
  const tlv = (tag: string, value: string) =>
    `${tag}${String(value.length).padStart(2, "0")}${value}`;
  const merchant =
    tlv("00", "ID.CO.QRIS.WWW") +
    tlv("01", "936000000000000000") +
    tlv("02", "MUG1III AUDIO") +
    tlv("03", "ID1024000000001") +
    tlv("51", "ID.CO.QRIS.WWW") +
    tlv("52", "5812") +
    tlv("53", "360") +
    tlv("54", amountStr) +
    tlv("58", "ID") +
    tlv("59", "MUG1III AUDIO") +
    tlv("60", "JAKARTA") +
    tlv("61", "10110") +
    tlv("62", tlv("05", orderNumber.slice(-12)));
  const body = tlv("00", "01") + tlv("01", "12") + tlv("26", merchant) + tlv("63", "ABCD");
  return body;
}
