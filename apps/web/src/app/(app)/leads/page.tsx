"use client";

import { useState } from "react";

import Image from "next/image";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ExternalLink, Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";

import { StatusBadge } from "@/components/status-badge";

import { Button } from "@/components/ui/button";

import { Card } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { api } from "@/lib/api";

import { formatCurrency, formatDate, relativeTime } from "@/lib/utils";

import {
  CALL_RESULT_LABELS,
  LEAD_KIND_LABELS,
  LEAD_STATUS_LABELS,
  LeadKind,
  LeadSource,
  LeadStatus,
  OwnerRating,
  Region,
  type CreateLeadRequest,
  type LeadDetailDto,
  type LeadDto,
  type Paginated,
} from "@reos/shared";

const OWNER_RATING_LABEL: Record<OwnerRating, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  AVERAGE: "Average",

  DIFFICULT: "Difficult",
  PROBLEM: "Problem",
  BLACKLIST: "Blacklist",
};

export default function LeadsPage() {
  const qc = useQueryClient();

  const [status, setStatus] = useState<string>("ALL");

  const [search, setSearch] = useState("");

  const [detailId, setDetailId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["leads", status, search],

    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "50" });

      if (status !== "ALL") params.set("status", status);

      if (search) params.set("search", search);

      return api.get<Paginated<LeadDto>>(`/leads?${params.toString()}`);
    },
  });

  const transition = useMutation({
    mutationFn: ({ id, to }: { id: string; to: LeadStatus }) =>
      api.post(`/leads/${id}/transition`, { to }),

    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Acquisition pipeline — scored, deduplicated and auto-assigned."
        action={
          <CreateLeadDialog
            onCreated={() => qc.invalidateQueries({ queryKey: ["leads"] })}
          />
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>

            {Object.values(LeadStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />

              <TableHead>Name</TableHead>

              <TableHead>Phone</TableHead>

              <TableHead>Source</TableHead>

              <TableHead>Region</TableHead>

              <TableHead>Score</TableHead>

              <TableHead>Status</TableHead>

              <TableHead>Assignee</TableHead>

              <TableHead>Created</TableHead>

              <TableHead className="text-right">Move to</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {query.data?.data.map((lead) => (
              <TableRow
                key={lead.id}
                className="cursor-pointer"
                onClick={() => setDetailId(lead.id)}
              >
                <TableCell>
                  {lead.listingPhotoUrl ? (
                    <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted">
                      <Image
                        src={lead.listingPhotoUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="40px"
                        unoptimized
                      />
                    </div>
                  ) : null}
                </TableCell>

                <TableCell className="font-medium">{lead.fullName}</TableCell>

                <TableCell className="font-mono text-xs">
                  {lead.phone}
                </TableCell>

                <TableCell className="text-muted-foreground">
                  {lead.source}
                </TableCell>

                <TableCell className="text-muted-foreground">
                  {lead.region ?? "—"}
                </TableCell>

                <TableCell>
                  <span className="inline-flex h-6 min-w-8 items-center justify-center rounded bg-primary/10 px-1.5 text-xs font-semibold text-primary">
                    {lead.score}
                  </span>
                </TableCell>

                <TableCell>
                  <StatusBadge value={lead.status} />
                </TableCell>

                <TableCell className="text-muted-foreground">
                  {lead.assignedToName ?? "Unassigned"}
                </TableCell>

                <TableCell className="text-muted-foreground">
                  {relativeTime(lead.createdAt)}
                </TableCell>

                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Select
                    onValueChange={(to) =>
                      transition.mutate({ id: lead.id, to: to as LeadStatus })
                    }
                  >
                    <SelectTrigger className="ml-auto h-8 w-32">
                      <SelectValue placeholder="Transition" />
                    </SelectTrigger>

                    <SelectContent>
                      {Object.values(LeadStatus).map((s) => (
                        <SelectItem key={s} value={s}>
                          {LEAD_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}

            {query.isLoading && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            )}

            {query.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="py-10 text-center text-muted-foreground"
                >
                  No leads found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <LeadDetailDialog
        leadId={detailId}
        open={!!detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
      />
    </div>
  );
}

function LeadDetailDialog({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = useQuery({
    queryKey: ["leads", leadId, "detail"],

    queryFn: () => api.get<LeadDetailDto>(`/leads/${leadId}`),

    enabled: open && !!leadId,
  });

  const lead = detail.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead?.fullName ?? "Lead detail"}</DialogTitle>
        </DialogHeader>

        {detail.isLoading && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        )}

        {lead && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start gap-4">
              {lead.listingPhotoUrl && (
                <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={lead.listingPhotoUrl}
                    alt="Listing"
                    fill
                    className="object-cover"
                    sizes="128px"
                    unoptimized
                  />
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={lead.status} />

                  <span className="text-xs text-muted-foreground">
                    {LEAD_STATUS_LABELS[lead.status]}
                  </span>
                </div>

                <p className="font-mono text-sm">{lead.phone}</p>

                {lead.listingPrice != null && (
                  <p className="text-sm font-semibold">
                    {formatCurrency(lead.listingPrice)}
                  </p>
                )}

                {lead.listingRooms && (
                  <p className="text-sm text-muted-foreground">
                    {lead.listingRooms}
                  </p>
                )}

                {lead.listingUrl && (
                  <a
                    href={lead.listingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    View listing <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoItem
                label="Last call"
                value={lead.lastCallAt ? formatDate(lead.lastCallAt) : "—"}
              />

              <InfoItem
                label="Last call result"
                value={
                  lead.lastCallResult
                    ? CALL_RESULT_LABELS[lead.lastCallResult]
                    : "—"
                }
              />

              <InfoItem
                label="Owner rating"
                value={
                  lead.ownerRating ? OWNER_RATING_LABEL[lead.ownerRating] : "—"
                }
              />

              <InfoItem
                label="Assignee"
                value={lead.assignedToName ?? "Unassigned"}
              />
            </div>

            {lead.lastNote && (
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Last note
                </p>

                <p className="mt-1 text-sm">{lead.lastNote}</p>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold">Activities</p>

              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-2">
                {lead.activities.length === 0 && (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    No activities yet.
                  </p>
                )}

                {lead.activities.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-md bg-muted/50 px-2 py-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{a.type}</span>

                      <span className="text-muted-foreground">
                        {relativeTime(a.createdAt)}
                      </span>
                    </div>

                    {a.message && (
                      <p className="mt-0.5 text-muted-foreground">
                        {a.message}
                      </p>
                    )}

                    {a.fromValue && a.toValue && (
                      <p className="mt-0.5 text-muted-foreground">
                        {LEAD_STATUS_LABELS[a.fromValue as LeadStatus] ??
                          a.fromValue}{" "}
                        →{" "}
                        {LEAD_STATUS_LABELS[a.toValue as LeadStatus] ??
                          a.toValue}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Calls</p>

              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-2">
                {lead.calls.length === 0 && (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    No calls logged yet.
                  </p>
                )}

                {lead.calls.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-md bg-muted/50 px-2 py-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {c.result ? CALL_RESULT_LABELS[c.result] : "—"}
                      </span>

                      <span className="text-muted-foreground">
                        {relativeTime(c.createdAt)}
                      </span>
                    </div>

                    {c.notes && (
                      <p className="mt-0.5 text-muted-foreground">{c.notes}</p>
                    )}

                    {c.followUpAt && (
                      <p className="mt-0.5 text-muted-foreground">
                        Follow-up: {formatDate(c.followUpAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>

      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}

function CreateLeadDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState<CreateLeadRequest>({
    kind: LeadKind.BUYER,
    fullName: "",
    phone: "",
    source: LeadSource.MANUAL,
  });

  const create = useMutation({
    mutationFn: () => api.post("/leads", form),

    onSuccess: () => {
      setOpen(false);
      onCreated();
      setForm({
        kind: LeadKind.BUYER,
        fullName: "",
        phone: "",
        source: LeadSource.MANUAL,
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New lead
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kind</Label>

              <Select
                value={form.kind}
                onValueChange={(v) => setForm({ ...form, kind: v as LeadKind })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {Object.values(LeadKind).map((k) => (
                    <SelectItem key={k} value={k}>
                      {LEAD_KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Source</Label>

              <Select
                value={form.source}
                onValueChange={(v) =>
                  setForm({ ...form, source: v as LeadSource })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {Object.values(LeadSource).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Region</Label>

            <Select
              value={form.region}
              onValueChange={(v) => setForm({ ...form, region: v as Region })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>

              <SelectContent>
                {Object.values(Region).map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={create.isPending || !form.fullName || !form.phone}
            onClick={() => create.mutate()}
          >
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
