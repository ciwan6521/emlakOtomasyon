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
import type { CustomerDto, Paginated } from "@reos/shared";

type FormState = {
  amount: string;
  customerId: string;
  dueAt: string;
  notes: string;
};
const EMPTY: FormState = { amount: "", customerId: "", dueAt: "", notes: "" };

export function InvoiceDialog({
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

  const { data: customers } = useQuery({
    queryKey: ["customers", "picker"],
    queryFn: () => api.get<Paginated<CustomerDto>>("/customers?pageSize=50"),
    enabled: open,
  });

  const save = useMutation({
    mutationFn: () =>
      api.post("/finance/invoices", {
        amount: Number(form.amount) || 0,
        customerId: form.customerId || undefined,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("invoice.title")}</DialogTitle>
          <DialogDescription>{t("invoice.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("invoice.amount")}</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("invoice.customer")}</Label>
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
          <div className="space-y-1.5">
            <Label>{t("invoice.dueDate")}</Label>
            <Input
              type="date"
              value={form.dueAt}
              onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.notes")}</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!form.amount || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? t("common.saving") : t("invoice.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
