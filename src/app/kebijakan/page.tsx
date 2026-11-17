import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan & Garansi",
  description:
    "Kebijakan refund, garansi 7 hari, syarat dan ketentuan pembelian album digital di MUG1III AUDIO.",
};

export default function KebijakanPage() {
  return (
    <div className="shell py-14">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Legal</p>
        <h1 className="display mt-3 text-4xl text-ink md:text-5xl">Kebijakan & Garansi</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-mute">
          Terakhir diperbarui: 17 November 2026. Dokumen ini berlaku untuk semua pembelian album
          digital melalui MUG1III AUDIO.
        </p>

        <div className="mt-12 space-y-12">
          <section>
            <h2 className="font-display text-2xl text-ink">1. Sifat barang digital</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Album yang dijual berupa file audio digital. Karena file tidak dapat
              &quot;dikembalikan&quot; setelah diunduh, semua pembelian bersifat{" "}
              <strong className="text-ink">non-refundable</strong> setelah akses tautan terkirim ke
              email pembeli.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink">2. Garansi 7 hari</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Meskipun tidak ada refund umum, kami memberikan garansi selama 7 hari setelah
              pembayaran untuk kondisi berikut:
            </p>
            <ul className="mt-4 space-y-3">
              {[
                "Tautan tidak dapat diakses karena kesalahan kami (bukan karena kesalahan pembeli, misalnya salah login akun Google).",
                "File rusak atau tidak lengkap karena kesalahan penjual.",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-sm leading-relaxed text-ink-mute">
                  <span className="mt-2 h-1 w-1 shrink-0 bg-gold/70" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Untuk kondisi pertama, kami perbaiki dengan mengirim ulang akses atau memberikan izin
              baru. Jika masalah tidak dapat diperbaiki, kami memberikan{" "}
              <strong className="text-ink">refund penuh</strong> dan akses dicabut otomatis.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink">3. Cara mengajukan garansi</h2>
            <ol className="mt-4 space-y-3">
              {[
                "Buka halaman Pesanan Saya dan pilih pesanan terkait.",
                "Tekan Laporkan masalah dan jelaskan kendalanya secara rinci.",
                "Sertakan nomor pesanan jika menghubungi support lewat email atau WhatsApp.",
                "Admin meninjau maksimal 2×24 jam pada hari kerja.",
              ].map((t, i) => (
                <li key={t} className="flex gap-3 text-sm leading-relaxed text-ink-mute">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-white/15 font-mono text-[0.5rem] text-ink-faint">
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink">4. Biaya & Kontribusi Arsip</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Semua tarif yang ditampilkan merupakan tarif bersih Rp 500 per judul lagu untuk pemeliharaan cloud storage, kurasi file audio, dan operasional arsip digital. Tidak ada biaya tersembunyi.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink">5. Hak Cipta & Penggunaan Pribadi</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Seluruh hak cipta rekaman, lirik, dan karya musik sepenuhnya merupakan hak milik pencipta, musisi, dan label terkait. Pengunduhan arsip audio ini ditujukan khusus untuk koleksi dan penggunaan pribadi pendengar.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink">6. Keamanan akses</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Akses diberikan per alamat email Google dengan hak baca (<em>reader</em>). Kami tidak
              menggunakan tautan publik. Pelanggaran terhadap ketentuan ini dapat menyebabkan
              pencabutan izin akses secara permanen.
            </p>
          </section>
        </div>

        <div className="mt-14 border border-white/[0.08] bg-carbon-850 p-6">
          <p className="text-sm leading-relaxed text-ink-soft">
            Ada pertanyaan tentang kebijakan ini?{" "}
            <Link href="/kontak" className="text-gold-bright underline-offset-4 hover:underline">
              Hubungi tim support kami
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
