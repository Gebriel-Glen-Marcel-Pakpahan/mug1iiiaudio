import { listAlbums } from "@/lib/repo";
import { formatIDR, formatSize } from "@/lib/utils";
import { AdminAlbumManager } from "@/components/admin/album-manager";

export const dynamic = "force-dynamic";

export default async function AdminAlbumsPage() {
  const albums = await listAlbums({ includeUnpublished: true });

  return (
    <AdminAlbumManager
      albums={albums.map((a) => ({
        id: a.id,
        title: a.title,
        artist: a.artist,
        genre: a.genre,
        price: a.price,
        format: a.format,
        sampleRate: a.sampleRate,
        bitDepth: a.bitDepth,
        trackCount: a.trackCount,
        totalSizeMb: a.totalSizeMb,
        isPublished: a.isPublished,
        gdriveFolderId: a.gdriveFolderId,
        priceLabel: formatIDR(a.price),
        sizeLabel: formatSize(a.totalSizeMb),
      }))}
    />
  );
}
