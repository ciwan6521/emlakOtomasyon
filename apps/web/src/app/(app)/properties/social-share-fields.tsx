"use client";

import { Facebook, Instagram } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n/locale-context";

export interface SocialShareFlags {
  shareOnInstagram: boolean;
  shareOnFacebook: boolean;
}

/** Instagram / Facebook opt-in checkboxes shown in the listing dialogs. */
export function SocialShareFields({
  value,
  onChange,
  children,
}: {
  value: SocialShareFlags;
  onChange: (next: SocialShareFlags) => void;
  /** Optional trailing action, e.g. a "Share now" button. */
  children?: React.ReactNode;
}) {
  const t = useT();
  const rowClass =
    "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent";
  return (
    <div className="space-y-2 sm:col-span-2 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <Label>{t("property.social")}</Label>
        {children}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={rowClass}>
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={value.shareOnInstagram}
            onChange={(ev) =>
              onChange({ ...value, shareOnInstagram: ev.target.checked })
            }
          />
          <Instagram className="h-4 w-4 text-muted-foreground" />
          {t("property.shareInstagram")}
        </label>
        <label className={rowClass}>
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={value.shareOnFacebook}
            onChange={(ev) =>
              onChange({ ...value, shareOnFacebook: ev.target.checked })
            }
          />
          <Facebook className="h-4 w-4 text-muted-foreground" />
          {t("property.shareFacebook")}
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{t("property.socialHint")}</p>
    </div>
  );
}
