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
import { messages, type MessageKey } from "./messages";

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

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return Locale.EN;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw && Object.values(Locale).includes(raw as Locale)) {
    return raw as Locale;
  }
  return Locale.EN;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const [locale, setLocaleState] = useState<Locale>(Locale.EN);

  const company = useQuery({
    queryKey: ["company"],
    queryFn: () => api.get<CompanyLocaleDto>("/company"),
    enabled: !!user,
  });

  useEffect(() => {
    if (company.data?.locale) {
      setLocaleState(company.data.locale);
      localStorage.setItem(STORAGE_KEY, company.data.locale);
      return;
    }
    if (!user) {
      setLocaleState(readStoredLocale());
    }
  }, [company.data?.locale, user]);

  useEffect(() => {
    const lang = locale === Locale.ME ? "cnr" : "en";
    document.documentElement.lang = lang;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: MessageKey) => {
      const pack = locale === Locale.ME ? messages.me : messages.en;
      return pack[key] ?? messages.en[key] ?? key;
    },
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
