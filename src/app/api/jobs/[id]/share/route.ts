import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrg } from "@/lib/org";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: jobSpecId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data } = await supabase
      .from("shortlist_shares")
      .select("id, token, created_at")
      .eq("job_spec_id", jobSpecId)
      .maybeSingle();

    return NextResponse.json({ share: data ?? null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal error" }, { status: 500 });
  }
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: jobSpecId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const org = await getUserOrg(user.id);
    if (!org) return NextResponse.json({ error: "no organisation" }, { status: 403 });

    // Return existing if present
    const { data: existing } = await supabase
      .from("shortlist_shares")
      .select("id, token")
      .eq("job_spec_id", jobSpecId)
      .maybeSingle();

    if (existing) return NextResponse.json({ share: existing });

    const { data, error } = await supabase
      .from("shortlist_shares")
      .insert({
        job_spec_id: jobSpecId,
        org_id: org.orgId,
        created_by: user.id,
      })
      .select("id, token")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ share: data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: jobSpecId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const org = await getUserOrg(user.id);
    if (!org) return NextResponse.json({ error: "no organisation" }, { status: 403 });

    const { error } = await supabase
      .from("shortlist_shares")
      .delete()
      .eq("job_spec_id", jobSpecId)
      .eq("org_id", org.orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal error" }, { status: 500 });
  }
}
