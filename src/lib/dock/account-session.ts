import "server-only";

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import Database from "better-sqlite3";
import { dockDataDir, accountEncryptionKey } from "@/lib/env";
import type { AccountSession } from "@/lib/solid/css-account";

// --- sqlite singleton (survives Next dev hot-reload) -----------------------

const g = globalThis as unknown as { __dockAccountDb?: Database.Database };

function db(): Database.Database {
  if (g.__dockAccountDb) return g.__dockAccountDb;
  if (!existsSync(dockDataDir)) mkdirSync(dockDataDir, { recursive: true });
  const conn = new Database(join(dockDataDir, "account-sessions.db"));
  conn.pragma("journal_mode = WAL");
  conn.exec(
    `CREATE TABLE IF NOT EXISTS account_sessions (
       id TEXT PRIMARY KEY,
       data_enc TEXT NOT NULL,
       created_at INTEGER NOT NULL
     )`,
  );
  g.__dockAccountDb = conn;
  return conn;
}

// --- AES-256-GCM envelope for the held CSS cookie --------------------------

const KEY = createHash("sha256").update(accountEncryptionKey).digest();

function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

function decrypt(envelope: string): string {
  const [ivHex, tagHex, ctHex] = envelope.split(":");
  if (!ivHex || !tagHex || !ctHex) throw new Error("bad envelope");
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()]).toString("utf8");
}

// --- public API ------------------------------------------------------------

/** Persist an account session (encrypted) and return its opaque id. */
export function createSession(session: AccountSession): string {
  const id = randomBytes(18).toString("hex");
  db()
    .prepare("INSERT INTO account_sessions (id, data_enc, created_at) VALUES (?, ?, ?)")
    .run(id, encrypt(JSON.stringify(session)), Date.now());
  return id;
}

/** Resolve an account session by id, or null if missing/corrupt. */
export function getSession(id: string | undefined | null): AccountSession | null {
  if (!id) return null;
  const row = db().prepare("SELECT data_enc FROM account_sessions WHERE id = ?").get(id) as
    | { data_enc: string }
    | undefined;
  if (!row) return null;
  try {
    return JSON.parse(decrypt(row.data_enc)) as AccountSession;
  } catch {
    return null;
  }
}

export function deleteSession(id: string | undefined | null): void {
  if (!id) return;
  db().prepare("DELETE FROM account_sessions WHERE id = ?").run(id);
}
