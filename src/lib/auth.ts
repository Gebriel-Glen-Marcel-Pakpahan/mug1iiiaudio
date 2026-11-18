import crypto from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { config } from "./config";
import { readDb, withDb } from "./db";
import { hashPassword, verifyPassword } from "./password";
import type { User } from "./types";

/**
 * Deterministic user ID based on email address.
 * Ensures consistent identity across stateless serverless instances and cold starts.
 */
export function userIdFromEmail(email: string): string {
  const clean = email.toLowerCase().trim();
  const hash = crypto.createHash("sha256").update(clean).digest("hex").slice(0, 12);
  return `usr_${hash}`;
}

function toSessionUser(u: User) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, image: u.avatarUrl ?? null };
}

async function upsertUser(email: string, name: string | null, avatarUrl?: string | null) {
  return withDb((db) => {
    const normalizedEmail = email.toLowerCase().trim();
    const isAdmin = config.auth.adminEmails.includes(normalizedEmail);
    const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      if (name && !existing.name) existing.name = name;
      if (avatarUrl) existing.avatarUrl = avatarUrl;
      // Sinkronkan status ADMIN jika email terdaftar di ADMIN_EMAILS
      if (isAdmin && existing.role !== "ADMIN") {
        existing.role = "ADMIN";
      }
      return existing;
    }
    const user: User = {
      id: userIdFromEmail(normalizedEmail),
      email: normalizedEmail,
      name,
      avatarUrl: avatarUrl ?? null,
      role: isAdmin ? "ADMIN" : "BUYER",
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return user;
  });
}

const providers: NextAuthOptions["providers"] = [];

if (config.auth.googleConfigured) {
  providers.push(
    GoogleProvider({
      clientId: config.auth.googleClientId,
      clientSecret: config.auth.googleClientSecret,
      authorization: {
        params: { prompt: "select_account", access_type: "online", scope: "openid email profile" },
      },
    }),
  );
}

// Primary Email + Password Provider
providers.push(
  CredentialsProvider({
    id: "credentials",
    name: "Email & Kata Sandi",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Kata Sandi", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase();
      const password = credentials?.password;
      if (!email || !password) return null;

      const isAdminEmail = config.auth.adminEmails.includes(email);
      const db = await readDb();
      let user = db.users.find((u) => u.email.toLowerCase() === email);

      // Unknown email: treat login as auto sign-up
      if (!user) {
        if (password.length < 6) return null;
        const newUser: User = {
          id: userIdFromEmail(email),
          email,
          name: email.split("@")[0],
          avatarUrl: null,
          role: isAdminEmail ? "ADMIN" : "BUYER",
          createdAt: new Date().toISOString(),
          passwordHash: hashPassword(password),
        };
        await withDb((d) => {
          d.users.push(newUser);
        });
        user = newUser;
      }

      // Existing account: the password must match. Never overwrite a stored hash on login.
      if (user.passwordHash) {
        if (!verifyPassword(password, user.passwordHash)) return null;
      } else if (!(config.auth.demoLoginEnabled && password === "admin123" && user.role === "ADMIN")) {
        // Seeded accounts without a password can only be used in demo mode.
        return null;
      }

      // Sync admin status from config if needed
      const isAdmin = config.auth.adminEmails.includes(email);
      if (isAdmin && user.role !== "ADMIN") {
        await withDb((d) => {
          const u = d.users.find((x) => x.id === user!.id);
          if (u) u.role = "ADMIN";
        });
        user.role = "ADMIN";
      }

      return toSessionUser(user);
    },
  }),
);

if (config.auth.demoLoginEnabled) {
  providers.push(
    CredentialsProvider({
      id: "demo-google",
      name: "Demo Google Account",
      credentials: {
        email: { label: "Email Google", type: "email" },
        name: { label: "Nama", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
        const user = await upsertUser(email, credentials?.name?.trim() || null, null);
        return toSessionUser(user);
      },
    }),
  );
}

// Ensure NEXTAUTH_URL is always set on Vercel
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://mug1iiiaudio.vercel.app";
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/masuk" },
  secret:
    process.env.NEXTAUTH_SECRET ||
    "mug1iii-audio-jwt-secret-key-prod-99f24301d0a5b28a472c6e11",
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const dbUser = await upsertUser(user.email, user.name ?? null, user.image ?? null);
        // keep role fresh in the token below
        (user as { role?: string }).role = dbUser.role;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await upsertUser(user.email, user.name ?? null, user.image ?? null);
        token.uid = dbUser.id;
        token.role = dbUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.uid as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};
