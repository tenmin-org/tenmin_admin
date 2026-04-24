/** Относительные пути /media/... → полный URL к бэкенду (как в клиенте при заданном BASE_URL). */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  if (base && u.startsWith("/")) return `${base}${u}`;
  return u;
}
