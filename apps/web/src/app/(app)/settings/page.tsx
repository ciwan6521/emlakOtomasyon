"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  MessageSquare,
  Network,
  Plug,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import {
  CommChannel,
  COMM_CHANNEL_LABELS,
  Locale,
  LOCALE_LABELS,
  Permission,
  type CompanySettingsDto,
} from "@reos/shared";
import { useLocale, useT } from "@/lib/i18n/locale-context";

interface CompanyDto {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  currency: string;
  locale: Locale;
  settings?: CompanySettingsDto;
}
interface TemplateDto {
  id: string;
  name: string;
  channel?: string;
}

interface IntegrationStatusDto {
  mode: string;
  channels: Array<{
    channel: CommChannel;
    provider: string;
    configured: boolean;
    live: boolean;
    missingEnv: string[];
  }>;
}

const NOTIFICATION_TOGGLES: Array<{
  key: keyof NonNullable<CompanySettingsDto["notifications"]>;
  label: string;
}> = [
  { key: "newLead", label: "New lead" },
  { key: "newCustomer", label: "New customer" },
  { key: "newMessage", label: "New message" },
  { key: "callback", label: "Callback reminder" },
  { key: "newPortfolio", label: "New portfolio listing" },
  { key: "priceUpdated", label: "Price updated" },
];

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        checked ? "bg-primary" : "bg-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const { locale, setLocale } = useLocale();
  const t = useT();
  const canManage = can(Permission.USER_MANAGE);
  const [form, setForm] = useState({
    name: "",
    logoUrl: "",
    currency: "EUR",
    locale: Locale.EN,
  });
  const [notifications, setNotifications] = useState<
    NonNullable<CompanySettingsDto["notifications"]>
  >({});
  const [social, setSocial] = useState<
    NonNullable<CompanySettingsDto["social"]>
  >({});

  const company = useQuery({
    queryKey: ["company"],
    queryFn: () => api.get<CompanyDto>("/company"),
  });
  const templates = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.get<TemplateDto[]>("/templates"),
  });
  const integrations = useQuery({
    queryKey: ["integrations", "status"],
    queryFn: () => api.get<IntegrationStatusDto>("/integrations/status"),
  });

  useEffect(() => {
    if (company.data) {
      setForm({
        name: company.data.name,
        logoUrl: company.data.logoUrl ?? "",
        currency: company.data.currency,
        locale: company.data.locale,
      });
      setNotifications(company.data.settings?.notifications ?? {});
      setSocial(company.data.settings?.social ?? {});
    }
  }, [company.data]);

  const saveProfile = useMutation({
    mutationFn: () => api.patch("/company", form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company"] }),
  });

  const saveSettings = useMutation({
    mutationFn: () =>
      api.patch("/company", { settings: { notifications, social } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company"] }),
  });

  return (
    <div>
      <PageHeader
        titleKey="page.settings.title"
        descriptionKey="page.settings.subtitle"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> {t("settings.companyProfile")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("settings.companyName")}</Label>
              <Input
                value={form.name}
                disabled={!canManage}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("settings.logoUrl")}</Label>
              <Input
                value={form.logoUrl}
                disabled={!canManage}
                placeholder="https://…"
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.currency")}</Label>
              <Input
                value={form.currency}
                disabled={!canManage}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.defaultLanguage")}</Label>
              <Select
                value={form.locale}
                disabled={!canManage}
                onValueChange={(v) => setForm({ ...form, locale: v as Locale })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Locale).map((l) => (
                    <SelectItem key={l} value={l}>
                      {LOCALE_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canManage && (
              <div className="sm:col-span-2">
                <Button
                  disabled={saveProfile.isPending}
                  onClick={() => saveProfile.mutate()}
                >
                  {saveProfile.isPending
                    ? t("common.saving")
                    : saveProfile.isSuccess
                      ? t("common.saved")
                      : t("settings.saveProfile")}
                </Button>
              </div>
            )}

            <div className="space-y-1.5 border-t pt-4 sm:col-span-2">
              <Label>{t("settings.myLanguage")}</Label>
              <Select
                value={locale}
                onValueChange={(v) => setLocale(v as Locale)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Locale).map((l) => (
                    <SelectItem key={l} value={l}>
                      {LOCALE_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("settings.myLanguageHint")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {NOTIFICATION_TOGGLES.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="text-sm">{label}</span>
                <Toggle
                  label={label}
                  disabled={!canManage}
                  checked={notifications[key] ?? false}
                  onChange={(v) =>
                    setNotifications((n) => ({ ...n, [key]: v }))
                  }
                />
              </div>
            ))}
            {canManage && (
              <Button
                disabled={saveSettings.isPending}
                onClick={() => saveSettings.mutate()}
              >
                {saveSettings.isPending ? "Saving…" : "Save notifications"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-4 w-4" /> Social accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Instagram account ID</Label>
              <Input
                value={social.instagramAccountId ?? ""}
                disabled={!canManage}
                placeholder="IG business account ID"
                onChange={(e) =>
                  setSocial({ ...social, instagramAccountId: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Facebook page ID</Label>
              <Input
                value={social.facebookPageId ?? ""}
                disabled={!canManage}
                placeholder="FB page ID"
                onChange={(e) =>
                  setSocial({ ...social, facebookPageId: e.target.value })
                }
              />
            </div>
            {canManage && (
              <Button
                disabled={saveSettings.isPending}
                onClick={() => saveSettings.mutate()}
              >
                {saveSettings.isPending ? "Saving…" : "Save social config"}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Stored in company settings via PATCH /company.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Message templates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(templates.data ?? []).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{t.name}</span>
                {t.channel && (
                  <span className="text-xs text-muted-foreground">
                    {t.channel}
                  </span>
                )}
              </div>
            ))}
            {(!templates.data || templates.data.length === 0) && (
              <p className="text-sm text-muted-foreground">No templates yet.</p>
            )}
            <Link
              href="/communication"
              className="inline-block pt-1 text-sm text-primary hover:underline"
            >
              Manage in Communication →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-4 w-4" /> {t("settings.integrations")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span className="font-medium">
                {t("settings.integrationsMode")}
              </span>
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium",
                  integrations.data?.mode === "live"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                )}
              >
                {integrations.data?.mode === "live"
                  ? t("settings.live")
                  : t("settings.simulated")}
              </span>
            </div>

            {(integrations.data?.channels ?? []).map((c) => (
              <div
                key={c.channel}
                className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p>{COMM_CHANNEL_LABELS[c.channel] ?? c.channel}</p>
                  <p className="text-xs text-muted-foreground">{c.provider}</p>
                  {!c.configured && c.missingEnv.length > 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("settings.missingEnv")}: {c.missingEnv.join(", ")}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded px-2 py-0.5 text-xs font-medium",
                    c.live
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : c.configured
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {c.live
                    ? t("settings.live")
                    : c.configured
                      ? t("settings.simulated")
                      : t("settings.notConfigured")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Administration
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link
              href="/settings/users"
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            >
              <Users className="h-4 w-4" /> Users & roles
            </Link>
            <Link
              href="/settings/branches"
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            >
              <Network className="h-4 w-4" /> Branch management
            </Link>
            <Link
              href="/settings/audit"
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            >
              <ShieldCheck className="h-4 w-4" /> Audit trail
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
