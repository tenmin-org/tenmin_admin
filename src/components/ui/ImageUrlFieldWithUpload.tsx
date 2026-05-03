import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";

import { extractError } from "@/api/client";
import { uploadAdminMedia, type MediaUploadFolder } from "@/api/endpoints";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: MediaUploadFolder;
  hint?: string;
};

export function ImageUrlFieldWithUpload({
  label,
  value,
  onChange,
  folder,
  hint,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadAdminMedia(file, folder),
    onSuccess: (url) => {
      onChange(url);
      toast.success("Изображение загружено");
    },
    onError: (e) => toast.error(extractError(e)),
  });

  return (
    <div className="space-y-1.5">
      <label className="label">{label}</label>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="input flex-1 min-w-0"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… или /media/…"
          autoComplete="off"
        />
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadMut.mutate(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="btn-secondary shrink-0 whitespace-nowrap"
          disabled={uploadMut.isPending}
          onClick={() => fileRef.current?.click()}
        >
          {uploadMut.isPending ? <LoadingSpinner className="size-4" /> : null}
          С устройства
        </button>
      </div>
    </div>
  );
}
