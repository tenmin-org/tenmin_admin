import { useQuery } from "@tanstack/react-query";

import { listStores } from "@/api/endpoints";

interface StoreSelectProps {
  value: number | null;
  onChange: (id: number | null) => void;
  allowAll?: boolean;
  className?: string;
  placeholder?: string;
}

export function StoreSelect({
  value,
  onChange,
  allowAll = false,
  className,
  placeholder = "Выберите магазин",
}: StoreSelectProps) {
  const { data } = useQuery({
    queryKey: ["stores"],
    queryFn: listStores,
  });

  return (
    <select
      className={"input " + (className ?? "")}
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? null : Number(v));
      }}
    >
      <option value="">{allowAll ? "Все магазины" : placeholder}</option>
      {data?.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
