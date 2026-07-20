"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useAuth } from "@/lib/auth-store";
import { formatCurrency, formatDate, relativeTime } from "@/lib/utils";
import {
  Permission,
  type CustomerDetailDto,
  type MatchDto,
} from "@reos/shared";
import { CustomerDialog } from "../customer-dialog";

interface MatchWithProperty extends MatchDto {
  propertyTitle?: string;
  propertyPrice?: number;
  propertyRegion?: string;
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const [editing, setEditing] = useState(false);
  const canManage = can(Permission.CUSTOMER_MANAGE);

  const { data, isLoading, error } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.get<CustomerDetailDto>(`/customers/${id}`),
  });

  const matches = (data?.matches ?? []) as MatchWithProperty[];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">Customer not found.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/customers">Back to customers</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/customers">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Customers
          </Link>
        </Button>
      </div>

      <PageHeader
        title={data.fullName}
        description={`${data.kind} · ${data.intent} · ${data.phone}`}
        action={
          canManage && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-1.5 h-4 w-4" /> Edit
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Budget range</p>
            <p className="mt-1 text-lg font-semibold">
              {formatCurrency(data.budgetMin)} –{" "}
              {formatCurrency(data.budgetMax)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Segment</p>
            <div className="mt-1">
              <StatusBadge value={data.segment} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Property matches</p>
            <p className="mt-1 text-lg font-semibold">{data.matchCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Appointments</p>
            <p className="mt-1 text-lg font-semibold">
              {data.appointments.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Requirements</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Property type</span>
              <p className="font-medium">{data.propertyType ?? "Any"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Rooms</span>
              <p className="font-medium">{data.roomRequirement ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Financing</span>
              <p className="font-medium">{data.financing ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Residency</span>
              <p className="font-medium">{data.residency ?? "—"}</p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-muted-foreground">Preferred regions</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {data.preferredRegions.length ? (
                  data.preferredRegions.map((r) => (
                    <Badge key={r} variant="secondary">
                      {r}
                    </Badge>
                  ))
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>
            {data.notes && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Notes</span>
                <p className="mt-1">{data.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {data.phone}
            </div>
            {data.whatsapp && (
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                {data.whatsapp}
              </div>
            )}
            {data.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {data.email}
              </div>
            )}
            {data.assignedToName && (
              <div>
                <span className="text-muted-foreground">Assigned to</span>
                <p className="font-medium">{data.assignedToName}</p>
              </div>
            )}
            {data.lastContactAt && (
              <div>
                <span className="text-muted-foreground">Last contact</span>
                <p className="font-medium">
                  {relativeTime(data.lastContactAt)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="matches">
        <TabsList>
          <TabsTrigger value="matches">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Matches (
            {matches.length})
          </TabsTrigger>
          <TabsTrigger value="deliveries">
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Sent (
            {data.sentDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Appointments (
            {data.appointments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Score</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Reasons</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <span className="font-semibold text-primary">
                        {m.score}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {m.propertyTitle ?? m.propertyId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.propertyRegion ?? "—"}
                    </TableCell>
                    <TableCell>
                      {m.propertyPrice != null
                        ? formatCurrency(m.propertyPrice)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {m.reasons.map((r) => (
                          <Badge key={r} variant="secondary">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {matches.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No property matches yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Content</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sentDeliveries.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(d.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.channel}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.body ?? d.propertyTitle ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {data.sentDeliveries.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No deliveries sent yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.appointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(a.startAt)}
                    </TableCell>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {a.location}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={a.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {data.appointments.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No appointments scheduled.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <CustomerDialog
        customer={data}
        open={editing}
        onOpenChange={setEditing}
      />
    </div>
  );
}
