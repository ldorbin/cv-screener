import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = createSupabaseServiceClient();

  const { data: invite } = await supabase
    .from("org_invites")
    .select("email, org_id, accepted_at, expires_at, organizations(name)")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "invite not found" }, { status: 404 });
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: "invite already used" }, { status: 400 });
  }

  if (new Date(invite.expires_at ?? 0) < new Date()) {
    return NextResponse.json({ error: "invite expired" }, { status: 400 });
  }

  const orgs = invite.organizations as any;
  const org = (Array.isArray(orgs) ? orgs[0] : orgs) as { name: string } | null;

  return NextResponse.json({
    invite: {
      email: invite.email,
      orgName: org?.name ?? "Unknown",
    },
  });
}
