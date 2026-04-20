import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrg } from "@/lib/org";
import type { PipelineStage } from "@/types";

const VALID_STAGES: PipelineStage[] = ['new', 'shortlisted', 'phone', 'interview', 'offer', 'rejected'];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { stage } = await request.json().catch(() => ({}));
    if (!stage || !VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: "invalid stage" }, { status: 400 });
    }

    const org = await getUserOrg(user.id);
    if (!org) return NextResponse.json({ error: "no organisation" }, { status: 403 });

    const { error } = await supabase
      .from("cvs")
      .update({ stage })
      .eq("id", id)
      .eq("org_id", org.orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal error" }, { status: 500 });
  }
}
