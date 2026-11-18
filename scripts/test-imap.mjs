import tls from "node:tls";

const smtpUrl = process.env.EMAIL_SMTP_URL;
if (!smtpUrl) {
  console.log("❌ EMAIL_SMTP_URL belum diatur di environment.");
  console.log("Contoh format:");
  console.log("EMAIL_SMTP_URL=smtps://mugiiistore%40gmail.com:APP_PASSWORD@smtp.gmail.com:465");
  process.exit(1);
}

const u = new URL(smtpUrl);
const user = decodeURIComponent(u.username);
const pass = decodeURIComponent(u.password);

console.log(`Menghubungkan ke imap.gmail.com:993 sebagai ${user}...`);

const sock = tls.connect({ host: "imap.gmail.com", port: 993, servername: "imap.gmail.com" }, () => {
  console.log("✓ Terhubung ke IMAP Gmail via TLS!");
});

let step = 0;
let buf = "";

sock.on("data", (chunk) => {
  buf += chunk.toString("utf8");
  if (step === 0 && buf.includes("OK")) {
    step = 1;
    buf = "";
    console.log("Mengirim autentikasi login...");
    sock.write(`A1 LOGIN "${user}" "${pass}"\r\n`);
  } else if (step === 1 && (buf.includes("A1 OK") || buf.includes("A1 NO") || buf.includes("A1 BAD"))) {
    if (!buf.includes("A1 OK")) {
      console.error("❌ Login gagal! Periksa kembali App Password Gmail Anda.");
      console.error(buf);
      sock.destroy();
      process.exit(1);
    }
    console.log("✓ Login berhasil!");
    step = 2;
    buf = "";
    sock.write("A2 SELECT INBOX\r\n");
  } else if (step === 2 && buf.includes("A2 OK")) {
    const existsMatch = buf.match(/\*\s+(\d+)\s+EXISTS/i);
    const total = existsMatch ? Number(existsMatch[1]) : 0;
    console.log(`✓ Inbox terbuka. Total email: ${total}`);
    const startSeq = Math.max(1, total - 9);
    step = 3;
    buf = "";
    sock.write(`A3 FETCH ${startSeq}:${total} (INTERNALDATE BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])\r\n`);
  } else if (step === 3 && (buf.includes("A3 OK") || buf.includes("A3 NO") || buf.includes("A3 BAD"))) {
    console.log("\n10 Email Terbaru di Inbox:");
    console.log("--------------------------------------------------");
    const lines = buf.split("\r\n");
    for (const l of lines) {
      if (l.startsWith("From:") || l.startsWith("Subject:") || l.startsWith("Date:")) {
        console.log(l);
      }
    }
    console.log("--------------------------------------------------");
    sock.destroy();
  }
});

sock.on("error", (err) => {
  console.error("Socket error:", err);
});
