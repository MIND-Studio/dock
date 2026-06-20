import { NextResponse } from "next/server";
import { createSession } from "@/lib/dock/account-session";
import { podBaseUrl } from "@/lib/env";
import { CssApiError, loginAccount } from "@/lib/solid/css-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let email = "";
  let password = "";
  let issuer = "";
  try {
    const body = (await req.json()) as { email?: string; password?: string; issuer?: string };
    email = body.email ?? "";
    password = body.password ?? "";
    issuer = body.issuer ?? "";
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const iss = issuer || podBaseUrl;
  try {
    const session = await loginAccount(iss, email, password);
    const id = createSession(session);
    const res = NextResponse.json({ ok: true });
    res.cookies.set("mh_account", id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch (e) {
    const status = e instanceof CssApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
