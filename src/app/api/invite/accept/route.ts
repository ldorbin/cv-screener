import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { token } = await request.json().catch(() => ({})) as { token?: string };
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const service = createSupabaseServiceClient();

  const { data: invite } = await service
    .from("org_invites")
    .select("id, email, org_id, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "invite not found" }, { status: 404 });
  if (invite.accepted_at) return NextResponse.json({ error: "invite already used" }, { status: 400 });
  if (new Date(invite.expires_at ?? 0) < new Date()) {
    return NextResponse.json({ error: "invite expired" }, { status: 400 });
  }

  // Verify email matches (loose check — ideally would verify against pending signup)
  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return NextResponse.json({ error: "email mismatch" }, { status: 400 });
  }

  // Check if user already a member
  const { data: existing } = await service
    .from("organization_members")
    .select("id")
    .eq("org_id", invite.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "already a member" }, { status: 400 });
  }

  // Add user as member
  const { error: memberError } = await service.from("organization_members").insert({
    org_id: invite.org_id,
    user_id: user.id,
    role: invite.role,
  });

  if (memberError) {
    return NextResponse.json({ error: "failed to add member" }, { status: 500 });
  }

  // Mark invite as accepted
  await service
    .from("org_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ success: true });
}
