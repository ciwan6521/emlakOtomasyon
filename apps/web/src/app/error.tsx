"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div>
        <h2 className="text-lg font-semibold">{t("common.error")}</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {error.message || t("errors.unexpectedPage")}
        </p>
      </div>
      <Button onClick={reset}>{t("common.retry")}</Button>
    </div>
  );
}
