import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCoverStore } from '../../stores/cover-store';
import { COVER_TEMPLATES } from '../../lib/cover-templates';
import { useSaveTemplate } from '../../hooks/useSaveTemplate';
import useBookEditQuery from '../../hooks/useBookEditQuery';
import CoverPreview from './CoverPreview';
import TemplateGallery from './TemplateGallery';
import CoverDesignerActions from './CoverDesignerActions';
import '../../styles/cover.css';

export default function CoverDesignerPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('cover');
  const { selectedTemplateId, setSelectedTemplate } = useCoverStore();
  const saveTemplate = useSaveTemplate();
  const { data: book, isLoading, error } = useBookEditQuery(bookId);

  useEffect(() => {
    if (book?.templateId && !selectedTemplateId) {
      setSelectedTemplate(book.templateId);
    }
  }, [book?.templateId, selectedTemplateId, setSelectedTemplate]);

  const selectedTemplate = COVER_TEMPLATES.find((t) => t.id === selectedTemplateId) || null;

  function handleSelect(id) {
    setSelectedTemplate(id);
  }

  async function handleSkip() {
    try {
      await saveTemplate.mutateAsync({ bookId, templateId: null });
      navigate('/shelf');
    } catch {
      // error handled by mutation
    }
  }

  async function handleCustomize() {
    if (!selectedTemplateId) return;
    try {
      await saveTemplate.mutateAsync({ bookId, templateId: selectedTemplateId });
      navigate(`/cover/${bookId}/customize`);
    } catch {
      // error handled by mutation
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <p className="text-red-600 text-sm">Failed to load book data.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <header className="px-4 pt-6 pb-2 text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('title')}</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
        <CoverPreview book={book} template={selectedTemplate} />
      </div>

      <div className="border-t border-gray-200 bg-gray-50">
        <TemplateGallery
          templates={COVER_TEMPLATES}
          selectedId={selectedTemplateId}
          onSelect={handleSelect}
        />
      </div>

      <CoverDesignerActions
        onSkip={handleSkip}
        onCustomize={handleCustomize}
        hasSelection={!!selectedTemplateId}
      />
    </div>
  );
}