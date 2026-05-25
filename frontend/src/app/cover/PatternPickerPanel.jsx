import { useTranslation } from 'react-i18next';
import { COVER_PATTERNS } from '../../lib/cover-patterns';
import PatternSwatch from './PatternSwatch';

export default function PatternPickerPanel({ selectedPattern, onSelectPattern, baseColor }) {
  const { t } = useTranslation('cover');

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-700 mb-2">
        {t('cover.customize.patternPickerHeading')}
      </h2>
      <div
        role="group"
        aria-label={t('cover.aria.patternPickerGroup')}
        className="
          flex gap-2 sm:gap-3 p-2
          overflow-x-auto scroll-smooth snap-x snap-mandatory
          sm:grid sm:grid-cols-4 sm:overflow-x-visible sm:snap-none
          lg:grid-cols-6
        "
      >
        {COVER_PATTERNS.map((pattern) => (
          <div
            key={pattern.id}
            className="shrink-0 snap-start sm:shrink"
          >
            <PatternSwatch
              pattern={pattern}
              isSelected={selectedPattern === pattern.id}
              onSelect={onSelectPattern}
              baseColor={baseColor}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
