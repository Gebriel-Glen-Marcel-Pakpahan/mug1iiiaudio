import crypto from "node:crypto";

/**
 * Secure password hashing using Node.js built-in scrypt algorithm.
 * Output format: <salt_hex>:<hash_hex>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  if (!combinedHash || !combinedHash.includes(":")) return false;
  const [salt, key] = combinedHash.split(":");
  if (!salt || !key) return false;

  try {
    const keyBuffer = Buffer.from(key, "hex");
    const derived = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derived);
  } catch {
    return false;
  }
}
