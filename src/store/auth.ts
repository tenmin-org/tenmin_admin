import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AdminProfile } from "@/api/types";

interface AuthState {
  token: string | null;
  profile: AdminProfile | null;
  setToken: (token: string | null) => void;
  setProfile: (profile: AdminProfile | null) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      profile: null,
      setToken: (token) => set({ token }),
      setProfile: (profile) => set({ profile }),
      logout: () => set({ token: null, profile: null }),
    }),
    {
      name: "tenmin-admin-auth",
      partialize: (state) => ({ token: state.token }),
    }
  )
);
