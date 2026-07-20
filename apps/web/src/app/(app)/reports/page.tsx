"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  Activity,
  Building2,
  KeyRound,
  PhoneCall,
  Target,
  TrendingUp,
} from "lucide-react";
import type { ReportRange, ReportSummary } from "@reos/shared";

const RANGES: { id: ReportRange; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

export default function ReportsPage() {
  const [range, setRange] = useState<ReportRange>("monthly");
  const { data, isLoading } = useQuery({
    queryKey: ["reports", range],
    queryFn: () => api.get<ReportSummary>(`/analytics/report?range=${range}`),
  });

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Daily, weekly, monthly and yearly performance reporting."
      />

      <div className="mb-4 flex gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.id}
            size="sm"
            variant={range === r.id ? "default" : "outline"}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Loading report…</p>
      ) : (
        <>
          <p className="mb-4 text-xs text-muted-foreground">
            {new Date(data.from).toLocaleDateString()} →{" "}
            {new Date(data.to).toLocaleDateString()}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="New leads"
              value={formatNumber(data.newLeads)}
              icon={Target}
              accent="primary"
            />
            <StatCard
              label="Calls made"
              value={formatNumber(data.callsMade)}
              icon={PhoneCall}
              accent="primary"
            />
            <StatCard
              label="New listings"
              value={formatNumber(data.newListings)}
              icon={Building2}
              accent="primary"
            />
            <StatCard
              label="Conversion"
              value={`${data.conversionRate}%`}
              icon={TrendingUp}
              accent="success"
            />
            <StatCard
              label="Sold"
              value={formatNumber(data.sold)}
              icon={KeyRound}
              accent="success"
            />
            <StatCard
              label="Rented"
              value={formatNumber(data.rented)}
              icon={Activity}
              accent="success"
            />
            <StatCard
              label="Revenue"
              value={formatCurrency(data.revenue)}
              icon={TrendingUp}
              accent="success"
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-warning" /> Top agents — deals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.topAgentsByDeals.map((a, i) => (
                  <div
                    key={a.agentId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">
                      {i + 1}. {a.agentName}
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(a.value)}
                    </span>
                  </div>
                ))}
                {data.topAgentsByDeals.length === 0 && (
                  <p className="text-sm text-muted-foreground">No data.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Top agents — leads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.topAgentsByLeads.map((a, i) => (
                  <div
                    key={a.agentId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">
                      {i + 1}. {a.agentName}
                    </span>
                    <span className="text-muted-foreground">
                      {a.value} leads
                    </span>
                  </div>
                ))}
                {data.topAgentsByLeads.length === 0 && (
                  <p className="text-sm text-muted-foreground">No data.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Top regions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.topRegions.map((r) => (
                  <div
                    key={r.region}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">
                      {r.region.replace(/_/g, " ")}
                    </span>
                    <span className="text-muted-foreground">
                      {r.sold} sold · {r.activeListings} active
                    </span>
                  </div>
                ))}
                {data.topRegions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No data.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
