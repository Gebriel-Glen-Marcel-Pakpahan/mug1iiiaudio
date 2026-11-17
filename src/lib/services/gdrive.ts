import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config, isDemo } from "../config";

const execFileAsync = promisify(execFile);

export interface GrantResult {
  folderId: string;
  permissionId: string;
  linkUrl: string;
  simulated: boolean;
}

/**
 * Resolves placeholder/demo folder IDs to the live sample folder ID created in Google Drive
 * (`14GmRuZ5WAz-FaYBuLhPb1ktBghsjSJ2m`) so sample purchases always point to a real Drive folder.
 */
function resolveRealFolderId(folderId: string): string {
  if (
    !folderId ||
    folderId.endsWith("DrvFolder") ||
    folderId.includes("_FLAC") ||
    folderId.length < 25
  ) {
    return config.gdrive.sampleFolderId;
  }
  return folderId;
}

/**
 * Google Drive integration (PRD §22.1).
 *
 * Live path: service-account JWT → OAuth token → Drive REST permissions.create.
 * Demo path: deterministic permission ids so the grant/revoke lifecycle is
 * observable in the admin audit log without Google credentials.
 */

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.token;

  const raw = config.gdrive.serviceAccountJson;
  if (!raw) throw new Error("GDRIVE_SERVICE_ACCOUNT_JSON is not set");
  const sa = JSON.parse(raw) as { client_email: string; private_key: string };

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(sa.private_key.replace(/\\n/g, "\n"), "base64url");
  const assertion = `${header}.${claims}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

const folderLink = (folderId: string, email?: string) =>
  `https://drive.google.com/drive/folders/${folderId}${email ? `?authuser=${encodeURIComponent(email)}` : ""}`;

/** permissions.create — role=reader, type=user, per buyer email. */
export async function grantFolderAccess(params: {
  folderId: string;
  email: string;
  orderNumber: string;
  albumTitle: string;
}): Promise<GrantResult> {
  const realFolderId = resolveRealFolderId(params.folderId);

  if (config.gdrive.isConfigured && !isDemo()) {
    const token = await getAccessToken();
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${realFolderId}/permissions?sendNotificationEmail=true&supportsAllDrives=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "reader",
          type: "user",
          emailAddress: params.email,
        }),
        cache: "no-store",
      },
    );

    if (!res.ok) throw new Error(`Drive permission create failed (${res.status}): ${await res.text()}`);
    const data = (await res.json()) as { id: string };

    return {
      folderId: realFolderId,
      permissionId: data.id,
      linkUrl: folderLink(realFolderId, params.email),
      simulated: false,
    };
  }

  // Try local gdrive CLI auto-share for real buyer emails when Service Account JSON is not set
  const isSyntheticEmail =
    params.email.startsWith("smoke") ||
    params.email.endsWith("@mug1iii.audio") ||
    params.email === "audiophile.demo@gmail.com";

  if (!isSyntheticEmail) {
    try {
      await execFileAsync(
        "gdrive",
        ["mutate", "share", realFolderId, "--email", params.email, "--role", "reader", "--notify=true"],
        { timeout: 6000 },
      );
      const permissionId = `perm_cli_${crypto
        .createHash("sha256")
        .update(`${params.orderNumber}:${realFolderId}:${params.email}`)
        .digest("hex")
        .slice(0, 16)}`;
      return {
        folderId: realFolderId,
        permissionId,
        linkUrl: folderLink(realFolderId, params.email),
        simulated: false,
      };
    } catch {
      // Fallback below if gdrive CLI is not in system PATH or email is not a registered Google account
    }
  }

  // Deterministic per order+album so retries are idempotent
  const permissionId = `perm_${crypto
    .createHash("sha256")
    .update(`${params.orderNumber}:${realFolderId}`)
    .digest("hex")
    .slice(0, 20)}`;
  return {
    folderId: realFolderId,
    permissionId,
    linkUrl: folderLink(realFolderId, params.email),
    simulated: true,
  };
}

/** permissions.delete — used by the warranty refund flow (PRD §8.3). */
export async function revokeFolderAccess(params: {
  folderId: string;
  permissionId: string;
}): Promise<{ revoked: boolean; simulated: boolean }> {
  if (isDemo() || !config.gdrive.isConfigured) {
    return { revoked: true, simulated: true };
  }

  const token = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${params.folderId}/permissions/${params.permissionId}?supportsAllDrives=true`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );

  if (!res.ok && res.status !== 404) {
    throw new Error(`Drive permission delete failed (${res.status}): ${await res.text()}`);
  }
  return { revoked: true, simulated: false };
}

/** Creates the per-album folder used by the admin upload flow. */
export async function createAlbumFolder(title: string): Promise<{ folderId: string; simulated: boolean }> {
  if (isDemo() || !config.gdrive.isConfigured) {
    return {
      folderId: `1${crypto.createHash("sha256").update(title).digest("hex").slice(0, 14)}`,
      simulated: true,
    };
  }

  const token = await getAccessToken();
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Album - ${title}`,
        mimeType: "application/vnd.google-apps.folder",
        parents: config.gdrive.rootFolderId ? [config.gdrive.rootFolderId] : undefined,
      }),
      cache: "no-store",
    },
  );

  if (!res.ok) throw new Error(`Drive folder create failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { id: string };
  return { folderId: data.id, simulated: false };
}
