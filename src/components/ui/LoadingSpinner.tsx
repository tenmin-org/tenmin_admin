import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("animate-spin text-brand-600", className ?? "size-5")}
    />
  );
}

export function FullPageLoading() {
  return (
    <div className="h-full flex items-center justify-center">
      <LoadingSpinner className="size-8" />
    </div>
  );
}
