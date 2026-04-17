import { getUserOrg } from "@/lib/org";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PLANS, getPlanLimits } from "@/lib/plans";
import BillingClient from "./client";

export default async function BillingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const org = await getUserOrg(user.id);
  if (!org) throw new Error("No organisation");

  const planLimits = getPlanLimits(org.plan as any);
  const percentageUsed = planLimits.cvLimitMonthly
    ? Math.round((org.cvsScoredThisMonth / planLimits.cvLimitMonthly) * 100)
    : 0;

  const isTrialEnded = org.planStatus === "trialing" && org.trialEndsAt && new Date(org.trialEndsAt) < new Date();

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing</h1>

      {/* Current plan */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Plan</h2>

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-600">Plan</p>
            <p className="text-2xl font-bold text-gray-900">
              {PLANS[org.plan as keyof typeof PLANS]?.name ?? org.plan}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Status</p>
            <p className={`text-lg font-semibold ${org.planStatus === "active" ? "text-green-600" : org.planStatus === "trialing" ? "text-blue-600" : "text-red-600"}`}>
              {org.planStatus === "active" ? "Active" : org.planStatus === "trialing" ? "Trial" : org.planStatus}
            </p>
          </div>
        </div>

        {org.planStatus === "trialing" && org.trialEndsAt && (
          <div className={`p-4 rounded-lg ${isTrialEnded ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"}`}>
            <p className={`text-sm font-medium ${isTrialEnded ? "text-red-900" : "text-blue-900"}`}>
              {isTrialEnded
                ? "Your trial has ended. Please choose a plan to continue."
                : `Trial ends ${new Date(org.trialEndsAt).toLocaleDateString()}`}
            </p>
          </div>
        )}

        {org.planStatus === "past_due" && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm font-medium text-red-900">Payment overdue. Please update your billing details.</p>
          </div>
        )}

        {org.planStatus === "canceled" && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm font-medium text-red-900">Subscription canceled. Please resubscribe to continue.</p>
          </div>
        )}
      </div>

      {/* Usage */}
      {planLimits.cvLimitMonthly && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly CV Usage</h2>

          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{org.cvsScoredThisMonth} / {planLimits.cvLimitMonthly} CVs</span>
              <span className="text-sm font-medium text-gray-700">{percentageUsed}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition ${percentageUsed >= 100 ? "bg-red-600" : percentageUsed >= 80 ? "bg-yellow-600" : "bg-green-600"}`}
                style={{ width: `${Math.min(percentageUsed, 100)}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-gray-600">Usage resets monthly on the 1st.</p>
        </div>
      )}

      {/* Billing actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing Actions</h2>

        <div className="space-y-3">
          {org.planStatus === "active" && (
            <BillingClient orgId={org.orgId} />
          )}
          {(org.planStatus === "trialing" || org.planStatus === "canceled" || isTrialEnded) && (
            <BillingClient orgId={org.orgId} />
          )}
        </div>
      </div>
    </div>
  );
}
