import { ExclamationTriangleIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';

/**
 * Unified confirmation modal with Tailwind styling.
 * Props:
 * - isOpen: boolean
 * - title?: string (default: 'Confirmation')
 * - message: string | ReactNode
 * - confirmText?: string (default: 'Confirmer')
 * - cancelText?: string (default: 'Annuler')
 * - variant?: 'danger' | 'warning' | 'info' (default: 'warning')
 * - onConfirm: () => void | Promise<void>
 * - onCancel: () => void
 */
const ConfirmDialog = ({
  isOpen,
  title = 'Confirmation',
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'warning',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const tone = variant === 'danger'
    ? {
      box: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
      button: 'bg-rose-600 hover:bg-rose-700 text-white'
    }
    : variant === 'info'
      ? {
        box: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
        button: 'bg-sky-600 hover:bg-sky-700 text-white'
      }
      : {
        box: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
        button: 'bg-amber-600 hover:bg-amber-700 text-white'
      };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-w-md w-full p-5 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${tone.box}`}>
            {variant === 'danger' ? (
              <ExclamationTriangleIcon className="h-5 w-5" />
            ) : (
              <ShieldExclamationIcon className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
            <div className="text-sm text-slate-600 dark:text-slate-300">{message}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`px-3 py-2 rounded-md ${tone.button}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
