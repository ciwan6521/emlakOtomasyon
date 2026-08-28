"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { ExportCsvButton } from "@/components/export-csv-button";
import { Card } from "@/components/ui/card";
import { KanbanBoard, KanbanCard, KanbanColumn } from "@/components/kanban";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { DealStage, type DealDto } from "@reos/shared";

const STAGES: { key: DealStage; title: string }[] = [
  { key: DealStage.LEAD, title: "Lead" },
  { key: DealStage.QUALIFIED, title: "Qualified" },
  { key: DealStage.OWNER_ACCEPTED, title: "Owner Accepted" },
  { key: DealStage.LISTING_CREATED, title: "Listing Created" },
  { key: DealStage.PUBLISHED, title: "Published" },
  { key: DealStage.BUYER_INTERESTED, title: "Buyer Interested" },
  { key: DealStage.OFFER, title: "Offer" },
  { key: DealStage.DEAL_CLOSED, title: "Closed" },
];

function DealCardBody({ deal }: { deal: DealDto }) {
  return (
    <Card className="cursor-grab p-3 active:cursor-grabbing">
      <p className="truncate text-sm font-medium">{deal.title}</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{deal.probability}%</span>
        <span className="font-semibold">{formatCurrency(deal.value)}</span>
      </div>
    </Card>
  );
}

export default function PipelinePage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () => api.get<Record<DealStage, DealDto[]>>("/pipeline/deals"),
  });

  const move = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: DealStage }) =>
      api.patch(`/pipeline/deals/${id}/stage`, { stage }),
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ["pipeline"] });
      const prev = qc.getQueryData<Record<DealStage, DealDto[]>>(["pipeline"]);
      if (prev) {
        const next: Record<string, DealDto[]> = {};
        let moved: DealDto | undefined;
        for (const col of Object.keys(prev)) {
          next[col] = prev[col as DealStage].filter((d) => {
            if (d.id === id) {
              moved = d;
              return false;
            }
            return true;
          });
        }
        if (moved) next[stage] = [{ ...moved, stage }, ...(next[stage] ?? [])];
        qc.setQueryData(["pipeline"], next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) =>
      ctx?.prev && qc.setQueryData(["pipeline"], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["pipeline"] }),
  });

  const findDeal = (id: string) =>
    Object.values(data ?? {})
      .flat()
      .find((d) => d.id === id);

  return (
    <div>
      <PageHeader
        titleKey="page.pipeline.title"
        descriptionKey="page.pipeline.subtitle"
        action={<ExportCsvButton resource="deals" />}
      />
      <KanbanBoard
        onMove={(id, to) => move.mutate({ id, stage: to as DealStage })}
        renderOverlay={(id) => {
          const d = findDeal(id);
          return d ? <DealCardBody deal={d} /> : null;
        }}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const deals = data?.[stage.key] ?? [];
            const total = deals.reduce((s, d) => s + d.value, 0);
            return (
              <div key={stage.key} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold">{stage.title}</h3>
                  <span className="text-xs text-muted-foreground">
                    {deals.length}
                  </span>
                </div>
                <p className="mb-2 px-1 text-xs text-muted-foreground">
                  {formatCurrency(total)}
                </p>
                <KanbanColumn id={stage.key} className="min-h-24 space-y-2">
                  {deals.map((deal) => (
                    <KanbanCard key={deal.id} id={deal.id} column={stage.key}>
                      <DealCardBody deal={deal} />
                    </KanbanCard>
                  ))}
                  {deals.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      —
                    </p>
                  )}
                </KanbanColumn>
              </div>
            );
          })}
        </div>
      </KanbanBoard>
    </div>
  );
}
