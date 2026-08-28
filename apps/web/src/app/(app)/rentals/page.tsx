"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AvailabilityKind,
  LEASE_STATUS_LABELS,
  LeaseStatus,
  ListingPurpose,
  MaintenancePriority,
  MaintenanceStatus,
  PaymentMethod,
  Permission,
  PayoutStatus,
  RENTAL_PIPELINE_LABELS,
  RentalPipelineStage,
  RentPaymentStatus,
  type CustomerDto,
  type LeaseDto,
  type MaintenanceDto,
  type Paginated,
  type PropertyDto,
  type RentalOverview,
  type RentPaymentDto,
} from "@reos/shared";

interface OwnerPayoutDto {
  id: string;
  propertyId: string;
  propertyTitle: string;
  ownerPhone: string | null;
  ownerName: string | null;
  periodStart: string;
  periodEnd: string;
  grossRent: number;
  managementFee: number;
  expenses: number;
  netAmount: number;
  status: PayoutStatus;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface AvailabilityBlockDto {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  kind: AvailabilityKind;
  source: string | null;
  externalRef: string | null;
  notes: string | null;
}

interface RentPaymentRow extends RentPaymentDto {
  propertyTitle?: string;
  tenantName?: string;
}

interface LeaseDetail extends LeaseDto {
  payments: RentPaymentDto[];
  handovers: Array<{
    id: string;
    type: string;
    actorName: string | null;
    keysGiven: number | null;
    notes: string | null;
    completedAt: string;
  }>;
}

const LEASE_STATUS_VARIANT: Record<LeaseStatus, BadgeProps["variant"]> = {
  [LeaseStatus.DRAFT]: "secondary",
  [LeaseStatus.APPLICATION]: "default",
  [LeaseStatus.APPROVED]: "success",
  [LeaseStatus.ACTIVE]: "success",
  [LeaseStatus.NOTICE_GIVEN]: "warning",
  [LeaseStatus.EXPIRED]: "secondary",
  [LeaseStatus.TERMINATED]: "destructive",
};

const PAYMENT_STATUS_LABEL: Record<RentPaymentStatus, string> = {
  [RentPaymentStatus.PENDING]: "Bekliyor",
  [RentPaymentStatus.PAID]: "Paid",
  [RentPaymentStatus.OVERDUE]: "Overdue",
  [RentPaymentStatus.PARTIAL]: "Partial",
  [RentPaymentStatus.WAIVED]: "Muaf",
};

const PAYMENT_STATUS_VARIANT: Record<RentPaymentStatus, BadgeProps["variant"]> =
  {
    [RentPaymentStatus.PENDING]: "warning",
    [RentPaymentStatus.PAID]: "success",
    [RentPaymentStatus.OVERDUE]: "destructive",
    [RentPaymentStatus.PARTIAL]: "warning",
    [RentPaymentStatus.WAIVED]: "secondary",
  };

const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  [PayoutStatus.PENDING]: "Bekliyor",
  [PayoutStatus.PAID]: "Paid",
  [PayoutStatus.CANCELLED]: "Cancelled",
};

const MAINTENANCE_PRIORITY_LABEL: Record<MaintenancePriority, string> = {
  [MaintenancePriority.LOW]: "Low",
  [MaintenancePriority.MEDIUM]: "Orta",
  [MaintenancePriority.HIGH]: "High",
  [MaintenancePriority.URGENT]: "Acil",
};

const AVAILABILITY_KIND_LABEL: Record<AvailabilityKind, string> = {
  [AvailabilityKind.BOOKED]: "Rezerve",
  [AvailabilityKind.BLOCKED]: "Blocked",
  [AvailabilityKind.OWNER_USE]: "Owner use",
  [AvailabilityKind.LEASE]: "Long-term lease",
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Nakit",
  [PaymentMethod.BANK_TRANSFER]: "Banka havalesi",
  [PaymentMethod.CARD]: "Kart",
  [PaymentMethod.OTHER]: "Other",
};

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

function LeaseStatusBadge({ status }: { status: LeaseStatus }) {
  return (
    <Badge variant={LEASE_STATUS_VARIANT[status] ?? "secondary"}>
      {LEASE_STATUS_LABELS[status]}
    </Badge>
  );
}

