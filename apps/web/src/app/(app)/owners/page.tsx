"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, Pencil, Plus, Star } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useAuth } from "@/lib/auth-store";
import { formatCurrency, formatDate, relativeTime } from "@/lib/utils";
import {
  OwnerRating,
  Permission,
  PropertyStatus,
  type OwnerDto,
  type Paginated,
} from "@reos/shared";

const RATING_STARS: Record<OwnerRating, number> = {
  EXCELLENT: 5,
  GOOD: 4,
  AVERAGE: 3,
  DIFFICULT: 2,
  PROBLEM: 1,
  BLACKLIST: 0,
};
const RATING_LABEL: Record<OwnerRating, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  AVERAGE: "Average",
  DIFFICULT: "Difficult",
  PROBLEM: "Problem",
  BLACKLIST: "Blacklist",
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  whatsapp: string;
  telegram: string;
  address: string;
  rating: OwnerRating;
  notes: string;
};
const EMPTY: FormState = {
  name: "",
  phone: "",
  email: "",
  whatsapp: "",
  telegram: "",
  address: "",
  rating: OwnerRating.AVERAGE,
  notes: "",
};

interface OwnerProperty {
  id: string;
  reference: string;
  title: string;
  status: PropertyStatus;
  price: number;
  region: string;
  createdAt: string;
}
interface OwnerConversation {
  id: string;
  channel: string;
  message: string;
  actorName: string | null;
  createdAt: string;
}
interface OwnerDetail extends OwnerDto {
  properties: OwnerProperty[];
  conversations: OwnerConversation[];
}

