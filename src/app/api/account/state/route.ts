import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/dock/account-session";
import { getAccountState } from "@/lib/solid/css-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const id = (await cookies()).get("mh_account")?.value;
  const session = getSession(id);
  if (!session) return NextResponse.json({ loggedIn: false });
  try {
    const state = await getAccountState(session);
    return NextResponse.json({ loggedIn: true, issuer: session.issuer, ...state });
  } catch {
    // Session expired on the CSS side — treat as logged out.
    return NextResponse.json({ loggedIn: false });
  }
}
