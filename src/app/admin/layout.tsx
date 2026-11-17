import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/masuk?next=/admin");
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/");

  return (
    <div className="shell py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <p className="eyebrow">Panel admin</p>
          <h1 className="display mt-2 text-3xl text-ink md:text-4xl">Operasional toko</h1>
        </div>
        <p className="font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
          Masuk sebagai {user.email}
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[190px_1fr] lg:gap-12">
        <AdminNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
