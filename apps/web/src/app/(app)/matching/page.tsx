"use client";

import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Home, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { CustomerDto, Paginated } from "@reos/shared";

interface MatchRow {
  id: string;
  score: number;
  reasons: string[];
  property?: {
    id: string;
    reference: string;
    title: string;
    price: number;
    region: string;
    rooms: string;
  };
}

export default function MatchingPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const customers = useQuery({
    queryKey: ["customers", "matching"],
    queryFn: () => api.get<Paginated<CustomerDto>>("/customers?pageSize=50"),
  });

  const matchCounts = useQueries({
    queries: (customers.data?.data ?? []).map((c) => ({
      queryKey: ["matching", "count", c.id],
      queryFn: () => api.get<MatchRow[]>(`/matches/customer/${c.id}`),
      staleTime: 60_000,
    })),
  });

  const matches = useQuery({
    queryKey: ["matching", "customer", selected],
    enabled: !!selected,
    queryFn: () => api.get<MatchRow[]>(`/matches/customer/${selected}`),
  });

  const countFor = (index: number) => matchCounts[index]?.data?.length ?? null;

  return (
    <div>
      <PageHeader
        titleKey="page.matching.title"
        descriptionKey="page.matching.subtitle"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Customers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {customers.data?.data.map((c, i) => {
              const count = countFor(i);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent ${selected === c.id ? "bg-primary/5 text-primary" : ""}`}
                >
                  <span className="truncate">{c.fullName}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {count === null ? (
                      "…"
                    ) : (
                      <>
                        <Home className="h-3 w-3" />
                        {count} suitable {count === 1 ? "home" : "homes"}
                      </>
                    )}
                  </span>
                </button>
              );
            })}
            {customers.data?.data.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No customers yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Matching properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selected && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Select a customer to see matched listings.
              </p>
            )}
            {selected && matches.data?.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No matches above threshold.
              </p>
            )}
            <div className="space-y-2">
              {matches.data?.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {m.score}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{m.property?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.property?.region} · {m.property?.rooms} ·{" "}
                      {m.property?.reference}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.reasons.map((r) => (
                        <Badge key={r} variant="secondary">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {m.property && (
                    <span className="text-sm font-semibold">
                      {formatCurrency(m.property.price)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
