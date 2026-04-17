import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserOrg } from "@/lib/org";
import TeamClient from "./client";

export default async function TeamPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const org = await getUserOrg(user.id);
  if (!org) throw new Error("No organisation");

  const isAdmin = org.role === "owner" || org.role === "admin";

  // Fetch members
  const { data: members } = await supabase
    .from("organization_members")
    .select("id, user_id, role, created_at, users(email)")
    .eq("org_id", org.orgId);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 sm:text-3xl sm:mb-8">Team</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Members</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Role</th>
                <th className="hidden sm:table-cell text-left py-3 px-4 font-semibold text-gray-900">Joined</th>
                {isAdmin && <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members?.map((member: any) => (
                <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{member.users?.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      member.role === "owner" ? "bg-purple-100 text-purple-900" :
                      member.role === "admin" ? "bg-blue-100 text-blue-900" :
                      "bg-gray-100 text-gray-900"
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell py-3 px-4 text-sm text-gray-600">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-4">
                      {member.user_id !== user.id && (
                        <button className="text-sm text-red-600 hover:text-red-700">
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Invite Member</h2>
          <TeamClient orgId={org.orgId} />
        </div>
      )}
    </div>
  );
}
