"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building, Loader2 } from "lucide-react";
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
import { useAuth } from "@/lib/auth-store";
import { ApiClientError } from "@/lib/api";
import { LOCALE_LABELS, Locale } from "@reos/shared";
import { useLocale, useT } from "@/lib/i18n/locale-context";

const QUICK_LOGINS = [
  { labelKey: "login.roleOwner" as const, email: "owner@adriatic.me" },
  { labelKey: "login.roleManager" as const, email: "manager@adriatic.me" },
  { labelKey: "login.roleAgent" as const, email: "agent@adriatic.me" },
  { labelKey: "login.roleCallCenter" as const, email: "callcenter@adriatic.me" },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const { locale, setLocale } = useLocale();
  const t = useT();
  const [email, setEmail] = useState("owner@adriatic.me");
  const [password, setPassword] = useState("Passw0rd!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.error.title : t("login.failed"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-xl md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15">
              <Building className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">REOS</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold leading-tight">REOS</h2>
            <p className="mt-3 text-sm text-primary-foreground/80">
              {t("login.tagline")}
            </p>
          </div>
          <p className="text-xs text-primary-foreground/60">Adriatic Estates</p>
        </div>

        <div className="p-8 md:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {t("login.signIn")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("login.subtitle")}
              </p>
            </div>
            <div className="w-44 shrink-0 space-y-1">
              <Label className="text-xs">{t("common.language")}</Label>
              <Select
                value={locale}
                onValueChange={(v) => setLocale(v as Locale)}
              >
                <SelectTrigger className="h-9">
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
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("login.submit")}
            </Button>
          </form>

          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("login.quickDemo")}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {QUICK_LOGINS.map((q) => (
                <Card
                  key={q.email}
                  className="cursor-pointer transition-colors hover:border-primary"
                  onClick={() => {
                    setEmail(q.email);
                    setPassword("Passw0rd!");
                  }}
                >
                  <CardContent className="p-3">
                    <p className="text-sm font-medium">{t(q.labelKey)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {q.email}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
