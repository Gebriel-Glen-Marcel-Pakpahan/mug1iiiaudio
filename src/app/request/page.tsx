import { listAlbumRequests } from "@/lib/repo";
import { AlbumRequestPanel } from "@/components/album-request-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Request Album — MUG1III AUDIO",
  description:
    "Mencari album musik lossless yang belum ada di katalog? Ajukan permintaan album FLAC 24-bit pilihan Anda ke kurator MUG1III.",
};

export default async function RequestPage() {
  const requests = await listAlbumRequests();

  return (
    <div className="shell py-12 md:py-16">
      {/* Hero Header */}
      <div className="mb-12 max-w-2xl">
        <p className="eyebrow">Layanan Pencarian Arsip</p>
        <h1 className="display mt-2 text-3xl text-ink md:text-5xl">
          Request Album Musik
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-mute md:text-base">
          Mencari album spesifik yang belum tersedia di katalog kami? Beritahu kami judul album, musisi,
          atau edisi rilis yang Anda cari. Kurator MUG1III AUDIO akan mencarikan master file audio FLAC murni
          tanpa kompresi untuk Anda.
        </p>
      </div>

      {/* Main Request Form & Community Board */}
      <AlbumRequestPanel initialRequests={requests} />
    </div>
  );
}
