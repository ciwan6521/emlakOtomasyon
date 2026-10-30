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
import { enumLabel, type EnumGroup } from "./enum-labels";

const STORAGE_KEY = "reos.uiLocale";

interface CompanyLocaleDto {
  locale: Locale;
}

export type TranslateFn = (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string;

export type EnumLabelFn = (
  group: EnumGroup,
  value: string | null | undefined,
) => string;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
  /** Localised label for an enum value, e.g. `e("status", "SOLD")`. */
  e: EnumLabelFn;
}

/** Replaces `{name}` placeholders with the provided values. */
function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
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

  const t = useCallback<TranslateFn>(
    (key, vars) =>
      interpolate(
        messages[locale]?.[key] ?? messages[Locale.EN][key] ?? key,
        vars,
      ),
    [locale],
  );

  const e = useCallback<EnumLabelFn>(
    (group, value) => enumLabel(locale, group, value),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, e }),
    [locale, setLocale, t, e],
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

/** Localised enum labels: `const e = useEnumLabel(); e("status", lead.status)`. */
export function useEnumLabel() {
  return useLocale().e;
}
