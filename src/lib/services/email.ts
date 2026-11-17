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

  if (config.email.isConfigured) {
    try {
      const mailer = getTransporter();
      if (mailer) {
        await mailer.sendMail({
          from: config.email.from,
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
