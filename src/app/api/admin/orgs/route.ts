import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { getPlanLimits, type PlanId } from "@/lib/plans";

function isAdmin(email: string | undefined) {
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes((email ?? "").toLowerCase());
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { name, plan, ownerEmail } = await request.json().catch(() => ({})) as {
    name?: string; plan?: string; ownerEmail?: string;
  };
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const resolvedPlan = (plan ?? "trial") as PlanId;
  const limits = getPlanLimits(resolvedPlan);
  const service = createSupabaseServiceClient();

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();

  const { data: org, error: orgErr } = await service
    .from("organizations")
    .insert({
      name: name.trim(),
      slug,
      plan: resolvedPlan,
      plan_status: resolvedPlan === "trial" ? "trialing" : "active",
      seat_limit: limits.seatLimit,
      cv_limit_monthly: limits.cvLimitMonthly,
    })
    .select("id")
    .single();

  if (orgErr || !org) return NextResponse.json({ error: orgErr?.message ?? "Failed to create org" }, { status: 500 });

  if (ownerEmail?.trim()) {
    // Look up existing user or invite them
    const { data: { users } } = await service.auth.admin.listUsers();
    const existing = users.find((u) => u.email?.toLowerCase() === ownerEmail.trim().toLowerCase());

    let ownerId: string;
    if (existing) {
      ownerId = existing.id;
    } else {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const { data: invited, error: invErr } = await service.auth.admin.inviteUserByEmail(ownerEmail.trim(), {
        redirectTo: `${siteUrl}/dashboard`,
      });
      if (invErr || !invited.user) {
        await service.from("organizations").delete().eq("id", org.id);
        return NextResponse.json({ error: invErr?.message ?? "Failed to invite user" }, { status: 500 });
      }
      ownerId = invited.user.id;
    }

    await service.from("organization_members").insert({ org_id: org.id, user_id: ownerId, role: "owner" });
  }

  return NextResponse.json({ id: org.id });
}
