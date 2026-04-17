import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

function isAdmin(email: string | undefined) {
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes((email ?? "").toLowerCase());
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id: orgId } = await props.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { email, role } = await request.json().catch(() => ({})) as { email?: string; role?: string };
  if (!email?.trim()) return NextResponse.json({ error: "email required" }, { status: 400 });
  const resolvedRole = role ?? "member";

  const service = createSupabaseServiceClient();

  // Check org exists
  const { data: org } = await service.from("organizations").select("id").eq("id", orgId).single();
  if (!org) return NextResponse.json({ error: "org not found" }, { status: 404 });

  // Look up or invite user
  const { data: { users } } = await service.auth.admin.listUsers();
  const existing = users.find((u) => u.email?.toLowerCase() === email.trim().toLowerCase());

  let memberId: string;
  let invited = false;
  if (existing) {
    memberId = existing.id;
  } else {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { data: inv, error: invErr } = await service.auth.admin.inviteUserByEmail(email.trim(), {
      redirectTo: `${siteUrl}/dashboard`,
    });
    if (invErr || !inv.user) return NextResponse.json({ error: invErr?.message ?? "Failed to invite user" }, { status: 500 });
    memberId = inv.user.id;
    invited = true;
  }

  // Check not already a member
  const { data: existing_member } = await service
    .from("organization_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", memberId)
    .maybeSingle();
  if (existing_member) return NextResponse.json({ error: "already a member" }, { status: 409 });

  const { error } = await service.from("organization_members").insert({ org_id: orgId, user_id: memberId, role: resolvedRole });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, invited });
}
