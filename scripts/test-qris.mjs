// Runnable check for src/lib/qris.ts logic (money path). Run: node scripts/test-qris.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/lib/qris.ts", import.meta.url), "utf8")
  .replace(/export /g, "")
  .replace(/\(s: string\): string/, "(s)")
  .replace(/\(staticQris: string, amount: number\): string/, "(staticQris, amount)");
const { crc16, withAmount } = new Function(`${src}; return { crc16, withAmount };`)();

const STATIC =
  "00020101021126570011ID.DANA.WWW011893600915387109409302098710940930303UMI51440014ID.CO.QRIS.WWW0215ID10254013974980303UMI5204654053033605802ID5913MUG1III STORE6015Kab. Humbang Ha61052245763040FA2";

// 1. The stored store QRIS must have a valid checksum, otherwise it was mis-transcribed.
assert.equal(crc16(STATIC.slice(0, -4)), STATIC.slice(-4), "store QRIS checksum mismatch");

// 2. Dynamic QRIS carries the exact amount and a valid checksum.
const dyn = withAmount(STATIC, 10000);
assert.ok(dyn.startsWith("000201010212"), "must be dynamic (tag 01 = 12)");
assert.ok(dyn.includes("540510000" + "5802ID"), "amount tag 54 must precede 58");
assert.equal(crc16(dyn.slice(0, -4)), dyn.slice(-4), "dynamic checksum invalid");

// 3. Bad amounts are rejected.
assert.throws(() => withAmount(STATIC, 0));
assert.throws(() => withAmount(STATIC, 10.5));

console.log("qris OK:", dyn);
