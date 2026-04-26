import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Package, Plus, Search, Trash2 } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { toast } from "sonner";

import { extractError } from "@/api/client";
import {
  createStoreProduct,
  deleteStoreProduct,
  listCategories,
  listProducts,
  listStoreCategories,
  listStoreProducts,
  listStores,
  updateStoreProduct,
} from "@/api/endpoints";
import type { StoreProduct } from "@/api/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StoreSelect } from "@/components/ui/StoreSelect";
import { formatPrice } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/mediaUrl";

const PAGE_SIZE = 30;

function ProductThumb({
  src,
  alt,
  onClick,
  frameClassName = "size-14 sm:size-16",
}: {
  src: string | null | undefined;
  alt: string;
  onClick?: () => void;
  frameClassName?: string;
}) {
  const resolved = resolveMediaUrl(src);
  const [broken, setBroken] = useState(false);
  const inner =
    !resolved || broken ? (
      <div
        className={`${frameClassName} rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200/60`}
      >
        <Package size={22} className="text-slate-400" strokeWidth={1.5} />
      </div>
    ) : (
      <img
        src={resolved}
        alt={onClick ? "" : alt}
        className={`${frameClassName} rounded-lg object-cover bg-slate-100 flex-shrink-0 border border-slate-200/60`}
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex-shrink-0 rounded-lg p-0 border-0 bg-transparent cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        title="Редактировать"
        aria-label={`Редактировать: ${alt || "товар"}`}
      >
        {inner}
      </button>
    );
  }
  return inner;
}

