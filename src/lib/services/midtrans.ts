import crypto from "node:crypto";
import QRCode from "qrcode";
import { config, isDemo } from "../config";
import { withAmount } from "../qris";

export interface QrisCharge {
  gatewayRef: string;
  qrString: string;
  qrDataUrl: string;
  expiresAt: string;
  /** true when the response came from the demo simulator */
  simulated: boolean;
}

/** Static store QRIS (MUG1III STORE, NMID ID1025401397498). CRC verified in scripts/test-qris.mjs. */
export const MUG1III_OFFICIAL_QRIS_STRING =
  "00020101021126570011ID.DANA.WWW011893600915387109409302098710940930303UMI51440014ID.CO.QRIS.WWW0215ID10254013974980303UMI5204654053033605802ID5913MUG1III STORE6015Kab. Humbang Ha61052245763040FA2";

/** Store QRIS with the exact order amount baked in, so the buyer's app asks for that amount. */
async function storeQrisCharge(
  orderNumber: string,
  amount: number,
  expiresAt: string,
  simulated: boolean,
): Promise<QrisCharge> {
  const qrString = withAmount(MUG1III_OFFICIAL_QRIS_STRING, amount);
  return {
    gatewayRef: `store-${orderNumber}`,
    qrString,
    qrDataUrl: await renderQr(qrString),
    expiresAt,
    simulated,
  };
}

const authHeader = () =>
  `Basic ${Buffer.from(`${config.midtrans.serverKey}:`).toString("base64")}`;

/**
 * Midtrans QRIS charge (PRD §9.2 POST /checkout).
 * Falls back to the store QRIS (with amount) when Midtrans is not configured or refuses the charge.
 */
export async function createQrisCharge(params: {
  orderId: string;
  orderNumber: string;
  amount: number;
  email: string;
}): Promise<QrisCharge> {
  const expiresAt = new Date(Date.now() + config.demo.qrisTtlMinutes * 60_000).toISOString();

  if (isDemo() || !config.midtrans.isConfigured) {
    return storeQrisCharge(params.orderNumber, params.amount, expiresAt, true);
  }

  try {
    const res = await fetch(config.midtrans.chargeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: authHeader() },
      body: JSON.stringify({
        payment_type: "qris",
        transaction_details: { order_id: params.orderNumber, gross_amount: params.amount },
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
        custom_expiry: { expiry_duration: config.demo.qrisTtlMinutes, unit: "minute" },
      }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      status_code?: string;
      status_message?: string;
      transaction_id?: string;
      qr_string?: string;
    };
    if (!res.ok || !data.qr_string) {
      console.warn("[midtrans] charge refused, using store QRIS:", res.status, data.status_code, data.status_message);
      return storeQrisCharge(params.orderNumber, params.amount, expiresAt, false);
    }
    return {
      gatewayRef: data.transaction_id ?? params.orderNumber,
      qrString: data.qr_string,
      qrDataUrl: await renderQr(data.qr_string),
      expiresAt,
      simulated: false,
    };
  } catch (err) {
    console.error("[midtrans] charge network error, using store QRIS:", err);
    return storeQrisCharge(params.orderNumber, params.amount, expiresAt, false);
  }
}

/** Re-render a stored QRIS string (page refresh before payment). */
export async function renderQr(qrString: string): Promise<string> {
  if (/^(https?:|data:image)/.test(qrString)) return qrString;
  return QRCode.toDataURL(qrString, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 560,
    color: { dark: "#0B0B0F", light: "#FFFFFF" },
  });
}

/** Active status polling from Midtrans API (used when the webhook is late or missing). */
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
      headers: { Accept: "application/json", Authorization: authHeader() },
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
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${config.midtrans.serverKey}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(payload.signature_key);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
