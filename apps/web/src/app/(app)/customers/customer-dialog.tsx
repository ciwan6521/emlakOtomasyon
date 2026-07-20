"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  CustomerIntent,
  CustomerKind,
  CustomerSegment,
  FinancingType,
  ListingPurpose,
  PricePeriod,
  PRICE_PERIOD_SUFFIX,
  PropertyType,
  Region,
  Residency,
  type CustomerDto,
} from "@reos/shared";

type FormState = {
  fullName: string;
  phone: string;
  email: string;
  whatsapp: string;
  kind: CustomerKind;
  intent: CustomerIntent;
  segment: CustomerSegment;
  budgetMin: string;
  budgetMax: string;
  preferredRegions: Region[];
  propertyType: string;
  roomRequirement: string;
  financing: string;
  residency: string;
  notes: string;
  preferredPurpose: string;
  moveInDate: string;
  leaseMonths: string;
  petsAllowed: boolean;
  occupants: string;
};

const EMPTY: FormState = {
  fullName: "",
  phone: "",
  email: "",
  whatsapp: "",
  kind: CustomerKind.BUYER,
  intent: CustomerIntent.LIVING,
  segment: CustomerSegment.WARM,
  budgetMin: "",
  budgetMax: "",
  preferredRegions: [],
  propertyType: "",
  roomRequirement: "",
  financing: "",
  residency: "",
  notes: "",
  preferredPurpose: "",
  moveInDate: "",
  leaseMonths: "",
  petsAllowed: false,
  occupants: "",
};

