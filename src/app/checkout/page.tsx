import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { getCartView } from "@/lib/repo";
import { CheckoutView } from "@/components/checkout-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/masuk?next=/checkout");

  const user = await getSessionUser();
  if (!user) redirect("/masuk?next=/checkout");

  const cart = await getCartView(user.id);
  if (!cart.items.length) redirect("/keranjang");

  return (
    <div className="shell py-14">
      <div className="mb-10">
        <p className="eyebrow">Langkah 2 dari 3</p>
        <h1 className="display mt-3 text-4xl text-ink md:text-5xl">Konfirmasi checkout</h1>
      </div>

      <CheckoutView
        email={user.email}
        name={user.name}
        subtotal={cart.subtotal}
        items={cart.items.map((i) => ({
          id: i.id,
          title: i.album.title,
          artist: i.album.artist,
          price: i.album.price,
          format: i.album.format,
          sampleRate: i.album.sampleRate,
          bitDepth: i.album.bitDepth,
        }))}
      />
    </div>
  );
}
