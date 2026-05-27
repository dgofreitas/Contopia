import { DEFAULT_COVER_PALETTE } from './default-cover-palette';
import { isLightColor } from './spine-colors';

export function getDefaultCoverColor(bookId) {
  if (!bookId) return DEFAULT_COVER_PALETTE[0].hex;
  const idx = bookId.toString().split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % DEFAULT_COVER_PALETTE.length;
  return DEFAULT_COVER_PALETTE[idx].hex;
}

export function getDefaultTextColor(bgHex) {
  if (!bgHex) return '#FFFFFF';
  const entry = DEFAULT_COVER_PALETTE.find((c) => c.hex === bgHex);
  if (entry) return entry.textColor;
  return isLightColor(bgHex) ? '#1A1A1A' : '#FFFFFF';
}

export function deriveDefaultEdgeColor(spineColor) {
  if (!spineColor || typeof spineColor !== 'string' || spineColor.length < 7 || spineColor.startsWith('rgba')) {
    return spineColor;
  }
  const r = Math.max(0, parseInt(spineColor.slice(1, 3), 16) - 50);
  const g = Math.max(0, parseInt(spineColor.slice(3, 5), 16) - 50);
  const b = Math.max(0, parseInt(spineColor.slice(5, 7), 16) - 50);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}