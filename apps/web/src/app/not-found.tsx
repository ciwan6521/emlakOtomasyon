"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";

export default function NotFound() {
  const t = useT();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <div>
        <p className="text-5xl font-bold tracking-tight text-muted-foreground">
          404
        </p>
        <h2 className="mt-2 text-lg font-semibold">
          {t("errors.notFoundTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("errors.notFoundBody")}
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">{t("errors.backToDashboard")}</Link>
      </Button>
    </div>
  );
}
