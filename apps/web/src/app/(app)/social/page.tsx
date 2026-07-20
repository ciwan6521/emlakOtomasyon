"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { api, apiFetch } from "@/lib/api";
import { cn, relativeTime } from "@/lib/utils";
import { SocialChannel } from "@reos/shared";

interface SocialPost {
  id: string;
  caption: string;
  channels: string[];
  status: string;
  scheduleAt: string | null;
  createdAt: string;
}

const CAPTION_ENDPOINTS = [
  "/social/caption/generate",
  "/ai/social-caption",
] as const;

async function probeCaptionEndpoint(path: string): Promise<boolean> {
  try {
    await apiFetch(path, { method: "POST", body: {}, retry: false });
    return true;
  } catch (err: unknown) {
    const status = (err as { error?: { status?: number } })?.error?.status;
    return status !== undefined && status !== 404;
  }
}

export default function SocialPage() {
  const qc = useQueryClient();
  const [captionEndpoint, setCaptionEndpoint] = useState<string | null>(null);
  const [draftCaption, setDraftCaption] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data } = useQuery({
    queryKey: ["social"],
    queryFn: () => api.get<SocialPost[]>("/social/posts"),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const path of CAPTION_ENDPOINTS) {
        if (await probeCaptionEndpoint(path)) {
          if (!cancelled) setCaptionEndpoint(path);
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const createPost = useMutation({
    mutationFn: () =>
      api.post("/social/posts", {
        caption: draftCaption,
        channels: [SocialChannel.INSTAGRAM, SocialChannel.FACEBOOK],
        propertyId: propertyId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social"] });
      setDraftCaption("");
      setPropertyId("");
    },
  });

  const generateCaption = async () => {
    if (!captionEndpoint) return;
    setGenerating(true);
    try {
      const result = await api.post<{ caption: string }>(captionEndpoint, {
        propertyId: propertyId || undefined,
      });
      if (result.caption) setDraftCaption(result.caption);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Social Automation"
        description="Auto-post on publish, scheduling and repost logic (1d / 7d / price update)."
      />

      <Card className="mb-4">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Property ID (optional, for AI caption)</Label>
            <Input
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              placeholder="Property UUID"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Caption</Label>
            <textarea
              rows={4}
              value={draftCaption}
              onChange={(e) => setDraftCaption(e.target.value)}
              placeholder="Write or generate a caption…"
              className={cn(
                "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                "ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {captionEndpoint && (
              <Button
                variant="outline"
                disabled={generating}
                onClick={generateCaption}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                {generating ? "Generating…" : "AI caption"}
              </Button>
            )}
            <Button
              disabled={!draftCaption.trim() || createPost.isPending}
              onClick={() => createPost.mutate()}
            >
              {createPost.isPending ? "Creating…" : "Create post"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((post) => (
          <Card key={post.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {post.channels.map((c) => (
                    <Badge key={c} variant="secondary">
                      {c}
                    </Badge>
                  ))}
                </div>
                <StatusBadge value={post.status} />
              </div>
              <p className="whitespace-pre-line text-sm">{post.caption}</p>
              <p className="text-xs text-muted-foreground">
                {post.status === "SCHEDULED" && post.scheduleAt
                  ? `Scheduled ${relativeTime(post.scheduleAt)}`
                  : relativeTime(post.createdAt)}
              </p>
            </CardContent>
          </Card>
        ))}
        {(!data || data.length === 0) && (
          <p className="text-sm text-muted-foreground">
            No posts yet. Publishing a property auto-creates posts.
          </p>
        )}
      </div>
    </div>
  );
}
