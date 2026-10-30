"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  Activity,
  Building2,
  KeyRound,
  PhoneCall,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Locale,
  regionLabel,
  type ReportRange,
  type ReportSummary,
} from "@reos/shared";

const RANGES: { id: ReportRange; labelKey: MessageKey }[] = [
  { id: "daily", labelKey: "reports.daily" },
  { id: "weekly", labelKey: "reports.weekly" },
  { id: "monthly", labelKey: "reports.monthly" },
  { id: "yearly", labelKey: "reports.yearly" },
];

const DATE_LOCALE: Record<Locale, string> = {
  [Locale.EN]: "en",
  [Locale.ME]: "sr-Latn",
  [Locale.TR]: "tr",
  [Locale.RU]: "ru",
};

export default function ReportsPage() {
  const { t, locale } = useLocale();
  const dateLocale = DATE_LOCALE[locale] ?? "en";
  const [range, setRange] = useState<ReportRange>("monthly");
  const { data, isLoading } = useQuery({
    queryKey: ["reports", range],
    queryFn: () => api.get<ReportSummary>(`/analytics/report?range=${range}`),
  });

  return (
    <div>
      <PageHeader
        titleKey="page.reports.title"
        descriptionKey="page.reports.subtitle"
      />

      <div className="mb-4 flex gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.id}
            size="sm"
            variant={range === r.id ? "default" : "outline"}
            onClick={() => setRange(r.id)}
          >
            {t(r.labelKey)}
          </Button>
        ))}
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">{t("reports.loading")}</p>
      ) : (
        <>
          <p className="mb-4 text-xs text-muted-foreground">
            {new Date(data.from).toLocaleDateString(dateLocale)} →{" "}
            {new Date(data.to).toLocaleDateString(dateLocale)}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("reports.newLeads")}
              value={formatNumber(data.newLeads)}
              icon={Target}
              accent="primary"
            />
            <StatCard
              label={t("reports.callsMade")}
              value={formatNumber(data.callsMade)}
              icon={PhoneCall}
              accent="primary"
            />
            <StatCard
              label={t("reports.newListings")}
              value={formatNumber(data.newListings)}
              icon={Building2}
              accent="primary"
            />
            <StatCard
              label={t("reports.conversion")}
              value={`${data.conversionRate}%`}
              icon={TrendingUp}
              accent="success"
            />
            <StatCard
              label={t("reports.sold")}
              value={formatNumber(data.sold)}
              icon={KeyRound}
              accent="success"
            />
            <StatCard
              label={t("reports.rented")}
              value={formatNumber(data.rented)}
              icon={Activity}
              accent="success"
            />
            <StatCard
              label={t("reports.revenue")}
              value={formatCurrency(data.revenue)}
              icon={TrendingUp}
              accent="success"
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-warning" />{" "}
                  {t("reports.topAgentsDeals")}
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
                  <p className="text-sm text-muted-foreground">
                    {t("reports.noData")}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />{" "}
                  {t("reports.topAgentsLeads")}
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
                      {t("reports.leadsCount", { n: a.value })}
                    </span>
                  </div>
                ))}
                {data.topAgentsByLeads.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("reports.noData")}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />{" "}
                  {t("reports.topRegions")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.topRegions.map((r) => (
                  <div
                    key={r.region}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">
                      {regionLabel(r.region)}
                    </span>
                    <span className="text-muted-foreground">
                      {t("reports.soldActive", {
                        sold: r.sold,
                        active: r.activeListings,
                      })}
                    </span>
                  </div>
                ))}
                {data.topRegions.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("reports.noData")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
