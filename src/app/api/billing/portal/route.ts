import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id, organizations(stripe_customer_id)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) return NextResponse.json({ error: "no organisation found" }, { status: 404 });

  const orgs = member.organizations as any;
  const org = (Array.isArray(orgs) ? orgs[0] : orgs) as { stripe_customer_id: string | null } | null;
  if (!org?.stripe_customer_id) {
    return NextResponse.json({ error: "no stripe customer" }, { status: 400 });
  }

  const stripe = getStripe();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${siteUrl}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
