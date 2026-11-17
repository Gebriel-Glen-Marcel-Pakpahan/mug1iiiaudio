/**
 * Domain types — mirror the Prisma schema in PRD §7.1.
 * Keeping these in one place lets the demo JSON store and a future
 * Prisma/Postgres repository share the same shapes.
 */

export type Role = "BUYER" | "ADMIN";
export type AudioFormat = "FLAC" | "WAV" | "ALAC" | "DSD";
export type OrderStatus = "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
export type AccessStatus = "PENDING" | "GRANTING" | "GRANTED" | "FAILED";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
export type RefundStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "DONE";

export interface Track {
  no: number;
  title: string;
  duration: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  passwordHash?: string | null;
  role: Role;
  createdAt: string;
}

export interface Album {
  id: string;
  slug: string;
  title: string;
  artist: string;
  genre: string;
  description: string;
  /** CSS gradient + generated artwork token, no external assets needed in demo. */
  coverPalette: [string, string, string];
  coverMark: string;
  price: number; // IDR integer
  format: AudioFormat;
  sampleRate: string;
  bitDepth: string;
  totalSizeMb: number;
  trackCount: number;
  totalDuration: string;
  tracklist: Track[];
  previewUrl: string | null;
  gdriveFolderId: string;
  isPublished: boolean;
  featured?: boolean;
  createdAt: string;
  /** editorial metadata for the storefront */
  year: number;
  label: string;
  catalogueNo: string;
}

export interface CartItem {
  id: string;
  userId: string;
  albumId: string;
  addedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  albumId: string;
  priceSnapshot: number;
}

export interface Payment {
  id: string;
  orderId: string;
  gateway: "midtrans";
  gatewayRef: string | null;
  qrString: string | null;
  amount: number;
  status: PaymentStatus;
  rawPayload?: unknown;
  verifiedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface DriveLink {
  id: string;
  orderId: string;
  albumId: string;
  folderId: string;
  permissionId: string;
  linkUrl: string;
  isActive: boolean;
  createdAt: string;
  revokedAt: string | null;
}

export interface Order {
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
}

export interface Refund {
  id: string;
  orderId: string;
  reason: string;
  status: RefundStatus;
  requestedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote?: string | null;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  level: "info" | "warn" | "critical";
}

export type AlbumRequestStatus = "PENDING" | "SEARCHING" | "FULFILLED" | "REJECTED";

export interface AlbumRequest {
  id: string;
  userId?: string | null;
  userEmail: string;
  userContact?: string | null;
  albumTitle: string;
  artist: string;
  year?: string | null;
  formatPreference?: string | null;
  notes?: string | null;
  status: AlbumRequestStatus;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbShape {
  users: User[];
  albums: Album[];
  cart: CartItem[];
  orders: Order[];
  payments: Payment[];
  driveLinks: DriveLink[];
  refunds: Refund[];
  audit: AuditEntry[];
  requests?: AlbumRequest[];
}

export interface OrderView extends Order {
  albumTitles: string[];
  userEmail: string;
  payment: Payment | null;
  driveLinks: DriveLink[];
  refund: Refund | null;
}

export const FORMAT_LABEL: Record<AudioFormat, string> = {
  FLAC: "FLAC",
  WAV: "WAV",
  ALAC: "ALAC",
  DSD: "DSD",
};
