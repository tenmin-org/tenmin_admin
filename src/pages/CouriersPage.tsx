import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { extractError } from "@/api/client";
import {
  createCourier,
  deleteCourier,
  listCouriers,
  listStores,
  updateCourier,
} from "@/api/endpoints";
import type { Courier } from "@/api/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";

const schema = z.object({
  telegram_id: z.coerce.number().int().gt(0, "Укажите Telegram ID"),
  name: z.string().trim().min(1, "Введите имя"),
  phone: z.string().optional().transform((v) => v || null),
  is_active: z.boolean(),
  store_ids: z.array(z.number().int()).default([]),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export default function CouriersPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Courier | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirm, setConfirm] = useState<Courier | null>(null);

  const query = useQuery({ queryKey: ["couriers"], queryFn: listCouriers });
  const storesQ = useQuery({ queryKey: ["stores"], queryFn: listStores });

  const storeMap = new Map(storesQ.data?.map((s) => [s.id, s.name]));

  const deleteMut = useMutation({
    mutationFn: deleteCourier,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["couriers"] });
      toast.success("Курьер удалён");
      setConfirm(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div>
      <PageHeader
        title="Курьеры"
        description="Курьеры, привязанные к магазинам"
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={18} /> Добавить
          </button>
        }
      />

      <div className="card overflow-hidden">
        {query.isLoading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner className="size-6" />
          </div>
        ) : !query.data?.length ? (
          <EmptyState title="Курьеров нет" icon={<Truck size={40} strokeWidth={1.5} />} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {query.data.map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-3 sm:p-4 hover:bg-slate-50">
                <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <Truck size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-900">{c.name}</span>
                    {!c.is_active && <span className="chip-red">Неактивен</span>}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    TG: {c.telegram_id}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.store_ids.map((sid) => (
                      <span key={sid} className="chip-blue">
                        {storeMap.get(sid) ?? `#${sid}`}
                      </span>
                    ))}
                    {!c.store_ids.length && (
                      <span className="text-xs text-slate-400">без магазинов</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="btn-ghost !p-2"
                    onClick={() => {
                      setEditing(c);
                      setModalOpen(true);
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="btn-ghost !p-2 text-red-600"
                    onClick={() => setConfirm(c)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CourierModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        courier={editing}
      />

      <ConfirmDialog
        open={!!confirm}
        title="Удалить курьера?"
        message={`Курьер «${confirm?.name}» будет удалён.`}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && deleteMut.mutate(confirm.id)}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

function CourierModal({
  open,
  onClose,
  courier,
}: {
  open: boolean;
  onClose: () => void;
  courier: Courier | null;
}) {
  const qc = useQueryClient();
  const storesQ = useQuery({ queryKey: ["stores"], queryFn: listStores });

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
      telegram_id: courier?.telegram_id ?? 0,
      name: courier?.name ?? "",
      phone: courier?.phone ?? "",
      is_active: courier?.is_active ?? true,
      store_ids: courier?.store_ids ?? [],
    },
  });

  const storeIds = watch("store_ids") ?? [];
  const toggleStore = (id: number) => {
    const next = storeIds.includes(id)
      ? storeIds.filter((x) => x !== id)
      : [...storeIds, id];
    setValue("store_ids", next, { shouldDirty: true });
  };

  const onSubmit = async (raw: FormInput) => {
    const data = raw as unknown as FormOutput;
    try {
      if (courier) {
        await updateCourier(courier.id, data);
        toast.success("Курьер обновлён");
      } else {
        await createCourier(data);
        toast.success("Курьер создан");
      }
      qc.invalidateQueries({ queryKey: ["couriers"] });
      reset();
      onClose();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={courier ? "Курьер" : "Новый курьер"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Telegram ID</label>
            <input
              type="number"
              className="input"
              {...register("telegram_id")}
              disabled={!!courier}
            />
            {errors.telegram_id && (
              <p className="text-xs text-red-600 mt-1">{errors.telegram_id.message}</p>
            )}
          </div>
          <div>
            <label className="label">Телефон</label>
            <input className="input" {...register("phone")} />
          </div>
        </div>
        <div>
          <label className="label">Имя</label>
          <input className="input" {...register("name")} />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Магазины</label>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
            {storesQ.data?.map((s) => (
              <label
                key={s.id}
                className={
                  "inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors " +
                  (storeIds.includes(s.id)
                    ? "bg-brand-50 border-brand-300 text-brand-700"
                    : "bg-white border-slate-200 hover:bg-slate-50")
                }
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={storeIds.includes(s.id)}
                  onChange={() => toggleStore(s.id)}
                />
                {s.name}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("is_active")} className="size-4" />
          Активен
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <LoadingSpinner className="size-4" /> : null}
            {courier ? "Сохранить" : "Создать"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
