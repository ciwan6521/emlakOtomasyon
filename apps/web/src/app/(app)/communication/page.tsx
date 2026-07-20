"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Send } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import {
  CommChannel,
  CustomerSegment,
  type CampaignDto,
  type PropertyBroadcastAudience,
} from "@reos/shared";

interface Template {
  id: string;
  name: string;
  channel: string;
  body: string;
}

export default function CommunicationPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    channel: CommChannel.WHATSAPP,
    templateId: "",
    segment: "" as string,
    customerIds: "",
    propertyId: "",
  });

  const templates = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.get<Template[]>("/templates"),
  });
  const campaigns = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => api.get<CampaignDto[]>("/campaigns").catch(() => []),
  });

  const broadcastHint = useQuery({
    queryKey: ["broadcast-audience", form.propertyId],
    enabled: !!form.propertyId.trim(),
    queryFn: () =>
      api.get<PropertyBroadcastAudience>(
        `/properties/${form.propertyId.trim()}/broadcast-audience`,
      ),
  });

  const createCampaign = useMutation({
    mutationFn: () => {
      const customerIds = form.customerIds
        .split(/[,;\s]+/)
        .map((id) => id.trim())
        .filter(Boolean);
      return api.post("/campaigns", {
        name: form.name,
        channel: form.channel,
        templateId: form.templateId,
        ...(form.segment ? { segment: form.segment } : {}),
        ...(customerIds.length ? { customerIds } : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setForm((f) => ({ ...f, name: "", customerIds: "" }));
    },
  });

  const dispatch = useMutation({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/dispatch`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const channelTemplates =
    templates.data?.filter((t) => t.channel === form.channel) ?? [];

  return (
    <div>
      <PageHeader
        title="Communication"
        description="Templates, bulk & personalized messaging across WhatsApp, Telegram and Email."
      />
      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.data?.map((t) => (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    {t.name}
                    <Badge variant="secondary">{t.channel}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t.body}</p>
                </CardContent>
              </Card>
            ))}
            {(!templates.data || templates.data.length === 0) && (
              <p className="text-sm text-muted-foreground">No templates yet.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4" /> Create campaign
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Campaign name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Spring buyers outreach"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select
                  value={form.channel}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      channel: v as CommChannel,
                      templateId: "",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CommChannel).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Template</Label>
                <Select
                  value={form.templateId}
                  onValueChange={(v) => setForm({ ...form, templateId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {channelTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Segment (optional)</Label>
                <Select
                  value={form.segment || "NONE"}
                  onValueChange={(v) =>
                    setForm({ ...form, segment: v === "NONE" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All segments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No segment filter</SelectItem>
                    {Object.values(CustomerSegment).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Customer IDs (optional, comma-separated)</Label>
                <Input
                  value={form.customerIds}
                  onChange={(e) =>
                    setForm({ ...form, customerIds: e.target.value })
                  }
                  placeholder="uuid-1, uuid-2, …"
                />
                <p className="text-xs text-muted-foreground">
                  Use segment or explicit customer IDs. If both are set,
                  customer IDs take precedence.
                </p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Property ID (broadcast hint)</Label>
                <Input
                  value={form.propertyId}
                  onChange={(e) =>
                    setForm({ ...form, propertyId: e.target.value })
                  }
                  placeholder="Property UUID to preview matched audience"
                />
                {broadcastHint.data && (
                  <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                    <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">
                        {broadcastHint.data.matchCount} matched customers for
                        property broadcast
                      </p>
                      {broadcastHint.data.customers.length > 0 && (
                        <p className="mt-1 text-muted-foreground">
                          Top matches:{" "}
                          {broadcastHint.data.customers
                            .slice(0, 5)
                            .map((c) => c.fullName)
                            .join(", ")}
                          {broadcastHint.data.matchCount > 5 ? "…" : ""}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Publishing a property auto-dispatches a WhatsApp
                        campaign to matched buyers.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <Button
                  disabled={
                    !form.name || !form.templateId || createCampaign.isPending
                  }
                  onClick={() => createCampaign.mutate()}
                >
                  {createCampaign.isPending ? "Creating…" : "Create campaign"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Clicked</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.data?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.channel}</TableCell>
                    <TableCell>{c.audienceSize}</TableCell>
                    <TableCell>{c.sentCount}</TableCell>
                    <TableCell>{c.deliveredCount}</TableCell>
                    <TableCell>{c.clickedCount}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={dispatch.isPending || c.audienceSize === 0}
                        onClick={() => dispatch.mutate(c.id)}
                      >
                        <Send className="mr-1 h-3.5 w-3.5" /> Dispatch
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!campaigns.data || campaigns.data.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No campaigns yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
