"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Permission, Region, type BranchDto } from "@reos/shared";

type FormState = {
  id: string | null;
  name: string;
  region: Region;
  address: string;
};
const EMPTY: FormState = {
  id: null,
  name: "",
  region: Region.BUDVA,
  address: "",
};

export default function BranchesPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const canManage = can(Permission.BRANCH_MANAGE);

  const { data, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.get<BranchDto[]>("/branches"),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form!.name,
        region: form!.region,
        address: form!.address || undefined,
      };
      return form!.id
        ? api.put(`/branches/${form!.id}`, payload)
        : api.post("/branches", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      setForm(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branches"] }),
  });

  return (
    <div>
      <PageHeader
        title="Branch Management"
        description="Operate each office (Budva, Podgorica, Kotor, Tivat…) independently."
        action={
          canManage && (
            <Button onClick={() => setForm(EMPTY)}>
              <Plus className="mr-1.5 h-4 w-4" /> New branch
            </Button>
          )
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Staff</TableHead>
              <TableHead className="text-right">Active listings</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((b) => (
              <TableRow
                key={b.id}
                className={canManage ? "cursor-pointer" : ""}
                onClick={() =>
                  canManage &&
                  setForm({
                    id: b.id,
                    name: b.name,
                    region: b.region,
                    address: b.address ?? "",
                  })
                }
              >
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell>{b.region.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-muted-foreground">
                  {b.address ?? "—"}
                </TableCell>
                <TableCell className="text-right">{b.userCount}</TableCell>
                <TableCell className="text-right">{b.activeListings}</TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete branch "${b.name}"?`))
                          remove.mutate(b.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {isLoading && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No branches yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit branch" : "New branch"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
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
                        {r.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button
              disabled={save.isPending || !form?.name}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Saving…" : "Save branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
