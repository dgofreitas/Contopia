import { useTranslation } from 'react-i18next';

export default function CoverAuthorName({ authorName, textColor }) {
  const { t } = useTranslation('cover');
  const displayName = authorName || t('cover.preview.author');

  return (
    <p
      className="text-sm opacity-80 line-clamp-1"
      style={{ color: textColor, fontFamily: "'Nunito', sans-serif" }}
      aria-label={t('cover.stickers.authorNameAriaLabel', { name: displayName })}
    >
      {displayName}
    </p>
  );
}