"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiDownload } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { useT } from "@/lib/i18n/locale-context";
import { Permission, Scope } from "@reos/shared";

export function ExportCsvButton({
  resource,
}: {
  resource: "leads" | "properties" | "customers" | "deals";
}) {
  const t = useT();
  const can = useAuth((s) => s.can);
  const [busy, setBusy] = useState(false);

  if (!can(Permission.DATA_EXPORT, Scope.BRANCH)) return null;

  const download = async () => {
    setBusy(true);
    try {
      await apiDownload(`/exports/${resource}.csv`, `${resource}.csv`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" size="sm" disabled={busy} onClick={download}>
      {busy ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-1.5 h-4 w-4" />
      )}
      {t("common.exportCsv")}
    </Button>
  );
}
