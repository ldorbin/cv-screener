import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";

export default async function AdminOverviewPage() {
  const supabase = createSupabaseServiceClient();

  const [{ data: orgs }, { count: userCount }] = await Promise.all([
    supabase.from("organizations").select("plan, plan_status, cvs_scored_this_month"),
    supabase.from("organization_members").select("id", { count: "exact", head: true }),
  ]);

  const totalOrgs = orgs?.length ?? 0;
  const totalCVs = orgs?.reduce((sum, o) => sum + (o.cvs_scored_this_month ?? 0), 0) ?? 0;

  const byPlan = (orgs ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.plan] = (acc[o.plan] ?? 0) + 1;
    return acc;
  }, {});

  const byStatus = (orgs ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.plan_status] = (acc[o.plan_status] ?? 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: "Organisations", value: totalOrgs },
    { label: "Total users", value: userCount ?? 0 },
    { label: "CVs scored this month", value: totalCVs },
  ];

  const planOrder = ["trial", "starter", "growth", "agency"];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Overview</h1>

      <div className="grid grid-cols-3 gap-6 mb-10">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plans</h2>
          <div className="space-y-3">
            {planOrder.map((plan) => {
              const count = byPlan[plan] ?? 0;
              const label = plan === "trial" ? "Trial" : PLANS[plan as keyof typeof PLANS]?.name ?? plan;
              return (
                <div key={plan} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{label}</span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription Status</h2>
          <div className="space-y-3">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className={`text-sm capitalize ${status === "active" ? "text-green-600" : status === "trialing" ? "text-blue-600" : "text-red-600"}`}>
                  {status}
                </span>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
