"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
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
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { initials } from "@/lib/utils";
import { useT } from "@/lib/i18n/locale-context";
import { ROLE_LABEL_KEYS } from "@/lib/i18n/packs/settings";
import { Permission, Role } from "@reos/shared";

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  roles: Role[];
  isActive: boolean;
  branch?: { id: string; name: string } | null;
}

const EMPTY_FORM = {
  email: "",
  password: "",
  fullName: "",
  roles: [Role.SALES_AGENT] as Role[],
  isActive: true,
};

export default function UsersPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const t = useT();
  const canManage = can(Permission.USER_MANAGE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<UserRow[]>("/users"),
    retry: false,
  });

  const save = useMutation({
    mutationFn: () => {
      if (editing) {
        return api.patch(`/users/${editing.id}`, {
          fullName: form.fullName,
          roles: form.roles,
          isActive: form.isActive,
          ...(form.password ? { password: form.password } : {}),
        });
      }
      return api.post("/users", {
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        roles: form.roles,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({
      email: u.email,
      password: "",
      fullName: u.fullName,
      roles: u.roles,
      isActive: u.isActive,
    });
    setDialogOpen(true);
  };

  const toggleRole = (role: Role) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role)
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role],
    }));
  };

  return (
    <div>
      <PageHeader
        titleKey="page.users.title"
        descriptionKey="page.users.subtitle"
        action={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> {t("users.new")}
            </Button>
          )
        }
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.email")}</TableHead>
              <TableHead>{t("users.roles")}</TableHead>
              <TableHead>{t("users.branch")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              {canManage && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback>{initials(u.fullName)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{u.fullName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.email}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <Badge key={r} variant="secondary">
                        {t(ROLE_LABEL_KEYS[r])}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.branch?.name ?? "—"}
                </TableCell>
                <TableCell>
                  {u.isActive ? (
                    <Badge variant="success">{t("users.active")}</Badge>
                  ) : (
                    <Badge variant="destructive">{t("users.inactive")}</Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          if (
                            confirm(
                              t("users.confirmDeactivate", {
                                name: u.fullName,
                              }),
                            )
                          )
                            remove.mutate(u.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {data?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 6 : 5}
                  className="py-10 text-center text-muted-foreground"
                >
                  {t("users.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("users.edit") : t("users.create")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!editing && (
              <div className="space-y-1.5">
                <Label>{t("common.email")}</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t("users.fullName")}</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                {editing
                  ? t("users.newPasswordOptional")
                  : t("login.password")}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("users.roles")}</Label>
              <div className="flex flex-wrap gap-2">
                {Object.values(Role).map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={form.roles.includes(r) ? "default" : "outline"}
                    onClick={() => toggleRole(r)}
                  >
                    {t(ROLE_LABEL_KEYS[r])}
                  </Button>
                ))}
              </div>
            </div>
            {editing && (
              <div className="space-y-1.5">
                <Label>{t("common.status")}</Label>
                <Select
                  value={form.isActive ? "active" : "inactive"}
                  onValueChange={(v) =>
                    setForm({ ...form, isActive: v === "active" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("users.active")}</SelectItem>
                    <SelectItem value="inactive">
                      {t("users.inactive")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={
                save.isPending ||
                !form.fullName ||
                (!editing && (!form.email || !form.password)) ||
                form.roles.length === 0
              }
              onClick={() => save.mutate()}
            >
              {save.isPending
                ? t("common.saving")
                : editing
                  ? t("common.update")
                  : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
