"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { ApiClientError, api } from "@/lib/api";
import { useEnumLabel, useT } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import {
  BuildType,
  ListingPurpose,
  PricePeriod,
  PRICE_PERIOD_SUFFIX,
  PropertyType,
  Region,
  REGION_LABELS,
  RentalTermType,
  type PropertyDto,
} from "@reos/shared";

const AMENITIES = [
  "hasElevator",
  "hasParking",
  "hasBalcony",
  "isFurnished",
  "hasSeaView",
  "hasPool",
  "hasGarden",
] as const;
type AmenityKey = (typeof AMENITIES)[number];

const EMPTY_FORM = {
  title: "",
  type: PropertyType.APARTMENT as PropertyType,
  purpose: ListingPurpose.SALE as ListingPurpose,
  region: Region.CENTAR as Region,
  address: "",
  neighborhood: "",
  price: "",
  pricePeriod: "" as "" | PricePeriod,
  rentalTermType: "" as "" | RentalTermType,
  availableFrom: "",
  minLeaseMonths: "",
  minStayNights: "",
  nightlyRate: "",
  depositAmount: "",
  rooms: "",
  sizeM2: "",
  floor: "",
  buildType: "" as "" | BuildType,
  monthlyDues: "",
  description: "",
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  hasElevator: false,
  hasParking: false,
  hasBalcony: false,
  isFurnished: false,
  hasSeaView: false,
  hasPool: false,
  hasGarden: false,
};

function num(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value);
}

