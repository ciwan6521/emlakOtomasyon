"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { NAV_ITEMS } from "@/lib/nav";
import { useAuth } from "@/lib/auth-store";
import { Scope } from "@reos/shared";
import { NAV_LABEL_KEYS } from "@/lib/i18n/messages";
import { useT } from "@/lib/i18n/locale-context";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const can = useAuth((s) => s.can);
  const t = useT();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const items = NAV_ITEMS.filter(
    (i) =>
      !i.permission ||
      can(i.permission, Scope.BRANCH) ||
      can(i.permission, Scope.OWN),
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t("common.searchPlaceholder")} />
      <CommandList>
        <CommandEmpty>{t("common.noResults")}</CommandEmpty>
        <CommandGroup heading={t("common.navigate")}>
          {items.map((item) => (
            <CommandItem
              key={item.href}
              value={item.label}
              onSelect={() => go(item.href)}
            >
              <item.icon className="h-4 w-4" />
              {NAV_LABEL_KEYS[item.href]
                ? t(NAV_LABEL_KEYS[item.href])
                : item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading={t("common.quickActions")}>
          <CommandItem value="new lead" onSelect={() => go("/leads?new=1")}>
            {t("common.createLead")}
          </CommandItem>
          <CommandItem
            value="new property"
            onSelect={() => go("/properties?new=1")}
          >
            {t("common.createProperty")}
          </CommandItem>
          <CommandItem value="call queue" onSelect={() => go("/call-center")}>
            {t("common.openCallQueue")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
