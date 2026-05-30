import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createPod, CssApiError } from "@/lib/solid/css-account";
import { getSession } from "@/lib/home/account-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const id = (await cookies()).get("mh_account")?.value;
  const session = getSession(id);
  if (!session) return NextResponse.json({ error: "Not signed in to your account." }, { status: 401 });
  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  if (!name?.trim()) return NextResponse.json({ error: "A pod name is required." }, { status: 400 });
  try {
    await createPod(session, name.trim());
    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = e instanceof CssApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
