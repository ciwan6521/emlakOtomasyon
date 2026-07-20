"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-store";
import { ApiClientError } from "@/lib/api";

const QUICK_LOGINS = [
  { label: "Company Owner", email: "owner@adriatic.me" },
  { label: "Branch Manager", email: "manager@adriatic.me" },
  { label: "Sales Agent", email: "agent@adriatic.me" },
  { label: "Call Center", email: "callcenter@adriatic.me" },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
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
        err instanceof ApiClientError ? err.error.title : "Login failed",
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
              Leads, portfolio, CRM, and day-to-day operations in one place.
            </p>
          </div>
          <p className="text-xs text-primary-foreground/60">Adriatic Estates</p>
        </div>

        <div className="p-8 md:p-10">
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use a demo account or your credentials.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
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
              Sign in
            </Button>
          </form>

          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Quick demo login
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
                    <p className="text-sm font-medium">{q.label}</p>
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
