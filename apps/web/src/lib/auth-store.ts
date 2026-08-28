import { create } from "zustand";
import { can, Permission, Role, Scope } from "@reos/shared";
import type { AuthUser } from "@reos/shared";
import { api, getTokens, setTokens } from "./api";

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
    // Revoke the refresh token server-side; a failure must not trap the user
    // in a signed-in state, so the local session is cleared regardless.
    const refreshToken = getTokens()?.refreshToken;
    if (refreshToken)
      void api.post("/auth/logout", { refreshToken }).catch(() => undefined);
    setTokens(null);
    set({ user: null });
    if (typeof window !== "undefined") window.location.href = "/login";
  },
  can(permission, scope = Scope.OWN) {
    const roles = (get().user?.roles ?? []) as Role[];
    return can(roles, permission, scope);
  },
}));
