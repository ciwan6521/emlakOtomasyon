"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { CustomerDto, Paginated, PropertyDto } from "@reos/shared";

type FormState = {
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  notes: string;
  propertyId: string;
  customerId: string;
};

const EMPTY: FormState = {
  title: "",
  startAt: "",
  endAt: "",
  location: "",
  notes: "",
  propertyId: "",
  customerId: "",
};

export function AppointmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (open) setForm(EMPTY);
  }, [open]);

  const { data: properties } = useQuery({
    queryKey: ["properties", "picker"],
    queryFn: () => api.get<Paginated<PropertyDto>>("/properties?pageSize=50"),
    enabled: open,
  });
  const { data: customers } = useQuery({
    queryKey: ["customers", "picker"],
    queryFn: () => api.get<Paginated<CustomerDto>>("/customers?pageSize=50"),
    enabled: open,
  });

  const save = useMutation({
    mutationFn: () =>
      api.post("/appointments", {
        title: form.title,
        startAt: new Date(form.startAt).toISOString(),
        endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
        location: form.location || undefined,
        notes: form.notes || undefined,
        propertyId: form.propertyId || undefined,
        customerId: form.customerId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      onOpenChange(false);
    },
  });

  const valid = form.title.trim() && form.startAt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("appointments.new")}</DialogTitle>
          <DialogDescription>
            {t("appointments.dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("appointments.fieldTitle")}</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t("appointments.titlePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("appointments.start")}</Label>
            <Input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setForm({ ...form, startAt: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("appointments.endOptional")}</Label>
            <Input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => setForm({ ...form, endAt: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("appointments.property")}</Label>
            <Select
              value={form.propertyId || "NONE"}
              onValueChange={(v) =>
                setForm({ ...form, propertyId: v === "NONE" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("common.none")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">{t("common.none")}</SelectItem>
                {properties?.data.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("appointments.customer")}</Label>
            <Select
              value={form.customerId || "NONE"}
              onValueChange={(v) =>
                setForm({ ...form, customerId: v === "NONE" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("common.none")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">{t("common.none")}</SelectItem>
                {customers?.data.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("appointments.location")}</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder={t("appointments.locationPlaceholder")}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("common.notes")}</Label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!valid || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? t("common.saving") : t("appointments.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