export function CustomerDialog({
  customer,
  open,
  onOpenChange,
}: {
  customer: CustomerDto | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!customer;
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (open) {
      setForm(
        customer
          ? {
              fullName: customer.fullName,
              phone: customer.phone,
              email: customer.email ?? "",
              whatsapp: customer.whatsapp ?? "",
              kind: customer.kind,
              intent: customer.intent,
              segment: customer.segment,
              budgetMin: String(customer.budgetMin),
              budgetMax: String(customer.budgetMax),
              preferredRegions: customer.preferredRegions,
              propertyType: customer.propertyType ?? "",
              roomRequirement: customer.roomRequirement ?? "",
              financing: customer.financing ?? "",
              residency: customer.residency ?? "",
              notes: customer.notes ?? "",
              preferredPurpose: customer.preferredPurpose ?? "",
              moveInDate: customer.moveInDate
                ? customer.moveInDate.slice(0, 10)
                : "",
              leaseMonths:
                customer.leaseMonths != null
                  ? String(customer.leaseMonths)
                  : "",
              petsAllowed: customer.petsAllowed ?? false,
              occupants:
                customer.occupants != null ? String(customer.occupants) : "",
            }
          : EMPTY,
      );
    }
  }, [open, customer]);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        budgetMin: Number(form.budgetMin) || 0,
        budgetMax: Number(form.budgetMax) || 0,
        preferredRegions: form.preferredRegions,
        propertyType: form.propertyType || undefined,
        roomRequirement: form.roomRequirement || undefined,
        financing: form.financing || undefined,
        residency: form.residency || undefined,
        segment: form.segment,
        notes: form.notes || undefined,
        whatsapp: form.whatsapp || undefined,
        preferredPurpose: form.preferredPurpose || undefined,
        moveInDate: form.moveInDate || undefined,
        leaseMonths:
          form.leaseMonths !== "" ? Number(form.leaseMonths) : undefined,
        petsAllowed: form.petsAllowed,
        occupants: form.occupants !== "" ? Number(form.occupants) : undefined,
      };
      return isEdit
        ? api.patch(`/customers/${customer!.id}`, payload)
        : api.post("/customers", {
            ...payload,
            fullName: form.fullName,
            phone: form.phone,
            email: form.email || undefined,
            whatsapp: form.whatsapp || undefined,
            kind: form.kind,
            intent: form.intent,
          });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      onOpenChange(false);
    },
  });

  function toggleRegion(r: Region) {
    setForm((f) => ({
      ...f,
      preferredRegions: f.preferredRegions.includes(r)
        ? f.preferredRegions.filter((x) => x !== r)
        : [...f.preferredRegions, r],
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit ${customer!.fullName}` : "New customer"}
          </DialogTitle>
          <DialogDescription>
            Buyer/tenant requirements drive smart matching against the
            portfolio.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          {!isEdit && (
            <>
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input
                  value={form.whatsapp}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp: e.target.value })
                  }
                  placeholder="+382…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kind</Label>
                <Select
                  value={form.kind}
                  onValueChange={(v) =>
                    setForm({ ...form, kind: v as CustomerKind })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CustomerKind).map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Intent</Label>
                <Select
                  value={form.intent}
                  onValueChange={(v) =>
                    setForm({ ...form, intent: v as CustomerIntent })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CustomerIntent).map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {isEdit && (
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="+382…"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Segment</Label>
            <Select
              value={form.segment}
              onValueChange={(v) =>
                setForm({ ...form, segment: v as CustomerSegment })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CustomerSegment).map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Budget min (EUR)</Label>
            <Input
              type="number"
              value={form.budgetMin}
              onChange={(e) => setForm({ ...form, budgetMin: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Budget max (EUR
              {form.kind === CustomerKind.TENANT ||
              form.preferredPurpose === ListingPurpose.RENT
                ? PRICE_PERIOD_SUFFIX[PricePeriod.MONTHLY]
                : ""}
              )
            </Label>
            <Input
              type="number"
              value={form.budgetMax}
              onChange={(e) => setForm({ ...form, budgetMax: e.target.value })}
            />
          </div>
          {(form.kind === CustomerKind.TENANT ||
            form.preferredPurpose === ListingPurpose.RENT) && (
            <>
              <div className="space-y-1.5">
                <Label>Move-in date</Label>
                <Input
                  type="date"
                  value={form.moveInDate}
                  onChange={(e) =>
                    setForm({ ...form, moveInDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Lease duration (months)</Label>
                <Input
                  type="number"
                  value={form.leaseMonths}
                  onChange={(e) =>
                    setForm({ ...form, leaseMonths: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Occupants</Label>
                <Input
                  type="number"
                  value={form.occupants}
                  onChange={(e) =>
                    setForm({ ...form, occupants: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Pets allowed</Label>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, petsAllowed: !f.petsAllowed }))
                  }
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${form.petsAllowed ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}
                >
                  {form.petsAllowed ? "Yes" : "No"}
                </button>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label>Preferred purpose</Label>
            <Select
              value={form.preferredPurpose || "ANY"}
              onValueChange={(v) =>
                setForm({ ...form, preferredPurpose: v === "ANY" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Auto (from kind)</SelectItem>
                <SelectItem value={ListingPurpose.SALE}>Sale</SelectItem>
                <SelectItem value={ListingPurpose.RENT}>Rent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Property type</Label>
            <Select
              value={form.propertyType || "ANY"}
              onValueChange={(v) =>
                setForm({ ...form, propertyType: v === "ANY" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Any</SelectItem>
                {Object.values(PropertyType).map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Rooms</Label>
            <Input
              value={form.roomRequirement}
              onChange={(e) =>
                setForm({ ...form, roomRequirement: e.target.value })
              }
              placeholder="e.g. 2+1"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Financing</Label>
            <Select
              value={form.financing || "ANY"}
              onValueChange={(v) =>
                setForm({ ...form, financing: v === "ANY" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Unspecified</SelectItem>
                <SelectItem value={FinancingType.CASH}>Cash</SelectItem>
                <SelectItem value={FinancingType.MORTGAGE}>
                  Mortgage / Credit
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Residency</Label>
            <Select
              value={form.residency || "ANY"}
              onValueChange={(v) =>
                setForm({ ...form, residency: v === "ANY" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Unspecified</SelectItem>
                <SelectItem value={Residency.CITIZEN}>Citizen</SelectItem>
                <SelectItem value={Residency.FOREIGN}>Foreigner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Internal notes…"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Preferred regions</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(Region).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRegion(r)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${form.preferredRegions.includes(r) ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Create customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
