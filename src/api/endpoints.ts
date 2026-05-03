import { api } from "./client";
import type {
  AdminProfile,
  AdminUser,
  AdminUserCreate,
  AdminUserUpdate,
  Category,
  CategoryCreate,
  CategoryUpdate,
  Courier,
  CourierCreate,
  CourierUpdate,
  OrderDetail,
  OrderListItem,
  OrderUpdate,
  Product,
  ProductCreate,
  ProductUpdate,
  Store,
  StoreCategory,
  StoreCategoryCreate,
  StoreCategoryUpdate,
  StoreCreate,
  PaginatedAdminUsers,
  PaginatedStoreCategories,
  PaginatedStoreProducts,
  StoreProduct,
  StoreProductCreate,
  StoreProductUpdate,
  StoreUpdate,
} from "./types";

// ---------- Auth ----------

export async function login(phone: string, password: string) {
  const { data } = await api.post<{ access_token: string; token_type: string }>(
    "/auth/login",
    { phone, password }
  );
  return data;
}

export async function getMe() {
  const { data } = await api.get<AdminProfile>("/auth/me");
  return data;
}

// ---------- Media (admin uploads) ----------

export type MediaUploadFolder = "products" | "categories" | "stores";

export async function uploadAdminMedia(
  file: File,
  folder: MediaUploadFolder = "products"
) {
  const body = new FormData();
  body.append("file", file);
  const { data } = await api.post<{ url: string }>("/media/upload", body, {
    params: { folder },
    timeout: 120_000,
  });
  return data.url;
}

// ---------- Stores ----------

export async function listStores() {
  const { data } = await api.get<Store[]>("/stores/");
  return data;
}
export async function getStore(id: number) {
  const { data } = await api.get<Store>(`/stores/${id}`);
  return data;
}
export async function createStore(body: StoreCreate) {
  const { data } = await api.post<Store>("/stores/", body);
  return data;
}
export async function updateStore(id: number, body: StoreUpdate) {
  const { data } = await api.patch<Store>(`/stores/${id}`, body);
  return data;
}
export async function deleteStore(id: number) {
  await api.delete(`/stores/${id}`);
}

// ---------- Admin Users ----------

export async function listAdminUsers(params?: {
  only_admins?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const { data } = await api.get<PaginatedAdminUsers>("/users/", { params });
  return data;
}
export async function createAdminUser(body: AdminUserCreate) {
  const { data } = await api.post<AdminUser>("/users/", body);
  return data;
}
export async function updateAdminUser(id: number, body: AdminUserUpdate) {
  const { data } = await api.patch<AdminUser>(`/users/${id}`, body);
  return data;
}
export async function deleteAdminUser(id: number) {
  await api.delete(`/users/${id}`);
}

// ---------- Products ----------

export async function listProducts(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const { data } = await api.get<Product[]>("/products/", { params });
  return data;
}
export async function createProduct(body: ProductCreate) {
  const { data } = await api.post<Product>("/products/", body);
  return data;
}
export async function updateProduct(id: number, body: ProductUpdate) {
  const { data } = await api.patch<Product>(`/products/${id}`, body);
  return data;
}
export async function deleteProduct(id: number) {
  await api.delete(`/products/${id}`);
}

// ---------- Categories ----------

export async function listCategories(params?: {
  parent_id?: number;
  search?: string;
}) {
  const { data } = await api.get<Category[]>("/categories/", { params });
  return data;
}
export async function createCategory(body: CategoryCreate) {
  const { data } = await api.post<Category>("/categories/", body);
  return data;
}
export async function updateCategory(id: number, body: CategoryUpdate) {
  const { data } = await api.patch<Category>(`/categories/${id}`, body);
  return data;
}
export async function deleteCategory(id: number) {
  await api.delete(`/categories/${id}`);
}

// ---------- StoreCategories ----------

export async function listLinkedStoreCategoryIds(store_id: number) {
  const { data } = await api.get<number[]>("/store-categories/linked-category-ids", {
    params: { store_id },
  });
  return data;
}

export async function listStoreCategories(params: {
  store_id: number;
  is_active?: boolean;
  leaf_only?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { data } = await api.get<PaginatedStoreCategories>("/store-categories/", {
    params,
  });
  return data;
}
export async function createStoreCategory(body: StoreCategoryCreate) {
  const { data } = await api.post<StoreCategory>("/store-categories/", body);
  return data;
}
export async function updateStoreCategory(id: number, body: StoreCategoryUpdate) {
  const { data } = await api.patch<StoreCategory>(`/store-categories/${id}`, body);
  return data;
}
export async function deleteStoreCategory(id: number) {
  await api.delete(`/store-categories/${id}`);
}

// ---------- StoreProducts ----------

export async function listStoreProducts(params: {
  store_id: number;
  category_id?: number;
  is_available?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const { data } = await api.get<PaginatedStoreProducts>("/store-products/", {
    params,
  });
  return data;
}
export async function createStoreProduct(body: StoreProductCreate) {
  const { data } = await api.post<StoreProduct>("/store-products/", body);
  return data;
}
export async function updateStoreProduct(id: number, body: StoreProductUpdate) {
  const { data } = await api.patch<StoreProduct>(`/store-products/${id}`, body);
  return data;
}
export async function deleteStoreProduct(id: number) {
  await api.delete(`/store-products/${id}`);
}

// ---------- Orders ----------

export async function listOrders(params?: {
  store_id?: number;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const { data } = await api.get<OrderListItem[]>("/orders/", { params });
  return data;
}
export async function getOrder(id: number) {
  const { data } = await api.get<OrderDetail>(`/orders/${id}`);
  return data;
}
export async function updateOrder(id: number, body: OrderUpdate) {
  const { data } = await api.patch<OrderDetail>(`/orders/${id}`, body);
  return data;
}

// ---------- Couriers ----------

export async function listCouriers() {
  const { data } = await api.get<Courier[]>("/couriers/");
  return data;
}
export async function createCourier(body: CourierCreate) {
  const { data } = await api.post<Courier>("/couriers/", body);
  return data;
}
export async function updateCourier(id: number, body: CourierUpdate) {
  const { data } = await api.patch<Courier>(`/couriers/${id}`, body);
  return data;
}
export async function deleteCourier(id: number) {
  await api.delete(`/couriers/${id}`);
}
