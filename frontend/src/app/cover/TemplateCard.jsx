import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const TemplateCard = memo(function TemplateCard({ template, isSelected, onSelect, disabled }) {
  const { t } = useTranslation('cover');
  const name = t(template.nameKey);
  const description = t(template.descriptionKey);

  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      disabled={disabled}
      aria-label={`${t('aria.selectTemplate')}: ${name}. ${description}${isSelected ? `. ${t('aria.selected')}` : ''}`}
      aria-pressed={isSelected}
      className={`
        group relative flex flex-col items-center rounded-lg overflow-hidden
        border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
        ${isSelected ? 'ring-2 ring-offset-2 ring-blue-500 scale-105 border-blue-500' : 'border-gray-200 hover:border-gray-400'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div
        className={`cover-template--${template.id} w-full aspect-[3/4] rounded-t-md`}
        aria-hidden="true"
      />
      <div className="w-full px-2 py-1.5 text-center bg-white">
        <span
          className="text-xs font-medium leading-tight block truncate"
          style={{ color: isSelected ? '#2563eb' : '#374151' }}
        >
          {name}
        </span>
      </div>
    </button>
  );
});

export default TemplateCard;