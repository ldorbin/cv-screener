import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Building2, LayoutDashboard, LogOut, Sparkles } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!adminEmails.includes((user.email ?? "").toLowerCase())) redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border/60 bg-card">
        <Link href="/admin" className="flex h-16 items-center gap-2 border-b border-border/60 px-6 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          Admin
        </Link>
        <nav className="flex-1 space-y-1 p-3">
          <Link href="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </Link>
          <Link href="/admin/orgs" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Building2 className="h-4 w-4" />
            Organisations
          </Link>
        </nav>
        <div className="border-t border-border/60 p-3">
          <div className="mb-2 truncate px-3 py-2 text-xs text-muted-foreground">{user.email}</div>
          <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <LogOut className="h-4 w-4" />
            Back to app
          </Link>
        </div>
      </aside>
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto w-full max-w-6xl px-8 py-10">{children}</div>
      </div>
    </div>
  );
}
