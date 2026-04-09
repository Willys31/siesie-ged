import { AlertTriangle } from 'lucide-react'

export default function ConfirmModal({
  open,
  title = 'Confirmation',
  message,
  confirmLabel = 'Confirmer',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  const confirmCls = variant === 'danger' ? 'btn-danger' : 'btn-primary'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative card p-6 w-full max-w-sm animate-slide-up">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base">{title}</h3>
            {message && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{message}</p>}
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>
            Annuler
          </button>
          <button className={confirmCls} onClick={onConfirm} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                En cours…
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
