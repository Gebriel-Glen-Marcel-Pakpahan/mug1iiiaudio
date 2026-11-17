import { listAlbumRequests } from "@/lib/repo";
import { AdminRequestsTable } from "@/components/admin/admin-requests-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kelola Request Album — Admin" };

export default async function AdminRequestsPage() {
  const requests = await listAlbumRequests();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="display text-2xl text-ink">Permintaan Album Pelanggan</h2>
          <p className="font-mono text-2xs uppercase tracking-label text-ink-mute">
            Total {requests.length} permintaan masuk dari pelanggan
          </p>
        </div>
      </div>

      <AdminRequestsTable initialRequests={requests} />
    </div>
  );
}
