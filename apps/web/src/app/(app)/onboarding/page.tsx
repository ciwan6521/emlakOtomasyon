"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import {
  OnboardingDecision,
  OnboardingStatus,
  regionLabel,
} from "@reos/shared";

interface Session {
  id: string;
  status: string;
  ownerName: string | null;
  ownerPhone: string | null;
  payload: {
    title?: string;
    region?: string;
    price?: number;
    mediaUrls?: string[];
  } | null;
  submittedAt: string | null;
}

const MODERATION_TABS: { value: OnboardingStatus; labelKey: MessageKey }[] = [
  { value: OnboardingStatus.SUBMITTED, labelKey: "onboarding.tabPending" },
  {
    value: OnboardingStatus.CHANGES_REQUESTED,
    labelKey: "onboarding.tabRevision",
  },
  {
    value: OnboardingStatus.MISSING_INFO,
    labelKey: "onboarding.tabMissingInfo",
  },
  {
    value: OnboardingStatus.READY_TO_PUBLISH,
    labelKey: "onboarding.tabReadyToPublish",
  },
];

function SessionList({
  sessions,
  onReview,
}: {
  sessions: Session[] | undefined;
  onReview: (args: { id: string; decision: OnboardingDecision }) => void;
}) {
  const t = useT();
  return (
    <div className="space-y-3">
      {sessions?.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">
                  {s.payload?.title ?? s.ownerName ?? t("onboarding.untitled")}
                </p>
                <StatusBadge value={s.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {s.ownerName} · {s.ownerPhone} ·{" "}
                {regionLabel(s.payload?.region as string | undefined)} ·{" "}
                {t("onboarding.mediaCount", {
                  n: s.payload?.mediaUrls?.length ?? 0,
                })}
              </p>
            </div>
            {s.status === OnboardingStatus.SUBMITTED && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onReview({
                      id: s.id,
                      decision: OnboardingDecision.REQUEST_CHANGES,
                    })
                  }
                >
                  {t("onboarding.requestChanges")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    onReview({ id: s.id, decision: OnboardingDecision.REJECT })
                  }
                >
                  {t("onboarding.reject")}
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    onReview({ id: s.id, decision: OnboardingDecision.APPROVE })
                  }
                >
                  {t("onboarding.approve")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {(!sessions || sessions.length === 0) && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t("onboarding.empty")}
        </p>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const t = useT();
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>(OnboardingStatus.SUBMITTED);

  const { data } = useQuery({
    queryKey: ["onboarding", status],
    queryFn: () => api.get<Session[]>(`/onboarding/review?status=${status}`),
  });

  const review = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: OnboardingDecision;
    }) => api.post(`/onboarding/sessions/${id}/review`, { decision }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  return (
    <div>
      <PageHeader
        titleKey="page.onboarding.title"
        descriptionKey="page.onboarding.subtitle"
      />
      <Tabs value={status} onValueChange={setStatus}>
        <TabsList className="mb-4">
          {MODERATION_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {t(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
        {MODERATION_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <SessionList
              sessions={data}
              onReview={(args) => review.mutate(args)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
