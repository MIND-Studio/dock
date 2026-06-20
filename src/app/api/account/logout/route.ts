import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteSession, getSession } from "@/lib/dock/account-session";
import { logoutAccount } from "@/lib/solid/css-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const id = (await cookies()).get("mh_account")?.value;
  const session = getSession(id);
  if (session) await logoutAccount(session);
  deleteSession(id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("mh_account", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
