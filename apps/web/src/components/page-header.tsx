"use client";

import { useT } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";

/**
 * Pass `titleKey`/`descriptionKey` for translated headings, or the plain
 * `title`/`description` props for values that are already data (a customer
 * name, for example).
 */
export function PageHeader({
  title,
  titleKey,
  description,
  descriptionKey,
  action,
}: {
  title?: string;
  titleKey?: MessageKey;
  description?: string;
  descriptionKey?: MessageKey;
  action?: React.ReactNode;
}) {
  const t = useT();
  const heading = titleKey ? t(titleKey) : title;
  const sub = descriptionKey ? t(descriptionKey) : description;

  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{heading}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
