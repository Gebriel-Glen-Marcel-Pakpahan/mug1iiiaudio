import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Accordion } from "@/components/accordion";
import { config } from "@/lib/config";

export const metadata = {
  title: "FAQ",
  description: "Pertanyaan umum tentang pembelian, akses Google Drive, garansi, dan format file.",
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Belum menerima email berisi tautan?",
    a: (
      <>
        Cek folder spam atau promosi terlebih dahulu. Tautan juga selalu tersedia di halaman{" "}
        <Link href="/pesanan" className="text-gold-bright underline-offset-4 hover:underline">
          Pesanan Saya
        </Link>{" "}
        begitu pembayaran terverifikasi — tidak perlu menunggu email.
      </>
    ),
  },
  {
    q: "Tautan tidak bisa dibuka?",
    a: (
      <>
        Pastikan Anda masuk ke Google dengan <strong className="text-ink-soft">email yang sama</strong>{" "}
        seperti saat checkout. Izin diberikan per alamat email, bukan tautan publik. Jika email sudah
        benar tetapi tetap gagal, ajukan garansi lewat halaman detail pesanan.
      </>
    ),
  },
  {
    q: "Mengapa wajib akun Google?",
    a: (
      <>
        Karena file tidak di-hosting di server kami. Setiap album disimpan sebagai folder di Google
        Drive dan izin baca diberikan langsung ke akun Google Anda — bukan tautan publik yang bisa
        dibagikan ke siapa pun.
      </>
    ),
  },
  {
    q: "Akun Google saya tidak bisa mengakses Drive — bagaimana?",
    a: (
      <>
        Beberapa akun Google Workspace menonaktifkan Drive untuk penggunanya. Akun seperti ini tidak
        dapat diberi izin. Hubungi support <strong className="text-ink-soft">sebelum checkout</strong>{" "}
        agar kami bantu verifikasi, karena email tidak dapat diganti setelah pembayaran.
      </>
    ),
  },
  {
    q: "Bisa mengganti email setelah checkout?",
    a: "Tidak. Demi keamanan, email penerima akses dikunci saat pembayaran. Periksa kembali email Anda di halaman checkout sebelum menekan Bayar dengan QRIS.",
  },
  {
    q: "Berapa kali saya bisa mengunduh?",
    a: "Tanpa batas, selama izin akses aktif. Anda dapat membuka folder dan mengunduh ulang kapan saja, di perangkat mana pun, dengan akun Google yang sama.",
  },
  {
    q: "Apakah bisa refund?",
    a: (
      <>
        Barang digital bersifat non-refundable setelah akses terkirim. Garansi 7 hari berlaku jika
        tautan rusak atau file tidak lengkap karena kesalahan kami — lihat{" "}
        <Link href="/kebijakan" className="text-gold-bright underline-offset-4 hover:underline">
          Kebijakan & Garansi
        </Link>
        .
      </>
    ),
  },
  {
    q: "Perangkat apa yang mendukung file saya?",
    a: (
      <>
        FLAC didukung Android, Windows, macOS, dan sebagian besar pemutar. WAV universal. ALAC
        optimal di iPhone, iPad, dan macOS. DSD memerlukan DAC serta pemutar khusus seperti
        Foobar2000, JRiver, atau HiBy. Detail lengkap ada di{" "}
        <Link href="/cara-unduh" className="text-gold-bright underline-offset-4 hover:underline">
          Cara Mengunduh
        </Link>
        .
      </>
    ),
  },
  {
    q: "Bagaimana pembayaran dilakukan?",
    a: "Kami hanya menerima QRIS melalui Midtrans. Setelah menekan Bayar dengan QRIS, kode QR muncul dan dapat dipindai dari m-banking atau e-wallet apa pun yang mendukung QRIS. Kode berlaku 15 menit.",
  },
];

export default function FaqPage() {
  return (
    <div className="shell py-14">
      <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">Dukungan</p>
          <h1 className="display mt-3 text-4xl text-ink md:text-5xl">Pertanyaan umum</h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-mute">
            Hal-hal yang paling sering ditanyakan tentang pembelian, akses file, dan garansi.
          </p>

          <div className="mt-8 space-y-3">
            <a
              href={`https://wa.me/${config.brand.supportWhatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card flex items-center gap-3 p-3.5 transition-colors hover:border-gold/30"
            >
              <MessageCircle size={15} className="text-gold" />
              <span className="text-sm text-ink-soft">WhatsApp: {config.brand.supportWhatsapp}</span>
            </a>
            <a
              href={config.brand.supportDiscord}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card flex items-center gap-3 p-3.5 transition-colors hover:border-gold/30"
            >
              <span className="font-mono text-sm font-semibold text-gold">#</span>
              <span className="text-sm text-ink-soft">Discord Server Komunitas</span>
            </a>
          </div>

          <p className="mt-5 font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
            {config.brand.supportHours}
          </p>
        </div>

        <div>
          <Accordion items={FAQS} />
        </div>
      </div>
    </div>
  );
}
