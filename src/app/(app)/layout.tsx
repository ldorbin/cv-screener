import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { getUserOrg } from "@/lib/org";
import { PLANS } from "@/lib/plans";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getUserOrg(user.id);
  let orgName = undefined;
  if (org) {
    const { data: orgData } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", org.orgId)
      .single();
    orgName = orgData?.name;
  }
  const planName = org ? PLANS[org.plan as keyof typeof PLANS]?.name : undefined;

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={user.email ?? null} orgName={orgName} planName={planName} />
      <div className="flex-1 overflow-y-auto bg-background pt-14 md:pt-0">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 md:py-10">{children}</div>
      </div>
    </div>
  );
}
