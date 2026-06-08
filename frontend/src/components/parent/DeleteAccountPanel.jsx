import { HiExclamation } from 'react-icons/hi';
import { Button, Spinner } from 'flowbite-react';
import useDeleteAccount from '../../hooks/useDeleteAccount';
import { useErrorStore } from '../../stores/error-store';
import { useState } from 'react';

export default function DeleteAccountPanel({ childFirstName, childId, deletionPending }) {
  const [confirmText, setConfirmText] = useState('');
  const { requestDeletion, cancelDeletion } = useDeleteAccount();

  const isExactMatch = confirmText === 'DELETE';

  const handleRequestDeletion = () => {
    requestDeletion.mutate(
      { confirmText: 'DELETE' },
      {
        onSuccess: () => {
          setConfirmText('');
          useErrorStore.getState().addToast(
            'DELETION_REQUESTED',
            'Conta agendada para exclusão em 30 dias. Um e-mail de confirmação foi enviado.',
          );
        },
        onError: () => {
          useErrorStore.getState().addToast(
            'DELETION_ERROR',
            'Erro ao solicitar exclusão. Tente novamente.',
          );
        },
      },
    );
  };

  const handleCancelDeletion = () => {
    cancelDeletion.mutate(
      { childId },
      {
        onSuccess: () => {
          useErrorStore.getState().addToast(
            'DELETION_CANCELLED',
            'Solicitação de exclusão cancelada. A conta está ativa novamente.',
          );
        },
        onError: () => {
          useErrorStore.getState().addToast(
            'DELETION_CANCEL_ERROR',
            'Erro ao cancelar exclusão. Tente novamente.',
          );
        },
      },
    );
  };

  return (
    <section aria-labelledby="delete-heading">
      <h2 id="delete-heading" className="text-xl font-semibold text-slate-800 mb-4">
        Excluir Conta
      </h2>

      {deletionPending ? (
        <div className="bg-red-50 border border-red-300 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <HiExclamation className="w-8 h-8 text-red-500 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-red-800 font-semibold mb-2">
                Conta Agendada para Exclusão
              </p>
              <p className="text-sm text-red-700 mb-4">
                Esta conta está agendada para exclusão permanente dentro de 30 dias.
                Você pode cancelar a solicitação enquanto a exclusão não for concluída.
              </p>
              <Button
                color="light"
                size="sm"
                onClick={handleCancelDeletion}
                disabled={cancelDeletion.isPending}
              >
                {cancelDeletion.isPending ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="xs" aria-label="Cancelando exclusão" />
                    <span>Cancelando...</span>
                  </div>
                ) : (
                  'Cancelar Exclusão'
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <HiExclamation className="w-5 h-5 text-red-500 mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-sm text-red-800">
                <strong>Atenção:</strong> Isso excluirá permanentemente a conta da{' '}
                {childFirstName || 'criança'}, todos os livros, dados de leitura e acesso dos pais.
                Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>

          <p className="text-slate-700 font-medium mb-3">
            Excluir Conta Permanentemente
          </p>

          <div className="mb-4">
            <label htmlFor="delete-confirm-input" className="block text-sm text-slate-600 mb-1">
              Digite <strong>DELETE</strong> para confirmar:
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500"
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>

          <Button
            color="failure"
            size="sm"
            disabled={!isExactMatch || requestDeletion.isPending}
            onClick={handleRequestDeletion}
            aria-label="Excluir conta permanentemente"
          >
            {requestDeletion.isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="xs" aria-label="Solicitando exclusão" />
                <span>Solicitando...</span>
              </div>
            ) : (
              'Excluir Conta Permanentemente'
            )}
          </Button>
        </div>
      )}
    </section>
  );
}