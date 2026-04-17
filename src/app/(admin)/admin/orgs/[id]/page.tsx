import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PlanOverride, EditName, AddMember, RemoveMember, DeleteOrg } from "./client";

export default async function AdminOrgDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = createSupabaseServiceClient();

  const { data: org } = await supabase.from("organizations").select("*").eq("id", id).single();
  if (!org) notFound();

  const { data: members } = await supabase
    .from("organization_members")
    .select("id, role, created_at, user_id")
    .eq("org_id", id)
    .order("created_at");

  // Get emails for all member user IDs
  const userIds = (members ?? []).map((m) => m.user_id);
  const emailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    users.forEach((u) => { emailMap[u.id] = u.email ?? u.id; });
  }

  const planLabel = org.plan === "trial" ? "Trial" : PLANS[org.plan as keyof typeof PLANS]?.name ?? org.plan;
  const cvUsage = org.cv_limit_monthly
    ? `${org.cvs_scored_this_month} / ${org.cv_limit_monthly}`
    : `${org.cvs_scored_this_month} (unlimited)`;

  const statusColor: Record<string, string> = {
    active: "text-green-600",
    trialing: "text-blue-600",
    past_due: "text-yellow-600",
    canceled: "text-red-600",
  };

  const roleColor: Record<string, string> = {
    owner: "bg-purple-100 text-purple-800",
    admin: "bg-blue-100 text-blue-800",
    member: "bg-gray-100 text-gray-700",
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/orgs" className="hover:text-primary">Organisations</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{org.name}</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{org.name}</h1>
        <DeleteOrg orgId={id} orgName={org.name} />
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Details + edit name */}
        <div className="bg-white rounded-lg shadow p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Details</h2>
          <EditName orgId={id} currentName={org.name} />
          <dl className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Plan</dt>
              <dd className="font-medium text-gray-900">{planLabel}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Status</dt>
              <dd className={`font-medium ${statusColor[org.plan_status] ?? "text-gray-900"}`}>{org.plan_status}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">CVs this month</dt>
              <dd className="font-medium text-gray-900">{cvUsage}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Seat limit</dt>
              <dd className="font-medium text-gray-900">{org.seat_limit ?? "Unlimited"}</dd>
            </div>
            {org.trial_ends_at && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Trial ends</dt>
                <dd className="font-medium text-gray-900">{new Date(org.trial_ends_at).toLocaleDateString()}</dd>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Created</dt>
              <dd className="font-medium text-gray-900">{new Date(org.created_at).toLocaleDateString()}</dd>
            </div>
            {org.stripe_customer_id && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Stripe customer</dt>
                <dd className="font-mono text-xs text-gray-700">{org.stripe_customer_id}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Plan override */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Override plan</h2>
          <PlanOverride orgId={id} currentPlan={org.plan} currentStatus={org.plan_status} />
        </div>
      </div>

      {/* Members */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Members ({members?.length ?? 0})</h2>
        </div>

        {/* Add member */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Add member</p>
          <AddMember orgId={id} />
          <p className="mt-2 text-xs text-gray-400">
            If the email isn&apos;t registered yet, an invite link will be sent automatically.
          </p>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Email", "Role", "Joined", ""].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(members ?? []).map((m) => (
              <tr key={m.id}>
                <td className="px-6 py-3 text-sm text-gray-900">{emailMap[m.user_id] ?? m.user_id}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[m.role] ?? "bg-gray-100 text-gray-700"}`}>
                    {m.role}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-500">{new Date(m.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-3 text-right">
                  <RemoveMember orgId={id} memberId={m.id} email={emailMap[m.user_id] ?? m.user_id} />
                </td>
              </tr>
            ))}
            {!members?.length && (
              <tr><td colSpan={4} className="px-6 py-6 text-sm text-center text-gray-400">No members yet — add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
