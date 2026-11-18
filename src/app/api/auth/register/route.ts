import { NextResponse } from "next/server";
import { readDb, withDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { config } from "@/lib/config";
import { userIdFromEmail } from "@/lib/auth";
import { attachRegisteredUserCookie } from "@/lib/order-cookie";
import type { User } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json(
        { error: "Format alamat email tidak valid." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Kata sandi minimal harus 6 karakter." },
        { status: 400 }
      );
    }

    const db = await readDb();
    const existing = db.users.find((u) => u.email.toLowerCase() === email);
    if (existing) {
      return NextResponse.json(
        { error: "Email sudah terdaftar. Silakan langsung masuk." },
        { status: 400 }
      );
    }

    const isAdmin = config.auth.adminEmails.includes(email);
    const newUser: User = {
      id: userIdFromEmail(email),
      email,
      name: name || email.split("@")[0],
      avatarUrl: null,
      passwordHash: hashPassword(password),
      role: isAdmin ? "ADMIN" : "BUYER",
      createdAt: new Date().toISOString(),
    };

    await withDb((d) => {
      d.users.push(newUser);
      return newUser;
    });

    const res = NextResponse.json({
      ok: true,
      message: "Akun berhasil didaftarkan.",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
    attachRegisteredUserCookie(res, newUser);
    return res;
  } catch (err) {
    console.error("Register error:", err);
    const detail = (err as Error)?.message || String(err);
    return NextResponse.json(
      { error: `Terjadi kesalahan saat mendaftarkan akun: ${detail}` },
      { status: 500 }
    );
  }
}
