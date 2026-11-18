/** CRC16-CCITT (0xFFFF init, poly 0x1021) — the checksum QRIS/EMVCo uses in tag 63. */
export function crc16(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Turns a static merchant QRIS into a dynamic one with a fixed amount, so the
 * buyer's banking app asks for exactly that amount after scanning.
 * Static → dynamic: tag 01 "11" → "12", insert tag 54 (amount) before tag 58, recompute CRC.
 */
export function withAmount(staticQris: string, amount: number): string {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Nominal QRIS tidak valid.");
  const body = staticQris.slice(0, -8).replace("010211", "010212"); // strip "6304XXXX"
  const value = String(amount);
  const tag54 = `54${String(value.length).padStart(2, "0")}${value}`;
  const at = body.indexOf("5802ID");
  if (at === -1) throw new Error("Format QRIS toko tidak dikenali.");
  const payload = `${body.slice(0, at)}${tag54}${body.slice(at)}6304`;
  return payload + crc16(payload);
}
