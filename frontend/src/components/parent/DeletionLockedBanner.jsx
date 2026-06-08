import { HiExclamation } from 'react-icons/hi';

export default function DeletionLockedBanner() {
  return (
    <div
      className="flex items-center gap-3 bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-sm text-red-800 mb-4"
      role="alert"
      aria-live="assertive"
    >
      <HiExclamation className="w-5 h-5 text-red-500 shrink-0" aria-hidden="true" />
      <p>
        Esta conta está agendada para exclusão. Entre em contato com o suporte para cancelar.
      </p>
    </div>
  );
}