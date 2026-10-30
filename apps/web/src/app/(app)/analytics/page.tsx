"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n/locale-context";
import { formatCurrency } from "@/lib/utils";
import {
  regionLabel,
  type AgentPerformance,
  type RegionPerformance,
} from "@reos/shared";

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
];

export default function AnalyticsPage() {
  const t = useT();
  const agents = useQuery({
    queryKey: ["analytics", "agents"],
    queryFn: () => api.get<AgentPerformance[]>("/analytics/agents"),
  });
  const regions = useQuery({
    queryKey: ["analytics", "regions"],
    queryFn: () => api.get<RegionPerformance[]>("/analytics/regions"),
  });
  const regionPie = (regions.data ?? []).map((r) => ({
    ...r,
    regionName: regionLabel(r.region),
  }));

  return (
    <div>
      <PageHeader
        titleKey="page.analytics.title"
        descriptionKey="page.analytics.subtitle"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.agentConversion")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={agents.data ?? []}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  className="stroke-border"
                />
                <XAxis
                  type="number"
                  className="text-xs"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="agentName"
                  width={120}
                  className="text-xs"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="conversionRate"
                  name={t("analytics.conversionRate")}
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.activeListingsByRegion")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={regionPie}
                  dataKey="activeListings"
                  nameKey="regionName"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {regionPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t("analytics.regionalPerformance")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("analytics.region")}</TableHead>
                <TableHead>{t("analytics.active")}</TableHead>
                <TableHead>{t("analytics.sold")}</TableHead>
                <TableHead>{t("analytics.avgPrice")}</TableHead>
                <TableHead>{t("analytics.revenue")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.data?.map((r) => (
                <TableRow key={r.region}>
                  <TableCell className="font-medium">
                    {regionLabel(r.region)}
                  </TableCell>
                  <TableCell>{r.activeListings}</TableCell>
                  <TableCell>{r.sold}</TableCell>
                  <TableCell>{formatCurrency(r.avgPrice)}</TableCell>
                  <TableCell>{formatCurrency(r.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
