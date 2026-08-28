"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Region, type Paginated, type PropertyDto } from "@reos/shared";

const PropertyMap = dynamic(
  () => import("@/components/property-map").then((m) => m.PropertyMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

export default function MapPage() {
  const [region, setRegion] = useState("ALL");
  const { data } = useQuery({
    queryKey: ["properties", "map", region],
    queryFn: () => {
      const params = new URLSearchParams({
        pageSize: "100",
        status: "ACTIVE_LISTING",
      });
      if (region !== "ALL") params.set("region", region);
      return api.get<Paginated<PropertyDto>>(
        `/properties?${params.toString()}`,
      );
    },
  });

  const points = useMemo(
    () => (data?.data ?? []).filter((p) => p.latitude && p.longitude),
    [data],
  );

  return (
    <div>
      <PageHeader
        titleKey="page.map.title"
        descriptionKey="page.map.subtitle"
        action={
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All regions</SelectItem>
              {Object.values(Region).map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            {points.length === 0 ? (
              <div className="flex h-[520px] items-center justify-center text-sm text-muted-foreground">
                No geocoded listings.
              </div>
            ) : (
              <PropertyMap properties={points} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="max-h-[520px] space-y-2 overflow-y-auto p-4">
            {points.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.region} · {p.rooms}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(p.price)}
                  </p>
                  <StatusBadge value={p.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
