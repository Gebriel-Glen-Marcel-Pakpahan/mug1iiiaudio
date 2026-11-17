import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { getCartView } from "@/lib/repo";
import { CartView } from "@/components/cart-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Keranjang" };

export default async function KeranjangPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/masuk?next=/keranjang");

  const user = await getSessionUser();
  if (!user) redirect("/masuk?next=/keranjang");

  const cart = await getCartView(user.id);

  return (
    <div className="shell py-14">
      <div className="mb-10">
        <p className="eyebrow">Langkah 1 dari 3</p>
        <h1 className="display mt-3 text-4xl text-ink md:text-5xl">Keranjang</h1>
      </div>
      <CartView
        items={cart.items.map((i) => ({
          id: i.id,
          albumId: i.album.id,
          slug: i.album.slug,
          title: i.album.title,
          artist: i.album.artist,
          price: i.album.price,
          format: i.album.format,
          sampleRate: i.album.sampleRate,
          bitDepth: i.album.bitDepth,
          totalSizeMb: i.album.totalSizeMb,
          palette: i.album.coverPalette,
          mark: i.album.coverMark,
          catalogueNo: i.album.catalogueNo,
        }))}
        subtotal={cart.subtotal}
        email={user.email}
      />
    </div>
  );
}
