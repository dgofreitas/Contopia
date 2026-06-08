import { HiDownload } from 'react-icons/hi';
import { Button, Spinner } from 'flowbite-react';
import useExportData from '../../hooks/useExportData';
import { useErrorStore } from '../../stores/error-store';

export default function ExportDataPanel({ childFirstName }) {
  const exportMutation = useExportData();

  const handleExport = () => {
    exportMutation.mutate(undefined, {
      onSuccess: () => {
        const name = childFirstName || 'criança';
        useErrorStore.getState().addToast(
          'EXPORT_SUCCESS',
          `Download concluído! Todas as histórias da ${name} foram salvas.`,
        );
      },
      onError: () => {
        useErrorStore.getState().addToast(
          'EXPORT_ERROR',
          'Erro ao exportar dados. Tente novamente.',
        );
      },
    });
  };

  return (
    <section aria-labelledby="export-heading">
      <h2 id="export-heading" className="text-xl font-semibold text-slate-800 mb-4">
        Exportar Dados
      </h2>
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <HiDownload className="w-8 h-8 text-slate-400 mb-3" aria-hidden="true" />
        <p className="text-slate-700 font-medium mb-2">
          Baixar Dados da {childFirstName || 'Criança'}
        </p>
        <p className="text-sm text-slate-500 mb-4">
          Exporte todos os livros, progresso de leitura e dados da conta como um arquivo portátil.
        </p>
        <Button
          onClick={handleExport}
          disabled={exportMutation.isPending}
          size="sm"
          aria-label="Baixar todos os dados"
        >
          {exportMutation.isPending ? (
            <div className="flex items-center gap-2">
              <Spinner size="xs" aria-label="Exportando dados" />
              <span>Exportando...</span>
            </div>
          ) : (
            'Baixar Todos os Dados'
          )}
        </Button>
      </div>
    </section>
  );
}