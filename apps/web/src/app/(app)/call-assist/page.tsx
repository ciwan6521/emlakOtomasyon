"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Building2,
  Check,
  Facebook,
  Instagram,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  Search,
  Send,
  Share2,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  CommChannel,
  parseListingQuery,
  type CallAssistCard,
  type CallAssistSearchResponse,
  type CallAssistSendResult,
} from "@reos/shared";

interface QueueItem {
  leadId: string;
  fullName: string;
  phone: string;
  score: number;
  status: string;
}

const CHANNELS: {
  value: CommChannel;
  label: string;
  icon: typeof MessageCircle;
}[] = [
  { value: CommChannel.WHATSAPP, label: "WhatsApp", icon: MessageCircle },
  { value: CommChannel.VIBER, label: "Viber", icon: MessageCircle },
  { value: CommChannel.TELEGRAM, label: "Telegram", icon: Send },
  { value: CommChannel.SMS, label: "SMS", icon: Phone },
  { value: CommChannel.EMAIL, label: "Email", icon: Mail },
];

/**
 * Each channel addresses people differently: WhatsApp and SMS take a phone
 * number, but Viber and Telegram need an id the contact only hands over by
 * messaging the business account first. An address is never reusable across
 * two of these, so the recipient is cleared whenever the space changes.
 */
const ADDRESS_SPACE: Record<CommChannel, string> = {
  [CommChannel.WHATSAPP]: "phone",
  [CommChannel.SMS]: "phone",
  [CommChannel.VIBER]: "viber",
  [CommChannel.TELEGRAM]: "telegram",
  [CommChannel.EMAIL]: "email",
};

const RECIPIENT_FIELD: Record<
  CommChannel,
  { label: string; placeholder: string }
> = {
  [CommChannel.WHATSAPP]: {
    label: "Recipient phone",
    placeholder: "+382 6x xxx xxx",
  },
  [CommChannel.SMS]: {
    label: "Recipient phone",
    placeholder: "+382 6x xxx xxx",
  },
  [CommChannel.VIBER]: {
    label: "Viber subscriber ID",
    placeholder: "Sent to you when the contact messages your Viber account",
  },
  [CommChannel.TELEGRAM]: {
    label: "Telegram chat ID",
    placeholder: "123456789",
  },
  [CommChannel.EMAIL]: {
    label: "Recipient email",
    placeholder: "name@example.com",
  },
};

