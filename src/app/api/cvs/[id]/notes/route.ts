import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrg } from "@/lib/org";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: cvId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { content } = await request.json().catch(() => ({}));
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }

    const org = await getUserOrg(user.id);
    if (!org) return NextResponse.json({ error: "no organisation" }, { status: 403 });

    const { data, error } = await supabase
      .from("cv_notes")
      .insert({
        cv_id: cvId,
        org_id: org.orgId,
        user_id: user.id,
        author_email: user.email,
        content: content.trim(),
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ note: data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: cvId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("cv_notes")
      .select("*")
      .eq("cv_id", cvId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ notes: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal error" }, { status: 500 });
  }
}
