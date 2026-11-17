import nodemailer from "nodemailer";

async function testEmail() {
  const smtpUrl = process.env.EMAIL_SMTP_URL;
  const targetEmail = process.argv[2] || process.env.TEST_TARGET_EMAIL;

  console.log("\n========================================================");
  console.log("   MUG1III AUDIO — PENGUJIAN PENGIRIMAN EMAIL NYATA   ");
  console.log("========================================================\n");

  if (!smtpUrl) {
    console.error("❌ ERROR: EMAIL_SMTP_URL belum diatur di .env.local atau environment variable.");
    console.log("\nCara mengisi di .env.local:");
    console.log("EMAIL_SMTP_URL=smtps://emailanda%40gmail.com:abcdefghijklmnop@smtp.gmail.com:465");
    console.log("EMAIL_FROM=MUG1III AUDIO <emailanda@gmail.com>");
    process.exit(1);
  }

  if (!targetEmail) {
    console.error("❌ ERROR: Mohon tentukan email tujuan pengujian.");
    console.log("Contoh penggunaan:");
    console.log("node scripts/test-email.mjs emailtujuan@gmail.com\n");
    process.exit(1);
  }

  console.log(`Menghubungkan ke SMTP: ${smtpUrl.replace(/:[^:@]+@/, ":****@")}...`);
  const transporter = nodemailer.createTransport(smtpUrl);

  try {
    await transporter.verify();
    console.log("✓ Koneksi ke server SMTP berhasil diverifikasi!");

    console.log(`Mengirim email uji coba akses Google Drive ke: ${targetEmail}...`);
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || "MUG1III AUDIO",
      to: targetEmail,
      subject: "Akses Album Digital Anda Siap — MUG1III AUDIO (Uji Coba)",
      text: `Halo,\n\nIni adalah email uji coba dari sistem MUG1III AUDIO.\nPembayaran Anda telah berhasil dan akses Google Drive master FLAC 24-bit telah aktif.\n\nTautan Folder: https://drive.google.com/drive/folders/14GmRuZ5WAz-FaYBuLhPb1ktBghsjSJ2m\n\nTerima kasih!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0B0B0F; color: #FFFFFF; padding: 30px; border: 1px solid #D4AF37;">
          <h1 style="color: #D4AF37; margin-top: 0; font-size: 20px; letter-spacing: 0.1em;">MUG1III AUDIO</h1>
          <p style="color: #A1A1AA; font-size: 14px;">Arsip Digital Musik Lossless FLAC 24-bit</p>
          <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;">
          <p>Halo <strong>${targetEmail.split("@")[0]}</strong>,</p>
          <p style="color: #D4D4D8;">Terima kasih atas pembelian Anda! Master audio lossless Anda siap diunduh.</p>
          <div style="background: rgba(255,255,255,0.05); padding: 18px; border-left: 3px solid #D4AF37; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; font-size: 15px;">SAMPLE - Sheila On 7 - Musim Yang Baik [FLAC 24-bit]</p>
            <p style="margin: 6px 0 0 0; font-size: 12px; color: #9CA3AF;">Format: FLAC 24-bit / 96 kHz · Master Lossless</p>
            <a href="https://drive.google.com/drive/folders/14GmRuZ5WAz-FaYBuLhPb1ktBghsjSJ2m" target="_blank" style="display: inline-block; margin-top: 14px; background: #D4AF37; color: #000000; font-weight: bold; text-decoration: none; padding: 10px 20px; font-size: 13px; border-radius: 2px;">
              Buka Folder Google Drive &rarr;
            </a>
          </div>
          <p style="font-size: 12px; color: #9CA3AF;">Pastikan Anda masuk ke Google Drive menggunakan email <strong>${targetEmail}</strong> saat membuka tautan.</p>
          <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;">
          <p style="font-size: 11px; color: #6B7280; margin-bottom: 0;">MUG1III AUDIO · WhatsApp Support: +6285973023210</p>
        </div>
      `,
    });

    console.log(`\n🎉 SUKSES! Email telah terkirim ke: ${targetEmail}`);
    console.log(`Message ID: ${info.messageId}`);
    console.log("Silakan cek kotak masuk (Inbox) atau folder Spam di Gmail Anda!\n");
  } catch (err) {
    console.error("\n❌ Gagal mengirim email:", err.message);
  }
}

testEmail();
