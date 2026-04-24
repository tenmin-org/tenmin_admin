import { useQuery } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router-dom";

import { getMe } from "@/api/endpoints";
import { AppLayout } from "@/components/layout/AppLayout";
import { FullPageLoading } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/store/auth";
import LoginPage from "@/pages/LoginPage";
import StoresPage from "@/pages/StoresPage";
import StoreProductsPage from "@/pages/StoreProductsPage";
import StoreCategoriesPage from "@/pages/StoreCategoriesPage";
import ProductsPage from "@/pages/ProductsPage";
import CategoriesPage from "@/pages/CategoriesPage";
import OrdersPage from "@/pages/OrdersPage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import CouriersPage from "@/pages/CouriersPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import { useEffect } from "react";

export default function App() {
  const token = useAuth((s) => s.token);
  const profile = useAuth((s) => s.profile);
  const setProfile = useAuth((s) => s.setProfile);

  const meQuery = useQuery({
    queryKey: ["me", token],
    queryFn: getMe,
    enabled: !!token,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (meQuery.data) {
      setProfile(meQuery.data);
    }
    if (meQuery.isError) {
      setProfile(null);
    }
  }, [meQuery.data, meQuery.isError, setProfile]);

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (meQuery.isLoading || (!profile && !meQuery.isError)) {
    return <FullPageLoading />;
  }

  if (!profile) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/orders" replace />} />
      <Route element={<AppLayout profile={profile} />}>
        <Route index element={<Navigate to="/orders" replace />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/stores" element={<StoresPage />} />
        <Route path="/store-products" element={<StoreProductsPage />} />
        <Route path="/store-categories" element={<StoreCategoriesPage />} />
        <Route path="/couriers" element={<CouriersPage />} />
        {profile.is_superadmin && (
          <>
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/users" element={<AdminUsersPage />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Route>
    </Routes>
  );
}
