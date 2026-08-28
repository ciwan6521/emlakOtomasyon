"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Locale } from "@reos/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { HTML_LANG, messages, type MessageKey } from "./messages";

const STORAGE_KEY = "reos.uiLocale";

interface CompanyLocaleDto {
  locale: Locale;
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && Object.values(Locale).includes(value as Locale)
  );
}

function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  return isLocale(raw) ? raw : null;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const [locale, setLocaleState] = useState<Locale>(Locale.EN);

  const company = useQuery({
    queryKey: ["company"],
    queryFn: () => api.get<CompanyLocaleDto>("/company"),
    enabled: !!user,
  });

  // Precedence: personal preference → last local choice → company default → EN.
  // The company value is only a fallback, so a signed-in user is never forced
  // back to the company language after picking their own.
  useEffect(() => {
    const resolved =
      (isLocale(user?.locale) ? user?.locale : null) ??
      readStoredLocale() ??
      (isLocale(company.data?.locale) ? company.data?.locale : null) ??
      Locale.EN;
    setLocaleState(resolved);
  }, [user?.locale, user?.id, company.data?.locale]);

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale] ?? "en";
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      localStorage.setItem(STORAGE_KEY, next);
      if (!user) return;
      // Persist server-side so the choice follows the user across devices.
      // A failure here only costs cross-device sync, so it is not surfaced.
      void api
        .patch("/auth/me/locale", { locale: next })
        .then(() => useAuth.setState({ user: { ...user, locale: next } }))
        .catch(() => undefined);
    },
    [user],
  );

  const t = useCallback(
    (key: MessageKey) =>
      messages[locale]?.[key] ?? messages[Locale.EN][key] ?? key,
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export function useT() {
  return useLocale().t;
}
