"use client";

import { type UseStandaloneSessionResult, useStandaloneSession } from "@mind-studio/core/solid";

/**
 * Thin wrapper over the shared provider-free session hook from
 * `@mind-studio/core/solid`. Dock runs standalone only (no shell broker). The
 * DPoP-bound `fetch` is used for pod reads/writes (profile card, app registry);
 * CSS-account management is a separate session (see css-account.ts).
 */
export function useSession(): UseStandaloneSessionResult {
  return useStandaloneSession({ clientName: "Mind Dock" });
}