export default function StoreProductsPage() {
  const qc = useQueryClient();
  const storesQ = useQuery({ queryKey: ["stores"], queryFn: listStores });
  const [storeId, setStoreId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [availability, setAvailability] = useState<"all" | "yes" | "no">("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<StoreProduct | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirm, setConfirm] = useState<StoreProduct | null>(null);

  const effectiveStoreId = storeId ?? storesQ.data?.[0]?.id ?? null;

  const deferredSearch = useDeferredValue(search.trim());

  useEffect(() => {
    setCategoryId("");
    setAvailability("all");
    setPage(1);
  }, [effectiveStoreId]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, categoryId, availability]);

  const storeCategoriesQ = useQuery({
    queryKey: ["store-categories-filter", effectiveStoreId],
    queryFn: () =>
      listStoreCategories({
        store_id: effectiveStoreId!,
        limit: 500,
        offset: 0,
      }),
    enabled: !!effectiveStoreId,
  });

  const query = useQuery({
    queryKey: [
      "store-products",
      effectiveStoreId,
      deferredSearch,
      categoryId,
      availability,
      page,
      PAGE_SIZE,
    ],
    queryFn: () =>
      listStoreProducts({
        store_id: effectiveStoreId!,
        search: deferredSearch || undefined,
        category_id: categoryId === "" ? undefined : categoryId,
        is_available:
          availability === "all" ? undefined : availability === "yes",
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    enabled: !!effectiveStoreId,
  });

  const total = query.data?.total ?? 0;
  const items = query.data?.items ?? [];
  const offset = query.data?.offset ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const fromRow = total === 0 ? 0 : offset + 1;
  const toRow = offset + items.length;

  useEffect(() => {
    if (query.isLoading) return;
    const t = query.data?.total;
    if (t === undefined) return;
    const tp = Math.max(1, Math.ceil(t / PAGE_SIZE));
    setPage((p) => (p > tp ? tp : p));
  }, [query.isLoading, query.data?.total]);

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { price?: string; is_available?: boolean };
    }) => updateStoreProduct(id, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["store-products", effectiveStoreId] }),
    onError: (e) => toast.error(extractError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: deleteStoreProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-products", effectiveStoreId] });
      toast.success("Товар убран из магазина");
      setConfirm(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div>
      <PageHeader
        title="Товары магазинов"
        description="Цены и наличие товаров в конкретном магазине"
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="w-full sm:w-64">
          <StoreSelect value={effectiveStoreId} onChange={setStoreId} />
        </div>
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input pl-10"
            placeholder="Поиск по названию товара"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className="btn-primary"
          onClick={() => setAddOpen(true)}
          disabled={!effectiveStoreId}
        >
          <Plus size={18} /> Добавить
        </button>
      </div>

      {effectiveStoreId && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <select
            className="input w-full sm:w-64"
            value={categoryId === "" ? "" : String(categoryId)}
            onChange={(e) => {
              const v = e.target.value;
              setCategoryId(v === "" ? "" : Number(v));
            }}
          >
            <option value="">Все категории</option>
            {(storeCategoriesQ.data?.items ?? []).map((sc) => (
              <option key={sc.category_id} value={sc.category_id}>
                {sc.category_name ?? `Категория #${sc.category_id}`}
              </option>
            ))}
          </select>
          <select
            className="input w-full sm:w-56"
            value={availability}
            onChange={(e) =>
              setAvailability(e.target.value as "all" | "yes" | "no")
            }
          >
            <option value="all">Любая доступность</option>
            <option value="yes">В наличии</option>
            <option value="no">Нет в наличии</option>
          </select>
        </div>
      )}

      <div className="card overflow-hidden">
        {!effectiveStoreId ? (
          <EmptyState title="Выберите магазин" />
        ) : query.isLoading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner className="size-6" />
          </div>
        ) : total === 0 ? (
          <EmptyState
            title="Товаров нет"
            message="Добавьте товары из глобального каталога."
            icon={<Package size={40} strokeWidth={1.5} />}
          />
        ) : (
          <>
          <ul className="divide-y divide-slate-100">
            {items.map((sp) => (
              <li
                key={sp.id}
                className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4 hover:bg-slate-50"
              >
                <ProductThumb
                  src={sp.product_image_url}
                  alt={sp.product_name ?? ""}
                  onClick={() => setEditing(sp)}
                />
                <div className="flex-1 min-w-0 pr-1">
                  <div className="font-medium text-slate-900 line-clamp-2 sm:line-clamp-none sm:truncate">
                    {sp.product_name ?? `Товар #${sp.product_id}`}
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {sp.category_name ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <PriceCell
                    value={sp.price}
                    onSave={(v) =>
                      updateMut.mutate({ id: sp.id, data: { price: v } })
                    }
                  />
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0"
                      checked={sp.is_available}
                      aria-label="В наличии"
                      onChange={(e) =>
                        updateMut.mutate({
                          id: sp.id,
                          data: { is_available: e.target.checked },
                        })
                      }
                    />
                    <span className="hidden sm:inline whitespace-nowrap">В наличии</span>
                  </label>
                  <button
                    type="button"
                    className="btn-ghost !p-2 text-red-600"
                    onClick={() => setConfirm(sp)}
                    aria-label="Убрать из магазина"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-3 sm:px-4 border-t border-slate-100 bg-slate-50/80">
            <p className="text-sm text-slate-600 order-2 sm:order-1">
              {fromRow}–{toRow} из {total}
              {totalPages > 1 && (
                <span className="text-slate-400 hidden sm:inline">
                  {" "}
                  · стр. {page} / {totalPages}
                </span>
              )}
            </p>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <button
                type="button"
                className="btn-secondary !py-1.5 !px-3"
                disabled={page <= 1 || query.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Предыдущая страница"
              >
                <ChevronLeft size={18} />
                Назад
              </button>
              <button
                type="button"
                className="btn-secondary !py-1.5 !px-3"
                disabled={page >= totalPages || query.isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Следующая страница"
              >
                Вперёд
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          </>
        )}
      </div>

      {effectiveStoreId && (
        <AddStoreProductModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          storeId={effectiveStoreId}
        />
      )}

      {editing && (
        <EditStoreProductModal
          open={!!editing}
          onClose={() => setEditing(null)}
          item={editing}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Убрать товар из магазина?"
        message={`«${confirm?.product_name}» больше не будет отображаться в этом магазине.`}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && deleteMut.mutate(confirm.id)}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

function PriceCell({
  value,
  onSave,
}: {
  value: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className="text-sm font-medium text-slate-900 hover:bg-slate-100 rounded px-2 py-1 whitespace-nowrap"
      >
        {formatPrice(value)}
      </button>
    );
  }
  return (
    <input
      type="number"
      step="0.01"
      className="input !py-1 !px-2 w-24 text-sm"
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft !== value && draft !== "") onSave(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
    />
  );
}

function AddStoreProductModal({
  open,
  onClose,
  storeId,
}: {
  open: boolean;
  onClose: () => void;
  storeId: number;
}) {
  const qc = useQueryClient();
  const productsQ = useQuery({
    queryKey: ["products-select"],
    queryFn: () => listProducts({ limit: 500 }),
  });
  const categoriesQ = useQuery({
    queryKey: ["categories-select"],
    queryFn: () => listCategories({}),
  });

  const [productId, setProductId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState(true);

  const mut = useMutation({
    mutationFn: () =>
      createStoreProduct({
        store_id: storeId,
        product_id: Number(productId),
        category_id: Number(categoryId),
        price,
        is_available: available,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-products", storeId] });
      toast.success("Товар добавлен в магазин");
      setProductId("");
      setCategoryId("");
      setPrice("");
      setAvailable(true);
      onClose();
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const selectedProduct = productsQ.data?.find((p) => String(p.id) === productId);

  return (
    <Modal open={open} onClose={onClose} title="Добавить товар в магазин">
      <div className="space-y-4">
        <div>
          <label className="label">Товар</label>
          <div className="flex gap-3 items-start">
            <ProductThumb
              src={selectedProduct?.image_url}
              alt={selectedProduct?.name ?? ""}
            />
            <select
              className="input flex-1 min-w-0"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">— выберите —</option>
              {productsQ.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Категория</label>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— выберите —</option>
            {categoriesQ.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Цена</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <label className="flex items-end gap-2 pb-2">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="size-4"
            />
            <span className="text-sm">В наличии</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!productId || !categoryId || !price || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? <LoadingSpinner className="size-4" /> : null}
            Добавить
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EditStoreProductModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: StoreProduct;
}) {
  const qc = useQueryClient();
  const categoriesQ = useQuery({
    queryKey: ["categories-select"],
    queryFn: () => listCategories({}),
  });
  const [price, setPrice] = useState(item.price);
  const [categoryId, setCategoryId] = useState(String(item.category_id));
  const [available, setAvailable] = useState(item.is_available);

  const mut = useMutation({
    mutationFn: () =>
      updateStoreProduct(item.id, {
        price,
        category_id: Number(categoryId),
        is_available: available,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-products", item.store_id] });
      toast.success("Обновлено");
      onClose();
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title={item.product_name ?? "Товар"}>
      <div className="space-y-4">
        <div className="flex gap-3 items-center pb-1 border-b border-slate-100">
          <ProductThumb
            src={item.product_image_url}
            alt={item.product_name ?? ""}
          />
          <p className="text-sm text-slate-600 line-clamp-2">
            {item.product_name ?? `Товар #${item.product_id}`}
          </p>
        </div>
        <div>
          <label className="label">Категория</label>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categoriesQ.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Цена</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <label className="flex items-end gap-2 pb-2">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="size-4"
            />
            <span className="text-sm">В наличии</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={mut.isPending}
            onClick={() => mut.mutate()}
          >
            {mut.isPending ? <LoadingSpinner className="size-4" /> : null}
            Сохранить
          </button>
        </div>
      </div>
    </Modal>
  );
}
