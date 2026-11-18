import tls from "node:tls";
import nodemailer from "nodemailer";
import { config, isDemo } from "../config";
import type { OrderView } from "../types";

export interface SentEmail {
  to: string;
  subject: string;
  preview: string;
  sentAt: string;
  simulated: boolean;
}

/** Outbox kept in memory for the demo admin panel ("Email terkirim"). */
const g = globalThis as typeof globalThis & { __mugOutbox?: SentEmail[] };
if (!g.__mugOutbox) g.__mugOutbox = [];

export function getOutbox(): SentEmail[] {
  return g.__mugOutbox!;
}

export function pushOutbox(email: SentEmail) {
  g.__mugOutbox!.unshift(email);
  if (g.__mugOutbox!.length > 60) g.__mugOutbox!.length = 60;
}

const rupiah = (n: number) => new Intl.NumberFormat("id-ID").format(n);

let transporter: nodemailer.Transporter | null = null;

function parseSmtpCredentials(): { user: string; pass: string } | null {
  try {
    if (!config.email.smtpUrl) return null;
    const u = new URL(config.email.smtpUrl);
    const user = decodeURIComponent(u.username);
    const pass = decodeURIComponent(u.password);
    if (!user || !pass) return null;
    return { user, pass };
  } catch {
    return null;
  }
}

function resolveFromAddress(): string {
  const creds = parseSmtpCredentials();
  if (config.email.from.includes("@")) return config.email.from;
  if (creds?.user) return `${config.email.from} <${creds.user}>`;
  return config.email.from;
}

function getTransporter() {
  if (!transporter && config.email.smtpUrl) {
    transporter = nodemailer.createTransport(config.email.smtpUrl);
  }
  return transporter;
}

