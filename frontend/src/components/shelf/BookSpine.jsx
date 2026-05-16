// Contopia — BookSpine
// Individual book spine rendered as a button with vertical text
import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { sanitizeText } from '../../lib/sanitize';
import { getTextColor, spineColorFromId } from '../../lib/spine-colors';

function BookSpine({ book, onClick }) {
  const { t } = useTranslation('shelf');
  const spineColor = book.spineColor || spineColorFromId(book._id);
  const textColor = getTextColor(spineColor);
  const title = sanitizeText(book.title);

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      aria-label={t('ariaSpineLabel', { title })}
      className="flex flex-col items-center justify-end px-1 pt-2 pb-1 rounded-t-sm cursor-pointer transition-shadow focus:ring-2 focus:ring-amber-300 focus:outline-none min-w-[44px] min-h-[44px] select-none"
      style={{
        backgroundColor: spineColor,
        color: textColor,
        width: `${Math.max(44, Math.min(120, 36 + title.length * 2))}px`,
        height: '140px',
      }}
    >
      <span
        className="text-xs font-bold leading-tight truncate drop-shadow-sm"
        style={{
          writingMode: 'vertical-lr',
          WebkitWritingMode: 'vertical-lr',
          msWritingMode: 'vertical-lr',
          maxHeight: '80%',
        }}
      >
        {title}
      </span>
    </motion.button>
  );
}

export default React.memo(BookSpine);
