import { spineColorFromId } from './spine-colors';
import { COVER_TEMPLATES } from './cover-templates';

export function deriveSpineColor({ coverColor, template, bookId }) {
  if (coverColor) {
    return coverColor;
  }

  if (template) {
    const found = COVER_TEMPLATES.find((t) => t.id === template);
    if (found && found.background && found.background.colors && found.background.colors.length > 0) {
      return found.background.colors[0];
    }
  }

  if (bookId) {
    return spineColorFromId(bookId);
  }

  return null;
}
