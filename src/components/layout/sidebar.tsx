"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, CreditCard, LayoutDashboard, LogOut, Menu, Sparkles, UserSearch, Users, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Job specs", icon: Briefcase },
  { href: "/candidates", label: "Candidates", icon: UserSearch },
];

const settingsItems = [
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/settings/team", label: "Team", icon: Users },
];

export function Sidebar({
  userEmail,
  orgName,
  planName,
}: {
  userEmail: string | null;
  orgName?: string;
  planName?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const close = () => setMobileOpen(false);

  const navContent = (
    <>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={close}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
        <div className="my-4 border-t border-border/60" />
        {settingsItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={close}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/60 p-3">
        {orgName && (
          <div className="mb-3 px-3">
            <div className="truncate text-xs font-semibold text-foreground">{orgName}</div>
            {planName && <div className="text-xs text-muted-foreground">{planName}</div>}
          </div>
        )}
        <div className="mb-2 truncate px-3 py-2 text-xs text-muted-foreground">{userEmail ?? ""}</div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-card px-4 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={close}>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          HireIQ
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2 text-muted-foreground hover:bg-secondary"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border/60 bg-card shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-border/60 px-4">
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={close}>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                HireIQ
              </Link>
              <button onClick={close} aria-label="Close menu" className="rounded-md p-2 text-muted-foreground hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 flex-col border-r border-border/60 bg-card">
        <Link href="/dashboard" className="flex h-16 items-center gap-2 border-b border-border/60 px-6 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          HireIQ
        </Link>
        {navContent}
      </aside>
    </>
  );
}
