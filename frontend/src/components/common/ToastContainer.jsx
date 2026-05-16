import { AnimatePresence } from 'framer-motion';
import { useErrorStore } from '../../stores/error-store';
import ErrorToast from './ErrorToast';

export default function ToastContainer() {
  const toasts = useErrorStore((s) => s.toasts);
  const removeToast = useErrorStore((s) => s.removeToast);

  return (
    <div
      aria-live="assertive"
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 md:right-4 md:left-auto md:w-96 md:top-4
                 max-md:left-4 max-md:right-4 max-md:w-auto max-md:top-4"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ErrorToast
            key={toast.id}
            id={toast.id}
            code={toast.code}
            message={toast.message}
            onDismiss={removeToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}