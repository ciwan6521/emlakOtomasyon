"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { NotificationDto } from "@reos/shared";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: count } = useQuery({
    queryKey: ["notifications", "count"],
    queryFn: () => api.get<{ count: number }>("/notifications/count"),
    refetchInterval: 60000,
  });

  const { data: items } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => api.get<NotificationDto[]>("/notifications"),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = count?.count ?? 0;

  const open = (n: NotificationDto) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.link) router.push(n.link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Bildirimler</span>
          {unread > 0 && (
            <button
              onClick={() => markAll.mutate()}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {(!items || items.length === 0) && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Bildirim yok
            </p>
          )}
          {items?.map((n) => (
            <button
              key={n.id}
              onClick={() => open(n)}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 border-b px-3 py-2.5 text-left transition-colors hover:bg-accent",
                !n.read && "bg-primary/5",
              )}
            >
              <div className="flex w-full items-center gap-2">
                {!n.read && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                )}
                <span className="text-sm font-medium leading-tight">
                  {n.title}
                </span>
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                  {timeAgo(n.createdAt)}
                </span>
              </div>
              {n.body && (
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {n.body}
                </span>
              )}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
