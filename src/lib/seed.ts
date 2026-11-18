import type { Album, DbShape, Order, Payment, DriveLink, Refund, User } from "./types";
import { ALBUM_SEEDS } from "./seed-data";
import { hashPassword } from "./password";

const DAY = 86_400_000;
const ago = (days: number, hours = 0) =>
  new Date(Date.now() - days * DAY - hours * 3_600_000).toISOString();

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const DEMO_ADMIN_EMAIL = "admin@mug1iii.audio";
export const DEMO_BUYER_EMAIL = "audiophile.demo@gmail.com";

/** Builds a populated demo database so every screen has realistic content. */
export function buildSeedDb(): DbShape {
  const albums: Album[] = ALBUM_SEEDS.map((s, i) => ({
    id: `alb_${String(i + 1).padStart(3, "0")}`,
    slug: s.slug || slugify(s.title),
    title: s.title,
    artist: s.artist,
    genre: s.genre,
    description: s.description,
    coverPalette: s.coverPalette,
    coverMark: s.coverMark,
    price: s.price,
    format: s.format,
    sampleRate: s.sampleRate,
    bitDepth: s.bitDepth,
    totalSizeMb: s.totalSizeMb,
    trackCount: s.trackCount,
    totalDuration: s.totalDuration,
    tracklist: s.tracklist,
    previewUrl: s.previewUrl,
    gdriveFolderId: s.gdriveFolderId || `1${Math.random().toString(36).slice(2, 12)}DrvFolder`,
    isPublished: true,
    featured: s.featured ?? false,
    createdAt: ago((s.daysAgo ?? 60) + i * 3),
    year: s.year,
    label: s.label,
    catalogueNo: s.catalogueNo,
  }));

  const users: User[] = [
    {
      id: "usr_admin",
      email: DEMO_ADMIN_EMAIL,
      name: "Admin MUG1III",
      avatarUrl: null,
      role: "ADMIN",
      createdAt: ago(400),
      passwordHash: hashPassword("admin123"),
    },
    {
      id: "usr_store_admin",
      email: "mugiiistore@gmail.com",
      name: "Owner MUG1III Store",
      avatarUrl: null,
      role: "ADMIN",
      createdAt: ago(400),
      passwordHash: hashPassword("admin123"),
    },
    {
      id: "usr_demo",
      email: DEMO_BUYER_EMAIL,
      name: "Rangga Prasetya",
      avatarUrl: null,
      role: "BUYER",
      createdAt: ago(92),
    },
    {
      id: "usr_2",
      email: "dinda.prameswari@gmail.com",
      name: "Dinda Prameswari",
      avatarUrl: null,
      role: "BUYER",
      createdAt: ago(64),
    },
    {
      id: "usr_3",
      email: "yusuf.hakim@gmail.com",
      name: "Yusuf Hakim",
      avatarUrl: null,
      role: "BUYER",
      createdAt: ago(31),
    },
  ];

  const pick = (slug: string) => albums.find((a) => a.slug === slug) ?? albums[0];

  type SeedOrder = {
    n: number;
    user: string;
    slugs: string[];
    status: Order["status"];
    payment: Payment["status"];
    access: Order["accessStatus"];
    daysAgo: number;
  };

  const seedOrders: SeedOrder[] = [
    {
      n: 1042,
      user: "usr_demo",
      slugs: ["sheila-on-7-musim-yang-baik"],
      status: "PAID",
      payment: "SUCCESS",
      access: "GRANTED",
      daysAgo: 2,
    },
  ];

  const orders: Order[] = [];
  const payments: Payment[] = [];
  const driveLinks: DriveLink[] = [];
  const refunds: Refund[] = [];

  seedOrders.forEach((so) => {
    const items = so.slugs.map((slug, idx) => {
      const album = pick(slug);
      return {
        id: `oi_${so.n}_${idx}`,
        orderId: `ord_${so.n}`,
        albumId: album.id,
        priceSnapshot: album.price,
      };
    });
    const total = items.reduce((sum, i) => sum + i.priceSnapshot, 0);
    const createdAt = ago(so.daysAgo, 3);
    const paidAt = so.status === "PAID" || so.status === "REFUNDED" ? ago(so.daysAgo, 2) : null;

    orders.push({
      id: `ord_${so.n}`,
      orderNumber: `ORD-2026${String(1100 + so.n).slice(-4)}-${String(so.n).slice(-4)}`,
      userId: so.user,
      totalAmount: total,
      taxAmount: 0,
      status: so.status,
      paymentStatus: so.payment,
      accessStatus: so.access,
      items,
      createdAt,
      paidAt,
    });

    payments.push({
      id: `pay_${so.n}`,
      orderId: `ord_${so.n}`,
      gateway: "midtrans",
      gatewayRef: `mid-${so.n}-${Math.random().toString(36).slice(2, 8)}`,
      qrString:
        so.payment === "PENDING"
          ? `00020101021226610014ID.CO.QRIS.WWW0118936000000000000000${so.n}5204000053033605802ID5915MUG1III AUDIO6007JAKARTA6304ABCD`
          : null,
      amount: total,
      status: so.payment,
      verifiedAt: so.payment === "SUCCESS" ? paidAt : null,
      createdAt,
      expiresAt: new Date(new Date(createdAt).getTime() + 15 * 60_000).toISOString(),
    });

    if (so.access === "GRANTED" || so.access === "FAILED") {
      items.forEach((item, idx) => {
        const album = albums.find((a) => a.id === item.albumId)!;
        const granted = so.access === "GRANTED";
        driveLinks.push({
          id: `dl_${so.n}_${idx}`,
          orderId: `ord_${so.n}`,
          albumId: album.id,
          folderId: album.gdriveFolderId,
          permissionId: granted ? `perm_${Math.random().toString(36).slice(2, 12)}` : "",
          linkUrl: `https://drive.google.com/drive/folders/${album.gdriveFolderId}`,
          isActive: granted,
          createdAt: paidAt ?? createdAt,
          revokedAt: null,
        });
      });
    }
  });

  refunds.push({
    id: "rfd_001",
    orderId: "ord_1047",
    reason:
      "Folder album tidak lengkap — track 6 dan 7 tidak ada saat saya buka, sepertinya file belum terunggah sempurna.",
    status: "DONE",
    requestedAt: ago(20),
    resolvedAt: ago(18),
    resolvedBy: DEMO_ADMIN_EMAIL,
    resolutionNote: "Terkonfirmasi file belum lengkap. Refund penuh diproses, akses dicabut.",
  });

  return {
    users,
    albums,
    cart: [],
    orders,
    payments,
    driveLinks,
    refunds,
    audit: [
      {
        id: "aud_001",
        at: ago(0, 1),
        actor: "system",
        action: "worker.retry",
        target: "ord_1044",
        detail: "Pemberian izin Drive gagal (503). Dijadwalkan ulang dengan backoff eksponensial.",
        level: "warn",
      },
      {
        id: "aud_002",
        at: ago(18),
        actor: DEMO_ADMIN_EMAIL,
        action: "refund.approved",
        target: "ord_1047",
        detail: "Refund garansi disetujui. 2 izin Drive dicabut, email pemberitahuan terkirim.",
        level: "critical",
      },
      {
        id: "aud_003",
        at: ago(21),
        actor: "system",
        action: "access.granted",
        target: "ord_1047",
        detail: "Izin reader diberikan untuk 1 album.",
        level: "info",
      },
      {
        id: "aud_004",
        at: ago(9),
        actor: "system",
        action: "payment.settled",
        target: "ord_1043",
        detail: "Webhook Midtrans tervalidasi (signature OK). Order ditandai PAID.",
        level: "info",
      },
    ],
  };
}
