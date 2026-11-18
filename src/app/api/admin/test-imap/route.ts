import { NextResponse } from "next/server";
import tls from "node:tls";
import { config } from "@/lib/config";
import { jsonError, requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    if (!config.email.smtpUrl) {
      return NextResponse.json({ error: "EMAIL_SMTP_URL belum dikonfigurasi di Vercel." }, { status: 400 });
    }

    const u = new URL(config.email.smtpUrl);
    const user = decodeURIComponent(u.username);
    const pass = decodeURIComponent(u.password);

    return new Promise<NextResponse>((resolve) => {
      let settled = false;
      const logs: string[] = [];
      const messages: { date: string; subject: string; from: string; snippet: string }[] = [];

      const finish = (result: unknown) => {
        if (settled) return;
        settled = true;
        try {
          sock.destroy();
        } catch {
          /* ignore */
        }
        resolve(NextResponse.json(result));
      };

      const timer = setTimeout(() => {
        finish({
          success: false,
          error: "IMAP Connection Timeout (4.5s). Port 993 mungkin dibatasi atau koneksi lambat.",
          logs,
        });
      }, 5000);

      logs.push(`Connecting to imap.gmail.com:993 as ${user}...`);
      const sock = tls.connect({ host: "imap.gmail.com", port: 993, servername: "imap.gmail.com" });

      let step = 0;
      let buf = "";

      sock.on("error", (err) => {
        clearTimeout(timer);
        finish({ success: false, error: err.message, logs });
      });

      sock.on("data", (chunk) => {
        buf += chunk.toString("utf8");

        if (step === 0 && buf.includes("OK")) {
          step = 1;
          buf = "";
          logs.push("IMAP Greeting received. Sending LOGIN...");
          sock.write(`A1 LOGIN "${user}" "${pass}"\r\n`);
        } else if (step === 1 && (buf.includes("A1 OK") || buf.includes("A1 NO") || buf.includes("A1 BAD"))) {
          if (!buf.includes("A1 OK")) {
            clearTimeout(timer);
            return finish({ success: false, error: "Login IMAP ditolak. Periksa App Password.", logs, raw: buf });
          }
          step = 2;
          buf = "";
          logs.push("Login OK. Selecting INBOX...");
          sock.write("A2 SELECT INBOX\r\n");
        } else if (step === 2 && buf.includes("A2 OK")) {
          const existsMatch = buf.match(/\*\s+(\d+)\s+EXISTS/i);
          const totalMsgs = existsMatch ? Number(existsMatch[1]) : 0;
          logs.push(`Inbox OK. Total messages: ${totalMsgs}`);
          if (totalMsgs === 0) {
            clearTimeout(timer);
            return finish({ success: true, totalMessages: 0, messages: [], logs });
          }
          const startSeq = Math.max(1, totalMsgs - 4);
          step = 3;
          buf = "";
          logs.push(`Fetching last 5 messages (${startSeq}:${totalMsgs})...`);
          sock.write(`A3 FETCH ${startSeq}:${totalMsgs} (INTERNALDATE BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)] BODY.PEEK[]<0.500>)\r\n`);
        } else if (step === 3 && (buf.includes("A3 OK") || buf.includes("A3 NO") || buf.includes("A3 BAD"))) {
          clearTimeout(timer);
          logs.push("Fetch completed.");
          const raw = buf;
          const blocks = raw.split(/\*\s+\d+\s+FETCH/i).slice(1);
          for (const blk of blocks) {
            const dateMatch = blk.match(/Date:\s*([^\r\n]+)/i);
            const subjMatch = blk.match(/Subject:\s*([^\r\n]+)/i);
            const fromMatch = blk.match(/From:\s*([^\r\n]+)/i);
            messages.push({
              date: dateMatch ? dateMatch[1].trim() : "—",
              subject: subjMatch ? subjMatch[1].trim() : "—",
              from: fromMatch ? fromMatch[1].trim() : "—",
              snippet: blk.slice(0, 300).replace(/[\r\n]+/g, " "),
            });
          }
          return finish({
            success: true,
            user,
            totalMessages: messages.length,
            messages,
            logs,
          });
        }
      });
    });
  } catch (err) {
    return jsonError(err);
  }
}
