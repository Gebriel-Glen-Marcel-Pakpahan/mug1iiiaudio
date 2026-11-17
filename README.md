# MUG1III AUDIO — Toko Album High Audio

Implementasi PRD `PRD_Website_Jual_Album_High_Audio_FINAL.md` (Next.js 14 App Router + TypeScript + Tailwind).

## Menjalankan

```bash
npm install
npm run dev            # http://localhost:3000
npm run smoke          # (terminal lain) uji alur: login → keranjang → QRIS → webhook → akses Drive
```

Mode demo aktif otomatis saat `npm run dev` (lihat `.env.local`):

- **Login**: halaman `/masuk` menerima email Google apa pun (simulasi OAuth).
- **Admin**: masuk dengan `admin@mug1iii.audio` → `/admin` (atur lewat `ADMIN_EMAILS`).
- **Pembayaran**: di halaman QRIS, isi "Simulator webhook" dengan `demo-settle` (nilai `DEMO_WEBHOOK_SECRET`) untuk mensimulasikan pembayaran sukses.
- **Data**: tersimpan di `data/db.json` (hapus file untuk reset ke seed).

## Ke produksi

Salin `.env.example` → isi kredensial. Saat `NODE_ENV=production`, demo login & pembayaran palsu **mati** otomatis; `NEXTAUTH_SECRET` wajib.

| Integrasi | Env | Tanpa env |
|-----------|-----|-----------|
| Google OAuth | `GOOGLE_CLIENT_ID/SECRET` | login demo |
| Midtrans QRIS | `MIDTRANS_SERVER_KEY` | QR simulasi |
| Google Drive | `GDRIVE_SERVICE_ACCOUNT_JSON`, `GDRIVE_ROOT_FOLDER_ID` | izin simulasi |
| Email | `EMAIL_SMTP_URL` | outbox di admin |

> Penyimpanan `data/db.json` hanya untuk demo/satu server. Untuk Vercel (serverless) ganti `src/lib/db.ts` dengan PostgreSQL + Prisma sesuai PRD §7 — tipe di `src/lib/types.ts` sudah mengikuti skemanya.

## Struktur

- `src/app` — halaman publik, pembeli (`/keranjang`, `/checkout`, `/bayar/[id]`, `/pesanan`), admin (`/admin/*`), API (`/api/*`, PRD §9)
- `src/lib/repo.ts` — logika bisnis: checkout idempoten, webhook (signature + idempotensi), worker akses Drive, refund garansi 7 hari
- `src/lib/services` — Midtrans, Google Drive, email (live bila env diisi, simulasi bila kosong)
