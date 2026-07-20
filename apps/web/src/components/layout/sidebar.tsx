"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { Scope } from "@reos/shared";

const GROUPS = [
  "Operations",
  "Portfolio",
  "Growth",
  "Insights",
  "Admin",
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const can = useAuth((s) => s.can);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card/40 lg:flex">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Building className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">REOS</span>
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          v1.0
        </span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {GROUPS.map((group) => {
          const items = NAV_ITEMS.filter(
            (i) =>
              i.group === group &&
              (!i.permission ||
                can(i.permission, Scope.BRANCH) ||
                can(i.permission, Scope.OWN)),
          );
          if (items.length === 0) return null;
          return (
            <div key={group}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