export default function OwnersPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState("ALL");
  const [search, setSearch] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<OwnerDto | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [noteChannel, setNoteChannel] = useState("NOTE");
  const [noteMessage, setNoteMessage] = useState("");
  const canManage = can(Permission.OWNER_MANAGE);

  const { data, isLoading } = useQuery({
    queryKey: ["owners", rating, search],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "100" });
      if (rating !== "ALL") params.set("rating", rating);
      if (search) params.set("search", search);
      return api.get<Paginated<OwnerDto>>(`/owners?${params.toString()}`);
    },
  });

  const detail = useQuery({
    queryKey: ["owner", viewingId],
    queryFn: () => api.get<OwnerDetail>(`/owners/${viewingId}`),
    enabled: !!viewingId,
  });

  const save = useMutation({
    mutationFn: () =>
      api.post("/owners", {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        whatsapp: form.whatsapp || undefined,
        telegram: form.telegram || undefined,
        address: form.address || undefined,
        rating: form.rating,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owners"] });
      setEditing(null);
    },
  });

  const addNote = useMutation({
    mutationFn: () =>
      api.post("/owners/conversations", {
        ownerPhone: detail.data!.phone,
        channel: noteChannel,
        message: noteMessage,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner", viewingId] });
      setNoteMessage("");
    },
  });

  function openEditor(o: OwnerDto | null) {
    setForm(
      o
        ? {
            name: o.name,
            phone: o.phone,
            email: o.email ?? "",
            whatsapp: o.whatsapp ?? "",
            telegram: o.telegram ?? "",
            address: o.address ?? "",
            rating: o.rating,
            notes: o.notes ?? "",
          }
        : EMPTY,
    );
    setEditing(o ?? ({ id: "new" } as OwnerDto));
  }

  return (
    <div>
      <PageHeader
        title="Owner CRM"
        description="Every property owner profiled with rating, portfolio history and contact channels."
        action={
          canManage && (
            <Button onClick={() => openEditor(null)}>
              <Plus className="mr-1.5 h-4 w-4" /> New owner
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={rating} onValueChange={setRating}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All ratings</SelectItem>
            {Object.values(OwnerRating).map((r) => (
              <SelectItem key={r} value={r}>
                {RATING_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="text-right">Properties</TableHead>
              <TableHead className="text-right">Active</TableHead>
              <TableHead className="text-right">Sold</TableHead>
              <TableHead className="text-right">Rented</TableHead>
              {canManage && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((o) => (
              <TableRow
                key={o.id}
                className="cursor-pointer"
                onClick={() => setViewingId(o.id)}
              >
                <TableCell className="font-medium">{o.name}</TableCell>
                <TableCell className="font-mono text-xs">{o.phone}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-0.5 text-warning">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5"
                        fill={
                          i < RATING_STARS[o.rating] ? "currentColor" : "none"
                        }
                      />
                    ))}
                  </span>
                </TableCell>
                <TableCell className="text-right">{o.propertyCount}</TableCell>
                <TableCell className="text-right">{o.activeListings}</TableCell>
                <TableCell className="text-right">{o.soldCount}</TableCell>
                <TableCell className="text-right">{o.rentedCount}</TableCell>
                {canManage && (
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditor(o);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {isLoading && (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 8 : 7}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 8 : 7}
                  className="py-10 text-center text-muted-foreground"
                >
                  No owners yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Owner detail dialog */}
      <Dialog open={!!viewingId} onOpenChange={(v) => !v && setViewingId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {detail.isLoading && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          )}
          {detail.data && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.data.name}</DialogTitle>
                <DialogDescription>
                  {detail.data.phone}
                  {detail.data.whatsapp &&
                    ` · WhatsApp ${detail.data.whatsapp}`}
                  {detail.data.email && ` · ${detail.data.email}`}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Properties</p>
                    <p className="text-lg font-semibold">
                      {detail.data.propertyCount}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Active</p>
                    <p className="text-lg font-semibold">
                      {detail.data.activeListings}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Sold</p>
                    <p className="text-lg font-semibold">
                      {detail.data.soldCount}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Rented</p>
                    <p className="text-lg font-semibold">
                      {detail.data.rentedCount}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {detail.data.notes && (
                <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {detail.data.notes}
                </p>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Properties</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ref</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.data.properties.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">
                            {p.reference}
                          </TableCell>
                          <TableCell className="font-medium">
                            {p.title}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {p.region}
                          </TableCell>
                          <TableCell>{formatCurrency(p.price)}</TableCell>
                          <TableCell>
                            <StatusBadge value={p.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                      {detail.data.properties.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="py-6 text-center text-muted-foreground"
                          >
                            No properties linked.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Conversation timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {detail.data.conversations.map((c) => (
                    <div
                      key={c.id}
                      className="flex gap-3 border-l-2 border-primary/30 pl-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {c.actorName ?? "System"}
                          </span>
                          <span>·</span>
                          <span>{c.channel}</span>
                          <span>·</span>
                          <span>{relativeTime(c.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm">{c.message}</p>
                      </div>
                    </div>
                  ))}
                  {detail.data.conversations.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No conversations yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              {canManage && (
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <MessageSquarePlus className="h-4 w-4" /> Add conversation
                    note
                  </p>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label>Channel</Label>
                      <Select
                        value={noteChannel}
                        onValueChange={setNoteChannel}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NOTE">Note</SelectItem>
                          <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                          <SelectItem value="PHONE">Phone</SelectItem>
                          <SelectItem value="EMAIL">Email</SelectItem>
                          <SelectItem value="TELEGRAM">Telegram</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-3">
                      <Label>Message</Label>
                      <Input
                        value={noteMessage}
                        onChange={(e) => setNoteMessage(e.target.value)}
                        placeholder="Call summary, agreement, follow-up…"
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          noteMessage.trim() &&
                          addNote.mutate()
                        }
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={!noteMessage.trim() || addNote.isPending}
                    onClick={() => addNote.mutate()}
                  >
                    {addNote.isPending ? "Saving…" : "Add note"}
                  </Button>
                </div>
              )}

              <DialogFooter>
                {canManage && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewingId(null);
                      openEditor(detail.data);
                    }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit profile
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / edit dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing && editing.id !== "new"
                ? `Edit ${editing.name}`
                : "New owner"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telegram</Label>
              <Input
                value={form.telegram}
                onChange={(e) => setForm({ ...form, telegram: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rating</Label>
              <Select
                value={form.rating}
                onValueChange={(v) =>
                  setForm({ ...form, rating: v as OwnerRating })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(OwnerRating).map((r) => (
                    <SelectItem key={r} value={r}>
                      {RATING_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={save.isPending || !form.name || !form.phone}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Saving…" : "Save owner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
