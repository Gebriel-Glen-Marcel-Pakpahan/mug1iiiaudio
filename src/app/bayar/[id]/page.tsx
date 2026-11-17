import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { getOrderForUser } from "@/lib/repo";
import { QrisRenderer } from "@/components/qris-renderer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pembayaran QRIS" };

export default async function BayarPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/masuk?next=/bayar/${params.id}`);

  const user = await getSessionUser();
  if (!user) redirect(`/masuk?next=/bayar/${params.id}`);

  const order = await getOrderForUser(params.id, user.id);
  if (!order) notFound();

  return (
    <div className="shell py-14">
      <QrisRenderer order={order} />
    </div>
  );
}
