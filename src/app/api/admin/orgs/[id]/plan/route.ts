import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { getPlanLimits, type PlanId } from "@/lib/plans";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  // Verify caller is admin
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!adminEmails.includes((user.email ?? "").toLowerCase())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { plan, status } = await request.json().catch(() => ({})) as { plan?: string; status?: string };
  if (!plan || !status) return NextResponse.json({ error: "plan and status required" }, { status: 400 });

  const validPlans = ["trial", "starter", "growth", "agency"];
  const validStatuses = ["trialing", "active", "past_due", "canceled"];
  if (!validPlans.includes(plan) || !validStatuses.includes(status)) {
    return NextResponse.json({ error: "invalid plan or status" }, { status: 400 });
  }

  const limits = getPlanLimits(plan as PlanId);
  const service = createSupabaseServiceClient();

  const { error } = await service
    .from("organizations")
    .update({
      plan,
      plan_status: status,
      seat_limit: limits.seatLimit,
      cv_limit_monthly: limits.cvLimitMonthly,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
