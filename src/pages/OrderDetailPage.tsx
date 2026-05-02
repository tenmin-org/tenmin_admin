import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Phone, User } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { extractError } from "@/api/client";
import { getOrder, listCouriers, updateOrder } from "@/api/endpoints";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/api/types";
import { FullPageLoading } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDate, formatPrice } from "@/lib/format";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const orderQ = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrder(orderId),
    enabled: !!orderId,
  });

  const couriersQ = useQuery({
    queryKey: ["couriers"],
    queryFn: listCouriers,
  });

  const statusMut = useMutation({
    mutationFn: (status: string) => updateOrder(orderId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Статус обновлён");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  const courierMut = useMutation({
    mutationFn: (courier_id: number) => updateOrder(orderId, { courier_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Курьер назначен");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  if (orderQ.isLoading) return <FullPageLoading />;
  if (orderQ.isError || !orderQ.data) {
    return (
      <div>
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost !pl-0"
        >
          <ArrowLeft size={18} /> Назад
        </button>
        <p className="text-sm text-red-600 mt-4">Не удалось загрузить заказ.</p>
      </div>
    );
  }

  const o = orderQ.data;
  const lineTotal = (it: (typeof o.items)[number]) => {
    const unit = Number(it.price);
    if (it.weight_grams != null && it.weight_grams > 0) {
      return unit * (it.weight_grams / 1000);
    }
    return unit * it.quantity;
  };
  const address = [o.delivery_address, o.house, o.apartment].filter(Boolean).join(", ");
  const availableCouriers = couriersQ.data?.filter((c) =>
    c.store_ids.includes(o.store_id)
  );

  return (
    <div>
      <Link to="/orders" className="btn-ghost !pl-0 mb-1">
        <ArrowLeft size={18} /> К списку
      </Link>
      <PageHeader
        title={`Заказ #${o.id}`}
        description={formatDate(o.created_at)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold mb-3">Состав</h3>
            <ul className="divide-y divide-slate-100">
              {o.items.map((it) => (
                <li key={it.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">
                      {it.product_name ?? `Товар #${it.product_id}`}
                    </div>
                    <div className="text-sm text-slate-500">
                      {it.weight_grams != null && it.weight_grams > 0
                        ? `${it.weight_grams} г × ${formatPrice(it.price)}/кг`
                        : `${it.quantity} × ${formatPrice(it.price)}`}
                    </div>
                  </div>
                  <div className="font-semibold text-slate-900">
                    {formatPrice(lineTotal(it))}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-2">
              <span className="text-sm text-slate-500">Итого</span>
              <span className="text-lg font-semibold">{formatPrice(o.total_price)}</span>
            </div>
          </div>

          {o.comment && (
            <div className="card p-4">
              <h3 className="font-semibold mb-2">Комментарий к заказу</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{o.comment}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold mb-3">Статус</h3>
            <select
              className="input"
              value={o.status}
              disabled={statusMut.isPending}
              onChange={(e) => statusMut.mutate(e.target.value)}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s as OrderStatus]}
                </option>
              ))}
            </select>
          </div>

          <div className="card p-4">
            <h3 className="font-semibold mb-3">Курьер</h3>
            <select
              className="input"
              value={o.courier_id ?? 0}
              disabled={courierMut.isPending}
              onChange={(e) => courierMut.mutate(Number(e.target.value))}
            >
              <option value={0}>— не назначен —</option>
              {availableCouriers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `· ${c.phone}` : ""}
                </option>
              ))}
            </select>
            {!availableCouriers?.length && (
              <p className="text-xs text-slate-500 mt-2">
                Для магазина {o.store_name ?? ""} нет привязанных курьеров.
              </p>
            )}
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="font-semibold">Клиент</h3>
            <div className="flex items-start gap-2 text-sm">
              <User size={16} className="text-slate-400 mt-0.5" />
              <span>{o.user_first_name ?? "—"}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Phone size={16} className="text-slate-400 mt-0.5" />
              <a
                href={o.user_phone ? `tel:${o.user_phone}` : undefined}
                className="text-brand-600"
              >
                {o.user_phone ?? "—"}
              </a>
            </div>
            <p className="text-sm text-slate-600 pl-6 -mt-1">
              Оплата при получении:{" "}
              <span className="font-medium text-slate-800">
                {o.payment_method === "card" ? "карта" : "перевод"}
              </span>
            </p>
            {address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin size={16} className="text-slate-400 mt-0.5" />
                <div>
                  <div>{address}</div>
                  {o.floor && (
                    <div className="text-xs text-slate-500">Этаж: {o.floor}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="card p-4">
            <h3 className="font-semibold mb-2">Магазин</h3>
            <div className="text-sm text-slate-700">{o.store_name}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
