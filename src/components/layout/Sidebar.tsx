import {
  Box,
  FolderTree,
  LogOut,
  Package,
  ShoppingCart,
  Store,
  Truck,
  Users,
  X,
  LayoutGrid,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "@/store/auth";
import { cn } from "@/lib/cn";
import type { AdminProfile } from "@/api/types";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Store;
  superadminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/orders", label: "Заказы", icon: ShoppingCart },
  { to: "/stores", label: "Магазины", icon: Store },
  { to: "/store-products", label: "Товары магазинов", icon: Package },
  { to: "/store-categories", label: "Витрины категорий", icon: LayoutGrid },
  { to: "/couriers", label: "Курьеры", icon: Truck },
  { to: "/products", label: "Каталог товаров", icon: Box, superadminOnly: true },
  { to: "/categories", label: "Категории", icon: FolderTree, superadminOnly: true },
  { to: "/users", label: "Админы", icon: Users, superadminOnly: true },
];

interface SidebarProps {
  profile: AdminProfile;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ profile, mobileOpen, onMobileClose }: SidebarProps) {
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  const items = NAV_ITEMS.filter(
    (item) => !item.superadminOnly || profile.is_superadmin
  );

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.username ||
    profile.phone ||
    "Админ";

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 lg:z-0 h-screen",
          "w-64 flex-shrink-0 bg-white border-r border-slate-200",
          "transition-transform duration-200 ease-out flex flex-col",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">
              T
            </div>
            <div className="font-semibold text-slate-900">TenMin Admin</div>
          </div>
          <button
            type="button"
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100"
            onClick={onMobileClose}
            aria-label="Закрыть меню"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onMobileClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )
              }
            >
              <item.icon size={18} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-600">
              {displayName[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">
                {displayName}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {profile.is_superadmin ? "Супер-админ" : "Админ"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut size={18} />
            Выйти
          </button>
        </div>
      </aside>
    </>
  );
}
