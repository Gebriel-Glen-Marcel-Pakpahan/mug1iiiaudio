import { listAudit } from "@/lib/repo";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log" };

const DOT = { info: "bg-signal-ok", warn: "bg-signal-warn", critical: "bg-signal-bad" } as const;

export default async function AdminAuditPage() {
  const entries = await listAudit(300);

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Keamanan · PRD §17.7</p>
        <h2 className="display mt-2 text-2xl text-ink">Audit log</h2>
        <p className="mt-2 max-w-xl text-[0.8125rem] leading-relaxed text-ink-mute">
          Semua perubahan status pembayaran, pemberian dan pencabutan akses Drive, serta keputusan
          refund. {entries.length} entri terbaru.
        </p>
      </header>

      <div className="plate overflow-x-auto">
        <table className="data-table min-w-[760px]">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Aksi</th>
              <th>Target</th>
              <th>Aktor</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[0.75rem] text-ink-faint">
                  Belum ada aktivitas.
                </td>
              </tr>
            )}
            {entries.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap font-mono text-[0.625rem] text-ink-faint">
                  {formatDateTime(a.at)}
                </td>
                <td className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-2 font-mono text-[0.6875rem] text-gold/85">
                    <span className={`h-1.5 w-1.5 rounded-full ${DOT[a.level]}`} aria-hidden />
                    <span className="sr-only">{a.level}</span>
                    {a.action}
                  </span>
                </td>
                <td className="whitespace-nowrap font-mono text-[0.6875rem]">{a.target}</td>
                <td className="max-w-[160px] truncate text-[0.75rem]">{a.actor}</td>
                <td className="text-[0.75rem] text-ink-mute">{a.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
