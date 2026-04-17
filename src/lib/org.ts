import { createSupabaseServiceClient } from "./supabase/server";

export interface OrgContext {
  orgId: string;
  role: string;
  plan: string;
  planStatus: string;
  trialEndsAt: string | null;
  cvLimitMonthly: number | null;
  cvsScoredThisMonth: number;
  seatLimit: number | null;
}

export async function getUserOrg(userId: string): Promise<OrgContext | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("organization_members")
    .select("role, org_id, organizations(plan, plan_status, trial_ends_at, cv_limit_monthly, cvs_scored_this_month, seat_limit, usage_reset_at)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const orgs = data.organizations as any;
  const org = (Array.isArray(orgs) ? orgs[0] : orgs) as {
    plan: string;
    plan_status: string;
    trial_ends_at: string | null;
    cv_limit_monthly: number | null;
    cvs_scored_this_month: number;
    seat_limit: number | null;
    usage_reset_at: string;
  } | null;
  if (!org) return null;

  return {
    orgId: data.org_id,
    role: data.role,
    plan: org.plan,
    planStatus: org.plan_status,
    trialEndsAt: org.trial_ends_at,
    cvLimitMonthly: org.cv_limit_monthly,
    cvsScoredThisMonth: org.cvs_scored_this_month,
    seatLimit: org.seat_limit,
  };
}

export async function checkScoringAllowed(
  orgId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = createSupabaseServiceClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("plan, plan_status, trial_ends_at, cv_limit_monthly, cvs_scored_this_month, usage_reset_at")
    .eq("id", orgId)
    .single();

  if (!org) return { allowed: false, reason: "Organisation not found" };

  // Reset monthly counter if past reset date
  if (new Date(org.usage_reset_at) < new Date()) {
    await supabase
      .from("organizations")
      .update({
        cvs_scored_this_month: 0,
        usage_reset_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
      })
      .eq("id", orgId);
    org.cvs_scored_this_month = 0;
  }

  const status = org.plan_status;
  if (status === "canceled") return { allowed: false, reason: "Subscription canceled. Please resubscribe to continue scoring." };
  if (status === "past_due") return { allowed: false, reason: "Payment overdue. Please update your billing details." };
  if (status === "trialing" && org.trial_ends_at && new Date(org.trial_ends_at) < new Date()) {
    return { allowed: false, reason: "Free trial has ended. Please choose a plan to continue." };
  }

  if (org.cv_limit_monthly !== null && org.cvs_scored_this_month >= org.cv_limit_monthly) {
    return { allowed: false, reason: `Monthly CV limit of ${org.cv_limit_monthly} reached. Upgrade your plan or wait until next month.` };
  }

  return { allowed: true };
}

export async function incrementCvCount(orgId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase.rpc("increment_cv_count", { oid: orgId });
}
