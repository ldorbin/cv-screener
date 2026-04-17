import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { PLANS, type PlanId } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { planId } = await request.json().catch(() => ({})) as { planId?: PlanId };
  if (!planId || planId === "trial" || !(planId in PLANS)) {
    return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  }

  const plan = PLANS[planId];
  if (!plan.stripePriceId) {
    return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  const { data: member } = await service
    .from("organization_members")
    .select("org_id, organizations(stripe_customer_id, name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "no organisation found" }, { status: 404 });

  const orgs = member.organizations as any;
  const org = (Array.isArray(orgs) ? orgs[0] : orgs) as { stripe_customer_id: string | null; name: string } | null;
  const stripe = getStripe();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let customerId = org?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: org?.name,
      metadata: { org_id: member.org_id },
    });
    customerId = customer.id;
    await service.from("organizations").update({ stripe_customer_id: customerId }).eq("id", member.org_id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14, metadata: { org_id: member.org_id } },
    success_url: `${siteUrl}/settings/billing?success=1`,
    cancel_url: `${siteUrl}/settings/billing`,
    metadata: { org_id: member.org_id, plan_id: planId },
  });

  return NextResponse.json({ url: session.url });
}
