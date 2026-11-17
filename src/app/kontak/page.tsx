import type { Metadata } from "next";
import { Clock, MessageCircle } from "lucide-react";
import { config } from "@/lib/config";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Kontak",
  description: "Hubungi tim support MUG1III AUDIO lewat WhatsApp atau Discord.",
};

export default function KontakPage() {
  return (
    <div className="shell py-14">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="eyebrow">Dukungan</p>
          <h1 className="display mt-3 text-4xl text-ink md:text-5xl">
            Ada yang bisa
            <br />
            kami bantu?
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-mute">
            Untuk masalah akses, sebutkan nomor pesanan agar kami bisa menelusuri lebih cepat.
            Pertanyaan umum mungkin sudah terjawab di FAQ.
          </p>

          <div className="mt-9 space-y-3">
            <a
              href={`https://wa.me/${config.brand.supportWhatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card flex items-center gap-4 p-4 transition-colors hover:border-gold/30"
            >
              <span className="flex h-9 w-9 items-center justify-center border border-gold/30 bg-gold/[0.06] text-gold">
                <MessageCircle size={15} />
              </span>
              <span>
                <span className="block font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
                  WhatsApp
                </span>
                <span className="mt-0.5 block text-sm text-ink-soft">
                  {config.brand.supportWhatsapp}
                </span>
              </span>
            </a>

            <a
              href={config.brand.supportDiscord}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card flex items-center gap-4 p-4 transition-colors hover:border-gold/30"
            >
              <span className="flex h-9 w-9 items-center justify-center border border-gold/30 bg-gold/[0.06] text-gold">
                #
              </span>
              <span>
                <span className="block font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
                  Discord
                </span>
                <span className="mt-0.5 block text-sm text-ink-soft">
                  Server Komunitas MUG1III
                </span>
              </span>
            </a>

            <div className="glass-card flex items-center gap-4 p-4">
              <span className="flex h-9 w-9 items-center justify-center border border-white/12 text-ink-mute">
                <Clock size={15} />
              </span>
              <span>
                <span className="block font-mono text-[0.5rem] uppercase tracking-label text-ink-faint">
                  Jam operasional
                </span>
                <span className="mt-0.5 block text-sm text-ink-soft">{config.brand.supportHours}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 md:p-8">
          <h2 className="font-display text-2xl text-ink">Kirim pesan</h2>
          <p className="mt-2 text-sm text-ink-mute">
            Kami membalas pada hari kerja, biasanya dalam beberapa jam.
          </p>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
