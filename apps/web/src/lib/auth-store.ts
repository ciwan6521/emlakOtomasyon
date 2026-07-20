import { create } from "zustand";
import { can, Permission, Role, Scope } from "@reos/shared";
import type { AuthUser } from "@reos/shared";
import { api, setTokens } from "./api";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (permission: Permission, scope?: Scope) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  async hydrate() {
    try {
      const me = await api.get<AuthUser>("/auth/me");
      set({ user: me, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  async login(email, password) {
    const res = await api.login(email, password);
    set({ user: res.user });
  },
  logout() {
    setTokens(null);
    set({ user: null });
    if (typeof window !== "undefined") window.location.href = "/login";
  },
  can(permission, scope = Scope.OWN) {
    const roles = (get().user?.roles ?? []) as Role[];
    return can(roles, permission, scope);
  },
}));
