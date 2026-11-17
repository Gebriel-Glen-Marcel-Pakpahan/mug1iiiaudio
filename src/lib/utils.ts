import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatIDR = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export const formatIDRPlain = (amount: number) =>
  new Intl.NumberFormat("id-ID").format(amount);

export const formatDate = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(iso))
    : "—";

export const formatDateTime = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : "—";

export const formatSize = (mb: number) =>
  mb >= 1024 ? `${(mb / 1024).toFixed(mb >= 10240 ? 0 : 1)} GB` : `${mb} MB`;

export const maskEmail = (email: string) => {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(user.length - 2, 3))}@${domain}`;
};

export const statusTone = {
  PENDING: "warn",
  PAID: "ok",
  CANCELLED: "bad",
  REFUNDED: "info",
  GRANTED: "ok",
  GRANTING: "warn",
  FAILED: "bad",
  SUCCESS: "ok",
  REQUESTED: "warn",
  APPROVED: "info",
  REJECTED: "bad",
  DONE: "ok",
} as const;

export const statusLabel: Record<string, string> = {
  PENDING: "Menunggu",
  PAID: "Lunas",
  CANCELLED: "Dibatalkan",
  REFUNDED: "Refund",
  GRANTING: "Mengirim akses",
  GRANTED: "Akses aktif",
  FAILED: "Gagal",
  SUCCESS: "Berhasil",
  REQUESTED: "Diajukan",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  DONE: "Selesai",
};
