"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import {
  Activity,
  AlarmClock,
  Bell,
  Building2,
  CalendarDays,
  CheckSquare,
  DollarSign,
  Home,
  KeyRound,
  PhoneCall,
  PhoneOutgoing,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/page-header";

import { StatCard } from "@/components/stat-card";

import { Badge } from "@/components/ui/badge";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Skeleton } from "@/components/ui/skeleton";

import { useRealtime } from "@/lib/use-realtime";

import { api } from "@/lib/api";

import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

import type { DashboardData, RentalOverview, TaskDto } from "@reos/shared";

const SEVERITY: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",

  medium: "bg-warning/10 text-warning border-warning/30",

  low: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_VARIANT = {
  LOW: "secondary",
  MEDIUM: "default",
  HIGH: "warning",
  URGENT: "destructive",
} as const;

export default function DashboardPage() {
  useRealtime();

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "dashboard"],

    queryFn: () => api.get<DashboardData>("/analytics/dashboard"),

    refetchInterval: 60_000,
  });

  const { data: rental } = useQuery({
    queryKey: ["rentals", "overview"],

    queryFn: () => api.get<RentalOverview>("/rentals/overview"),

    refetchInterval: 60_000,
  });

  const k = data?.kpis;

  const trend = (k?.trend.leads ?? []).map((v, i) => ({
    day: `D${i + 1}`,
    leads: v,
    calls: k?.trend.calls[i] ?? 0,
  }));

  const regionData = (data?.regions ?? []).map((r) => ({
    region: r.region.replace(/_/g, " "),
    active: r.activeListings,
    sold: r.sold,
  }));

  return (
    <div>
      <PageHeader
        titleKey="page.dashboard.title"
        descriptionKey="page.dashboard.subtitle"
      />

      {isLoading || !k ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active portfolio"
              value={formatNumber(k.activeListings)}
              sub={`${k.forSale} sale · ${k.forRent} rent`}
              icon={Building2}
              accent="primary"
            />

            <StatCard
              label="Leads today"
              value={formatNumber(k.dailyLeads)}
              icon={Target}
              accent="primary"
            />

            <StatCard
              label="Calls today"
              value={formatNumber(k.callsMade)}
              icon={PhoneCall}
              accent="primary"
            />

            <StatCard
              label="Pending callbacks"
              value={formatNumber(k.callbacksPending)}
              icon={PhoneOutgoing}
              accent="warning"
            />

            <StatCard
              label="Today's appointments"
              value={formatNumber(k.appointmentsToday)}
              icon={CalendarDays}
              accent="primary"
            />

            <StatCard
              label="New listings (7d)"
              value={formatNumber(k.newListingsThisWeek)}
              icon={Home}
              accent="success"
            />

            <StatCard
              label="Sold this month"
              value={formatNumber(k.soldThisMonth)}
              sub={`${k.rentedThisMonth} rented`}
              icon={KeyRound}
              accent="success"
            />

            <StatCard
              label="Commission this month"
              value={formatCurrency(k.commissionThisMonth)}
              icon={DollarSign}
              accent="success"
            />
          </div>

          {rental && (
            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Rental operations
                </h2>

                <Link
                  href="/rentals"
                  className="text-xs text-primary hover:underline"
                >
                  View all →
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Active leases"
                  value={formatNumber(rental.activeLeases)}
                  icon={KeyRound}
                  accent="primary"
                />

                <StatCard
                  label="Overdue payments"
                  value={formatNumber(rental.overduePayments)}
                  icon={AlarmClock}
                  accent="warning"
                />

                <StatCard
                  label="Open maintenance"
                  value={formatNumber(rental.openMaintenance)}
                  icon={Activity}
                  accent="warning"
                />

                <StatCard
                  label="Collected this month"
                  value={formatCurrency(rental.monthlyRentCollected)}
                  icon={DollarSign}
                  accent="success"
                />
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Conversion rate"
              value={`${k.conversionRate}%`}
              icon={TrendingUp}
              accent="success"
            />

            <StatCard
              label="Call center conversion"
              value={`${data?.callCenterConversion ?? 0}%`}
              icon={PhoneCall}
              accent="success"
            />

            <StatCard
              label="Sales closed (all-time)"
              value={formatNumber(k.salesClosed)}
              icon={Activity}
              accent="primary"
            />

            <StatCard
              label="Revenue (all-time)"
              value={formatCurrency(k.revenue)}
              icon={DollarSign}
              accent="success"
            />
          </div>
        </>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Leads & calls — last 7 days</CardTitle>
          </CardHeader>

          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.4}
                    />

                    <stop
                      offset="95%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />

                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="hsl(var(--primary))"
                  fill="url(#g1)"
                  strokeWidth={2}
                />

                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="hsl(var(--success))"
                  fillOpacity={0}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by region</CardTitle>
          </CardHeader>

          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={regionData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  vertical={false}
                />

                <XAxis
                  dataKey="region"
                  tickLine={false}
                  axisLine={false}
                  className="text-[10px]"
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={50}
                />

                <YAxis hide />

                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />

                <Bar
                  dataKey="active"
                  name="Active"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />

                <Bar
                  dataKey="sold"
                  name="Sold"
                  fill="hsl(var(--success))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-warning" /> Top sellers
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {(data?.topSellers ?? []).map((a, i) => (
              <div key={a.agentId} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {i + 1}
                </span>

                <span className="flex-1 truncate text-sm font-medium">
                  {a.agentName}
                </span>

                <span className="text-sm text-muted-foreground">
                  {formatCurrency(a.value)}
                </span>
              </div>
            ))}

            {(!data?.topSellers || data.topSellers.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No closed deals yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" /> Top portfolio builders
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {(data?.topPortfolioBuilders ?? []).map((a, i) => (
              <div key={a.agentId} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {i + 1}
                </span>

                <span className="flex-1 truncate text-sm font-medium">
                  {a.agentName}
                </span>

                <span className="text-sm text-muted-foreground">
                  {a.value} listings
                </span>
              </div>
            ))}

            {(!data?.topPortfolioBuilders ||
              data.topPortfolioBuilders.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No portfolio data yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Newly uploaded listings
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            {(data?.recentListings ?? []).map((p) => (
              <Link
                key={p.id}
                href={`/properties`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <span className="truncate">{p.title}</span>

                <span className="ml-2 shrink-0 text-muted-foreground">
                  {formatCurrency(p.price)}
                </span>
              </Link>
            ))}

            {(!data?.recentListings || data.recentListings.length === 0) && (
              <p className="text-sm text-muted-foreground">No listings yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" /> Pending tasks
            </CardTitle>

            <Link
              href="/tasks"
              className="text-xs text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>

          <CardContent className="space-y-2">
            {(data?.pendingTasks ?? []).map((task) => (
              <PendingTaskRow key={task.id} task={task} />
            ))}

            {(!data?.pendingTasks || data.pendingTasks.length === 0) && (
              <p className="text-sm text-muted-foreground">No pending tasks.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlarmClock className="h-4 w-4 text-destructive" /> Alarm center
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            {(data?.alarms ?? []).map((a) => (
              <Link
                key={a.id}
                href={a.link}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${SEVERITY[a.severity]}`}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.title}</p>

                  <p className="truncate text-xs opacity-80">{a.detail}</p>
                </div>

                <span className="ml-2 shrink-0 text-xs uppercase">
                  {a.severity}
                </span>
              </Link>
            ))}

            {(!data?.alarms || data.alarms.length === 0) && (
              <p className="text-sm text-muted-foreground">
                All clear — no active alarms.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PendingTaskRow({ task }: { task: TaskDto }) {
  return (
    <Link
      href="/tasks"
      className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{task.title}</p>

        <p className="text-xs text-muted-foreground">
          {task.type.replace(/_/g, " ").toLowerCase()}

          {task.assigneeName ? ` · ${task.assigneeName}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge variant={PRIORITY_VARIANT[task.priority]}>
          {task.priority.toLowerCase()}
        </Badge>

        {task.dueAt && (
          <span className="text-xs text-muted-foreground">
            {formatDate(task.dueAt)}
          </span>
        )}
      </div>
    </Link>
  );
}
