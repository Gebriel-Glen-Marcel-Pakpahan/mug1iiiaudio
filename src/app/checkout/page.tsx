import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { getCartView } from "@/lib/repo";
import { readDb } from "@/lib/db";
import { CheckoutView } from "@/components/checkout-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams?: { albumId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/masuk?next=/checkout${searchParams?.albumId ? `?albumId=${searchParams.albumId}` : ""}`);
  }

  const user = await getSessionUser();
  if (!user) {
    redirect(`/masuk?next=/checkout${searchParams?.albumId ? `?albumId=${searchParams.albumId}` : ""}`);
  }

  let items: {
    id: string;
    albumId: string;
    title: string;
    artist: string;
    price: number;
    format: string;
    sampleRate: string;
    bitDepth: string;
  }[] = [];
  let subtotal = 0;

  // Direct checkout if albumId query param is present
  if (searchParams?.albumId) {
    const db = await readDb();
    const album = db.albums.find((a) => a.id === searchParams.albumId && a.isPublished);
    if (album) {
      items = [
        {
          id: `direct_${album.id}`,
          albumId: album.id,
          title: album.title,
          artist: album.artist,
          price: album.price,
          format: album.format,
          sampleRate: album.sampleRate,
          bitDepth: album.bitDepth,
        },
      ];
      subtotal = album.price;
    }
  }

  // Fallback to cart if not direct or album not found
  if (!items.length) {
    const cart = await getCartView(user.id);
    if (!cart.items.length) redirect("/keranjang");
    items = cart.items.map((i) => ({
      id: i.id,
      albumId: i.album.id,
      title: i.album.title,
      artist: i.album.artist,
      price: i.album.price,
      format: i.album.format,
      sampleRate: i.album.sampleRate,
      bitDepth: i.album.bitDepth,
    }));
    subtotal = cart.subtotal;
  }

  return (
    <div className="shell py-14">
      <div className="mb-10">
        <p className="eyebrow">Langkah 2 dari 3</p>
        <h1 className="display mt-3 text-4xl text-ink md:text-5xl">Konfirmasi checkout</h1>
      </div>

      <CheckoutView
        email={user.email}
        name={user.name}
        subtotal={subtotal}
        items={items}
        directAlbumId={searchParams?.albumId}
      />
    </div>
  );
}
