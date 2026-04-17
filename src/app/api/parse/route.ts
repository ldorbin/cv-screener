import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseFile } from "@/lib/parse";
import { getUserOrg } from "@/lib/org";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const jobSpecId = form.get("jobSpecId");

  if (!(file instanceof File) || typeof jobSpecId !== "string") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "file too large (max 10MB)" }, { status: 413 });
  }

  // Get user's org
  const org = await getUserOrg(user.id);
  if (!org) {
    return NextResponse.json({ error: "no organisation" }, { status: 403 });
  }

  // Verify the job spec belongs to this org/user
  const { data: job, error: jobErr } = await supabase
    .from("job_specs")
    .select("id, org_id")
    .eq("id", jobSpecId)
    .single();
  if (jobErr || !job) {
    return NextResponse.json({ error: "job not found" }, { status: 404 });
  }
  if (job.org_id && job.org_id !== org.orgId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let parsed;
  try {
    parsed = await parseFile(buffer, file.name);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "parse failed" },
      { status: 422 },
    );
  }

  // Upload original file to storage under <user_id>/<jobSpecId>/<timestamp>-<name>
  const storagePath = `${user.id}/${jobSpecId}/${Date.now()}-${file.name}`;
  const { error: uploadErr } = await supabase.storage
    .from("cvs")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
    });
  if (uploadErr) {
    return NextResponse.json(
      { error: `storage: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  const { data: cv, error: insertErr } = await supabase
    .from("cvs")
    .insert({
      user_id: user.id,
      job_spec_id: jobSpecId,
      candidate_name: parsed.candidateName,
      file_path: storagePath,
      file_name: file.name,
      parsed_text: parsed.text,
      status: "pending",
      org_id: org.orgId,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ cv });
}
