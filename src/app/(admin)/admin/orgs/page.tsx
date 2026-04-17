import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminOrgsPage() {
  const supabase = createSupabaseServiceClient();

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, plan, plan_status, cvs_scored_this_month, cv_limit_monthly, trial_ends_at, created_at")
    .order("created_at", { ascending: false });

  const { data: memberCounts } = await supabase
    .from("organization_members")
    .select("org_id");

  const countMap = (memberCounts ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.org_id] = (acc[m.org_id] ?? 0) + 1;
    return acc;
  }, {});

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    trialing: "bg-blue-100 text-blue-800",
    past_due: "bg-yellow-100 text-yellow-800",
    canceled: "bg-red-100 text-red-800",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Organisations</h1>
        <Link href="/admin/orgs/new">
          <Button>New organisation</Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Name", "Plan", "Status", "Members", "CVs this month", "Trial ends", "Created"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(orgs ?? []).map((org) => {
              const planLabel = org.plan === "trial" ? "Trial" : PLANS[org.plan as keyof typeof PLANS]?.name ?? org.plan;
              const members = countMap[org.id] ?? 0;
              const cvUsage = org.cv_limit_monthly
                ? `${org.cvs_scored_this_month}/${org.cv_limit_monthly}`
                : `${org.cvs_scored_this_month} (∞)`;
              return (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orgs/${org.id}`} className="text-sm font-medium text-primary hover:underline">
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{planLabel}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[org.plan_status] ?? "bg-gray-100 text-gray-700"}`}>
                      {org.plan_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{members}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{cvUsage}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {org.trial_ends_at ? new Date(org.trial_ends_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!orgs?.length && (
          <p className="text-center text-sm text-gray-500 py-10">No organisations yet.</p>
        )}
      </div>
    </div>
  );
}
