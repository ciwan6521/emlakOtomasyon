"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { useEnumLabel, useT } from "@/lib/i18n/locale-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CommissionStatus,
  InvoiceStatus,
  Permission,
  type CommissionDto,
  type FinanceSummary,
  type InvoiceDto,
  type Paginated,
} from "@reos/shared";
import { InvoiceDialog } from "./invoice-dialog";

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

export default function FinancePage() {
  const t = useT();
  const e = useEnumLabel();
  const { can } = useAuth();
  const qc = useQueryClient();
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const canManageComm = can(Permission.COMMISSION_MANAGE);
  const canManageInv = can(Permission.INVOICE_MANAGE);

  const { data: summary } = useQuery({
    queryKey: ["finance", "summary"],
    queryFn: () => api.get<FinanceSummary>("/finance/summary"),
  });
  const { data: commissions } = useQuery({
    queryKey: ["finance", "commissions"],
    queryFn: () =>
      api.get<Paginated<CommissionDto>>("/finance/commissions?pageSize=100"),
  });
  const { data: invoices } = useQuery({
    queryKey: ["finance", "invoices"],
    queryFn: () =>
      api.get<Paginated<InvoiceDto>>("/finance/invoices?pageSize=100"),
  });

  const commStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CommissionStatus }) =>
      api.post(`/finance/commissions/${id}/status`, { status }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["finance"] }),
  });
  const invStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      api.post(`/finance/invoices/${id}/status`, { status }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["finance"] }),
  });

  return (
    <div>
      <PageHeader
        titleKey="page.finance.title"
        descriptionKey="page.finance.subtitle"
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label={t("finance.kpi.commissionPending")}
          value={formatCurrency(summary?.commissionPending ?? 0)}
        />
        <SummaryCard
          label={t("finance.kpi.commissionPaid")}
          value={formatCurrency(summary?.commissionPaid ?? 0)}
        />
        <SummaryCard
          label={t("finance.kpi.invoiceOpen")}
          value={formatCurrency(summary?.invoiceOutstanding ?? 0)}
        />
        <SummaryCard
          label={t("finance.kpi.invoicePaid")}
          value={formatCurrency(summary?.invoicePaid ?? 0)}
        />
      </div>

      <Tabs defaultValue="commissions">
        <TabsList>
          <TabsTrigger value="commissions">
            {t("finance.tabs.commissions")}
          </TabsTrigger>
          <TabsTrigger value="invoices">
            {t("finance.tabs.invoices")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commissions">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("finance.col.deal")}</TableHead>
                  <TableHead>{t("finance.col.agent")}</TableHead>
                  <TableHead>{t("finance.col.base")}</TableHead>
                  <TableHead>{t("finance.col.rate")}</TableHead>
                  <TableHead>{t("finance.col.amount")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions?.data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.dealTitle ?? c.dealId}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.agentName ?? "—"}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(c.baseAmount, c.currency)}
                    </TableCell>
                    <TableCell>%{c.ratePct}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(c.amount, c.currency)}
                    </TableCell>
                    <TableCell>
                      {canManageComm ? (
                        <Select
                          value={c.status}
                          onValueChange={(v) =>
                            commStatus.mutate({
                              id: c.id,
                              status: v as CommissionStatus,
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(CommissionStatus).map((s) => (
                              <SelectItem key={s} value={s}>
                                {e("status", s)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        e("status", c.status)
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {commissions?.data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {t("finance.noCommissions")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <div className="mb-3 flex justify-end">
            {canManageInv && (
              <Button size="sm" onClick={() => setCreatingInvoice(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> {t("finance.newInvoice")}
              </Button>
            )}
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("finance.col.number")}</TableHead>
                  <TableHead>{t("finance.col.amount")}</TableHead>
                  <TableHead>{t("finance.col.issued")}</TableHead>
                  <TableHead>{t("finance.col.due")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices?.data.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">
                      {i.number}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(i.amount, i.currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {i.issuedAt ? formatDate(i.issuedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {i.dueAt ? formatDate(i.dueAt) : "—"}
                    </TableCell>
                    <TableCell>
                      {canManageInv ? (
                        <Select
                          value={i.status}
                          onValueChange={(v) =>
                            invStatus.mutate({
                              id: i.id,
                              status: v as InvoiceStatus,
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(InvoiceStatus).map((s) => (
                              <SelectItem key={s} value={s}>
                                {e("status", s)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        e("status", i.status)
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {invoices?.data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {t("finance.noInvoices")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <InvoiceDialog open={creatingInvoice} onOpenChange={setCreatingInvoice} />
    </div>
  );
}
