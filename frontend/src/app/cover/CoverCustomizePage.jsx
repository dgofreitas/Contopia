import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCoverStore } from '../../stores/cover-store';
import { COVER_TEMPLATES } from '../../lib/cover-templates';
import { useSaveCoverCustomization } from '../../hooks/useSaveCoverCustomization';
import useBookEditQuery from '../../hooks/useBookEditQuery';
import CoverPreview from './CoverPreview';
import ColorPickerPanel from './ColorPickerPanel';
import PatternPickerPanel from './PatternPickerPanel';
import SpineCustomizeSection from './SpineCustomizeSection';
import StickerPickerPanel from './StickerPickerPanel';
import StickerActions from './StickerActions';
import CustomizeActions from './CustomizeActions';
import '../../styles/cover.css';

export default function CoverCustomizePage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('cover');
  const {
    selectedTemplateId,
    baseColor,
    patternId,
    spineColor,
    spineCustomized,
    stickers,
    coverTitle,
    setSelectedTemplate,
    setBaseColor,
    setPattern,
    setSpineColor,
    setSpineCustomized,
    setCoverTitle,
    setStoreStickers,
    resetStore,
  } = useCoverStore();
  const saveCustomization = useSaveCoverCustomization();
  const { data: book, isLoading, error } = useBookEditQuery(bookId);

  useEffect(() => {
    if (book) {
      if (book.templateId && !selectedTemplateId) {
        setSelectedTemplate(book.templateId);
      }
      if (book.coverColor && !baseColor) {
        setBaseColor(book.coverColor);
      }
      if (book.coverPattern && !patternId) {
        setPattern(book.coverPattern);
      }
      if (book.spineColor && !spineColor) {
        setSpineColor(book.spineColor);
      }
      if (book.spineCustomized && !spineCustomized) {
        setSpineCustomized(book.spineCustomized);
      }
      if (book.coverTitle !== undefined && coverTitle === null) {
        setCoverTitle(book.coverTitle);
      }
      if (book.stickers && book.stickers.length > 0 && stickers.length === 0) {
        const restored = book.stickers.map((s) => ({
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
          svgId: s.svgId,
          x: s.x,
          y: s.y,
          scale: s.scale ?? 1,
        }));
        setStoreStickers(restored);
      }
    }
  }, [book?.templateId, book?.coverColor, book?.coverPattern, book?.spineColor, book?.spineCustomized, book?.coverTitle, book?.stickers?.length]);

  const selectedTemplate = COVER_TEMPLATES.find((tpl) => tpl.id === selectedTemplateId) || null;

  function handleSelectColor(hex) {
    setBaseColor(hex);
  }

  function handleSelectPattern(id) {
    setPattern(id);
  }

  function handleBack() {
    navigate(`/cover/${bookId}`);
  }

  async function handleSave() {
    try {
      await saveCustomization.mutateAsync({
        bookId,
        templateId: selectedTemplateId,
        coverColor: baseColor,
        coverPattern: patternId,
        spineColor,
        spineCustomized,
        coverTitle,
        stickers: stickers.map(({ svgId, x, y, scale }) => ({ svgId, x, y, scale })),
      });
      resetStore();
      navigate('/shelf');
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

      <div className="flex-1 flex flex-col lg:flex-row lg:gap-8 px-4 py-4 max-w-5xl mx-auto w-full">
        <div className="flex-shrink-0 flex justify-center mb-6 lg:mb-0 lg:sticky lg:top-24 lg:self-start">
          <CoverPreview book={book} template={selectedTemplate} />
        </div>

        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <ColorPickerPanel
            selectedColor={baseColor}
            onSelectColor={handleSelectColor}
          />
          <PatternPickerPanel
            selectedPattern={patternId}
            onSelectPattern={handleSelectPattern}
            baseColor={baseColor}
          />
          <SpineCustomizeSection title={book?.title} />
          <StickerPickerPanel />
          <StickerActions />
        </div>
      </div>

      <CustomizeActions
        onBack={handleBack}
        onSave={handleSave}
        isSaving={saveCustomization.isPending}
      />
    </div>
  );
}
