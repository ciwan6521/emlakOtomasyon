"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ExternalLink,
  Heart,
  Instagram,
  MapPin,
  Ruler,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExportCsvButton } from "@/components/export-csv-button";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatPriceWithPeriod } from "@/lib/utils";
import {
  BuildType,
  ListingPurpose,
  PropertyStatus,
  Region,
  type Paginated,
  type PropertyDto,
} from "@reos/shared";
import { PropertyDialog } from "./property-dialog";

const AMENITY_FILTERS = [
  ["hasSeaView", "Sea view"],
  ["hasPool", "Pool"],
  ["hasParking", "Parking"],
  ["hasElevator", "Elevator"],
  ["hasBalcony", "Balcony"],
  ["isFurnished", "Furnished"],
  ["hasGarden", "Garden"],
] as const;

export default function PropertiesPage() {
  const qc = useQueryClient();
  const [region, setRegion] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [purpose, setPurpose] = useState("ALL");
  const [buildType, setBuildType] = useState("ALL");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [rooms, setRooms] = useState("");
  const [floor, setFloor] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [minSqm, setMinSqm] = useState("");
  const [maxSqm, setMaxSqm] = useState("");
  const [amenities, setAmenities] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PropertyDto | null>(null);
  const [favOverrides, setFavOverrides] = useState<Record<string, number>>({});

  const activeAmenities = Object.keys(amenities).filter((k) => amenities[k]);

  const query = useQuery({
    queryKey: [
      "properties",
      region,
      status,
      purpose,
      buildType,
      minPrice,
      maxPrice,
      rooms,
      floor,
      neighborhood,
      minSqm,
      maxSqm,
      activeAmenities.join(","),
      search,
    ],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "60" });
      if (region !== "ALL") params.set("region", region);
      if (status !== "ALL") params.set("status", status);
      if (purpose !== "ALL") params.set("purpose", purpose);
      if (buildType !== "ALL") params.set("buildType", buildType);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (rooms) params.set("rooms", rooms);
      if (floor) params.set("floor", floor);
      if (neighborhood) params.set("neighborhood", neighborhood);
      if (minSqm) params.set("minSizeM2", minSqm);
      if (maxSqm) params.set("maxSizeM2", maxSqm);
      for (const a of activeAmenities) params.set(a, "true");
      if (search) params.set("search", search);
      return api.get<Paginated<PropertyDto>>(
        `/properties?${params.toString()}`,
      );
    },
  });

  function toggleAmenity(key: string) {
    setAmenities((a) => ({ ...a, [key]: !a[key] }));
  }

  const publish = useMutation({
    mutationFn: (id: string) => api.post(`/properties/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });

  const favorite = useMutation({
    mutationFn: (id: string) =>
      api.post<{ favoriteCount: number }>(`/properties/${id}/favorite`),
    onSuccess: (result, id) => {
      setFavOverrides((prev) => ({ ...prev, [id]: result.favoriteCount }));
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  function getFavoriteCount(p: PropertyDto) {
    return favOverrides[p.id] ?? p.favoriteCount;
  }

  return (
    <div>
      <PageHeader
        titleKey="page.properties.title"
        descriptionKey="page.properties.subtitle"
        action={<ExportCsvButton resource="properties" />}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search reference, title, address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-36">
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
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {Object.values(PropertyStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={purpose} onValueChange={setPurpose}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Sale & rent</SelectItem>
            {Object.values(ListingPurpose).map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={buildType} onValueChange={setBuildType}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any age</SelectItem>
            <SelectItem value={BuildType.NEW}>New build</SelectItem>
            <SelectItem value={BuildType.OLD}>Old build</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Min €"
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="w-24"
        />
        <Input
          placeholder="Max €"
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="w-24"
        />
        <Input
          placeholder="Rooms"
          value={rooms}
          onChange={(e) => setRooms(e.target.value)}
          className="w-24"
        />
        <Input
          placeholder="Floor"
          type="number"
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          className="w-20"
        />
        <Input
          placeholder="Neighborhood"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          className="w-36"
        />
        <Input
          placeholder="Min m²"
          type="number"
          value={minSqm}
          onChange={(e) => setMinSqm(e.target.value)}
          className="w-20"
        />
        <Input
          placeholder="Max m²"
          type="number"
          value={maxSqm}
          onChange={(e) => setMaxSqm(e.target.value)}
          className="w-20"
        />
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {AMENITY_FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleAmenity(key)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${amenities[key] ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {query.data?.data.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <div className="relative aspect-[4/3] bg-muted">
              {p.coverUrl ? (
                <Image
                  src={p.coverUrl}
                  alt={p.title}
                  fill
                  className="object-cover"
                  sizes="320px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Building2 className="h-8 w-8" />
                </div>
              )}
              <div className="absolute left-2 top-2">
                <StatusBadge value={p.status} />
              </div>
              <button
                type="button"
                title="Add favorite"
                disabled={favorite.isPending}
                onClick={() => favorite.mutate(p.id)}
                className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs shadow-sm transition-colors hover:bg-background"
              >
                <Heart
                  className="h-3.5 w-3.5 text-destructive"
                  fill="currentColor"
                />
                {getFavoriteCount(p)}
              </button>
            </div>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">
                  {p.reference}
                </span>
                <span className="text-sm font-semibold">
                  {formatPriceWithPeriod(p.price, p.pricePeriod, p.currency)}
                </span>
              </div>
              <p className="truncate text-sm font-medium">{p.title}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {p.neighborhood || p.region}
                </span>
                <span>{p.rooms}</span>
                <span className="flex items-center gap-1">
                  <Ruler className="h-3 w-3" /> {p.sizeM2} m²
                </span>
              </div>
              {p.createdByName && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" /> {p.createdByName}
                </p>
              )}
              {(p.instagramUrl || p.facebookUrl) && (
                <div className="flex items-center gap-2">
                  {p.instagramUrl && (
                    <a
                      href={p.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Instagram className="h-3.5 w-3.5" /> Instagram
                    </a>
                  )}
                  {p.facebookUrl && (
                    <a
                      href={p.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Facebook
                    </a>
                  )}
                </div>
              )}
              {(p.hasSeaView || p.hasPool || p.isFurnished || p.hasParking) && (
                <div className="flex flex-wrap gap-1">
                  {p.hasSeaView && (
                    <span className="rounded bg-accent px-1.5 py-0.5 text-[10px]">
                      Sea view
                    </span>
                  )}
                  {p.hasPool && (
                    <span className="rounded bg-accent px-1.5 py-0.5 text-[10px]">
                      Pool
                    </span>
                  )}
                  {p.isFurnished && (
                    <span className="rounded bg-accent px-1.5 py-0.5 text-[10px]">
                      Furnished
                    </span>
                  )}
                  {p.hasParking && (
                    <span className="rounded bg-accent px-1.5 py-0.5 text-[10px]">
                      Parking
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>{p.viewCount} views</span>
                <span>{p.sentCount} sent</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelected(p)}
                >
                  Manage
                </Button>
                {p.status !== PropertyStatus.ACTIVE_LISTING &&
                  p.status !== PropertyStatus.SOLD && (
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={publish.isPending}
                      onClick={() => publish.mutate(p.id)}
                    >
                      Publish
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {query.data?.data.length === 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          No properties found.
        </p>
      )}

      <PropertyDialog
        property={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
}