export function NewPropertyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called with the new listing so the caller can open the media/manage view. */
  onCreated: (property: PropertyDto) => void;
}) {
  const t = useT();
  const e = useEnumLabel();
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const isRental = form.purpose === ListingPurpose.RENT;
  const period = form.pricePeriod || (isRental ? PricePeriod.MONTHLY : "");
  const suffix = period ? PRICE_PERIOD_SUFFIX[period] : "";

  const requiredFilled =
    form.title.trim() &&
    form.address.trim() &&
    form.price.trim() &&
    form.rooms.trim() &&
    form.sizeM2.trim() &&
    form.ownerName.trim() &&
    form.ownerPhone.trim();

  const create = useMutation({
    mutationFn: () =>
      api.post<PropertyDto>("/properties", {
        title: form.title.trim(),
        type: form.type,
        purpose: form.purpose,
        region: form.region,
        address: form.address.trim(),
        neighborhood: form.neighborhood.trim() || undefined,
        price: Number(form.price),
        pricePeriod: isRental ? form.pricePeriod || undefined : undefined,
        rentalTermType: isRental ? form.rentalTermType || undefined : undefined,
        availableFrom: isRental ? form.availableFrom || undefined : undefined,
        minLeaseMonths: isRental ? num(form.minLeaseMonths) : undefined,
        minStayNights: isRental ? num(form.minStayNights) : undefined,
        nightlyRate: isRental ? num(form.nightlyRate) : undefined,
        depositAmount: isRental ? num(form.depositAmount) : undefined,
        rooms: form.rooms.trim(),
        sizeM2: Number(form.sizeM2),
        floor: num(form.floor),
        buildType: form.buildType || undefined,
        monthlyDues: num(form.monthlyDues),
        description: form.description.trim() || undefined,
        ownerName: form.ownerName.trim(),
        ownerPhone: form.ownerPhone.trim(),
        ownerEmail: form.ownerEmail.trim() || undefined,
        hasElevator: form.hasElevator,
        hasParking: form.hasParking,
        hasBalcony: form.hasBalcony,
        isFurnished: form.isFurnished,
        hasSeaView: form.hasSeaView,
        hasPool: form.hasPool,
        hasGarden: form.hasGarden,
      }),
    onSuccess: (property) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      setForm(EMPTY_FORM);
      setError(null);
      onOpenChange(false);
      onCreated(property);
    },
    onError: (err) => {
      setError(
        err instanceof ApiClientError
          ? err.error.detail || err.error.title
          : t("common.error"),
      );
    },
  });

  function submit() {
    if (!requiredFilled) {
      setError(t("property.validation.required"));
      return;
    }
    setError(null);
    create.mutate();
  }

  const field = (key: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("property.createTitle")}</DialogTitle>
          <DialogDescription>{t("property.createSubtitle")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="np-title">{t("property.title")} *</Label>
            <Input
              id="np-title"
              value={form.title}
              placeholder={t("property.titlePlaceholder")}
              onChange={(ev) => field("title")(ev.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("property.type")} *</Label>
            <Select
              value={form.type}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, type: v as PropertyType }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PropertyType).map((v) => (
                  <SelectItem key={v} value={v}>
                    {e("propertyType", v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("property.purpose")} *</Label>
            <Select
              value={form.purpose}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, purpose: v as ListingPurpose }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ListingPurpose).map((v) => (
                  <SelectItem key={v} value={v}>
                    {e("purpose", v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("property.region")} *</Label>
            <Select
              value={form.region}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, region: v as Region }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {Object.values(Region).map((r) => (
                  <SelectItem key={r} value={r}>
                    {REGION_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="np-neigh">{t("property.neighborhood")}</Label>
            <Input
              id="np-neigh"
              value={form.neighborhood}
              onChange={(ev) => field("neighborhood")(ev.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="np-address">{t("property.address")} *</Label>
            <Input
              id="np-address"
              value={form.address}
              placeholder={t("property.addressPlaceholder")}
              onChange={(ev) => field("address")(ev.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="np-price">
              {t("property.price", { suffix })} *
            </Label>
            <Input
              id="np-price"
              type="number"
              min={0}
              value={form.price}
              onChange={(ev) => field("price")(ev.target.value)}
            />
          </div>

          {isRental && (
            <>
              <div className="space-y-1.5">
                <Label>{t("property.pricePeriod")}</Label>
                <Select
                  value={form.pricePeriod || PricePeriod.MONTHLY}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, pricePeriod: v as PricePeriod }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      PricePeriod.MONTHLY,
                      PricePeriod.NIGHTLY,
                      PricePeriod.WEEKLY,
                    ].map((v) => (
                      <SelectItem key={v} value={v}>
                        {e("pricePeriod", v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("property.rentalTerm")}</Label>
                <Select
                  value={form.rentalTermType || "NA"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      rentalTermType: v === "NA" ? "" : (v as RentalTermType),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NA">{t("property.unspecified")}</SelectItem>
                    {Object.values(RentalTermType).map((v) => (
                      <SelectItem key={v} value={v}>
                        {e("rentalTerm", v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-available">{t("property.availableFrom")}</Label>
                <Input
                  id="np-available"
                  type="date"
                  value={form.availableFrom}
                  onChange={(ev) => field("availableFrom")(ev.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-deposit">{t("property.deposit")}</Label>
                <Input
                  id="np-deposit"
                  type="number"
                  min={0}
                  value={form.depositAmount}
                  onChange={(ev) => field("depositAmount")(ev.target.value)}
                />
              </div>
              {(form.rentalTermType === RentalTermType.LONG_TERM ||
                !form.rentalTermType) && (
                <div className="space-y-1.5">
                  <Label htmlFor="np-minlease">{t("property.minLease")}</Label>
                  <Input
                    id="np-minlease"
                    type="number"
                    min={0}
                    value={form.minLeaseMonths}
                    onChange={(ev) => field("minLeaseMonths")(ev.target.value)}
                  />
                </div>
              )}
              {(form.rentalTermType === RentalTermType.SHORT_TERM ||
                form.pricePeriod === PricePeriod.NIGHTLY) && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="np-minstay">{t("property.minStay")}</Label>
                    <Input
                      id="np-minstay"
                      type="number"
                      min={0}
                      value={form.minStayNights}
                      onChange={(ev) => field("minStayNights")(ev.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="np-nightly">{t("property.nightlyRate")}</Label>
                    <Input
                      id="np-nightly"
                      type="number"
                      min={0}
                      value={form.nightlyRate}
                      onChange={(ev) => field("nightlyRate")(ev.target.value)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="np-rooms">{t("property.rooms")} *</Label>
            <Input
              id="np-rooms"
              value={form.rooms}
              placeholder={t("property.roomsPlaceholder")}
              onChange={(ev) => field("rooms")(ev.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-size">{t("property.size")} *</Label>
            <Input
              id="np-size"
              type="number"
              min={0}
              value={form.sizeM2}
              onChange={(ev) => field("sizeM2")(ev.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-floor">{t("property.floor")}</Label>
            <Input
              id="np-floor"
              type="number"
              value={form.floor}
              onChange={(ev) => field("floor")(ev.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("property.buildType")}</Label>
            <Select
              value={form.buildType || "NA"}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  buildType: v === "NA" ? "" : (v as BuildType),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NA">{t("property.unspecified")}</SelectItem>
                {Object.values(BuildType).map((v) => (
                  <SelectItem key={v} value={v}>
                    {e("buildType", v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-dues">{t("property.monthlyDues")}</Label>
            <Input
              id="np-dues"
              type="number"
              min={0}
              value={form.monthlyDues}
              onChange={(ev) => field("monthlyDues")(ev.target.value)}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("property.features")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {AMENITIES.map((key: AmenityKey) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, [key]: !f[key] }))}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${form[key] ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}
                >
                  {t(`amenity.${key}` as MessageKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="np-desc">{t("property.description")}</Label>
            <textarea
              id="np-desc"
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.description}
              onChange={(ev) => field("description")(ev.target.value)}
            />
          </div>

          <div className="sm:col-span-2 border-t pt-3">
            <p className="mb-2 text-sm font-medium">{t("property.owner")}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="np-owner">{t("property.ownerName")} *</Label>
                <Input
                  id="np-owner"
                  value={form.ownerName}
                  onChange={(ev) => field("ownerName")(ev.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-owner-phone">
                  {t("property.ownerPhone")} *
                </Label>
                <Input
                  id="np-owner-phone"
                  type="tel"
                  value={form.ownerPhone}
                  placeholder="+382 6x xxx xxx"
                  onChange={(ev) => field("ownerPhone")(ev.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-owner-email">{t("property.ownerEmail")}</Label>
                <Input
                  id="np-owner-email"
                  type="email"
                  value={form.ownerEmail}
                  onChange={(ev) => field("ownerEmail")(ev.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {t("property.requiredHint")}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" disabled={create.isPending} onClick={submit}>
              {create.isPending && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {create.isPending
                ? t("common.creating")
                : t("property.createSubmit")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
