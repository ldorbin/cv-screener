import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

const PLAN_LIMITS: Record<string, { seatLimit: number | null; cvLimitMonthly: number | null }> = {
  trial: { seatLimit: 2, cvLimitMonthly: 20 },
  starter: { seatLimit: 3, cvLimitMonthly: 150 },
  growth: { seatLimit: 10, cvLimitMonthly: 500 },
  agency: { seatLimit: null, cvLimitMonthly: null },
};

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "webhook secret not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const body = await request.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const orgId = session.metadata?.org_id;
        const planId = session.metadata?.plan_id;

        if (!orgId || !planId) break;

        const limits = PLAN_LIMITS[planId] ?? PLAN_LIMITS.trial;

        await supabase
          .from("organizations")
          .update({
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            plan: planId,
            plan_status: session.status === "open" ? "trialing" : "active",
            seat_limit: limits.seatLimit,
            cv_limit_monthly: limits.cvLimitMonthly,
          })
          .eq("id", orgId);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const orgId = subscription.metadata?.org_id;

        if (!orgId) break;

        // Extract plan from subscription items
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const planId = Object.entries(PLAN_LIMITS).find(([_, limits]) =>
          // In production, map priceId to planId from env vars
          false
        )?.[0] ?? "starter";

        const limits = PLAN_LIMITS[planId] ?? PLAN_LIMITS.trial;

        await supabase
          .from("organizations")
          .update({
            plan: planId,
            plan_status: subscription.status,
            seat_limit: limits.seatLimit,
            cv_limit_monthly: limits.cvLimitMonthly,
          })
          .eq("id", orgId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const orgId = subscription.metadata?.org_id;

        if (!orgId) break;

        await supabase
          .from("organizations")
          .update({ plan_status: "canceled" })
          .eq("id", orgId);
        break;
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
