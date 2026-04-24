import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { extractError } from "@/api/client";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/api/endpoints";
import type { Category } from "@/api/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";

const schema = z.object({
  name: z.string().trim().min(1, "Введите название"),
  code: z.string().optional().transform((v) => v || null),
  image_url: z.string().optional().transform((v) => v || null),
  parent_id: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => {
      if (v === "" || v === null || v === undefined) return null;
      return Number(v);
    }),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirm, setConfirm] = useState<Category | null>(null);

  const query = useQuery({
    queryKey: ["categories-all"],
    queryFn: () => listCategories({}),
  });

  const byId = new Map(query.data?.map((c) => [c.id, c]));

  const deleteMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories-all"] });
      toast.success("Категория удалена");
      setConfirm(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div>
      <PageHeader
        title="Категории"
        description="Глобальное дерево категорий (общая база для всех магазинов)"
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
          <EmptyState title="Категорий нет" icon={<FolderTree size={40} strokeWidth={1.5} />} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {query.data.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 p-3 sm:p-4 hover:bg-slate-50"
              >
                <div className="size-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {c.image_url ? (
                    <img src={c.image_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <FolderTree size={16} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">
                    {c.name}
                    {c.parent_id && (
                      <span className="ml-2 text-xs text-slate-400 font-normal">
                        ← {byId.get(c.parent_id)?.name ?? `#${c.parent_id}`}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{c.code ?? ""}</div>
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

      <CategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        category={editing}
        categories={query.data ?? []}
      />

      <ConfirmDialog
        open={!!confirm}
        title="Удалить категорию?"
        message={`Категория «${confirm?.name}» и все её подкатегории будут удалены.`}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && deleteMut.mutate(confirm.id)}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

function CategoryModal({
  open,
  onClose,
  category,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  categories: Category[];
}) {
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormInput>({
      resolver: zodResolver(schema),
      values: {
        name: category?.name ?? "",
        code: category?.code ?? "",
        image_url: category?.image_url ?? "",
        parent_id: category?.parent_id ?? null,
      },
    });

  const onSubmit = async (raw: FormInput) => {
    const data = raw as unknown as FormOutput;
    try {
      if (category) {
        await updateCategory(category.id, data);
        toast.success("Категория обновлена");
      } else {
        await createCategory(data);
        toast.success("Категория создана");
      }
      qc.invalidateQueries({ queryKey: ["categories-all"] });
      reset();
      onClose();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={category ? "Категория" : "Новая категория"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Название</label>
          <input className="input" {...register("name")} />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Код</label>
            <input className="input" {...register("code")} placeholder="milk, vegetables" />
          </div>
          <div>
            <label className="label">Родитель</label>
            <select className="input" {...register("parent_id")}>
              <option value="">—</option>
              {categories
                .filter((c) => c.id !== category?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Картинка (URL)</label>
          <input className="input" {...register("image_url")} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <LoadingSpinner className="size-4" /> : null}
            {category ? "Сохранить" : "Создать"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
