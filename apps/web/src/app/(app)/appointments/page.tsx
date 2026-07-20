"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  MapPin,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { cn, formatDate } from "@/lib/utils";
import {
  AppointmentStatus,
  Permission,
  type AppointmentDto,
  type Paginated,
} from "@reos/shared";
import { AppointmentDialog } from "./appointment-dialog";

type ViewMode = "list" | "calendar";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function buildCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date | null; key: string }> = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push({ date: null, key: `pad-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: new Date(year, month, day),
      key: `${year}-${month}-${day}`,
    });
  }
  return cells;
}

function CalendarGrid({
  appointments,
  year,
  month,
}: {
  appointments: AppointmentDto[];
  year: number;
  month: number;
}) {
  const cells = useMemo(() => buildCalendarDays(year, month), [year, month]);

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentDto[]>();
    for (const a of appointments) {
      const d = new Date(a.startAt);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [appointments, year, month]);

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map(({ date, key }) => {
          if (!date) {
            return (
              <div
                key={key}
                className="min-h-[100px] border-b border-r bg-muted/10"
              />
            );
          }
          const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const dayAppts = byDay.get(dayKey) ?? [];
          const isToday = new Date().toDateString() === date.toDateString();

          return (
            <div key={key} className="min-h-[100px] border-b border-r p-1.5">
              <div
                className={cn(
                  "mb-1 text-xs font-medium",
                  isToday ? "text-primary" : "text-muted-foreground",
                )}
              >
                {date.getDate()}
              </div>
              <div className="space-y-1">
                {dayAppts.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] leading-tight text-primary"
                    title={a.title}
                  >
                    {new Date(a.startAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    {a.title}
                  </div>
                ))}
                {dayAppts.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{dayAppts.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState("ALL");
  const [view, setView] = useState<ViewMode>("list");
  const [creating, setCreating] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const canManage = can(Permission.APPOINTMENT_MANAGE);

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", status],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "100" });
      if (status !== "ALL") params.set("status", status);
      return api.get<Paginated<AppointmentDto>>(
        `/appointments?${params.toString()}`,
      );
    },
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      api.post(`/appointments/${id}/status`, { status }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });

  const appointments = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="Viewings and meetings calendar. Creates a task and notification for the assigned agent."
        action={
          canManage && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New appointment
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {Object.values(AppointmentStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex rounded-md border p-0.5">
          <Button
            size="sm"
            variant={view === "list" ? "default" : "ghost"}
            className="h-8"
            onClick={() => setView("list")}
          >
            <List className="mr-1 h-3.5 w-3.5" /> List
          </Button>
          <Button
            size="sm"
            variant={view === "calendar" ? "default" : "ghost"}
            className="h-8"
            onClick={() => setView("calendar")}
          >
            <LayoutGrid className="mr-1 h-3.5 w-3.5" /> Calendar
          </Button>
        </div>
      </div>

      {view === "calendar" ? (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCursor((c) => {
                  const d = new Date(c.year, c.month - 1, 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-sm font-semibold">
              {monthLabel(cursor.year, cursor.month)}
            </h3>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCursor((c) => {
                  const d = new Date(c.year, c.month + 1, 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : (
            <CalendarGrid
              appointments={appointments}
              year={cursor.year}
              month={cursor.month}
            />
          )}
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-sm">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(a.startAt)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.propertyTitle ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.customerName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.agentName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {a.location}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <Select
                        value={a.status}
                        onValueChange={(v) =>
                          changeStatus.mutate({
                            id: a.id,
                            status: v as AppointmentStatus,
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(AppointmentStatus).map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <StatusBadge value={a.status} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && appointments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No appointments yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <AppointmentDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
