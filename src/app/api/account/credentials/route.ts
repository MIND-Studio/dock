import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createCredential, deleteCredential, CssApiError } from "@/lib/solid/css-account";
import { getSession } from "@/lib/dock/account-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = getSession((await cookies()).get("mh_account")?.value);
  if (!session) return NextResponse.json({ error: "Not signed in to your account." }, { status: 401 });
  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: "A name is required." }, { status: 400 });
  try {
    const created = await createCredential(session, name.trim());
    return NextResponse.json({ ok: true, ...created });
  } catch (e) {
    const status = e instanceof CssApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

export async function DELETE(req: Request) {
  const session = getSession((await cookies()).get("mh_account")?.value);
  if (!session) return NextResponse.json({ error: "Not signed in to your account." }, { status: 401 });
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing credential url." }, { status: 400 });
  try {
    await deleteCredential(session, url);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = e instanceof CssApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
