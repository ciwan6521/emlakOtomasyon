"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ExternalLink,
  Heart,
  Instagram,
  MapPin,
  Plus,
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
import { ApiClientError, api } from "@/lib/api";
import { useEnumLabel, useT } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { formatPriceWithPeriod } from "@/lib/utils";
import {
  BuildType,
  ListingPurpose,
  PropertyStatus,
  Region,
  REGION_LABELS,
  type Paginated,
  type PropertyDto,
} from "@reos/shared";
import { PropertyDialog } from "./property-dialog";
import { NewPropertyDialog } from "./new-property-dialog";

const AMENITY_FILTERS = [
  "hasSeaView",
  "hasPool",
  "hasParking",
  "hasElevator",
  "hasBalcony",
  "isFurnished",
  "hasGarden",
] as const;

const CARD_AMENITIES = [
  "hasSeaView",
  "hasPool",
  "isFurnished",
  "hasParking",
] as const;

export default function PropertiesPage() {
  return (
    <Suspense fallback={null}>
      <PropertiesPageInner />
    </Suspense>
  );
}

function PropertiesPageInner() {
  const t = useT();
  const e = useEnumLabel();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const [creating, setCreating] = useState(false);
  const [favOverrides, setFavOverrides] = useState<Record<string, number>>({});

  // The command palette deep-links here with ?new=1.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setCreating(true);
      router.replace(pathname);
    }
  }, [searchParams, router, pathname]);

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

  const [publishError, setPublishError] = useState<string | null>(null);
  const publish = useMutation({
    mutationFn: (id: string) => api.post(`/properties/${id}/publish`),
    onMutate: () => setPublishError(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
    onError: (err) => {
      const detail =
        err instanceof ApiClientError
          ? err.error.detail || err.error.title
          : "";
      setPublishError(
        /without media/i.test(detail)
          ? t("properties.publishNeedsMedia")
          : detail || t("common.error"),
      );
    },
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
        action={
          <div className="flex items-center gap-2">
            <ExportCsvButton resource="properties" />
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("properties.new")}
            </Button>
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("properties.searchPlaceholder")}
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
          className="max-w-xs"
        />
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="ALL">{t("properties.allRegions")}</SelectItem>
            {Object.values(Region).map((r) => (
              <SelectItem key={r} value={r}>
                {REGION_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("properties.allStatuses")}</SelectItem>
            {Object.values(PropertyStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {e("status", s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={purpose} onValueChange={setPurpose}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("properties.saleAndRent")}</SelectItem>
            {Object.values(ListingPurpose).map((p) => (
              <SelectItem key={p} value={p}>
                {e("purpose", p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={buildType} onValueChange={setBuildType}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("properties.anyAge")}</SelectItem>
            {Object.values(BuildType).map((b) => (
              <SelectItem key={b} value={b}>
                {e("buildType", b)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder={t("properties.minPrice")}
          type="number"
          value={minPrice}
          onChange={(ev) => setMinPrice(ev.target.value)}
          className="w-24"
        />
        <Input
          placeholder={t("properties.maxPrice")}
          type="number"
          value={maxPrice}
          onChange={(ev) => setMaxPrice(ev.target.value)}
          className="w-24"
        />
        <Input
          placeholder={t("properties.rooms")}
          value={rooms}
          onChange={(ev) => setRooms(ev.target.value)}
          className="w-24"
        />
        <Input
          placeholder={t("properties.floor")}
          type="number"
          value={floor}
          onChange={(ev) => setFloor(ev.target.value)}
          className="w-20"
        />
        <Input
          placeholder={t("properties.neighborhood")}
          value={neighborhood}
          onChange={(ev) => setNeighborhood(ev.target.value)}
          className="w-36"
        />
        <Input
          placeholder={t("properties.minSqm")}
          type="number"
          value={minSqm}
          onChange={(ev) => setMinSqm(ev.target.value)}
          className="w-20"
        />
        <Input
          placeholder={t("properties.maxSqm")}
          type="number"
          value={maxSqm}
          onChange={(ev) => setMaxSqm(ev.target.value)}
          className="w-20"
        />
      </div>
      {publishError && (
        <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {publishError}
        </p>
      )}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {AMENITY_FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleAmenity(key)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${amenities[key] ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}
          >
            {t(`amenity.${key}` as MessageKey)}
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
                title={t("properties.addFavorite")}
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
                  <MapPin className="h-3 w-3" />{" "}
                  {p.neighborhood || REGION_LABELS[p.region]}
                </span>
                <span>{p.rooms}</span>
                <span className="flex items-center gap-1">
                  <Ruler className="h-3 w-3" /> {p.sizeM2} m²
                </span>
              </div>
              {p.createdByName && (
                <p
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                  title={t("properties.createdBy")}
                >
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
              {CARD_AMENITIES.some((k) => p[k]) && (
                <div className="flex flex-wrap gap-1">
                  {CARD_AMENITIES.filter((k) => p[k]).map((k) => (
                    <span
                      key={k}
                      className="rounded bg-accent px-1.5 py-0.5 text-[10px]"
                    >
                      {t(`amenity.${k}` as MessageKey)}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>{t("properties.views", { n: p.viewCount })}</span>
                <span>{t("properties.sent", { n: p.sentCount })}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelected(p)}
                >
                  {t("properties.manage")}
                </Button>
                {p.status !== PropertyStatus.ACTIVE_LISTING &&
                  p.status !== PropertyStatus.SOLD && (
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={publish.isPending}
                      onClick={() => publish.mutate(p.id)}
                    >
                      {t("properties.publish")}
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {query.data?.data.length === 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          {t("properties.empty")}
        </p>
      )}

      <NewPropertyDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(property) => setSelected(property)}
      />

      <PropertyDialog
        property={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
}
