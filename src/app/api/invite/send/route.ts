import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { email, role } = await request.json().catch(() => ({})) as { email?: string; role?: string };
  if (!email?.trim()) return NextResponse.json({ error: "email required" }, { status: 400 });

  const service = createSupabaseServiceClient();

  // Check that user is owner/admin
  const { data: member } = await service
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || !["owner", "admin"].includes(member.role)) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  // Create invite
  const { data: invite, error } = await service
    .from("org_invites")
    .insert({
      org_id: member.org_id,
      email: email.toLowerCase(),
      role: role || "member",
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "failed to create invite" }, { status: 500 });
  }

  return NextResponse.json({ token: invite.token });
}
