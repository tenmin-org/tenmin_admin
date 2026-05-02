export interface AdminProfile {
  id: number;
  phone: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  is_superadmin: boolean;
  store_ids: number[];
}

export interface Store {
  id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  is_active: boolean;
  is_new: boolean;
  /** Стоимость доставки, ₸ */
  delivery_price: number;
}

export type StoreCreate = Omit<Store, "id">;
export type StoreUpdate = Partial<StoreCreate>;

export interface AdminUser {
  id: number;
  telegram_id: number;
  phone: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  is_superadmin: boolean;
  is_active: boolean;
  is_blocked: boolean;
  store_ids: number[];
}

export interface PaginatedAdminUsers {
  items: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminUserCreate {
  telegram_id: number;
  phone: string;
  password: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  is_admin: boolean;
  is_superadmin: boolean;
  store_ids: number[];
}

export interface AdminUserUpdate {
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  is_admin?: boolean;
  is_superadmin?: boolean;
  is_active?: boolean;
  is_blocked?: boolean;
  store_ids?: number[];
  password?: string | null;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  measure: string | null;
}

export type ProductCreate = Omit<Product, "id">;
export type ProductUpdate = Partial<ProductCreate>;

export interface Category {
  id: number;
  name: string;
  code: string | null;
  image_url: string | null;
  parent_id: number | null;
}

export type CategoryCreate = Omit<Category, "id">;
export type CategoryUpdate = Partial<CategoryCreate>;

export interface StoreCategory {
  id: number;
  store_id: number;
  category_id: number;
  category_name: string | null;
  category_image_url: string | null;
  is_active: boolean;
  position: number;
}

export interface PaginatedStoreCategories {
  items: StoreCategory[];
  total: number;
  limit: number;
  offset: number;
}

export interface StoreCategoryCreate {
  store_id: number;
  category_id: number;
  is_active: boolean;
  position: number;
}

export interface StoreCategoryUpdate {
  is_active?: boolean;
  position?: number;
}

export interface StoreProduct {
  id: number;
  store_id: number;
  product_id: number;
  category_id: number;
  price: string;
  is_available: boolean;
  product_name: string | null;
  category_name: string | null;
  product_image_url: string | null;
}

export interface PaginatedStoreProducts {
  items: StoreProduct[];
  total: number;
  limit: number;
  offset: number;
}

export interface StoreProductCreate {
  store_id: number;
  product_id: number;
  category_id: number;
  price: string | number;
  is_available: boolean;
}

export interface StoreProductUpdate {
  category_id?: number;
  price?: string | number;
  is_available?: boolean;
}

export interface OrderListItem {
  id: number;
  store_id: number;
  store_name: string | null;
  user_id: number;
  user_phone: string | null;
  user_first_name: string | null;
  courier_id: number | null;
  courier_name: string | null;
  status: string;
  total_price: string;
  created_at: string | null;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string | null;
  quantity: number;
  price: string;
  weight_grams?: number | null;
}

export interface OrderDetail extends OrderListItem {
  comment: string | null;
  payment_method?: string;
  delivery_address: string | null;
  house: string | null;
  floor: string | null;
  apartment: string | null;
  items: OrderItem[];
}

export interface OrderUpdate {
  status?: string;
  courier_id?: number;
}

export interface Courier {
  id: number;
  telegram_id: number;
  name: string;
  phone: string | null;
  is_active: boolean;
  store_ids: number[];
}

export interface CourierCreate {
  telegram_id: number;
  name: string;
  phone?: string | null;
  is_active: boolean;
  store_ids: number[];
}

export interface CourierUpdate {
  name?: string;
  phone?: string | null;
  is_active?: boolean;
  store_ids?: number[];
}

export const ORDER_STATUSES = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "on_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Новый",
  accepted: "Принят",
  preparing: "Готовится",
  ready: "Готов",
  on_delivery: "В доставке",
  delivered: "Доставлен",
  cancelled: "Отменён",
};
