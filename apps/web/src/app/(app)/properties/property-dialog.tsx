"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Languages, Star, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n/locale-context";
import {
  BuildType,
  ListingPurpose,
  MediaType,
  LOCALES,
  PricePeriod,
  PRICE_PERIOD_SUFFIX,
  RentalTermType,
  type PropertyDto,
} from "@reos/shared";

interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  isCover: boolean;
  position: number;
}
interface PropertyDetail extends PropertyDto {
  media?: MediaItem[];
}
interface PresignResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresInSeconds: number;
}

const AMENITIES = [
  ["hasElevator", "Elevator"],
  ["hasParking", "Parking"],
  ["hasBalcony", "Balcony"],
  ["isFurnished", "Furnished"],
  ["hasSeaView", "Sea view"],
  ["hasPool", "Pool"],
  ["hasGarden", "Garden"],
] as const;

export function PropertyDialog({
  property,
  open,
  onOpenChange,
}: {
  property: PropertyDto | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    price: "",
    rooms: "",
    sizeM2: "",
    description: "",
    neighborhood: "",
    floor: "",
    buildType: "",
    monthlyDues: "",
    pricePeriod: "",
    rentalTermType: "",
    availableFrom: "",
    minLeaseMonths: "",
    minStayNights: "",
    nightlyRate: "",
    depositAmount: "",
    managementFeePct: "",
    hasElevator: false,
    hasParking: false,
    hasBalcony: false,
    isFurnished: false,
    hasSeaView: false,
    hasPool: false,
    hasGarden: false,
  });
  const [initialized, setInitialized] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ["property", property?.id],
    queryFn: () => api.get<PropertyDetail>(`/properties/${property!.id}`),
    enabled: open && !!property?.id,
  });

  // Seed the edit form once the detail loads for a given property.
  if (detail.data && initialized !== detail.data.id) {
    setInitialized(detail.data.id);
    const d = detail.data;
    setForm({
      title: d.title ?? "",
      price: String(d.price ?? ""),
      rooms: d.rooms ?? "",
      sizeM2: String(d.sizeM2 ?? ""),
      description: d.description ?? "",
      neighborhood: d.neighborhood ?? "",
      floor: d.floor != null ? String(d.floor) : "",
      buildType: d.buildType ?? "",
      monthlyDues: d.monthlyDues != null ? String(d.monthlyDues) : "",
      pricePeriod: d.pricePeriod ?? "",
      rentalTermType: d.rentalTermType ?? "",
      availableFrom: d.availableFrom ? d.availableFrom.slice(0, 10) : "",
      minLeaseMonths: d.minLeaseMonths != null ? String(d.minLeaseMonths) : "",
      minStayNights: d.minStayNights != null ? String(d.minStayNights) : "",
      nightlyRate: d.nightlyRate != null ? String(d.nightlyRate) : "",
      depositAmount: d.depositAmount != null ? String(d.depositAmount) : "",
      managementFeePct:
        d.managementFeePct != null ? String(d.managementFeePct) : "",
      hasElevator: d.hasElevator,
      hasParking: d.hasParking,
      hasBalcony: d.hasBalcony,
      isFurnished: d.isFurnished,
      hasSeaView: d.hasSeaView,
      hasPool: d.hasPool,
      hasGarden: d.hasGarden,
    });
  }

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/properties/${property!.id}`, {
        title: form.title,
        price: Number(form.price),
        rooms: form.rooms,
        sizeM2: Number(form.sizeM2),
        description: form.description || undefined,
        neighborhood: form.neighborhood || undefined,
        floor: form.floor !== "" ? Number(form.floor) : undefined,
        buildType: form.buildType || undefined,
        monthlyDues:
          form.monthlyDues !== "" ? Number(form.monthlyDues) : undefined,
        pricePeriod: form.pricePeriod || undefined,
        rentalTermType: form.rentalTermType || undefined,
        availableFrom: form.availableFrom || undefined,
        minLeaseMonths:
          form.minLeaseMonths !== "" ? Number(form.minLeaseMonths) : undefined,
        minStayNights:
          form.minStayNights !== "" ? Number(form.minStayNights) : undefined,
        nightlyRate:
          form.nightlyRate !== "" ? Number(form.nightlyRate) : undefined,
        depositAmount:
          form.depositAmount !== "" ? Number(form.depositAmount) : undefined,
        managementFeePct:
          form.managementFeePct !== ""
            ? Number(form.managementFeePct)
            : undefined,
        hasElevator: form.hasElevator,
        hasParking: form.hasParking,
        hasBalcony: form.hasBalcony,
        isFurnished: form.isFurnished,
        hasSeaView: form.hasSeaView,
        hasPool: form.hasPool,
        hasGarden: form.hasGarden,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property", property?.id] });
    },
  });

  const translate = useMutation({
    mutationFn: () =>
      api.post(`/properties/${property!.id}/translate`, {
        locales: LOCALES,
      }),
  });

  const setCover = useMutation({
    mutationFn: (m: MediaItem) =>
      api.post(`/properties/${property!.id}/media`, {
        type: m.type,
        url: m.url,
        isCover: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property", property?.id] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  async function uploadFiles(files: FileList) {
    if (!property) return;
    setUploading(true);
    try {
      const existing = detail.data?.media?.length ?? 0;
      let index = existing;
      for (const file of Array.from(files)) {
        const presign = await api.post<PresignResult>(
          `/properties/${property.id}/media/presign`,
          {
            filename: file.name,
            contentType: file.type || "application/octet-stream",
          },
        );
        const put = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!put.ok) throw new Error(`Upload failed (${put.status})`);
        await api.post(`/properties/${property.id}/media`, {
          type: file.type.startsWith("video")
            ? MediaType.VIDEO
            : MediaType.PHOTO,
          url: presign.publicUrl,
          isCover: index === 0,
          position: index,
        });
        index += 1;
      }
      qc.invalidateQueries({ queryKey: ["property", property.id] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  if (!property) return null;
  const isRental = detail.data?.purpose === ListingPurpose.RENT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{property.reference} — Manage property</DialogTitle>
          <DialogDescription>
            Edit details, upload media and generate multi-language content.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="p-title">Title</Label>
            <Input
              id="p-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-price">
              Price (EUR
              {form.pricePeriod === PricePeriod.MONTHLY
                ? PRICE_PERIOD_SUFFIX[PricePeriod.MONTHLY]
                : form.pricePeriod === PricePeriod.NIGHTLY
                  ? PRICE_PERIOD_SUFFIX[PricePeriod.NIGHTLY]
                  : ""}
              )
            </Label>
            <Input
              id="p-price"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          {isRental && (
            <>
              <div className="space-y-1.5">
                <Label>Price period</Label>
                <Select
                  value={form.pricePeriod || PricePeriod.MONTHLY}
                  onValueChange={(v) => setForm({ ...form, pricePeriod: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PricePeriod.MONTHLY}>Monthly</SelectItem>
                    <SelectItem value={PricePeriod.NIGHTLY}>Nightly</SelectItem>
                    <SelectItem value={PricePeriod.WEEKLY}>Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rental term</Label>
                <Select
                  value={form.rentalTermType || "NA"}
                  onValueChange={(v) =>
                    setForm({ ...form, rentalTermType: v === "NA" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NA">Unspecified</SelectItem>
                    <SelectItem value={RentalTermType.LONG_TERM}>
                      Long term
                    </SelectItem>
                    <SelectItem value={RentalTermType.SHORT_TERM}>
                      Short term
                    </SelectItem>
                    <SelectItem value={RentalTermType.SEASONAL}>
                      Seasonal
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-available">Available from</Label>
                <Input
                  id="p-available"
                  type="date"
                  value={form.availableFrom}
                  onChange={(e) =>
                    setForm({ ...form, availableFrom: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-deposit">Deposit (EUR)</Label>
                <Input
                  id="p-deposit"
                  type="number"
                  value={form.depositAmount}
                  onChange={(e) =>
                    setForm({ ...form, depositAmount: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-mgmt">Management fee (%)</Label>
                <Input
                  id="p-mgmt"
                  type="number"
                  value={form.managementFeePct}
                  onChange={(e) =>
                    setForm({ ...form, managementFeePct: e.target.value })
                  }
                />
              </div>
              {(form.rentalTermType === RentalTermType.LONG_TERM ||
                !form.rentalTermType) && (
                <div className="space-y-1.5">
                  <Label htmlFor="p-minlease">Min lease (months)</Label>
                  <Input
                    id="p-minlease"
                    type="number"
                    value={form.minLeaseMonths}
                    onChange={(e) =>
                      setForm({ ...form, minLeaseMonths: e.target.value })
                    }
                  />
                </div>
              )}
              {(form.rentalTermType === RentalTermType.SHORT_TERM ||
                form.pricePeriod === PricePeriod.NIGHTLY) && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-minstay">Min stay (nights)</Label>
                    <Input
                      id="p-minstay"
                      type="number"
                      value={form.minStayNights}
                      onChange={(e) =>
                        setForm({ ...form, minStayNights: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-nightly">Nightly rate (EUR)</Label>
                    <Input
                      id="p-nightly"
                      type="number"
                      value={form.nightlyRate}
                      onChange={(e) =>
                        setForm({ ...form, nightlyRate: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="p-rooms">Rooms</Label>
            <Input
              id="p-rooms"
              value={form.rooms}
              onChange={(e) => setForm({ ...form, rooms: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-size">Size (m²)</Label>
            <Input
              id="p-size"
              type="number"
              value={form.sizeM2}
              onChange={(e) => setForm({ ...form, sizeM2: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-neigh">Neighborhood</Label>
            <Input
              id="p-neigh"
              value={form.neighborhood}
              onChange={(e) =>
                setForm({ ...form, neighborhood: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-floor">Floor</Label>
            <Input
              id="p-floor"
              type="number"
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Build type</Label>
            <Select
              value={form.buildType || "NA"}
              onValueChange={(v) =>
                setForm({ ...form, buildType: v === "NA" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NA">Unspecified</SelectItem>
                <SelectItem value={BuildType.NEW}>New build</SelectItem>
                <SelectItem value={BuildType.OLD}>Old build</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-dues">Monthly dues (EUR)</Label>
            <Input
              id="p-dues"
              type="number"
              value={form.monthlyDues}
              onChange={(e) =>
                setForm({ ...form, monthlyDues: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Features</Label>
            <div className="flex flex-wrap gap-1.5">
              {AMENITIES.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, [key]: !f[key] }))}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${form[key] ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="p-desc">Description</Label>
            <textarea
              id="p-desc"
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground sm:col-span-2">
            <span>{property.viewCount} views</span>
            <span>{property.sentCount} sent</span>
            <span>{property.favoriteCount} favorites</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Media</Label>
            <div className="flex gap-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={(e) => e.target.files && uploadFiles(e.target.files)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                )}
                Upload
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {detail.data?.media?.map((m) => (
              <div
                key={m.id}
                className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
              >
                {m.type === MediaType.VIDEO ? (
                  <video src={m.url} className="h-full w-full object-cover" />
                ) : (
                  <Image
                    src={m.url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="120px"
                    unoptimized
                  />
                )}
                <button
                  type="button"
                  title={m.isCover ? "Cover" : "Set as cover"}
                  onClick={() => !m.isCover && setCover.mutate(m)}
                  className={`absolute right-1 top-1 rounded-full p-1 ${m.isCover ? "bg-primary text-primary-foreground" : "bg-background/80 opacity-0 group-hover:opacity-100"}`}
                >
                  <Star
                    className="h-3 w-3"
                    fill={m.isCover ? "currentColor" : "none"}
                  />
                </button>
              </div>
            ))}
            {(detail.data?.media?.length ?? 0) === 0 && (
              <p className="col-span-4 py-4 text-center text-xs text-muted-foreground">
                No media yet. Upload photos to enable publishing.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={translate.isPending}
            onClick={() => translate.mutate()}
          >
            <Languages className="mr-1.5 h-4 w-4" />
            {translate.isPending
              ? t("property.translateQueuing")
              : translate.isSuccess
                ? t("property.translateQueued")
                : t("property.translate")}
          </Button>
          <Button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
