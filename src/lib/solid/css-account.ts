import "server-only";

/**
 * Minimal server-side client for the CommunitySolidServer v7 account API
 * (`/.account/`). mind-dock holds the user's OIDC/WebID session in the browser,
 * but managing the *account* (pods, linked WebIDs, client credentials) needs the
 * separate account credential + a pod-origin cookie. We do that here, server-side,
 * with a cookie jar — never exposing the account cookie to the browser.
 *
 * Cookie-jar plumbing adapted from codespaces/src/lib/solid/css-account.ts.
 */

type CookieJar = Map<string, string>;

export class CssApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CssApiError";
  }
}

export type AccountSession = { issuer: string; cookies: Record<string, string> };

export type AccountState = {
  /** Pod base URLs owned by this account. */
  pods: string[];
  /** WebIDs linked to this account. */
  webIds: string[];
  /** Client credentials: id → management resource URL (for delete). */
  credentials: { id: string; url: string }[];
};

function mergeSetCookies(jar: CookieJar, setCookies: string[]): void {
  for (const line of setCookies) {
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const name = line.slice(0, eq).trim();
    const rest = line.slice(eq + 1);
    const semi = rest.indexOf(";");
    const value = (semi < 0 ? rest : rest.slice(0, semi)).trim();
    if (value === "" && /expires=Thu, 01 Jan 1970/i.test(line)) {
      jar.delete(name);
      continue;
    }
    jar.set(name, value);
  }
}

function cookieHeader(jar: CookieJar): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function req(
  url: string,
  jar: CookieJar,
  init: { method?: string; body?: unknown } = {},
): Promise<{ status: number; body: Record<string, unknown> | null }> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (jar.size > 0) headers["Cookie"] = cookieHeader(jar);
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    redirect: "manual",
  });
  const getSetCookie = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === "function") mergeSetCookies(jar, getSetCookie.call(res.headers));
  let body: Record<string, unknown> | null = null;
  try {
    const text = await res.text();
    if (text) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

function accountBase(issuer: string): string {
  return `${issuer.replace(/\/?$/, "/")}.account/`;
}

function pickPath(obj: unknown, path: string[]): string | undefined {
  let cur: unknown = obj;
  for (const k of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** First map-shaped value among the candidate keys → its key list / entries. */
function asMap(body: Record<string, unknown> | null, keys: string[]): Record<string, string> {
  if (!body) return {};
  for (const k of keys) {
    const v = body[k];
    if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, string>;
  }
  return {};
}

/** Log into the account; returns the held cookie jar. Throws on bad creds. */
export async function loginAccount(
  issuer: string,
  email: string,
  password: string,
): Promise<AccountSession> {
  const jar: CookieJar = new Map();
  const index = await req(accountBase(issuer), jar);
  const loginUrl = pickPath(index.body, ["controls", "password", "login"]);
  if (!loginUrl) throw new CssApiError("Account login is unavailable on this pod.", 500);
  const login = await req(loginUrl, jar, { method: "POST", body: { email, password } });
  if (login.status >= 400) {
    throw new CssApiError(
      (login.body?.["message"] as string) || "Wrong email or password.",
      login.status,
    );
  }
  return { issuer, cookies: Object.fromEntries(jar) };
}

async function authedControls(s: AccountSession, jar: CookieJar) {
  const index = await req(accountBase(s.issuer), jar);
  if (index.status === 401 || index.status === 403) {
    throw new CssApiError("Your account session expired. Please sign in again.", 401);
  }
  const account = ((index.body?.["controls"] as Record<string, unknown>)?.["account"] ??
    {}) as Record<string, string>;
  return account;
}

/** Read pods, linked WebIDs, and client credentials for the account. */
export async function getAccountState(s: AccountSession): Promise<AccountState> {
  const jar: CookieJar = new Map(Object.entries(s.cookies));
  const account = await authedControls(s, jar);

  const podsRes = account["pod"] ? await req(account["pod"], jar) : { body: null };
  const webIdRes = account["webId"] ? await req(account["webId"], jar) : { body: null };
  const credRes = account["clientCredentials"]
    ? await req(account["clientCredentials"], jar)
    : { body: null };

  const pods = Object.keys(asMap(podsRes.body, ["pods", "podLinks", "pod"]));
  const webIds = Object.keys(asMap(webIdRes.body, ["webIdLinks", "webIds", "webId"]));
  const credMap = asMap(credRes.body, ["clientCredentials", "credentials"]);
  const credentials = Object.entries(credMap).map(([id, url]) => ({ id, url: String(url) }));

  return { pods, webIds, credentials };
}

/** Create a new pod under the account. */
export async function createPod(s: AccountSession, name: string): Promise<void> {
  const jar: CookieJar = new Map(Object.entries(s.cookies));
  const account = await authedControls(s, jar);
  if (!account["pod"]) throw new CssApiError("This pod host doesn’t allow creating pods.", 500);
  const res = await req(account["pod"], jar, { method: "POST", body: { name } });
  if (res.status >= 400) {
    throw new CssApiError(
      (res.body?.["message"] as string) || "Couldn’t create that pod.",
      res.status,
    );
  }
}

/** Mint a client credential (machine token) for the account's first WebID. */
export async function createCredential(
  s: AccountSession,
  name: string,
): Promise<{ id?: string; secret?: string }> {
  const jar: CookieJar = new Map(Object.entries(s.cookies));
  const account = await authedControls(s, jar);
  if (!account["clientCredentials"])
    throw new CssApiError("Credentials aren’t available here.", 500);
  const webIds = account["webId"]
    ? Object.keys(asMap((await req(account["webId"], jar)).body, ["webIdLinks", "webIds"]))
    : [];
  const webId = webIds[0];
  if (!webId) throw new CssApiError("Link a WebID before creating credentials.", 400);
  const res = await req(account["clientCredentials"], jar, {
    method: "POST",
    body: { name, webId },
  });
  if (res.status >= 400) {
    throw new CssApiError(
      (res.body?.["message"] as string) || "Couldn’t create the credential.",
      res.status,
    );
  }
  return {
    id: res.body?.["id"] as string | undefined,
    secret: res.body?.["secret"] as string | undefined,
  };
}

/** Revoke a client credential by its management resource URL. */
export async function deleteCredential(s: AccountSession, url: string): Promise<void> {
  const jar: CookieJar = new Map(Object.entries(s.cookies));
  const res = await req(url, jar, { method: "DELETE" });
  if (res.status >= 400) {
    throw new CssApiError("Couldn’t revoke that credential.", res.status);
  }
}

/** Log the account session out on the CSS side (best-effort). */
export async function logoutAccount(s: AccountSession): Promise<void> {
  const jar: CookieJar = new Map(Object.entries(s.cookies));
  try {
    const account = await authedControls(s, jar);
    if (account["logout"]) await req(account["logout"], jar, { method: "POST", body: {} });
  } catch {
    // best-effort
  }
}
