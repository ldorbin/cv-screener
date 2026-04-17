import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

function isAdmin(email: string | undefined) {
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes((email ?? "").toLowerCase());
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string; memberId: string }> }) {
  const { id: orgId, memberId } = await props.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const service = createSupabaseServiceClient();
  const { error } = await service.from("organization_members").delete().eq("id", memberId).eq("org_id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
