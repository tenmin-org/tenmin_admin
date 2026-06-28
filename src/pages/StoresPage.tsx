import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Store as StoreIcon, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { extractError } from "@/api/client";
import {
  createStore,
  deleteStore,
  listStores,
  updateStore,
} from "@/api/endpoints";
import type { Store } from "@/api/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ImageUrlFieldWithUpload } from "@/components/ui/ImageUrlFieldWithUpload";
import { useAuth } from "@/store/auth";

const schema = z.object({
  name: z.string().trim().min(1, "Введите название"),
  address: z.string().trim().min(1, "Введите адрес"),
  latitude: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v)))
    .refine((v) => v === null || !Number.isNaN(v), { message: "Число" }),
  longitude: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v)))
    .refine((v) => v === null || !Number.isNaN(v), { message: "Число" }),
  image_url: z.string().optional().transform((v) => (v ? v : null)),
  delivery_price: z
    .string()
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined) return 0;
      const n = Number(v);
      return Number.isNaN(n) ? 0 : n;
    })
    .refine((v) => v >= 0, { message: "Число не меньше 0" }),
  is_active: z.boolean(),
  is_new: z.boolean(),
  delivery_type: z.enum(["own", "yandex"]),
  group_id: z
    .string()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v)))
    .refine((v) => v === null || !Number.isNaN(v), { message: "Число" }),
  payment_type: z.enum(["transfer", "remote"]),
  payment_phone: z.string().optional().transform((v) => (v?.trim() || null)),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export default function StoresPage() {
  const profile = useAuth((s) => s.profile)!;
  const isSuper = profile.is_superadmin;
  const qc = useQueryClient();

  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Store | null>(null);

  const query = useQuery({ queryKey: ["stores-admin"], queryFn: listStores });

  const openCreate = () => {
    setEditingStore(null);
    setModalOpen(true);
  };
  const openEdit = (store: Store) => {
    setEditingStore(store);
    setModalOpen(true);
  };

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteStore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stores-admin"] });
      qc.invalidateQueries({ queryKey: ["stores"] });
      toast.success("Магазин удалён");
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div>
      <PageHeader
        title="Магазины"
        description={isSuper ? "Все магазины сервиса" : "Магазины, которые вы администрируете"}
        actions={
          isSuper ? (
            <button className="btn-primary" onClick={openCreate}>
              <Plus size={18} /> Добавить
            </button>
          ) : null
        }
      />

      <div className="card overflow-hidden">
        {query.isLoading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner className="size-6" />
          </div>
        ) : !query.data?.length ? (
          <EmptyState
            title="Магазинов нет"
            icon={<StoreIcon size={40} strokeWidth={1.5} />}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {query.data.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 p-4 hover:bg-slate-50"
              >
                <div className="size-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {s.image_url ? (
                    <img src={s.image_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <StoreIcon size={20} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-900 truncate">
                      {s.name}
                    </span>
                    {!s.is_active && <span className="chip-red">Отключён</span>}
                    {s.is_new && <span className="chip-blue">Новый</span>}
                  </div>
                  <div className="text-sm text-slate-500 truncate">{s.address}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="btn-ghost !p-2"
                    onClick={() => openEdit(s)}
                    aria-label="Редактировать"
                  >
                    <Pencil size={16} />
                  </button>
                  {isSuper && (
                    <button
                      className="btn-ghost !p-2 text-red-600"
                      onClick={() => setConfirmDelete(s)}
                      aria-label="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <StoreFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        store={editingStore}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Удалить магазин?"
        message={`Магазин «${confirmDelete?.name}» будет удалён без возможности восстановления.`}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

function StoreFormModal({
  open,
  onClose,
  store,
}: {
  open: boolean;
  onClose: () => void;
  store: Store | null;
}) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    values: {
      name: store?.name ?? "",
      address: store?.address ?? "",
      latitude: store?.latitude != null ? String(store.latitude) : "",
      longitude: store?.longitude != null ? String(store.longitude) : "",
      image_url: store?.image_url ?? "",
      delivery_price:
        store?.delivery_price != null ? String(store.delivery_price) : "0",
      is_active: store?.is_active ?? true,
      is_new: store?.is_new ?? false,
      delivery_type: store?.delivery_type ?? "own",
      group_id: store?.group_id != null ? String(store.group_id) : "",
      payment_type: store?.payment_type ?? "remote",
      payment_phone: store?.payment_phone ?? "",
    },
  });

  const onSubmit = async (raw: FormInput) => {
    const data = raw as unknown as FormOutput;
    try {
      if (store) {
        await updateStore(store.id, data);
        toast.success("Магазин обновлён");
      } else {
        await createStore(data);
        toast.success("Магазин создан");
      }
      qc.invalidateQueries({ queryKey: ["stores-admin"] });
      qc.invalidateQueries({ queryKey: ["stores"] });
      reset();
      onClose();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={store ? "Редактировать магазин" : "Новый магазин"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {store ? (
          <div>
            <label className="label">ID магазина</label>
            <input
              className="input bg-slate-50 text-slate-600 cursor-default"
              readOnly
              value={store.id}
              tabIndex={-1}
            />
          </div>
        ) : null}
        <div>
          <label className="label">Название</label>
          <input className="input" {...register("name")} />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Адрес</label>
          <input className="input" {...register("address")} />
          {errors.address && (
            <p className="text-xs text-red-600 mt-1">{errors.address.message}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Широта</label>
            <input className="input" {...register("latitude")} placeholder="43.25" />
          </div>
          <div>
            <label className="label">Долгота</label>
            <input className="input" {...register("longitude")} placeholder="76.95" />
          </div>
        </div>
        <div>
          <label className="label">Стоимость доставки (₸)</label>
          <input
            className="input"
            type="text"
            inputMode="decimal"
            {...register("delivery_price")}
            placeholder="0"
          />
          {errors.delivery_price && (
            <p className="text-xs text-red-600 mt-1">{errors.delivery_price.message}</p>
          )}
        </div>
        <ImageUrlFieldWithUpload
          label="Картинка"
          hint="Ссылка или загрузка с устройства (до 5 МБ)."
          folder="stores"
          value={watch("image_url") ?? ""}
          onChange={(v) => setValue("image_url", v, { shouldDirty: true })}
        />
        <div>
          <label className="label">Telegram Group ID</label>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            {...register("group_id")}
            placeholder="-1001234567890"
          />
          <p className="text-xs text-slate-500 mt-1">
            Chat ID группы магазина. Заказы будут отправляться в эту группу.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("is_active")} className="size-4" />
            Активен
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("is_new")} className="size-4" />
            Новинка
          </label>
        </div>
        <div>
          <label className="label">Тип доставки</label>
          <select className="input" {...register("delivery_type")}>
            <option value="own">Своя доставка</option>
            <option value="yandex">Яндекс Курьер</option>
          </select>
        </div>
        <div>
          <label className="label">Тип оплаты</label>
          <select className="input" {...register("payment_type")}>
            <option value="remote">Удалённая оплата</option>
            <option value="transfer">Перевод (Kaspi и т.д.)</option>
          </select>
        </div>
        {watch("payment_type") === "transfer" && (
          <div>
            <label className="label">Номер телефона для перевода</label>
            <input
              className="input"
              type="tel"
              {...register("payment_phone")}
              placeholder="+77001234567"
            />
            <p className="text-xs text-slate-500 mt-1">
              Клиент получит этот номер в уведомлении при запросе оплаты.
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <LoadingSpinner className="size-4" /> : null}
            {store ? "Сохранить" : "Создать"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
