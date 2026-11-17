import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { getOrderForUser, listOrdersForUser } from "@/lib/repo";
import { QrisRenderer } from "@/components/qris-renderer";
import { getStoredOrderById } from "@/lib/order-cookie";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pembayaran QRIS" };

export default async function BayarPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/masuk?next=/bayar/${params.id}`);

  const user = await getSessionUser();
  if (!user) redirect(`/masuk?next=/bayar/${params.id}`);

  let order = await getOrderForUser(params.id, user.id);

  if (!order) {
    const cookieOrder = getStoredOrderById(params.id);
    if (cookieOrder) {
      order = await getOrderForUser(params.id, user.id);
    }
  }

  if (!order) {
    // Check if user has any active pending order
    const userOrders = await listOrdersForUser(user.id);
    const activePending = userOrders.find((o) => o.status === "PENDING");
    if (activePending) {
      redirect(`/bayar/${activePending.id}`);
    }
    redirect("/pesanan");
  }

  return (
    <div className="shell py-14">
      <QrisRenderer order={order} />
    </div>
  );
}
