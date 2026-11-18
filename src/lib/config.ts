/**
 * Runtime configuration.
 *
 * Everything ships in DEMO mode by default so the whole purchase flow can be
 * exercised locally without Midtrans / Google Cloud / SMTP credentials.
 * Fill the matching env vars to switch a single integration to live.
 */

const env = (k: string, fallback = "") => process.env[k]?.trim() || fallback;

/** Demo shortcuts (fake payments, open login) default ON in dev, OFF in production. */
const demoDefault = process.env.NODE_ENV === "production" ? "false" : "true";

export const config = {
  brand: {
    name: "MUG1III AUDIO",
    tagline: "Lossless archive for serious listeners",
    supportWhatsapp: env("SUPPORT_WHATSAPP", "+6285973023210"),
    supportWhatsappUrl: "https://wa.me/6285973023210",
    supportDiscord: env("SUPPORT_DISCORD", "https://discord.gg/BYpDGbez9"),
    supportHours: "Senin–Minggu, 24 Jam",
  },

  baseUrl: env("NEXT_PUBLIC_BASE_URL", "http://localhost:3000"),

  demo: {
    /** Master switch — when true all external calls are simulated. */
    get enabled() {
      return env("DEMO_MODE", demoDefault) !== "false";
    },
    /** Demo webhook token shown in the payment page to simulate settlement. */
    webhookSecret: env("DEMO_WEBHOOK_SECRET", "demo-settle"),
    /** How long a QRIS charge stays payable. */
    qrisTtlMinutes: Number(env("QRIS_TTL_MINUTES", "15")),
  },

  midtrans: {
    serverKey: env("MIDTRANS_SERVER_KEY"),
    clientKey: env("MIDTRANS_CLIENT_KEY"),
    get isProduction() {
      const key = env("MIDTRANS_SERVER_KEY");
      if (key.startsWith("SB-")) return false;
      return env("MIDTRANS_IS_PRODUCTION", "false") === "true";
    },
    get isConfigured() {
      return Boolean(env("MIDTRANS_SERVER_KEY"));
    },
    get chargeUrl() {
      return this.isProduction
        ? "https://api.midtrans.com/v2/charge"
        : "https://api.sandbox.midtrans.com/v2/charge";
    },
  },

  gdrive: {
    serviceAccountJson: env("GDRIVE_SERVICE_ACCOUNT_JSON"),
    rootFolderId: env("GDRIVE_ROOT_FOLDER_ID", "1Kxr9BhutAybshEM8qPOSHcvtQjXYcc03"),
    sampleFolderId: env("GDRIVE_SAMPLE_FOLDER_ID", "14GmRuZ5WAz-FaYBuLhPb1ktBghsjSJ2m"),
    get isConfigured() {
      return Boolean(env("GDRIVE_SERVICE_ACCOUNT_JSON") && this.rootFolderId);
    },
  },

  email: {
    from: env("EMAIL_FROM", "MUG1III AUDIO <mugiiistore@gmail.com>"),
    smtpUrl: env("EMAIL_SMTP_URL"),
    get isConfigured() {
      return Boolean(env("EMAIL_SMTP_URL"));
    },
  },

  auth: {
    googleClientId: env("GOOGLE_CLIENT_ID"),
    googleClientSecret: env("GOOGLE_CLIENT_SECRET"),
    /** Allows the demo login form when real Google OAuth is not wired. */
    get googleConfigured() {
      return Boolean(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET"));
    },
    get demoLoginEnabled() {
      return env("ALLOW_DEMO_LOGIN", demoDefault) !== "false";
    },
    /** Comma-separated emails that get the ADMIN role on first sign-in. */
    get adminEmails() {
      return env("ADMIN_EMAILS", "admin@mug1iii.audio,mugiiistore@gmail.com")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
    },
  },
};

export const isDemo = () => config.demo.enabled;
