import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SignInPanel } from "@/components/sign-in-panel";
import { config } from "@/lib/config";

export const metadata = { title: "Masuk" };

export default async function MasukPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect(searchParams.next || "/");

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grain" />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(212,175,55,0.10) 0%, transparent 65%)",
        }}
      />
      <div className="shell relative flex min-h-[calc(100vh-72px)] items-center justify-center py-16">
        <SignInPanel
          next={searchParams.next || "/"}
          googleConfigured={config.auth.googleConfigured}
          demoEnabled={config.auth.demoLoginEnabled}
        />
      </div>
    </div>
  );
}
