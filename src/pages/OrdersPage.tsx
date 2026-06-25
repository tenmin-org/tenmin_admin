import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { listOrders } from "@/api/endpoints";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/api/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { StoreSelect } from "@/components/ui/StoreSelect";
import { cn } from "@/lib/cn";
import { formatDate, formatPrice } from "@/lib/format";

const statusChip: Record<OrderStatus, string> = {
  pending: "chip-yellow",
  accepted: "chip-blue",
  preparing: "chip-blue",
  ready: "chip-purple",
  on_delivery: "chip-purple",
  delivered: "chip-green",
  cancelled: "chip-red",
};

export default function OrdersPage() {
  const [storeId, setStoreId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("");

  const query = useQuery({
    queryKey: ["orders", storeId, status],
    queryFn: () =>
      listOrders({
        store_id: storeId ?? undefined,
        status: status || undefined,
      }),
  });

  return (
    <div>
      <PageHeader
        title="Заказы"
        description="Управление заказами магазинов"
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="w-full sm:w-64">
          <StoreSelect value={storeId} onChange={setStoreId} allowAll />
        </div>
        <select
          className="input w-full sm:w-52"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Все статусы</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {query.isLoading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner className="size-6" />
          </div>
        ) : !query.data?.length ? (
          <EmptyState
            title="Заказов пока нет"
            message="Как только поступит заказ, он появится здесь."
            icon={<ShoppingCart size={40} strokeWidth={1.5} />}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Магазин</th>
                    <th>Клиент</th>
                    <th>Статус</th>
                    <th className="text-right">Сумма</th>
                    <th>Создан</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.map((o) => (
                    <tr key={o.id}>
                      <td className="font-medium text-slate-900">#{o.id}</td>
                      <td>{o.store_name ?? "—"}</td>
                      <td>
                        <div className="flex flex-col">
                          <span>{o.user_first_name ?? "—"}</span>
                          <span className="text-xs text-slate-500">{o.user_phone ?? ""}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={cn(
                            statusChip[o.status as OrderStatus] ?? "chip"
                          )}
                        >
                          {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                        </span>
                      </td>
                      <td className="text-right font-medium">{formatPrice(o.total_price)}</td>
                      <td className="text-slate-500 whitespace-nowrap">
                        {formatDate(o.created_at)}
                      </td>
                      <td>
                        <Link
                          to={`/orders/${o.id}`}
                          className="btn-ghost !px-2 !py-1 text-brand-600"
                        >
                          Открыть
                          <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="md:hidden divide-y divide-slate-100">
              {query.data.map((o) => (
                <li key={o.id}>
                  <Link
                    to={`/orders/${o.id}`}
                    className="flex items-center gap-3 p-4 active:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">#{o.id}</span>
                        <span className={cn(statusChip[o.status as OrderStatus] ?? "chip")}>
                          {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 mt-0.5 truncate">
                        {o.store_name ?? "—"} · {o.user_first_name ?? "—"}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-slate-500">
                          {formatDate(o.created_at)}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {formatPrice(o.total_price)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
