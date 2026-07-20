"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, PenLine, Upload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { formatDate } from "@/lib/utils";
import {
  DocumentStatus,
  DocumentType,
  Permission,
  type DocumentDto,
  type Paginated,
} from "@reos/shared";

interface PresignResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresInSeconds: number;
}

export default function DocumentsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [uploadType, setUploadType] = useState<DocumentType>(
    DocumentType.CONTRACT,
  );
  const canManage = can(Permission.DOCUMENT_MANAGE);

  const { data, isLoading } = useQuery({
    queryKey: ["documents", typeFilter],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "100" });
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      return api.get<Paginated<DocumentDto>>(`/documents?${params.toString()}`);
    },
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DocumentStatus }) =>
      api.post(`/documents/${id}/status`, { status }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });

  const sign = useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/sign`, {}),
    onSettled: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });

  async function uploadFiles(files: FileList) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const presign = await api.post<PresignResult>("/documents/presign", {
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        });
        const put = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!put.ok) throw new Error(`Upload failed (${put.status})`);
        await api.post("/documents", {
          name: file.name,
          url: presign.publicUrl,
          type: uploadType,
          mimeType: file.type || undefined,
          sizeBytes: file.size,
        });
      }
      qc.invalidateQueries({ queryKey: ["documents"] });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Contracts, title deeds, IDs, and other documents. Upload, track status, and sign."
        action={
          canManage && (
            <div className="flex items-center gap-2">
              <Select
                value={uploadType}
                onValueChange={(v) => setUploadType(v as DocumentType)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DocumentType).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                ref={fileInput}
                type="file"
                accept="image/*,application/pdf"
                multiple
                hidden
                onChange={(e) => e.target.files && uploadFiles(e.target.files)}
              />
              <Button
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-4 w-4" />
                )}
                Upload
              </Button>
            </div>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {Object.values(DocumentType).map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 font-medium hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                    {d.name}
                  </a>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {d.type}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(d.createdAt)}
                </TableCell>
                <TableCell>
                  {canManage ? (
                    <Select
                      value={d.status}
                      onValueChange={(v) =>
                        changeStatus.mutate({
                          id: d.id,
                          status: v as DocumentStatus,
                        })
                      }
                    >
                      <SelectTrigger className="h-7 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(DocumentStatus).map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    d.status
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {canManage && d.status !== DocumentStatus.SIGNED && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sign.mutate(d.id)}
                    >
                      <PenLine className="mr-1.5 h-3.5 w-3.5" /> Mark signed
                    </Button>
                  )}
                  {d.status === DocumentStatus.SIGNED && d.signedAt && (
                    <span className="text-xs text-muted-foreground">
                      Signed {formatDate(d.signedAt)}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {isLoading && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  No documents yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
