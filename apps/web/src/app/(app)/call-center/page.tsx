"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { MessageCircle, Phone, PhoneCall, Send } from "lucide-react";

import { PageHeader } from "@/components/page-header";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { StatusBadge } from "@/components/status-badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { api } from "@/lib/api";

import { CALL_RESULT_LABELS, CallResult, OwnerRating } from "@reos/shared";

interface QueueItem {
  leadId: string;

  fullName: string;

  phone: string;

  score: number;

  status: string;

  followUpAt?: string | null;

  ownerRating?: OwnerRating | null;

  lastNote?: string | null;

  listingUrl?: string | null;

  listingPhotoUrl?: string | null;
}

const OWNER_RATING_LABEL: Record<OwnerRating, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  AVERAGE: "Average",

  DIFFICULT: "Difficult",
  PROBLEM: "Problem",
  BLACKLIST: "Blacklist",
};

function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";

  const d = new Date(iso);

  const pad = (n: number) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CallCenterPage() {
  const qc = useQueryClient();

  const [active, setActive] = useState<QueueItem | null>(null);

  const [notes, setNotes] = useState("");

  const [followUpAt, setFollowUpAt] = useState("");

  const [ownerRating, setOwnerRating] = useState<OwnerRating | "">("");

  const queue = useQuery({
    queryKey: ["calls", "queue"],
    queryFn: () => api.get<QueueItem[]>("/calls/queue?limit=25"),
  });

  useEffect(() => {
    if (active) {
      setFollowUpAt(toDatetimeLocal(active.followUpAt));

      setOwnerRating(active.ownerRating ?? "");
    } else {
      setFollowUpAt("");

      setOwnerRating("");
    }
  }, [active]);

  const logResult = useMutation({
    mutationFn: ({ leadId, result }: { leadId: string; result: CallResult }) =>
      api.post(`/calls/lead/${leadId}/result`, {
        result,

        notes: notes || undefined,

        followUpAt: followUpAt ? new Date(followUpAt).toISOString() : undefined,

        ownerRating: ownerRating || undefined,
      }),

    onSuccess: () => {
      setActive(null);

      setNotes("");

      setFollowUpAt("");

      setOwnerRating("");

      qc.invalidateQueries({ queryKey: ["calls"] });

      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  function selectLead(item: QueueItem) {
    setActive(item);

    setNotes(item.lastNote ?? "");
  }

  const digits = active ? phoneDigits(active.phone) : "";

  return (
    <div>
      <PageHeader
        titleKey="page.callCenter.title"
        descriptionKey="page.callCenter.subtitle"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Outbound queue</CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            {queue.data?.map((item) => (
              <button
                key={item.leadId}
                onClick={() => selectLead(item)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent ${active?.leadId === item.leadId ? "border-primary bg-primary/5" : ""}`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Phone className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.fullName}
                  </p>

                  <p className="font-mono text-xs text-muted-foreground">
                    {item.phone}
                  </p>
                </div>

                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                  {item.score}
                </span>

                <StatusBadge value={item.status} />
              </button>
            ))}

            {queue.data?.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Queue is empty. Great work!
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call result</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {active ? (
              <>
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{active.fullName}</p>

                  <p className="font-mono text-xs text-muted-foreground">
                    {active.phone}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${active.phone}`}>
                        <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
                      </a>
                    </Button>

                    {digits && (
                      <>
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={`https://wa.me/${digits}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />{" "}
                            WhatsApp
                          </a>
                        </Button>

                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={`https://t.me/+${digits}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Send className="mr-1.5 h-3.5 w-3.5" /> Telegram
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Notes</Label>

                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Structured call note…"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Callback (follow-up)</Label>

                  <Input
                    type="datetime-local"
                    value={followUpAt}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Owner rating</Label>

                  <Select
                    value={ownerRating || "NONE"}
                    onValueChange={(v) =>
                      setOwnerRating(v === "NONE" ? "" : (v as OwnerRating))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="NONE">—</SelectItem>

                      {Object.values(OwnerRating).map((r) => (
                        <SelectItem key={r} value={r}>
                          {OWNER_RATING_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {Object.values(CallResult).map((r) => (
                    <Button
                      key={r}
                      variant="outline"
                      size="sm"
                      disabled={logResult.isPending}
                      onClick={() =>
                        logResult.mutate({ leadId: active.leadId, result: r })
                      }
                    >
                      {CALL_RESULT_LABELS[r]}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-muted-foreground">
                <PhoneCall className="mb-2 h-6 w-6" />
                Select a lead from the queue to log a call.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
