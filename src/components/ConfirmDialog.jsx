import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  showWarning = true,
  onConfirm,
  onCancel,
}) {
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative bg-background rounded-2xl p-5 w-full max-w-sm shadow-xl flex flex-col gap-4 animate-fade-up">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold text-foreground font-heading leading-tight">{title}</h2>
          <button
            onClick={onCancel}
            aria-label="Cancel"
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        {showWarning && (
          <p className="text-xs font-semibold text-destructive">This action cannot be undone.</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-muted text-muted-foreground hover:bg-border transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-destructive text-white hover:opacity-90 transition-colors active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
