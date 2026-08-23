"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { useAuth } from "@/lib/auth-store";
import { useRealtime } from "@/lib/use-realtime";
import { useT } from "@/lib/i18n/locale-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, hydrate } = useAuth();
  const router = useRouter();
  const t = useT();
  useRealtime();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 lg:p-6">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
