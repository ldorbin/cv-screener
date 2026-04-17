export type PlanId = "trial" | "starter" | "growth" | "agency";

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  seatLimit: number | null;
  cvLimitMonthly: number | null;
  stripePriceId: string | null;
  features: string[];
}

export const PLANS: Record<Exclude<PlanId, "trial">, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: "£79/mo",
    seatLimit: 3,
    cvLimitMonthly: 150,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? null,
    features: ["3 recruiter seats", "150 CVs/month", "Knockout criteria", "HM briefs", "CSV & PDF export"],
  },
  growth: {
    id: "growth",
    name: "Growth",
    price: "£199/mo",
    seatLimit: 10,
    cvLimitMonthly: 500,
    stripePriceId: process.env.STRIPE_PRICE_GROWTH ?? null,
    features: ["10 recruiter seats", "500 CVs/month", "Everything in Starter", "Shortlist comparison", "Priority support"],
  },
  agency: {
    id: "agency",
    name: "Agency",
    price: "£449/mo",
    seatLimit: null,
    cvLimitMonthly: null,
    stripePriceId: process.env.STRIPE_PRICE_AGENCY ?? null,
    features: ["Unlimited seats", "Unlimited CVs", "Everything in Growth", "Dedicated onboarding"],
  },
};

export function getPlanLimits(plan: PlanId): { seatLimit: number | null; cvLimitMonthly: number | null } {
  if (plan === "trial") return { seatLimit: 2, cvLimitMonthly: 20 };
  return { seatLimit: PLANS[plan].seatLimit, cvLimitMonthly: PLANS[plan].cvLimitMonthly };
}