type LeaseForm = {
  propertyId: string;
  customerId: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  depositAmount: string;
  notes: string;
};

const EMPTY_LEASE: LeaseForm = {
  propertyId: "",
  customerId: "",
  startDate: "",
  endDate: "",
  monthlyRent: "",
  depositAmount: "",
  notes: "",
};

type PayoutForm = {
  propertyId: string;
  periodStart: string;
  periodEnd: string;
  grossRent: string;
  expenses: string;
  notes: string;
};

const EMPTY_PAYOUT: PayoutForm = {
  propertyId: "",
  periodStart: "",
  periodEnd: "",
  grossRent: "",
  expenses: "",
  notes: "",
};

type MaintenanceForm = {
  propertyId: string;
  leaseId: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
};

const EMPTY_MAINTENANCE: MaintenanceForm = {
  propertyId: "",
  leaseId: "",
  title: "",
  description: "",
  priority: MaintenancePriority.MEDIUM,
};

type AvailabilityForm = {
  startDate: string;
  endDate: string;
  kind: AvailabilityKind;
  notes: string;
};

const EMPTY_AVAILABILITY: AvailabilityForm = {
  startDate: "",
  endDate: "",
  kind: AvailabilityKind.BLOCKED,
  notes: "",
};

export default function RentalsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const canManage = can(Permission.RENTAL_MANAGE);

  const [leaseStatusFilter, setLeaseStatusFilter] = useState<string>("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>(
    RentPaymentStatus.OVERDUE,
  );
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] =
    useState<string>("ALL");

  const [creatingLease, setCreatingLease] = useState(false);
  const [leaseForm, setLeaseForm] = useState<LeaseForm>(EMPTY_LEASE);
  const [viewingLeaseId, setViewingLeaseId] = useState<string | null>(null);
  const [terminateNotes, setTerminateNotes] = useState("");

  const [recordingPayment, setRecordingPayment] =
    useState<RentPaymentRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.BANK_TRANSFER,
  );
  const [paymentNotes, setPaymentNotes] = useState("");

  const [creatingPayout, setCreatingPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState<PayoutForm>(EMPTY_PAYOUT);

  const [creatingMaintenance, setCreatingMaintenance] = useState(false);
  const [maintenanceForm, setMaintenanceForm] =
    useState<MaintenanceForm>(EMPTY_MAINTENANCE);

  const [calendarPropertyId, setCalendarPropertyId] = useState("");
  const [addingBlock, setAddingBlock] = useState(false);
  const [availabilityForm, setAvailabilityForm] =
    useState<AvailabilityForm>(EMPTY_AVAILABILITY);

  const { data: overview } = useQuery({
    queryKey: ["rentals", "overview"],
    queryFn: () => api.get<RentalOverview>("/rentals/overview"),
  });

  const { data: leases, isLoading: leasesLoading } = useQuery({
    queryKey: ["rentals", "leases", leaseStatusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "100" });
      if (leaseStatusFilter !== "ALL") params.set("status", leaseStatusFilter);
      return api.get<Paginated<LeaseDto>>(
        `/rentals/leases?${params.toString()}`,
      );
    },
  });

  const leaseDetail = useQuery({
    queryKey: ["rentals", "lease", viewingLeaseId],
    queryFn: () => api.get<LeaseDetail>(`/rentals/leases/${viewingLeaseId}`),
    enabled: !!viewingLeaseId,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["rentals", "payments", paymentStatusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "100" });
      if (paymentStatusFilter !== "ALL")
        params.set("status", paymentStatusFilter);
      return api.get<Paginated<RentPaymentRow>>(
        `/rentals/payments?${params.toString()}`,
      );
    },
  });

  const { data: payouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ["rentals", "payouts"],
    queryFn: () =>
      api.get<Paginated<OwnerPayoutDto>>("/rentals/payouts?pageSize=100"),
  });

  const { data: maintenance, isLoading: maintenanceLoading } = useQuery({
    queryKey: ["rentals", "maintenance", maintenanceStatusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "100" });
      if (maintenanceStatusFilter !== "ALL")
        params.set("status", maintenanceStatusFilter);
      return api.get<Paginated<MaintenanceDto>>(
        `/rentals/maintenance?${params.toString()}`,
      );
    },
  });

  const { data: rentalProperties } = useQuery({
    queryKey: ["properties", "rentals"],
    queryFn: () =>
      api.get<Paginated<PropertyDto>>(
        `/properties?purpose=${ListingPurpose.RENT}&pageSize=100`,
      ),
  });

  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ["rentals", "availability", calendarPropertyId],
    queryFn: () =>
      api.get<AvailabilityBlockDto[]>(
        `/rentals/availability/${calendarPropertyId}`,
      ),
    enabled: !!calendarPropertyId,
  });

  const { data: pickerProperties } = useQuery({
    queryKey: ["properties", "picker"],
    queryFn: () =>
      api.get<Paginated<PropertyDto>>(
        `/properties?purpose=${ListingPurpose.RENT}&pageSize=50`,
      ),
    enabled:
      creatingLease || creatingPayout || creatingMaintenance || addingBlock,
  });

  const { data: pickerCustomers } = useQuery({
    queryKey: ["customers", "picker"],
    queryFn: () => api.get<Paginated<CustomerDto>>("/customers?pageSize=50"),
    enabled: creatingLease,
  });

  useEffect(() => {
    if (!calendarPropertyId && rentalProperties?.data.length) {
      setCalendarPropertyId(rentalProperties.data[0].id);
    }
  }, [calendarPropertyId, rentalProperties?.data]);

  useEffect(() => {
    if (recordingPayment) {
      setPaymentAmount(
        String(
          recordingPayment.amount - recordingPayment.paidAmount ||
            recordingPayment.amount,
        ),
      );
      setPaymentMethod(PaymentMethod.BANK_TRANSFER);
      setPaymentNotes("");
    }
  }, [recordingPayment]);

  useEffect(() => {
    if (creatingLease) setLeaseForm(EMPTY_LEASE);
    if (creatingPayout) setPayoutForm(EMPTY_PAYOUT);
    if (creatingMaintenance) setMaintenanceForm(EMPTY_MAINTENANCE);
    if (addingBlock) setAvailabilityForm(EMPTY_AVAILABILITY);
  }, [creatingLease, creatingPayout, creatingMaintenance, addingBlock]);

  const invalidateRentals = () =>
    qc.invalidateQueries({ queryKey: ["rentals"] });

  const createLease = useMutation({
    mutationFn: () =>
      api.post("/rentals/leases", {
        propertyId: leaseForm.propertyId,
        customerId: leaseForm.customerId,
        startDate: leaseForm.startDate,
        endDate: leaseForm.endDate,
        monthlyRent: leaseForm.monthlyRent
          ? Number(leaseForm.monthlyRent)
          : undefined,
        depositAmount: leaseForm.depositAmount
          ? Number(leaseForm.depositAmount)
          : undefined,
        notes: leaseForm.notes || undefined,
      }),
    onSuccess: () => {
      invalidateRentals();
      setCreatingLease(false);
    },
  });

  const updateLeasePipeline = useMutation({
    mutationFn: ({
      id,
      pipelineStage,
    }: {
      id: string;
      pipelineStage: RentalPipelineStage;
    }) => api.patch(`/rentals/leases/${id}`, { pipelineStage }),
    onSuccess: () => {
      invalidateRentals();
      qc.invalidateQueries({ queryKey: ["rentals", "lease", viewingLeaseId] });
    },
  });

  const activateLease = useMutation({
    mutationFn: (id: string) => api.post(`/rentals/leases/${id}/activate`),
    onSuccess: () => {
      invalidateRentals();
      qc.invalidateQueries({ queryKey: ["rentals", "lease", viewingLeaseId] });
    },
  });

  const terminateLease = useMutation({
    mutationFn: (id: string) =>
      api.post(`/rentals/leases/${id}/terminate`, {
        notes: terminateNotes || undefined,
      }),
    onSuccess: () => {
      invalidateRentals();
      qc.invalidateQueries({ queryKey: ["rentals", "lease", viewingLeaseId] });
      setTerminateNotes("");
    },
  });

  const recordPayment = useMutation({
    mutationFn: () =>
      api.patch(`/rentals/payments/${recordingPayment!.id}/record`, {
        paidAmount: Number(paymentAmount),
        method: paymentMethod,
        notes: paymentNotes || undefined,
      }),
    onSuccess: () => {
      invalidateRentals();
      setRecordingPayment(null);
    },
  });

  const createPayout = useMutation({
    mutationFn: () =>
      api.post("/rentals/payouts", {
        propertyId: payoutForm.propertyId,
        periodStart: payoutForm.periodStart,
        periodEnd: payoutForm.periodEnd,
        grossRent: payoutForm.grossRent
          ? Number(payoutForm.grossRent)
          : undefined,
        expenses: payoutForm.expenses ? Number(payoutForm.expenses) : undefined,
        notes: payoutForm.notes || undefined,
      }),
    onSuccess: () => {
      invalidateRentals();
      setCreatingPayout(false);
    },
  });

  const markPayoutPaid = useMutation({
    mutationFn: (id: string) => api.post(`/rentals/payouts/${id}/mark-paid`),
    onSuccess: () => invalidateRentals(),
  });

  const createMaintenance = useMutation({
    mutationFn: () =>
      api.post("/rentals/maintenance", {
        propertyId: maintenanceForm.propertyId,
        leaseId: maintenanceForm.leaseId || undefined,
        title: maintenanceForm.title,
        description: maintenanceForm.description || undefined,
        priority: maintenanceForm.priority,
      }),
    onSuccess: () => {
      invalidateRentals();
      setCreatingMaintenance(false);
    },
  });

  const updateMaintenanceStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MaintenanceStatus }) =>
      api.patch(`/rentals/maintenance/${id}`, { status }),
    onSuccess: () => invalidateRentals(),
  });

  const createAvailability = useMutation({
    mutationFn: () =>
      api.post("/rentals/availability", {
        propertyId: calendarPropertyId,
        startDate: availabilityForm.startDate,
        endDate: availabilityForm.endDate,
        kind: availabilityForm.kind,
        notes: availabilityForm.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["rentals", "availability", calendarPropertyId],
      });
      setAddingBlock(false);
    },
  });

  const deleteAvailability = useMutation({
    mutationFn: (id: string) => api.delete(`/rentals/availability/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["rentals", "availability", calendarPropertyId],
      }),
  });

  const detail = leaseDetail.data;
  const canActivate =
    detail &&
    [LeaseStatus.APPLICATION, LeaseStatus.APPROVED].includes(detail.status);
  const canTerminate =
    detail &&
    [
      LeaseStatus.ACTIVE,
      LeaseStatus.NOTICE_GIVEN,
      LeaseStatus.APPROVED,
    ].includes(detail.status);

  return (
    <div>
      <PageHeader
        titleKey="page.rentals.title"
        descriptionKey="page.rentals.subtitle"
        action={
          canManage && (
            <Button onClick={() => setCreatingLease(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New lease
            </Button>
          )
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leases">Leases</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="payouts">Owner payouts</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="calendar">Calendar (STR)</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Active leases"
              value={String(overview?.activeLeases ?? "—")}
            />
            <SummaryCard
              label="Pending applications"
              value={String(overview?.pendingApplications ?? "—")}
            />
            <SummaryCard
              label="Overdue payments"
              value={String(overview?.overduePayments ?? "—")}
            />
            <SummaryCard
              label="Expiring in 30 days"
              value={String(overview?.expiringLeases ?? "—")}
            />
            <SummaryCard
              label="Open maintenance"
              value={String(overview?.openMaintenance ?? "—")}
            />
            <SummaryCard
              label="Occupied rentals"
              value={String(overview?.occupiedRentals ?? "—")}
            />
            <SummaryCard
              label="Collected this month"
              value={formatCurrency(overview?.monthlyRentCollected ?? 0)}
            />
            <SummaryCard
              label="Pending payouts"
              value={String(overview?.pendingPayouts ?? "—")}
            />
          </div>
        </TabsContent>

        {/* ── Leases ── */}
        <TabsContent value="leases">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Select
              value={leaseStatusFilter}
              onValueChange={setLeaseStatusFilter}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {Object.values(LeaseStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEASE_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases?.data.map((l) => (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer"
                    onClick={() => setViewingLeaseId(l.id)}
                  >
                    <TableCell>
                      <div className="font-medium">
                        {l.propertyTitle ?? l.propertyReference ?? l.propertyId}
                      </div>
                      {l.propertyReference && (
                        <div className="font-mono text-xs text-muted-foreground">
                          {l.propertyReference}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>{l.tenantName ?? "—"}</div>
                      {l.tenantPhone && (
                        <div className="text-xs text-muted-foreground">
                          {l.tenantPhone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(l.startDate)} – {formatDate(l.endDate)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(l.monthlyRent)}
                    </TableCell>
                    <TableCell>
                      <LeaseStatusBadge status={l.status} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {RENTAL_PIPELINE_LABELS[l.pipelineStage]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {leasesLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!leasesLoading && leases?.data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No leases yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Payments ── */}
        <TabsContent value="payments">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Select
              value={paymentStatusFilter}
              onValueChange={setPaymentStatusFilter}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={RentPaymentStatus.OVERDUE}>
                  Overdue
                </SelectItem>
                <SelectItem value={RentPaymentStatus.PENDING}>
                  Pending
                </SelectItem>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value={RentPaymentStatus.PAID}>Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="w-28" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments?.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.propertyTitle ?? p.propertyId}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.tenantName ?? "—"}
                    </TableCell>
                    <TableCell>{formatDate(p.dueDate)}</TableCell>
                    <TableCell>{formatCurrency(p.amount)}</TableCell>
                    <TableCell>{formatCurrency(p.paidAmount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          PAYMENT_STATUS_VARIANT[p.status] ?? "secondary"
                        }
                      >
                        {PAYMENT_STATUS_LABEL[p.status]}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        {p.status !== RentPaymentStatus.PAID &&
                          p.status !== RentPaymentStatus.WAIVED && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRecordingPayment(p)}
                            >
                              Save
                            </Button>
                          )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {paymentsLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 7 : 6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!paymentsLoading && payments?.data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 7 : 6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Owner Payouts ── */}
        <TabsContent value="payouts">
          <div className="mb-3 flex justify-end">
            {canManage && (
              <Button size="sm" onClick={() => setCreatingPayout(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> New payout
              </Button>
            )}
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="w-28" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts?.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.propertyTitle}
                    </TableCell>
                    <TableCell>
                      <div>{p.ownerName ?? "—"}</div>
                      {p.ownerPhone && (
                        <div className="text-xs text-muted-foreground">
                          {p.ownerPhone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                    </TableCell>
                    <TableCell>{formatCurrency(p.grossRent)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(p.netAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === PayoutStatus.PAID
                            ? "success"
                            : p.status === PayoutStatus.CANCELLED
                              ? "secondary"
                              : "warning"
                        }
                      >
                        {PAYOUT_STATUS_LABEL[p.status]}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        {p.status === PayoutStatus.PENDING && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={markPayoutPaid.isPending}
                            onClick={() => markPayoutPaid.mutate(p.id)}
                          >
                            Mark paid
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {payoutsLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 7 : 6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!payoutsLoading && payouts?.data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 7 : 6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No owner payouts yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Maintenance ── */}
        <TabsContent value="maintenance">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <Select
              value={maintenanceStatusFilter}
              onValueChange={setMaintenanceStatusFilter}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {Object.values(MaintenanceStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManage && (
              <Button size="sm" onClick={() => setCreatingMaintenance(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> New request
              </Button>
            )}
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  {canManage && <TableHead className="w-40" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenance?.data.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.propertyTitle ?? m.propertyId}
                    </TableCell>
                    <TableCell>
                      <div>{m.title}</div>
                      {m.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {m.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.priority === MaintenancePriority.URGENT
                            ? "destructive"
                            : m.priority === MaintenancePriority.HIGH
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {MAINTENANCE_PRIORITY_LABEL[m.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={m.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(m.createdAt)}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        {m.status !== MaintenanceStatus.COMPLETED &&
                          m.status !== MaintenanceStatus.CANCELLED && (
                            <Select
                              value={m.status}
                              onValueChange={(v) =>
                                updateMaintenanceStatus.mutate({
                                  id: m.id,
                                  status: v as MaintenanceStatus,
                                })
                              }
                            >
                              <SelectTrigger className="h-7 w-36 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.values(MaintenanceStatus).map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s.replace(/_/g, " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {maintenanceLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 6 : 5}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!maintenanceLoading && maintenance?.data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 6 : 5}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Maintenance talebi yok.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Calendar (STR) ── */}
        <TabsContent value="calendar">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select
                value={calendarPropertyId}
                onValueChange={setCalendarPropertyId}
              >
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {rentalProperties?.data.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.reference ? `${p.reference} — ` : ""}
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canManage && calendarPropertyId && (
              <Button size="sm" onClick={() => setAddingBlock(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Blok ekle
              </Button>
            )}
          </div>

          {!calendarPropertyId ? (
            <Card className="p-10 text-center text-muted-foreground">
              No rental listings found.
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Kaynak</TableHead>
                    <TableHead>Not</TableHead>
                    {canManage && <TableHead className="w-12" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availability?.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{formatDate(b.startDate)}</TableCell>
                      <TableCell>{formatDate(b.endDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {AVAILABILITY_KIND_LABEL[b.kind] ?? b.kind}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {b.source ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {b.notes ?? "—"}
                      </TableCell>
                      {canManage && b.kind !== AvailabilityKind.LEASE && (
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            disabled={deleteAvailability.isPending}
                            onClick={() => deleteAvailability.mutate(b.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                      {canManage && b.kind === AvailabilityKind.LEASE && (
                        <TableCell />
                      )}
                    </TableRow>
                  ))}
                  {availabilityLoading && (
                    <TableRow>
                      <TableCell
                        colSpan={canManage ? 6 : 5}
                        className="py-10 text-center text-muted-foreground"
                      >
                        Loading…
                      </TableCell>
                    </TableRow>
                  )}
                  {!availabilityLoading &&
                    (!availability || availability.length === 0) && (
                      <TableRow>
                        <TableCell
                          colSpan={canManage ? 6 : 5}
                          className="py-10 text-center text-muted-foreground"
                        >
                          No availability blocks.
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Create lease dialog ── */}
      <Dialog open={creatingLease} onOpenChange={setCreatingLease}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New lease</DialogTitle>
            <DialogDescription>
              Select a rental property and tenant to create a lease.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Property</Label>
              <Select
                value={leaseForm.propertyId}
                onValueChange={(v) =>
                  setLeaseForm({ ...leaseForm, propertyId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {pickerProperties?.data.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.reference ? `${p.reference} — ` : ""}
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Tenant</Label>
              <Select
                value={leaseForm.customerId}
                onValueChange={(v) =>
                  setLeaseForm({ ...leaseForm, customerId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {pickerCustomers?.data.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                      {c.phone ? ` (${c.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start</Label>
              <Input
                type="date"
                value={leaseForm.startDate}
                onChange={(e) =>
                  setLeaseForm({ ...leaseForm, startDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <Input
                type="date"
                value={leaseForm.endDate}
                onChange={(e) =>
                  setLeaseForm({ ...leaseForm, endDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly rent (EUR)</Label>
              <Input
                type="number"
                value={leaseForm.monthlyRent}
                onChange={(e) =>
                  setLeaseForm({ ...leaseForm, monthlyRent: e.target.value })
                }
                placeholder="Leave blank to use listing price"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Depozito (EUR)</Label>
              <Input
                type="number"
                value={leaseForm.depositAmount}
                onChange={(e) =>
                  setLeaseForm({ ...leaseForm, depositAmount: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notlar</Label>
              <Input
                value={leaseForm.notes}
                onChange={(e) =>
                  setLeaseForm({ ...leaseForm, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreatingLease(false)}>
              Cancelled
            </Button>
            <Button
              disabled={
                createLease.isPending ||
                !leaseForm.propertyId ||
                !leaseForm.customerId ||
                !leaseForm.startDate ||
                !leaseForm.endDate
              }
              onClick={() => createLease.mutate()}
            >
              {createLease.isPending ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Lease detail dialog ── */}
      <Dialog
        open={!!viewingLeaseId}
        onOpenChange={(v) => !v && setViewingLeaseId(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {leaseDetail.isLoading && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          )}
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {detail.propertyTitle ?? detail.propertyReference ?? "Lease"}
                </DialogTitle>
                <DialogDescription>
                  {detail.tenantName ?? "Tenant"} ·{" "}
                  {formatDate(detail.startDate)} – {formatDate(detail.endDate)}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-2">
                <LeaseStatusBadge status={detail.status} />
                <Badge variant="outline">
                  {RENTAL_PIPELINE_LABELS[detail.pipelineStage]}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">
                      Monthly rent
                    </p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(detail.monthlyRent)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Depozito</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(detail.depositAmount)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Due day</p>
                    <p className="text-lg font-semibold">
                      {detail.rentDueDay}.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {(detail.ownerName || detail.ownerPhone) && (
                <p className="text-sm text-muted-foreground">
                  Owner: {detail.ownerName ?? "—"}
                  {detail.ownerPhone ? ` · ${detail.ownerPhone}` : ""}
                </p>
              )}

              {detail.notes && (
                <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {detail.notes}
                </p>
              )}

              {canManage && (
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">Pipeline stage</p>
                  <Select
                    value={detail.pipelineStage}
                    onValueChange={(v) =>
                      updateLeasePipeline.mutate({
                        id: detail.id,
                        pipelineStage: v as RentalPipelineStage,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(RentalPipelineStage).map((s) => (
                        <SelectItem key={s} value={s}>
                          {RENTAL_PIPELINE_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {canActivate && (
                      <Button
                        size="sm"
                        disabled={activateLease.isPending}
                        onClick={() => activateLease.mutate(detail.id)}
                      >
                        {activateLease.isPending
                          ? "Activating…"
                          : "Activate lease"}
                      </Button>
                    )}
                    {canTerminate && (
                      <>
                        <Input
                          className="max-w-xs"
                          placeholder="Termination note (optional)"
                          value={terminateNotes}
                          onChange={(e) => setTerminateNotes(e.target.value)}
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={terminateLease.isPending}
                          onClick={() => terminateLease.mutate(detail.id)}
                        >
                          {terminateLease.isPending
                            ? "Feshediliyor…"
                            : "Leaseyi feshet"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Payment schedule</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Due</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{formatDate(p.dueDate)}</TableCell>
                          <TableCell>{formatCurrency(p.amount)}</TableCell>
                          <TableCell>{formatCurrency(p.paidAmount)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                PAYMENT_STATUS_VARIANT[p.status] ?? "secondary"
                              }
                            >
                              {PAYMENT_STATUS_LABEL[p.status]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {detail.payments.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="py-6 text-center text-muted-foreground"
                          >
                            No payment schedule yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {detail.handovers.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Handover records</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {detail.handovers.map((h) => (
                      <div
                        key={h.id}
                        className="rounded border px-3 py-2 text-sm"
                      >
                        <span className="font-medium">
                          {h.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {formatDate(h.completedAt)}
                        </span>
                        {h.actorName && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {h.actorName}
                          </span>
                        )}
                        {h.notes && (
                          <p className="mt-1 text-muted-foreground">
                            {h.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setViewingLeaseId(null)}
                >
                  Kapat
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Record payment dialog ── */}
      <Dialog
        open={!!recordingPayment}
        onOpenChange={(v) => !v && setRecordingPayment(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>Manual collection only.</DialogDescription>
          </DialogHeader>
          {recordingPayment && (
            <div className="grid gap-4 py-2">
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <p>{recordingPayment.propertyTitle}</p>
                <p className="text-muted-foreground">
                  Vade: {formatDate(recordingPayment.dueDate)} · Kalan:{" "}
                  {formatCurrency(
                    recordingPayment.amount - recordingPayment.paidAmount,
                  )}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Tutar (EUR)</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PaymentMethod.CASH}>
                      {PAYMENT_METHOD_LABEL[PaymentMethod.CASH]}
                    </SelectItem>
                    <SelectItem value={PaymentMethod.BANK_TRANSFER}>
                      {PAYMENT_METHOD_LABEL[PaymentMethod.BANK_TRANSFER]}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Notlar</Label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRecordingPayment(null)}>
              Cancelled
            </Button>
            <Button
              disabled={
                recordPayment.isPending ||
                !paymentAmount ||
                Number(paymentAmount) <= 0
              }
              onClick={() => recordPayment.mutate()}
            >
              {recordPayment.isPending ? "Saving…" : "Save payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create payout dialog ── */}
      <Dialog open={creatingPayout} onOpenChange={setCreatingPayout}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create owner payout</DialogTitle>
            <DialogDescription>
              Gross rent for the period is calculated automatically. Override if
              needed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Property</Label>
              <Select
                value={payoutForm.propertyId}
                onValueChange={(v) =>
                  setPayoutForm({ ...payoutForm, propertyId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {pickerProperties?.data.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.reference ? `${p.reference} — ` : ""}
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Period start</Label>
              <Input
                type="date"
                value={payoutForm.periodStart}
                onChange={(e) =>
                  setPayoutForm({ ...payoutForm, periodStart: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Period end</Label>
              <Input
                type="date"
                value={payoutForm.periodEnd}
                onChange={(e) =>
                  setPayoutForm({ ...payoutForm, periodEnd: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gross rent (EUR, optional)</Label>
              <Input
                type="number"
                value={payoutForm.grossRent}
                onChange={(e) =>
                  setPayoutForm({ ...payoutForm, grossRent: e.target.value })
                }
                placeholder="Automatic"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Giderler (EUR)</Label>
              <Input
                type="number"
                value={payoutForm.expenses}
                onChange={(e) =>
                  setPayoutForm({ ...payoutForm, expenses: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notlar</Label>
              <Input
                value={payoutForm.notes}
                onChange={(e) =>
                  setPayoutForm({ ...payoutForm, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreatingPayout(false)}>
              Cancelled
            </Button>
            <Button
              disabled={
                createPayout.isPending ||
                !payoutForm.propertyId ||
                !payoutForm.periodStart ||
                !payoutForm.periodEnd
              }
              onClick={() => createPayout.mutate()}
            >
              {createPayout.isPending ? "Createuluyor…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create maintenance dialog ── */}
      <Dialog open={creatingMaintenance} onOpenChange={setCreatingMaintenance}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New maintenance request</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Property</Label>
              <Select
                value={maintenanceForm.propertyId}
                onValueChange={(v) =>
                  setMaintenanceForm({ ...maintenanceForm, propertyId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {pickerProperties?.data.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.reference ? `${p.reference} — ` : ""}
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Title</Label>
              <Input
                value={maintenanceForm.title}
                onChange={(e) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    title: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Input
                value={maintenanceForm.description}
                onChange={(e) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={maintenanceForm.priority}
                onValueChange={(v) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    priority: v as MaintenancePriority,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(MaintenancePriority).map((p) => (
                    <SelectItem key={p} value={p}>
                      {MAINTENANCE_PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lease ID (optional)</Label>
              <Input
                value={maintenanceForm.leaseId}
                onChange={(e) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    leaseId: e.target.value,
                  })
                }
                placeholder="UUID"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreatingMaintenance(false)}
            >
              Cancelled
            </Button>
            <Button
              disabled={
                createMaintenance.isPending ||
                !maintenanceForm.propertyId ||
                !maintenanceForm.title.trim()
              }
              onClick={() => createMaintenance.mutate()}
            >
              {createMaintenance.isPending ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add availability block dialog ── */}
      <Dialog open={addingBlock} onOpenChange={setAddingBlock}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add availability block</DialogTitle>
            <DialogDescription>
              Add a booking or blocked period to the short-term calendar
              ekleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Start</Label>
              <Input
                type="date"
                value={availabilityForm.startDate}
                onChange={(e) =>
                  setAvailabilityForm({
                    ...availabilityForm,
                    startDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <Input
                type="date"
                value={availabilityForm.endDate}
                onChange={(e) =>
                  setAvailabilityForm({
                    ...availabilityForm,
                    endDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={availabilityForm.kind}
                onValueChange={(v) =>
                  setAvailabilityForm({
                    ...availabilityForm,
                    kind: v as AvailabilityKind,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    AvailabilityKind.BOOKED,
                    AvailabilityKind.BLOCKED,
                    AvailabilityKind.OWNER_USE,
                  ].map((k) => (
                    <SelectItem key={k} value={k}>
                      {AVAILABILITY_KIND_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notlar</Label>
              <Input
                value={availabilityForm.notes}
                onChange={(e) =>
                  setAvailabilityForm({
                    ...availabilityForm,
                    notes: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddingBlock(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                createAvailability.isPending ||
                !availabilityForm.startDate ||
                !availabilityForm.endDate
              }
              onClick={() => createAvailability.mutate()}
            >
              {createAvailability.isPending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
