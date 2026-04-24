import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";

import { Sidebar } from "./Sidebar";
import type { AdminProfile } from "@/api/types";

interface AppLayoutProps {
  profile: AdminProfile;
}

export function AppLayout({ profile }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      <Sidebar
        profile={profile}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 h-14 flex items-center px-3 gap-3">
          <button
            type="button"
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100"
            onClick={() => setMobileOpen(true)}
            aria-label="Меню"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-brand-600 text-white flex items-center justify-center text-sm font-bold">
              T
            </div>
            <div className="font-semibold text-slate-900">TenMin Admin</div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
