import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  FolderTree,
  GripVertical,
  LayoutGrid,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { extractError } from "@/api/client";
import {
  createStoreCategory,
  deleteStoreCategory,
  listCategories,
  listLinkedStoreCategoryIds,
  listStoreCategories,
  listStores,
  updateStoreCategory,
} from "@/api/endpoints";
import type { Category, StoreCategory } from "@/api/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StoreSelect } from "@/components/ui/StoreSelect";
import { resolveMediaUrl } from "@/lib/mediaUrl";

const FETCH_PAGE = 200;

async function fetchAllStoreCategories(params: {
  store_id: number;
  is_active?: boolean;
}): Promise<{ items: StoreCategory[]; total: number }> {
  const items: StoreCategory[] = [];
  let offset = 0;
  let total = 0;
  for (;;) {
    const res = await listStoreCategories({
      ...params,
      limit: FETCH_PAGE,
      offset,
    });
    total = res.total;
    items.push(...res.items);
    if (res.items.length < FETCH_PAGE || items.length >= res.total) break;
    offset += FETCH_PAGE;
  }
  return { items, total };
}

function sortStoreCategories(a: StoreCategory, b: StoreCategory): number {
  if (a.position !== b.position) return a.position - b.position;
  return a.id - b.id;
}

function buildShowcaseTree(
  showcaseItems: StoreCategory[],
  categories: Category[] | undefined
) {
  const catById = new Map((categories ?? []).map((c) => [c.id, c]));
  const idsOnShowcase = new Set(showcaseItems.map((sc) => sc.category_id));

  const childrenByParentCategoryId = new Map<number, StoreCategory[]>();
  for (const sc of showcaseItems) {
    const pid = catById.get(sc.category_id)?.parent_id;
    if (pid == null) continue;
    const list = childrenByParentCategoryId.get(pid) ?? [];
    list.push(sc);
    childrenByParentCategoryId.set(pid, list);
  }
  for (const list of childrenByParentCategoryId.values()) {
    list.sort(sortStoreCategories);
  }

  const roots = showcaseItems.filter((sc) => {
    const pid = catById.get(sc.category_id)?.parent_id ?? null;
    return pid === null || !idsOnShowcase.has(pid);
  });
  roots.sort(sortStoreCategories);

  const getChildren = (parentCategoryId: number) =>
    childrenByParentCategoryId.get(parentCategoryId) ?? [];

  return { roots, getChildren };
}

