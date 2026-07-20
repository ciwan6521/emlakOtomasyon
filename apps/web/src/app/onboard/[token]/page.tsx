"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Building, CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListingPurpose, PropertyType, Region } from "@reos/shared";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface PresignResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresInSeconds: number;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadMedia(token: string, file: File): Promise<string> {
  try {
    const presignRes = await fetch(
      `${API_URL}/onboarding/sessions/${token}/presign`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      },
    );
    if (presignRes.ok) {
      const presign = (await presignRes.json()) as PresignResult;
      const put = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (put.ok) return presign.publicUrl;
    }
  } catch {
    // fall through to data URL fallback
  }

  if (file.type.startsWith("image/") && file.size <= 2 * 1024 * 1024) {
    return readAsDataUrl(file);
  }
  throw new Error(
    `Could not upload ${file.name}. Try a smaller image or contact support.`,
  );
}

export default function OnboardPage() {
  const { token } = useParams<{ token: string }>();
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"loading" | "form" | "done" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    ownerName: "",
    ownerPhone: "",
    title: "",
    type: PropertyType.APARTMENT,
    purpose: ListingPurpose.SALE,
    region: Region.BUDVA,
    address: "",
    price: 0,
    rooms: "2+1",
    sizeM2: 0,
    floor: "" as string | number,
    monthlyDues: "" as string | number,
    notes: "",
    mediaUrls: [] as string[],
  });

  useEffect(() => {
    fetch(`${API_URL}/onboarding/sessions/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.status === "APPROVED") {
          setState("done");
          setMessage("This property has already been approved.");
        } else {
          setState("form");
          if (data?.ownerName)
            setForm((f) => ({ ...f, ownerName: data.ownerName }));
          if (data?.payload) {
            const p = data.payload as Record<string, unknown>;
            setForm((f) => ({
              ...f,
              ownerName: (p.ownerName as string) ?? f.ownerName,
              ownerPhone: (p.ownerPhone as string) ?? f.ownerPhone,
              title: (p.title as string) ?? f.title,
              type: (p.type as PropertyType) ?? f.type,
              purpose: (p.purpose as ListingPurpose) ?? f.purpose,
              region: (p.region as Region) ?? f.region,
              address: (p.address as string) ?? f.address,
              price: (p.price as number) ?? f.price,
              rooms: (p.rooms as string) ?? f.rooms,
              sizeM2: (p.sizeM2 as number) ?? f.sizeM2,
              floor: p.floor != null ? String(p.floor) : "",
              monthlyDues: p.monthlyDues != null ? String(p.monthlyDues) : "",
              notes: (p.notes as string) ?? "",
              mediaUrls: (p.mediaUrls as string[]) ?? f.mediaUrls,
            }));
          }
        }
      })
      .catch(() => {
        setState("error");
        setMessage("Invalid or expired link.");
      });
  }, [token]);

  async function handleFiles(files: FileList) {
    setUploading(true);
    setMessage("");
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadMedia(token, file));
      }
      setForm((f) => ({ ...f, mediaUrls: [...f.mediaUrls, ...urls] }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function removeMedia(index: number) {
    setForm((f) => ({
      ...f,
      mediaUrls: f.mediaUrls.filter((_, i) => i !== index),
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.mediaUrls.length === 0) {
      setMessage("Please upload at least one photo.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    const payload = {
      ownerName: form.ownerName,
      ownerPhone: form.ownerPhone,
      title: form.title,
      type: form.type,
      purpose: form.purpose,
      region: form.region,
      address: form.address,
      price: form.price,
      rooms: form.rooms,
      sizeM2: form.sizeM2,
      floor: form.floor !== "" ? Number(form.floor) : undefined,
      monthlyDues:
        form.monthlyDues !== "" ? Number(form.monthlyDues) : undefined,
      notes: form.notes || undefined,
      mediaUrls: form.mediaUrls,
    };
    const res = await fetch(`${API_URL}/onboarding/sessions/${token}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (res.ok) {
      setState("done");
      setMessage("Thank you! Your property has been submitted for review.");
    } else {
      const err = await res.json().catch(() => null);
      setMessage(
        err?.title ?? err?.message ?? "Submission failed. Please try again.",
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Adriatic Real Estate</p>
              <p className="text-xs text-muted-foreground">
                Property onboarding
              </p>
            </div>
          </div>

          {state === "loading" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}
          {(state === "done" || state === "error") && (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle2
                className={`mb-3 h-10 w-10 ${state === "done" ? "text-success" : "text-destructive"}`}
              />
              <p className="text-sm">{message}</p>
            </div>
          )}

          {state === "form" && (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please provide your property details. Our team will review and
                publish it.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Your name</Label>
                  <Input
                    value={form.ownerName}
                    onChange={(e) =>
                      setForm({ ...form, ownerName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    value={form.ownerPhone}
                    onChange={(e) =>
                      setForm({ ...form, ownerPhone: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Listing title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) =>
                      setForm({ ...form, type: v as PropertyType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(PropertyType).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Purpose</Label>
                  <Select
                    value={form.purpose}
                    onValueChange={(v) =>
                      setForm({ ...form, purpose: v as ListingPurpose })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ListingPurpose).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Region</Label>
                  <Select
                    value={form.region}
                    onValueChange={(v) =>
                      setForm({ ...form, region: v as Region })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
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
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Price (EUR)</Label>
                  <Input
                    type="number"
                    value={form.price || ""}
                    onChange={(e) =>
                      setForm({ ...form, price: Number(e.target.value) })
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rooms</Label>
                  <Input
                    value={form.rooms}
                    onChange={(e) =>
                      setForm({ ...form, rooms: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Size (m²)</Label>
                  <Input
                    type="number"
                    value={form.sizeM2 || ""}
                    onChange={(e) =>
                      setForm({ ...form, sizeM2: Number(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Floor</Label>
                  <Input
                    type="number"
                    value={form.floor}
                    onChange={(e) =>
                      setForm({ ...form, floor: e.target.value })
                    }
                    placeholder="e.g. 3"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Monthly dues / aidat (EUR)</Label>
                  <Input
                    type="number"
                    value={form.monthlyDues}
                    onChange={(e) =>
                      setForm({ ...form, monthlyDues: e.target.value })
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <textarea
                  className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional details about the property…"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Photos</Label>
                  <div>
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(e) =>
                        e.target.files && handleFiles(e.target.files)
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => fileInput.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Upload photos
                    </Button>
                  </div>
                </div>
                {form.mediaUrls.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {form.mediaUrls.map((url, i) => (
                      <div
                        key={`${url}-${i}`}
                        className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                      >
                        <Image
                          src={url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="120px"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => removeMedia(i)}
                          className="absolute right-1 top-1 rounded-full bg-background/90 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                    Upload at least one photo of the property.
                  </p>
                )}
              </div>

              {message && <p className="text-sm text-destructive">{message}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || uploading}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />{" "}
                    Submitting…
                  </>
                ) : (
                  "Submit property"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
