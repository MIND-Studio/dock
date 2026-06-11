/**
 * Single source of truth for environment configuration.
 *
 *   - Client-safe (`NEXT_PUBLIC_*`): inlined at build time, readable in the
 *     browser. Changing them needs a dev-server restart + hard reload.
 *   - Server-only: read at runtime inside API routes / scripts. Never import
 *     these into a "use client" module.
 */

// ---- Client-safe (NEXT_PUBLIC_*) ------------------------------------------

export const oidcIssuer =
  process.env.NEXT_PUBLIC_SOLID_ISSUER ??
  process.env.NEXT_PUBLIC_OIDC_ISSUER ??
  "https://pods.mindpods.org/";

export const podBaseUrl = ensureSlash(
  process.env.NEXT_PUBLIC_POD_BASE_URL ?? "http://localhost:3011/",
);

// ---- Server-only ----------------------------------------------------------

/** Local sqlite store for the server-side CSS account sessions (Phase D). */
export const dockDataDir = process.env.DOCK_DATA_DIR ?? "./.dock-data";

/**
 * 32-byte AES-256-GCM key for encrypting the held CSS account cookie at rest.
 * Dev fallback is a fixed string — fine for local single-user dev, NEVER prod.
 */
export const accountEncryptionKey =
  process.env.DOCK_ACCOUNT_ENC_KEY ??
  "dev-only-mind-dock-account-key-32b!!";

function ensureSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}