export function buildAccessEmail(order: OrderView, albums: { title: string; linkUrl: string }[]) {
  const subject = `Akses album Anda siap — ${order.orderNumber}`;
  const lines = albums.map((a) => `• ${a.title}\n  ${a.linkUrl}`).join("\n\n");
  const preview = [
    `Halo ${order.userEmail.split("@")[0]},`,
    ``,
    `Pembayaran untuk pesanan ${order.orderNumber} sudah kami terima.`,
    `Buka tautan di bawah ini dengan akun Google yang sama saat checkout:`,
    ``,
    lines,
    ``,
    `Total: Rp ${rupiah(order.totalAmount)} (Rp 500/lagu)`,
    ``,
    `Akses berlaku permanen di Google Drive Anda.`,
    `Butuh bantuan? WhatsApp: ${config.brand.supportWhatsapp} atau Discord: ${config.brand.supportDiscord}`,
    ``,
    `— ${config.brand.name}`,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0B0B0F; color: #EDEDED; padding: 32px; border: 1px solid rgba(212,175,55,0.2);">
      <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; margin-bottom: 24px;">
        <h1 style="color: #D4AF37; font-size: 20px; margin: 0; letter-spacing: 0.1em; text-transform: uppercase;">MUG1III AUDIO</h1>
        <p style="color: #8E8EA0; font-size: 12px; margin: 4px 0 0 0;">Arsip Digital Musik Lossless FLAC 24-bit</p>
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #EDEDED;">Halo <strong>${order.userEmail.split("@")[0]}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #A1A1AA;">
        Pembayaran untuk pesanan <strong style="color: #F6E05E; font-family: monospace;">${order.orderNumber}</strong> sebesar <strong>Rp ${rupiah(order.totalAmount)}</strong> telah berhasil kami terima.
      </p>

      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 20px; margin: 24px 0;">
        <h3 style="color: #D4AF37; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 16px 0;">Folder Google Drive Anda:</h3>
        ${albums
          .map(
            (a) => `
          <div style="margin-bottom: 16px;">
            <div style="font-weight: 600; font-size: 14px; color: #FFFFFF;">${a.title}</div>
            <a href="${a.linkUrl}" target="_blank" style="display: inline-block; margin-top: 8px; background: #D4AF37; color: #0B0B0F; font-weight: 600; text-decoration: none; padding: 8px 16px; font-size: 12px; border-radius: 2px;">
              Buka Folder di Google Drive &rarr;
            </a>
          </div>
        `,
          )
          .join("")}
      </div>

      <p style="font-size: 12px; line-height: 1.6; color: #71717A;">
        <strong>Catatan Unduhan:</strong> Pastikan Anda membuka tautan di atas saat sedang masuk dengan email <code>${order.userEmail}</code>. File master FLAC 24-bit dapat diunduh tanpa batas.
      </p>

      <div style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 32px; padding-top: 20px; font-size: 12px; color: #71717A;">
        <p style="margin: 0;">Butuh bantuan? Hubungi WhatsApp: <a href="https://wa.me/6285973023210" style="color: #D4AF37;">+6285973023210</a> atau Discord: <a href="https://discord.gg/BYpDGbez9" style="color: #D4AF37;">Komunitas</a></p>
      </div>
    </div>
  `;

  return { subject, preview, html };
}

/**
 * Transactional email (PRD §8.1 step 23–24).
 * Live delivery uses Nodemailer via EMAIL_SMTP_URL; fallback records in memory outbox.
 */
export async function sendAccessEmail(order: OrderView, albums: { title: string; linkUrl: string }[]) {
  const { subject, preview, html } = buildAccessEmail(order, albums);

  if (config.email.isConfigured && order.userEmail && order.userEmail.includes("@")) {
    try {
      const mailer = getTransporter();
      if (mailer) {
        await mailer.sendMail({
          from: resolveFromAddress(),
          to: order.userEmail,
          subject,
          text: preview,
          html,
        });
        pushOutbox({
          to: order.userEmail,
          subject,
          preview,
          sentAt: new Date().toISOString(),
          simulated: false,
        });
        return { delivered: true, simulated: false };
      }
    } catch (err) {
      console.error("Gagal mengirim email via SMTP:", err);
    }
  }

  // Simulated fallback
  pushOutbox({
    to: order.userEmail,
    subject,
    preview,
    sentAt: new Date().toISOString(),
    simulated: true,
  });
  return { delivered: true, simulated: true };
}

/**
 * Checks the store's Gmail inbox via IMAP (imap.gmail.com:993) for a genuine incoming
 * QRIS / DANA / Bank / Midtrans payment notification arriving after the order was created.
 */
export async function checkImapPaymentNotification(params: {
  orderNumber: string;
  amount: number;
  createdAt: string;
}): Promise<boolean> {
  const creds = parseSmtpCredentials();
  if (!creds) return false;

  const amountPlain = String(params.amount);
  const amountFormatted = rupiah(params.amount); // e.g. "4.500" or "10.000"
  // Allow 3 minutes clock-skew tolerance between server time and payment timestamp
  const orderCreatedMs = new Date(params.createdAt).getTime() - 180_000;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (val: boolean) => {
      if (settled) return;
      settled = true;
      try {
        sock.destroy();
      } catch {
        /* ignore */
      }
      resolve(val);
    };

    const timer = setTimeout(() => finish(false), 4500);
    const sock = tls.connect({ host: "imap.gmail.com", port: 993, servername: "imap.gmail.com" });

    let step = 0;
    let buf = "";

    sock.on("error", () => {
      clearTimeout(timer);
      finish(false);
    });

    sock.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      if (step === 0 && buf.includes("OK")) {
        step = 1;
        buf = "";
        sock.write(`A1 LOGIN "${creds.user}" "${creds.pass}"\r\n`);
      } else if (step === 1 && (buf.includes("A1 OK") || buf.includes("A1 NO") || buf.includes("A1 BAD"))) {
        if (!buf.includes("A1 OK")) {
          clearTimeout(timer);
          return finish(false);
        }
        step = 2;
        buf = "";
        sock.write("A2 SELECT INBOX\r\n");
      } else if (step === 2 && buf.includes("A2 OK")) {
        const existsMatch = buf.match(/\*\s+(\d+)\s+EXISTS/i);
        const totalMsgs = existsMatch ? Number(existsMatch[1]) : 0;
        if (totalMsgs === 0) {
          clearTimeout(timer);
          return finish(false);
        }
        const startSeq = Math.max(1, totalMsgs - 19);
        step = 3;
        buf = "";
        // Fetch headers + top 3000 bytes of MIME body to catch both plain-text and HTML emails
        sock.write(`A3 FETCH ${startSeq}:${totalMsgs} (INTERNALDATE BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)] BODY.PEEK[]<0.3000>)\r\n`);
      } else if (step === 3 && (buf.includes("A3 OK") || buf.includes("A3 NO") || buf.includes("A3 BAD"))) {
        clearTimeout(timer);
        const raw = buf;
        const blocks = raw.split(/\*\s+\d+\s+FETCH/i).slice(1);
        for (const blk of blocks) {
          const dateMatch = blk.match(/INTERNALDATE\s+"([^"]+)"/i);
          if (dateMatch) {
            const msgMs = new Date(dateMatch[1]).getTime();
            if (!Number.isNaN(msgMs) && msgMs < orderCreatedMs) continue;
          }
          const lower = blk.toLowerCase();
          // Must come from a recognized payment/e-wallet/bank/QRIS notification
          const isPaymentNotice =
            lower.includes("dana") ||
            lower.includes("espay") ||
            lower.includes("qris") ||
            lower.includes("midtrans") ||
            lower.includes("gopay") ||
            lower.includes("bca") ||
            lower.includes("mandiri") ||
            lower.includes("livin") ||
            lower.includes("bri") ||
            lower.includes("brimo") ||
            lower.includes("bni") ||
            lower.includes("seabank") ||
            lower.includes("jago") ||
            lower.includes("shopeepay") ||
            lower.includes("ovo") ||
            lower.includes("transfer");

          const hasSuccessWord =
            lower.includes("berhasil") ||
            lower.includes("diterima") ||
            lower.includes("masuk") ||
            lower.includes("settlement") ||
            lower.includes("paid") ||
            lower.includes("lunas") ||
            lower.includes("sukses") ||
            lower.includes("terima") ||
            lower.includes("penerimaan") ||
            lower.includes("received");

          const hasAmountOrOrder =
            blk.includes(params.orderNumber) ||
            blk.includes(`Rp${amountFormatted}`) ||
            blk.includes(`Rp ${amountFormatted}`) ||
            blk.includes(`IDR ${amountFormatted}`) ||
            blk.includes(`Rp${amountPlain}`) ||
            blk.includes(`Rp ${amountPlain}`) ||
            blk.includes(amountFormatted);

          if (isPaymentNotice && hasSuccessWord && hasAmountOrOrder) {
            return finish(true);
          }
        }
        return finish(false);
      }
    });
  });
}

export async function sendRefundEmail(order: OrderView, note: string) {
  const subject = `Refund diproses — ${order.orderNumber}`;
  const preview = [
    `Halo ${order.userEmail.split("@")[0]},`,
    ``,
    `Permintaan garansi untuk pesanan ${order.orderNumber} telah kami setujui.`,
    `Akses ke folder album sudah dicabut dan refund penuh sedang diproses.`,
    ``,
    `Catatan: ${note}`,
    ``,
    `— ${config.brand.name}`,
  ].join("\n");

  if (config.email.isConfigured) {
    try {
      const mailer = getTransporter();
      if (mailer) {
        await mailer.sendMail({
          from: config.email.from,
          to: order.userEmail,
          subject,
          text: preview,
        });
      }
    } catch {
      /* ignore */
    }
  }

  pushOutbox({
    to: order.userEmail,
    subject,
    preview,
    sentAt: new Date().toISOString(),
    simulated: !config.email.isConfigured,
  });
  return { delivered: true };
}
