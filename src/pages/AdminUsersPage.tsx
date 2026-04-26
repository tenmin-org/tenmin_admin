import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { extractError } from "@/api/client";
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  listStores,
  updateAdminUser,
} from "@/api/endpoints";
import type { AdminUser, AdminUserUpdate } from "@/api/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/store/auth";

const createSchema = z.object({
  telegram_id: z.coerce.number().int().gt(0, "Укажите Telegram ID"),
  phone: z.string().trim().min(3, "Телефон обязателен"),
  first_name: z.string().optional().transform((v) => v || null),
  last_name: z.string().optional().transform((v) => v || null),
  username: z.string().optional().transform((v) => v || null),
  password: z.string().min(6, "Минимум 6 символов"),
  is_admin: z.boolean(),
  is_superadmin: z.boolean(),
  store_ids: z.array(z.number().int()).default([]),
});

type CreateInput = z.input<typeof createSchema>;
type CreateOutput = z.output<typeof createSchema>;

const editSchema = z.object({
  phone: z
    .string()
    .transform((s) => s.trim())
    .refine(
      (s) => s === "" || s.length >= 3,
      "Минимум 3 символа или оставьте пустым"
    ),
  first_name: z.string().optional().transform((v) => v || null),
  last_name: z.string().optional().transform((v) => v || null),
  username: z.string().optional().transform((v) => v || null),
  password: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || v.length >= 6, "Минимум 6 символов"),
  is_admin: z.boolean(),
  is_superadmin: z.boolean(),
  is_active: z.boolean(),
  is_blocked: z.boolean(),
  store_ids: z.array(z.number().int()).default([]),
});

type EditInput = z.input<typeof editSchema>;
type EditOutput = z.output<typeof editSchema>;

