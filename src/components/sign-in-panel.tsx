"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

type Mode = "login" | "register";

export function SignInPanel({
  next,
  googleConfigured,
  demoEnabled,
}: {
  next: string;
  googleConfigured: boolean;
  demoEnabled: boolean;
}) {
  const [mode, setMode] = useState<Mode>("login");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState<"credentials" | "register" | "google" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 1. Handle Login (Email + Kata Sandi)
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }

    setLoading("credentials");
    const res = await signIn("credentials", {
      email: cleanEmail,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Email atau kata sandi tidak sesuai. Silakan periksa kembali.");
      setLoading(null);
      return;
    }

    window.location.href = next;
  }

  // 2. Handle Registrasi Akun Baru
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setError("Masukkan alamat email yang valid.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Kata sandi minimal harus 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading("register");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal mendaftar akun.");
        setLoading(null);
        return;
      }

      setSuccess("Akun berhasil dibuat! Mengalihkan ke sesi masuk...");

      // Otomatis login setelah registrasi berhasil
      const loginRes = await signIn("credentials", {
        email: cleanEmail,
        password,
        redirect: false,
      });

      if (loginRes?.error) {
        // Jika auto login gagal, alihkan ke tab masuk
        setMode("login");
        setSuccess("Akun berhasil didaftarkan. Silakan masukkan kata sandi untuk masuk.");
        setLoading(null);
      } else {
        window.location.href = next;
      }
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
      setLoading(null);
    }
  }

  return (
    <div className="w-full max-w-[440px]">
      <div className="flex justify-center">
        <Logo />
      </div>

      <div className="mt-8 overflow-hidden border border-white/[0.09] bg-carbon-850/85 backdrop-blur-md shadow-2xl">
        {/* Tab Switcher: Masuk vs Daftar Akun */}
        <div className="grid grid-cols-2 border-b border-white/[0.09] bg-carbon-900/75 p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setSuccess(null);
            }}
            className={cn(
              "py-3 text-center font-mono text-[0.6875rem] uppercase tracking-label transition-all",
              mode === "login"
                ? "border-b-2 border-gold bg-white/[0.06] font-bold text-gold-bright"
                : "text-ink-mute hover:text-ink hover:bg-white/[0.02]"
            )}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
              setSuccess(null);
            }}
            className={cn(
              "py-3 text-center font-mono text-[0.6875rem] uppercase tracking-label transition-all",
              mode === "register"
                ? "border-b-2 border-gold bg-white/[0.06] font-bold text-gold-bright"
                : "text-ink-mute hover:text-ink hover:bg-white/[0.02]"
            )}
          >
            Daftar Akun
          </button>
        </div>

        <div className="p-7 md:p-8">
          <div>
            <h1 className="display text-2xl text-ink md:text-3xl">
              {mode === "login" ? "Selamat Datang" : "Buat Akun Baru"}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-ink-mute">
              {mode === "login"
                ? "Masuk dengan email dan kata sandi Anda untuk mengakses koleksi audio dan riwayat pesanan."
                : "Daftar dengan email Google aktif Anda untuk menerima hak akses folder Google Drive saat pembelian selesai."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="mt-6 space-y-4">
            {mode === "register" && (
              <div>
                <label className="label flex items-center gap-1.5" htmlFor="name">
                  <User size={12} className="text-ink-faint" />
                  Nama Lengkap (opsional)
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Anda"
                  autoComplete="name"
                  className="field"
                />
              </div>
            )}

            <div>
              <label className="label flex items-center gap-1.5" htmlFor="email">
                <Mail size={12} className="text-ink-faint" />
                Alamat Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@gmail.com"
                autoComplete="email"
                className="field"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label flex items-center gap-1.5" htmlFor="password">
                  <Lock size={12} className="text-ink-faint" />
                  Kata Sandi
                </label>
                {mode === "register" && (
                  <span className="font-mono text-[0.5625rem] text-ink-faint">Min. 6 karakter</span>
                )}
              </div>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="field pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label className="label flex items-center gap-1.5" htmlFor="confirmPassword">
                  <Lock size={12} className="text-ink-faint" />
                  Ulangi Kata Sandi
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="field"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading !== null}
              className="btn-gold mt-2 w-full justify-center py-3"
            >
              {loading === "credentials" || loading === "register" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ArrowRight size={15} />
              )}
              {mode === "login" ? "Masuk ke Akun" : "Daftar Akun Sekarang"}
            </button>
          </form>

          {/* Quick Switch Text */}
          <p className="mt-4 text-center font-mono text-[0.625rem] uppercase tracking-label text-ink-mute">
            {mode === "login" ? (
              <>
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-gold-bright underline hover:text-gold"
                >
                  Daftar di sini
                </button>
              </>
            ) : (
              <>
                Sudah memiliki akun?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-gold-bright underline hover:text-gold"
                >
                  Masuk di sini
                </button>
              </>
            )}
          </p>

          {/* Google OAuth Option (Jika aktif) */}
          {googleConfigured && (
            <div className="mt-6 border-t border-white/[0.08] pt-5">
              <button
                type="button"
                onClick={() => {
                  setLoading("google");
                  void signIn("google", { callbackUrl: next });
                }}
                disabled={loading !== null}
                className="btn-outline w-full justify-center py-3 text-xs"
              >
                {loading === "google" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <GoogleGlyph />
                )}
                Lanjutkan dengan Google
              </button>
            </div>
          )}

          {/* Feedback Messages */}
          {error && (
            <div className="mt-4 flex items-start gap-2 border border-signal-bad/30 bg-signal-bad/[0.08] p-3 text-signal-bad">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 flex items-start gap-2 border border-emerald-500/30 bg-emerald-500/[0.08] p-3 text-emerald-400">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">{success}</p>
            </div>
          )}

          {/* Demo Helpers for Testing */}
          {demoEnabled && (
            <div className="mt-6 border-t border-white/[0.08] pt-4">
              <p className="font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
                Shortcut Pengujian (Mode Demo):
              </p>
              <div className="mt-2 flex flex-col gap-1.5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setEmail("admin@mug1iii.audio");
                    setPassword("admin123");
                  }}
                  className="flex-1 border border-gold/30 bg-gold/[0.06] py-1.5 text-center font-mono text-[0.5625rem] uppercase tracking-label text-gold-bright hover:bg-gold/15"
                >
                  🛡️ Akun Admin Demo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setEmail("audiophile.demo@gmail.com");
                    setPassword("buyer123");
                  }}
                  className="flex-1 border border-white/10 bg-white/[0.03] py-1.5 text-center font-mono text-[0.5625rem] uppercase tracking-label text-ink-soft hover:bg-white/10"
                >
                  👤 Akun Pembeli Demo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.86c2.26-2.09 3.56-5.17 3.56-8.87z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
