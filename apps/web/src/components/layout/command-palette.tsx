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

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const can = useAuth((s) => s.can);

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
      <CommandInput placeholder="Search pages, leads, properties…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {items.map((item) => (
            <CommandItem
              key={item.href}
              value={item.label}
              onSelect={() => go(item.href)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Quick actions">
          <CommandItem value="new lead" onSelect={() => go("/leads?new=1")}>
            Create lead
          </CommandItem>
          <CommandItem
            value="new property"
            onSelect={() => go("/properties?new=1")}
          >
            Create property
          </CommandItem>
          <CommandItem value="call queue" onSelect={() => go("/call-center")}>
            Open call queue
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