function CategoryThumb({
  src,
  alt,
}: {
  src: string | null | undefined;
  alt: string;
}) {
  const resolved = resolveMediaUrl(src);
  const [broken, setBroken] = useState(false);
  if (!resolved || broken) {
    return (
      <div className="size-14 sm:size-16 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200/60">
        <FolderTree size={22} className="text-slate-400" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <img
      src={resolved}
      alt={alt}
      className="size-14 sm:size-16 rounded-lg object-cover bg-slate-100 flex-shrink-0 border border-slate-200/60"
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

// ── Row content (used both in list and in DragOverlay) ──────────────────────

function CategoryRowContent({
  sc,
  depth,
  hasChildren,
  isExpanded,
  toggleMut,
  setConfirm,
  onToggleExpand,
  dragHandleProps,
  isDragging,
}: {
  sc: StoreCategory;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  toggleMut: { mutate: (args: { id: number; is_active: boolean }) => void };
  setConfirm: (sc: StoreCategory) => void;
  onToggleExpand?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
}) {
  const name = sc.category_name ?? `Категория #${sc.category_id}`;
  const rowPad = 12 + depth * 18;

  return (
    <div
      className={`flex flex-col gap-3 p-3 sm:p-4 sm:flex-row sm:items-center sm:gap-3 ${
        isDragging ? "opacity-50" : "hover:bg-slate-50"
      }`}
      style={{ paddingLeft: rowPad }}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="hidden sm:flex flex-shrink-0 cursor-grab active:cursor-grabbing p-1 rounded text-slate-300 hover:text-slate-500 hover:bg-slate-100 touch-none"
        aria-label="Перетащить"
        {...dragHandleProps}
      >
        <GripVertical size={18} />
      </button>

      <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-3">
        {/* Mobile drag handle */}
        <button
          type="button"
          className="sm:hidden mt-1 flex-shrink-0 cursor-grab active:cursor-grabbing p-1 rounded text-slate-300 hover:text-slate-500 touch-none"
          aria-label="Перетащить"
          {...dragHandleProps}
        >
          <GripVertical size={20} />
        </button>

        <div className="flex w-8 flex-shrink-0 items-center justify-center">
          {hasChildren ? (
            <button
              type="button"
              className="rounded-md p-1 text-slate-500 hover:bg-slate-200/80 hover:text-slate-800"
              aria-expanded={isExpanded}
              aria-label={
                isExpanded ? "Свернуть подкатегории" : "Показать подкатегории"
              }
              onClick={onToggleExpand}
            >
              <ChevronRight
                size={20}
                className={`transition-transform duration-150 ${
                  isExpanded ? "rotate-90" : ""
                }`}
              />
            </button>
          ) : (
            <span className="block w-8" aria-hidden />
          )}
        </div>

        <CategoryThumb src={sc.category_image_url} alt={name} />

        <div
          className={`min-w-0 flex-1 ${
            hasChildren ? "cursor-pointer select-none" : ""
          }`}
          onClick={hasChildren ? onToggleExpand : undefined}
        >
          <div
            className="font-medium text-slate-900 break-words sm:truncate"
            title={name}
          >
            {name}
          </div>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center justify-end gap-3 sm:justify-start">
        <label className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
          <input
            type="checkbox"
            className="size-4"
            checked={sc.is_active}
            onChange={(e) =>
              toggleMut.mutate({ id: sc.id, is_active: e.target.checked })
            }
          />
          Актив.
        </label>
        <button
          className="btn-ghost !p-2 text-red-600"
          onClick={() => setConfirm(sc)}
          aria-label="Удалить"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Sortable row ─────────────────────────────────────────────────────────────

function SortableCategoryRow({
  sc,
  depth,
  expandedCategoryIds,
  toggleExpand,
  childrenMap,
  toggleMut,
  setConfirm,
}: {
  sc: StoreCategory;
  depth: number;
  expandedCategoryIds: Set<number>;
  toggleExpand: (categoryId: number) => void;
  childrenMap: Map<number, StoreCategory[]>;
  toggleMut: { mutate: (args: { id: number; is_active: boolean }) => void };
  setConfirm: (sc: StoreCategory) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const children = childrenMap.get(sc.category_id) ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedCategoryIds.has(sc.category_id);

  return (
    <>
      <li ref={setNodeRef} style={style} className="border-b border-slate-100 last:border-0">
        <CategoryRowContent
          sc={sc}
          depth={depth}
          hasChildren={hasChildren}
          isExpanded={isExpanded}
          toggleMut={toggleMut}
          setConfirm={setConfirm}
          onToggleExpand={() => toggleExpand(sc.category_id)}
          dragHandleProps={{ ...listeners, ...attributes }}
          isDragging={isDragging}
        />
      </li>

      {hasChildren && isExpanded && (
        <SortableContext
          items={children.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {children.map((child) => (
            <SortableCategoryRow
              key={child.id}
              sc={child}
              depth={depth + 1}
              expandedCategoryIds={expandedCategoryIds}
              toggleExpand={toggleExpand}
              childrenMap={childrenMap}
              toggleMut={toggleMut}
              setConfirm={setConfirm}
            />
          ))}
        </SortableContext>
      )}
    </>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function StoreCategoriesPage() {
  const qc = useQueryClient();
  const storesQ = useQuery({ queryKey: ["stores"], queryFn: listStores });
  const [storeId, setStoreId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "yes" | "no">("all");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<number>>(
    () => new Set()
  );

  const effectiveStoreId = storeId ?? storesQ.data?.[0]?.id ?? null;

  useEffect(() => {
    setActiveFilter("all");
    setExpandedCategoryIds(new Set());
  }, [effectiveStoreId]);

  useEffect(() => {
    setExpandedCategoryIds(new Set());
  }, [activeFilter]);

  const categoriesQ = useQuery({
    queryKey: ["categories-all"],
    queryFn: () => listCategories({}),
    enabled: !!effectiveStoreId,
  });

  const query = useQuery({
    queryKey: ["store-categories-all", effectiveStoreId, activeFilter],
    queryFn: () =>
      fetchAllStoreCategories({
        store_id: effectiveStoreId!,
        is_active:
          activeFilter === "all" ? undefined : activeFilter === "yes",
      }),
    enabled: !!effectiveStoreId,
  });

  const total = query.data?.total ?? 0;
  const items = query.data?.items ?? [];

  const { roots: serverRoots, getChildren: getServerChildren } = useMemo(
    () => buildShowcaseTree(items, categoriesQ.data),
    [items, categoriesQ.data]
  );

  // Local state for optimistic DnD reordering
  const [localRoots, setLocalRoots] = useState<StoreCategory[]>([]);
  const [localChildrenMap, setLocalChildrenMap] = useState<
    Map<number, StoreCategory[]>
  >(new Map());
  const isDraggingRef = useRef(false);
  const [activeDragId, setActiveDragId] = useState<number | null>(null);

  // Sync server → local when not dragging
  useEffect(() => {
    if (isDraggingRef.current) return;
    setLocalRoots(serverRoots);
    const map = new Map<number, StoreCategory[]>();
    for (const root of serverRoots) {
      const children = getServerChildren(root.category_id);
      if (children.length > 0) map.set(root.category_id, children);
    }
    setLocalChildrenMap(map);
  }, [serverRoots, getServerChildren]);

  const toggleExpand = useCallback((categoryId: number) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const invalidateStoreCategories = (sid: number) => {
    qc.invalidateQueries({ queryKey: ["store-categories-all", sid] });
    qc.invalidateQueries({ queryKey: ["store-categories", sid] });
    qc.invalidateQueries({ queryKey: ["store-categories-linked-ids", sid] });
    qc.invalidateQueries({ queryKey: ["store-categories-filter", sid] });
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [confirm, setConfirm] = useState<StoreCategory | null>(null);

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateStoreCategory(id, { is_active }),
    onSuccess: () => {
      if (effectiveStoreId) invalidateStoreCategories(effectiveStoreId);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const positionMut = useMutation({
    mutationFn: ({ id, position }: { id: number; position: number }) =>
      updateStoreCategory(id, { position }),
    onError: (e) => toast.error(extractError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: deleteStoreCategory,
    onSuccess: () => {
      if (effectiveStoreId) invalidateStoreCategories(effectiveStoreId);
      toast.success("Удалено");
      setConfirm(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  // DnD sensors — pointer with distance guard + touch with delay for scroll
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    })
  );

  const activeDragItem = useMemo(() => {
    if (activeDragId === null) return null;
    for (const r of localRoots) {
      if (r.id === activeDragId) return r;
    }
    for (const children of localChildrenMap.values()) {
      for (const c of children) {
        if (c.id === activeDragId) return c;
      }
    }
    return null;
  }, [activeDragId, localRoots, localChildrenMap]);

  function handleDragEnd(event: DragEndEvent) {
    isDraggingRef.current = false;
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as number;
    const overId = over.id as number;

    // Check roots
    const activeRootIdx = localRoots.findIndex((r) => r.id === activeId);
    const overRootIdx = localRoots.findIndex((r) => r.id === overId);

    if (activeRootIdx !== -1 && overRootIdx !== -1) {
      const newRoots = arrayMove(localRoots, activeRootIdx, overRootIdx);
      setLocalRoots(newRoots);
      newRoots.forEach((r, idx) => {
        if (r.position !== idx) positionMut.mutate({ id: r.id, position: idx });
      });
      if (effectiveStoreId) {
        setTimeout(() => invalidateStoreCategories(effectiveStoreId), 500);
      }
      return;
    }

    // Check children groups
    for (const [parentCatId, children] of localChildrenMap.entries()) {
      const activeIdx = children.findIndex((c) => c.id === activeId);
      const overIdx = children.findIndex((c) => c.id === overId);
      if (activeIdx !== -1 && overIdx !== -1) {
        const newChildren = arrayMove(children, activeIdx, overIdx);
        setLocalChildrenMap((prev) => {
          const next = new Map(prev);
          next.set(parentCatId, newChildren);
          return next;
        });
        newChildren.forEach((c, idx) => {
          if (c.position !== idx)
            positionMut.mutate({ id: c.id, position: idx });
        });
        if (effectiveStoreId) {
          setTimeout(() => invalidateStoreCategories(effectiveStoreId), 500);
        }
        return;
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Витрины категорий"
        description="Какие категории показываются в магазине, в каком порядке и активны ли"
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="w-full sm:w-64">
          <StoreSelect value={effectiveStoreId} onChange={setStoreId} />
        </div>
        <button
          className="btn-primary sm:ml-auto"
          onClick={() => setModalOpen(true)}
          disabled={!effectiveStoreId}
        >
          <Plus size={18} /> Добавить
        </button>
      </div>

      {effectiveStoreId && (
        <div className="mb-4 w-full sm:w-64">
          <select
            className="input"
            value={activeFilter}
            onChange={(e) =>
              setActiveFilter(e.target.value as "all" | "yes" | "no")
            }
          >
            <option value="all">Все на витрине</option>
            <option value="yes">Только активные</option>
            <option value="no">Только скрытые</option>
          </select>
        </div>
      )}

      <div className="card overflow-hidden">
        {!effectiveStoreId ? (
          <EmptyState title="Выберите магазин" />
        ) : query.isLoading || categoriesQ.isLoading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner className="size-6" />
          </div>
        ) : total === 0 ? (
          <EmptyState
            title="Витрина пуста"
            message="Добавьте категории, которые будут отображаться в магазине."
            icon={<LayoutGrid size={40} strokeWidth={1.5} />}
          />
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(e) => {
                isDraggingRef.current = true;
                setActiveDragId(e.active.id as number);
              }}
              onDragCancel={() => {
                isDraggingRef.current = false;
                setActiveDragId(null);
              }}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localRoots.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul>
                  {localRoots.map((sc) => (
                    <SortableCategoryRow
                      key={sc.id}
                      sc={sc}
                      depth={0}
                      expandedCategoryIds={expandedCategoryIds}
                      toggleExpand={toggleExpand}
                      childrenMap={localChildrenMap}
                      toggleMut={toggleMut}
                      setConfirm={setConfirm}
                    />
                  ))}
                </ul>
              </SortableContext>

              <DragOverlay>
                {activeDragItem ? (
                  <div className="bg-white rounded-lg shadow-lg border border-slate-200 opacity-95">
                    <CategoryRowContent
                      sc={activeDragItem}
                      depth={0}
                      hasChildren={false}
                      isExpanded={false}
                      toggleMut={toggleMut}
                      setConfirm={setConfirm}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            <div className="px-3 py-3 sm:px-4 border-t border-slate-100 bg-slate-50/80">
              <p className="text-sm text-slate-500">
                Всего на витрине: {total}. Удерживайте{" "}
                <GripVertical
                  size={13}
                  className="inline relative -top-px text-slate-400"
                />{" "}
                чтобы изменить порядок.
              </p>
            </div>
          </>
        )}
      </div>

      {effectiveStoreId && (
        <AddStoreCategoryModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          storeId={effectiveStoreId}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Убрать с витрины?"
        message={`Категория «${confirm?.category_name}» исчезнет из магазина.`}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && deleteMut.mutate(confirm.id)}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

// ── Add modal ────────────────────────────────────────────────────────────────

function AddStoreCategoryModal({
  open,
  onClose,
  storeId,
}: {
  open: boolean;
  onClose: () => void;
  storeId: number;
}) {
  const qc = useQueryClient();
  const categoriesQ = useQuery({
    queryKey: ["categories-all"],
    queryFn: () => listCategories({}),
  });
  const linkedIdsQ = useQuery({
    queryKey: ["store-categories-linked-ids", storeId],
    queryFn: () => listLinkedStoreCategoryIds(storeId),
    enabled: open && !!storeId,
  });

  const [categoryId, setCategoryId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [seedProducts, setSeedProducts] = useState(true);

  const existingIds = useMemo(
    () => new Set(linkedIdsQ.data ?? []),
    [linkedIdsQ.data]
  );

  const selectedCategory = categoriesQ.data?.find(
    (c) => String(c.id) === categoryId
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["store-categories-all", storeId] });
    qc.invalidateQueries({ queryKey: ["store-categories", storeId] });
    qc.invalidateQueries({
      queryKey: ["store-categories-linked-ids", storeId],
    });
    qc.invalidateQueries({ queryKey: ["store-categories-filter", storeId] });
  };

  const mut = useMutation({
    mutationFn: () =>
      createStoreCategory({
        store_id: storeId,
        category_id: Number(categoryId),
        position: 9999,
        is_active: isActive,
        seed_products: seedProducts,
      }),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["store-products"] });
      toast.success("Категория добавлена");
      setCategoryId("");
      setIsActive(true);
      setSeedProducts(true);
      onClose();
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title="Добавить категорию на витрину">
      <div className="space-y-4">
        <div>
          <label className="label">Категория</label>
          <div className="flex gap-3 items-start">
            <CategoryThumb
              src={selectedCategory?.image_url}
              alt={selectedCategory?.name ?? ""}
            />
            <select
              className="input flex-1 min-w-0"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">— выберите —</option>
              {categoriesQ.data
                ?.filter((c) => !existingIds.has(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4"
          />
          <span className="text-sm">Активна</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={seedProducts}
            onChange={(e) => setSeedProducts(e.target.checked)}
            className="size-4"
          />
          <span className="text-sm">Автоматически добавить товары из этой категории</span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!categoryId || mut.isPending}
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