function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function CallAssistPage() {
  const [queryText, setQueryText] = useState("");
  const debounced = useDebounced(queryText);
  const [selected, setSelected] = useState<Record<string, CallAssistCard>>({});
  const [channel, setChannel] = useState<CommChannel>(CommChannel.WHATSAPP);
  const [recipient, setRecipient] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [leadId, setLeadId] = useState<string | undefined>();
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [messageTouched, setMessageTouched] = useState(false);
  const [sentInfo, setSentInfo] = useState<CallAssistSendResult | null>(null);

  const parsedPreview = useMemo(
    () => parseListingQuery(debounced),
    [debounced],
  );

  const search = useQuery({
    queryKey: ["call-assist", debounced],
    queryFn: () =>
      api.post<CallAssistSearchResponse>("/call-assist/search", {
        q: debounced,
        limit: 18,
      }),
    enabled: debounced.trim().length > 0,
  });

  // Optional: outbound call queue to quick-pick who you're calling (call-center roles).
  const queue = useQuery({
    queryKey: ["calls", "queue", "assist"],
    queryFn: () => api.get<QueueItem[]>("/calls/queue?limit=15"),
    retry: false,
  });

  const selectedList = Object.values(selected);

  // Seed the editable message from the backend's suggestion (until the agent edits it).
  useEffect(() => {
    if (!messageTouched && search.data?.suggestedMessage)
      setMessage(search.data.suggestedMessage);
  }, [search.data?.suggestedMessage, messageTouched]);

  const send = useMutation({
    mutationFn: () =>
      api.post<CallAssistSendResult>("/call-assist/send", {
        propertyIds: selectedList.map((c) => c.id),
        channel,
        recipient,
        message: message || undefined,
        customerId,
        leadId,
      }),
    onSuccess: (res) => {
      setSentInfo(res);
      setSelected({});
      setTimeout(() => setSentInfo(null), 6000);
    },
  });

  function toggle(card: CallAssistCard) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[card.id]) delete next[card.id];
      else next[card.id] = card;
      return next;
    });
  }

  function pickQueueItem(item: QueueItem) {
    setRecipient(ADDRESS_SPACE[channel] === "phone" ? item.phone : "");
    setCustomerName(item.fullName);
    setLeadId(item.leadId);
    setCustomerId(undefined);
  }

  function pickChannel(next: CommChannel) {
    if (ADDRESS_SPACE[next] !== ADDRESS_SPACE[channel]) setRecipient("");
    setChannel(next);
  }

  async function share(card: CallAssistCard) {
    const text =
      card.shareText +
      (card.socialLinks[0]?.url ? `\n${card.socialLinks[0].url}` : "");
    if (navigator.share) {
      try {
        await navigator.share({ title: card.title, text });
        return;
      } catch {
        /* fall through */
      }
    }
    await navigator.clipboard.writeText(text);
  }

  const canSend =
    selectedList.length > 0 && recipient.trim().length > 0 && !send.isPending;
  const chips = [
    parsedPreview.region && parsedPreview.region,
    parsedPreview.rooms && `${parsedPreview.rooms} rooms`,
    parsedPreview.type && parsedPreview.type,
    parsedPreview.purpose && parsedPreview.purpose,
    parsedPreview.budgetMin != null &&
      `≥ ${formatCurrency(parsedPreview.budgetMin)}`,
    parsedPreview.budgetMax != null &&
      `≤ ${formatCurrency(parsedPreview.budgetMax)}`,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-4 pb-40">
      <PageHeader
        titleKey="page.callAssist.title"
        descriptionKey="page.callAssist.subtitle"
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* LEFT — customer / conversation panel */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name (optional)</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{RECIPIENT_FIELD[channel].label}</Label>
                <Input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={RECIPIENT_FIELD[channel].placeholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CHANNELS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => pickChannel(c.value)}
                      className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${channel === c.value ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}
                    >
                      <c.icon className="h-3.5 w-3.5" /> {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Conversation notes</Label>
                <textarea
                  className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Jot down what the customer says…"
                />
              </div>
            </CardContent>
          </Card>

          {(queue.data?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Call queue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {queue.data!.map((item) => (
                  <button
                    key={item.leadId}
                    onClick={() => pickQueueItem(item)}
                    className={`flex w-full items-center gap-2 rounded-md border p-2 text-left text-xs transition-colors hover:bg-accent ${leadId === item.leadId ? "border-primary bg-primary/5" : ""}`}
                  >
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {item.fullName}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {item.phone}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT — live filtered listings */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder='Type e.g. "Budva 2+1 200k" or "villa tivat rent 1.2m"…'
              className="h-11 pl-9 text-base"
            />
            {search.isFetching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {chips.map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
            </div>
          )}

          {!debounced.trim() && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center text-sm text-muted-foreground">
              <Building2 className="mb-2 h-8 w-8" />
              Start typing what the customer is looking for — results filter in
              real time.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {search.data?.results.map((card) => {
              const isSel = !!selected[card.id];
              return (
                <Card
                  key={card.id}
                  className={`overflow-hidden transition-shadow ${isSel ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="relative aspect-[4/3] bg-muted">
                    {card.coverUrl ? (
                      <Image
                        src={card.coverUrl}
                        alt={card.title}
                        fill
                        className="object-cover"
                        sizes="320px"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Building2 className="h-8 w-8" />
                      </div>
                    )}
                    <button
                      onClick={() => toggle(card)}
                      className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${isSel ? "border-primary bg-primary text-primary-foreground" : "border-white bg-black/30 text-transparent"}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <Badge className="absolute right-2 top-2 bg-primary/90">
                      {card.relevance}% match
                    </Badge>
                  </div>
                  <CardContent className="space-y-2 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">
                        {card.reference}
                      </span>
                      <span className="text-sm font-semibold">
                        {formatCurrency(card.price, card.currency)}
                      </span>
                    </div>
                    <p className="truncate text-sm font-medium">{card.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {card.region}
                      </span>
                      <span>{card.rooms}</span>
                      <span className="flex items-center gap-1">
                        <Ruler className="h-3 w-3" />
                        {card.sizeM2} m²
                      </span>
                    </div>
                    {card.matchReasons.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {card.matchReasons.slice(0, 3).map((r) => (
                          <span
                            key={r}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1 pt-1">
                      {card.socialLinks.map((l) => (
                        <a
                          key={l.channel}
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-primary"
                          title={l.channel}
                        >
                          {l.channel === "INSTAGRAM" ? (
                            <Instagram className="h-4 w-4" />
                          ) : (
                            <Facebook className="h-4 w-4" />
                          )}
                        </a>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto h-7 px-2"
                        onClick={() => share(card)}
                      >
                        <Share2 className="mr-1 h-3.5 w-3.5" /> Share
                      </Button>
                      <Button
                        size="sm"
                        variant={isSel ? "default" : "outline"}
                        className="h-7 px-2"
                        onClick={() => toggle(card)}
                      >
                        {isSel ? "Selected" : "Select"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {debounced.trim() && search.data?.results.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No active listings match these criteria.
            </p>
          )}
        </div>
      </div>

      {/* BOTTOM — send to customer panel */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-2 p-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 lg:w-72">
            <Badge variant={selectedList.length ? "default" : "secondary"}>
              {selectedList.length} selected
            </Badge>
            <span className="truncate text-xs text-muted-foreground">
              {recipient
                ? `→ ${customerName || recipient} via ${channel}`
                : "Set a recipient on the left"}
            </span>
          </div>
          <Input
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setMessageTouched(true);
            }}
            placeholder="Auto-prepared message — select listings to populate…"
            className="flex-1"
          />
          <Button
            disabled={!canSend}
            onClick={() => send.mutate()}
            className="lg:w-44"
          >
            {send.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-4 w-4" />
            )}
            Send to customer
          </Button>
        </div>
        {sentInfo && (
          <div className="bg-emerald-500/10 py-1.5 text-center text-xs font-medium text-emerald-600">
            Sent {sentInfo.sent} listing{sentInfo.sent === 1 ? "" : "s"} to{" "}
            {sentInfo.recipient} via {sentInfo.channel}
          </div>
        )}
      </div>
    </div>
  );
}
