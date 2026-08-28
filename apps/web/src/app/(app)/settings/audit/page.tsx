"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/utils";
import type { AuditLogDto, Paginated } from "@reos/shared";

function JsonCell({ value }: { value: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <pre className="max-h-32 max-w-xs overflow-auto whitespace-pre-wrap break-all rounded bg-muted/50 p-2 font-mono text-[10px] leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AuditPage() {
  const { data } = useQuery({
    queryKey: ["audit"],
    queryFn: () => api.get<Paginated<AuditLogDto>>("/audit?pageSize=80"),
  });

  return (
    <div>
      <PageHeader
        titleKey="page.audit.title"
        descriptionKey="page.audit.subtitle"
      />
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Before</TableHead>
              <TableHead>After</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Badge variant="secondary">{row.action}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {row.entity}
                  {row.entityId ? `:${row.entityId.slice(0, 8)}` : ""}
                </TableCell>
                <TableCell>
                  <JsonCell value={row.before} />
                </TableCell>
                <TableCell>
                  <JsonCell value={row.after} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.actorEmail ?? "system"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {relativeTime(row.createdAt)}
                </TableCell>
              </TableRow>
            ))}
            {(!data || data.data.length === 0) && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No audit records.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
