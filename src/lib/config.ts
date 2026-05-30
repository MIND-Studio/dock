/**
 * Client-facing runtime config re-exported from env.ts for ergonomic imports
 * in "use client" components (mirrors the sibling prototypes' config shape).
 */
export { oidcIssuer, podBaseUrl } from "@/lib/env";

/** Display name used by the shared login card + last-identity hint. */
export const APP_NAME = "Home";

/** Mind teal — the default Mind brand accent. */
export const ACCENT = "#16b88a";
