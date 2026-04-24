import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  title = "Подтверждение",
  message,
  confirmLabel = "Да",
  cancelLabel = "Отмена",
  onConfirm,
  onClose,
  loading,
  destructive = true,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-slate-600">{message}</p>
      <div className="flex justify-end gap-2 mt-5">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={destructive ? "btn-danger" : "btn-primary"}
          onClick={onConfirm}
          disabled={loading}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