const PAGE_SIZE = 30;

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const me = useAuth((s) => s.profile)!;
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<AdminUser | null>(null);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  const query = useQuery({
    queryKey: ["admin-users", deferredSearch, page, PAGE_SIZE],
    queryFn: () =>
      listAdminUsers({
        only_admins: false,
        search: deferredSearch || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
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

  const storesQ = useQuery({ queryKey: ["stores"], queryFn: listStores });
  const storeMap = new Map(storesQ.data?.map((s) => [s.id, s.name]));

  const deleteMut = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Учётная запись удалена");
      setConfirm(null);
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div>
      <PageHeader
        title="Пользователи"
        description="Все учётные записи: клиенты из Telegram и доступ в админку"
        actions={
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
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
          placeholder="Телефон, имя, username или Telegram ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        {query.isLoading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner className="size-6" />
          </div>
        ) : total === 0 ? (
          <EmptyState title="Нет пользователей" icon={<Users size={40} strokeWidth={1.5} />} />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {items.map((u) => {
                const displayName =
                  [u.first_name, u.last_name].filter(Boolean).join(" ") ||
                  u.username ||
                  u.phone ||
                  `User #${u.id}`;
                return (
                  <li key={u.id} className="flex items-center gap-3 p-3 sm:p-4 hover:bg-slate-50">
                    <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center font-medium text-slate-600">
                      {displayName[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900">{displayName}</span>
                        {u.is_superadmin ? (
                          <span className="chip-purple">Супер-админ</span>
                        ) : u.is_admin ? (
                          <span className="chip-blue">Админ</span>
                        ) : (
                          <span className="chip">Клиент</span>
                        )}
                        {u.is_blocked && <span className="chip-red">Заблокирован</span>}
                        {!u.is_active && <span className="chip-red">Неактивен</span>}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {u.phone ?? "—"} · TG: {u.telegram_id}
                        {u.username ? ` · @${u.username}` : ""}
                      </div>
                      {u.is_admin && !u.is_superadmin && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {u.store_ids.map((sid) => (
                            <span key={sid} className="chip-blue">
                              {storeMap.get(sid) ?? `#${sid}`}
                            </span>
                          ))}
                          {!u.store_ids.length && (
                            <span className="text-xs text-slate-400">
                              магазины не назначены
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="btn-ghost !p-2"
                        onClick={() => setEditing(u)}
                        aria-label="Редактировать"
                      >
                        <Pencil size={16} />
                      </button>
                      {u.id !== me.id && (
                        <button
                          type="button"
                          className="btn-ghost !p-2 text-red-600"
                          onClick={() => setConfirm(u)}
                          aria-label="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
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
                >
                  <ChevronLeft size={18} />
                  Назад
                </button>
                <button
                  type="button"
                  className="btn-secondary !py-1.5 !px-3"
                  disabled={page >= totalPages || query.isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Вперёд
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {editing && (
        <EditUserModal
          user={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Удалить пользователя?"
        message={`Будет удалён пользователь «${confirm?.first_name ?? confirm?.phone ?? confirm?.username ?? `#${confirm?.id}`}». Действие нельзя отменить.`}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && deleteMut.mutate(confirm.id)}
        loading={deleteMut.isPending}
      />
    </div>
  );
}

function StoreCheckboxGroup({
  selected,
  onChange,
}: {
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const storesQ = useQuery({ queryKey: ["stores"], queryFn: listStores });
  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  return (
    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
      {storesQ.data?.map((s) => (
        <label
          key={s.id}
          className={
            "inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors " +
            (selected.includes(s.id)
              ? "bg-brand-50 border-brand-300 text-brand-700"
              : "bg-white border-slate-200 hover:bg-slate-50")
          }
        >
          <input
            type="checkbox"
            className="hidden"
            checked={selected.includes(s.id)}
            onChange={() => toggle(s.id)}
          />
          {s.name}
        </label>
      ))}
    </div>
  );
}

function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateInput>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      telegram_id: 0,
      phone: "",
      first_name: "",
      last_name: "",
      username: "",
      password: "",
      is_admin: true,
      is_superadmin: false,
      store_ids: [],
    },
  });

  const onSubmit = async (raw: CreateInput) => {
    const data = raw as unknown as CreateOutput;
    try {
      await createAdminUser(data);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Пользователь создан");
      reset();
      onClose();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  const storeIds = watch("store_ids") ?? [];
  const isSuper = watch("is_superadmin");

  return (
    <Modal open={open} onClose={onClose} title="Новый пользователь с доступом в админку">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-slate-600 -mt-1">
          Создаётся учётная запись с паролем для входа по телефону. Клиенты из Telegram появляются в
          списке автоматически.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Telegram ID</label>
            <input type="number" className="input" {...register("telegram_id")} />
            {errors.telegram_id && (
              <p className="text-xs text-red-600 mt-1">{errors.telegram_id.message}</p>
            )}
          </div>
          <div>
            <label className="label">Телефон</label>
            <input className="input" {...register("phone")} placeholder="+7..." />
            {errors.phone && (
              <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Имя</label>
            <input className="input" {...register("first_name")} />
          </div>
          <div>
            <label className="label">Фамилия</label>
            <input className="input" {...register("last_name")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Username</label>
            <input className="input" {...register("username")} />
          </div>
          <div>
            <label className="label">Пароль</label>
            <input className="input" {...register("password")} />
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("is_admin")} className="size-4" />
            Админ
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("is_superadmin")} className="size-4" />
            Супер-админ
          </label>
        </div>
        {!isSuper && (
          <div>
            <label className="label">Магазины</label>
            <StoreCheckboxGroup
              selected={storeIds}
              onChange={(v) => setValue("store_ids", v, { shouldDirty: true })}
            />
            <p className="text-xs text-slate-500 mt-1">
              Админ получит доступ только к выбранным магазинам.
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <LoadingSpinner className="size-4" /> : null}
            Создать
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({
  user,
  open,
  onClose,
}: {
  user: AdminUser;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditInput>({
    resolver: zodResolver(editSchema),
    values: {
      phone: user.phone ?? "",
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      username: user.username ?? "",
      password: "",
      is_admin: user.is_admin,
      is_superadmin: user.is_superadmin,
      is_active: user.is_active,
      is_blocked: user.is_blocked,
      store_ids: user.store_ids,
    },
  });

  const storeIds = watch("store_ids") ?? [];
  const isSuper = watch("is_superadmin");

  const onSubmit = async (raw: EditInput) => {
    const data = raw as unknown as EditOutput;
    const payload: AdminUserUpdate = {
      phone: data.phone === "" ? null : data.phone,
      first_name: data.first_name,
      last_name: data.last_name,
      username: data.username,
      is_admin: data.is_admin,
      is_superadmin: data.is_superadmin,
      is_active: data.is_active,
      is_blocked: data.is_blocked,
      store_ids: data.store_ids,
    };
    if (data.password) payload.password = data.password;
    try {
      await updateAdminUser(user.id, payload);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Обновлено");
      onClose();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Редактировать пользователя">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Телефон</label>
          <input className="input" {...register("phone")} placeholder="Пусто — только Telegram" />
          {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
          <p className="text-xs text-slate-500 mt-1">
            Для входа в админку нужен телефон и пароль; для клиентов поле можно оставить пустым.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Имя</label>
            <input className="input" {...register("first_name")} />
          </div>
          <div>
            <label className="label">Фамилия</label>
            <input className="input" {...register("last_name")} />
          </div>
        </div>
        <div>
          <label className="label">Новый пароль (оставьте пустым, чтобы не менять)</label>
          <input className="input" {...register("password")} placeholder="••••••" />
          {errors.password && (
            <p className="text-xs text-red-600 mt-1">{errors.password.message as string}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("is_admin")} className="size-4" />
            Админ
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("is_superadmin")} className="size-4" />
            Супер-админ
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("is_active")} className="size-4" />
            Активен
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("is_blocked")} className="size-4" />
            Заблокирован
          </label>
        </div>
        {!isSuper && (
          <div>
            <label className="label">Магазины</label>
            <StoreCheckboxGroup
              selected={storeIds}
              onChange={(v) => setValue("store_ids", v, { shouldDirty: true })}
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <LoadingSpinner className="size-4" /> : null}
            Сохранить
          </button>
        </div>
      </form>
    </Modal>
  );
}
