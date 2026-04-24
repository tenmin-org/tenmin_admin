import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { extractError } from "@/api/client";
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from "@/api/endpoints";
import type { Product } from "@/api/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";

const schema = z.object({
  name: z.string().trim().min(1, "Введите название"),
  description: z.string().optional().transform((v) => v || null),
  image_url: z.string().optional().transform((v) => v || null),
  measure: z.string().optional().transform((v) => v || null),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export default function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirm, setConfirm] = useState<Product | null>(null);

  const query = useQuery({
    queryKey: ["products", search],
    queryFn: () => listProducts({ search: search || undefined, limit: 200 }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Товар удалён");
      setConfirm(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div>
      <PageHeader
        title="Каталог товаров"
        description="Глобальные товары (единая база для всех магазинов)"
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

      <div className="mb-4 relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          className="input pl-10 max-w-sm"
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        {query.isLoading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner className="size-6" />
          </div>
        ) : !query.data?.length ? (
          <EmptyState title="Товаров нет" icon={<Package size={40} strokeWidth={1.5} />} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {query.data.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-3 sm:p-4 hover:bg-slate-50">
                <div className="size-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {p.image_url ? (
                    <img src={p.image_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <Package size={18} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{p.name}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {p.measure ?? "—"}
                    {p.description ? ` · ${p.description}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="btn-ghost !p-2"
                    onClick={() => {
                      setEditing(p);
                      setModalOpen(true);
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="btn-ghost !p-2 text-red-600"
                    onClick={() => setConfirm(p)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProductFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editing}
      />

      <ConfirmDialog
        open={!!confirm}
        title="Удалить товар?"
        message={`Товар «${confirm?.name}» будет удалён. Все связи в магазинах пропадут.`}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && deleteMut.mutate(confirm.id)}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

function ProductFormModal({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}) {
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormInput>({
      resolver: zodResolver(schema),
      values: {
        name: product?.name ?? "",
        description: product?.description ?? "",
        image_url: product?.image_url ?? "",
        measure: product?.measure ?? "",
      },
    });

  const onSubmit = async (raw: FormInput) => {
    const data = raw as unknown as FormOutput;
    try {
      if (product) {
        await updateProduct(product.id, data);
        toast.success("Товар обновлён");
      } else {
        await createProduct(data);
        toast.success("Товар создан");
      }
      qc.invalidateQueries({ queryKey: ["products"] });
      reset();
      onClose();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={product ? "Товар" : "Новый товар"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Название</label>
          <input className="input" {...register("name")} />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Описание</label>
          <textarea className="input min-h-[80px]" {...register("description")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ед. измерения</label>
            <input className="input" {...register("measure")} placeholder="кг, шт, л" />
          </div>
          <div>
            <label className="label">Картинка (URL)</label>
            <input className="input" {...register("image_url")} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <LoadingSpinner className="size-4" /> : null}
            {product ? "Сохранить" : "Создать"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
