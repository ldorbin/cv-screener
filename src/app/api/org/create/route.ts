import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { name } = await request.json().catch(() => ({})) as { name?: string };
  if (!name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();

  // Check if user already has an org
  const { data: existing } = await service
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "user already has an organisation" }, { status: 400 });
  }

  // Create slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Create org
  const { data: org, error: orgError } = await service
    .from("organizations")
    .insert({
      name,
      slug: `${slug}-${Date.now()}`, // Ensure uniqueness
      plan: "trial",
      plan_status: "trialing",
    })
    .select("id")
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: "failed to create organisation" }, { status: 500 });
  }

  // Add user as owner
  const { error: memberError } = await service.from("organization_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return NextResponse.json({ error: "failed to add member" }, { status: 500 });
  }

  return NextResponse.json({ orgId: org.id });
}
