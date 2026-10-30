"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExportCsvButton } from "@/components/export-csv-button";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useEnumLabel, useT } from "@/lib/i18n/locale-context";
import { formatCurrency } from "@/lib/utils";
import {
  CustomerSegment,
  Permission,
  regionLabel,
  type CustomerDto,
  type Paginated,
} from "@reos/shared";
import { CustomerDialog } from "./customer-dialog";

export default function CustomersPage() {
  const router = useRouter();
  const t = useT();
  const e = useEnumLabel();
  const { can } = useAuth();
  const [segment, setSegment] = useState("ALL");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CustomerDto | null>(null);
  const [creating, setCreating] = useState(false);
  const canManage = can(Permission.CUSTOMER_MANAGE);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", segment, search],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "60" });
      if (segment !== "ALL") params.set("segment", segment);
      if (search) params.set("search", search);
      return api.get<Paginated<CustomerDto>>(`/customers?${params.toString()}`);
    },
  });

  return (
    <div>
      <PageHeader
        titleKey="page.customers.title"
        descriptionKey="page.customers.subtitle"
        action={
          <>
            <ExportCsvButton resource="customers" />
            {canManage && (
              <Button onClick={() => setCreating(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> {t("customers.newCustomer")}
              </Button>
            )}
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("customers.searchPlaceholder")}
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
          className="max-w-xs"
        />
        <Select value={segment} onValueChange={setSegment}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("customers.allSegments")}</SelectItem>
            {Object.values(CustomerSegment).map((s) => (
              <SelectItem key={s} value={s}>
                {e("status", s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.phone")}</TableHead>
              <TableHead>{t("customers.intent")}</TableHead>
              <TableHead>{t("customers.budget")}</TableHead>
              <TableHead>{t("customers.regions")}</TableHead>
              <TableHead>{t("customers.type")}</TableHead>
              <TableHead>{t("customers.segment")}</TableHead>
              {canManage && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() => router.push(`/customers/${c.id}`)}
              >
                <TableCell className="font-medium">{c.fullName}</TableCell>
                <TableCell className="font-mono text-xs">{c.phone}</TableCell>
                <TableCell className="text-muted-foreground">
                  {e("customerIntent", c.intent)}
                </TableCell>
                <TableCell>
                  {formatCurrency(c.budgetMin)} – {formatCurrency(c.budgetMax)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.preferredRegions.map(regionLabel).join(", ")}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.propertyType ? e("propertyType", c.propertyType) : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge value={c.segment} />
                </TableCell>
                {canManage && (
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setEditing(c);
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
                  {t("customers.loading")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <CustomerDialog
        customer={editing}
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
      />
      <CustomerDialog
        customer={null}
        open={creating}
        onOpenChange={setCreating}
      />
    </div>
  );
}
