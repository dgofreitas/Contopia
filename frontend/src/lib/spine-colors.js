export const SPINE_PALETTE = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Sky blue
  '#78C6A9', // Sage green
  '#FFEAA7', // Yellow
  '#9333EA', // Plum
  '#98D8C8', // Mint
  '#A78BFA', // Lavender
  '#FB923C', // Tangerine
  '#1E90FF', // Ocean blue
  '#1E1B4B', // Midnight
  '#22C55E', // Forest
];

export function isLightColor(hex) {
  // Calculate perceived brightness to determine text color
  // Returns true if background is light (use dark text), false if dark (use white text)
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Weighted brightness formula (perceptual)
  // Threshold 0.595 ensures #FF6B6B (0.593) is dark, #45B7D1 (0.596) is light
  const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return brightness > 0.595;
}

export function getTextColor(spineColor) {
  if (!spineColor) return '#FFFFFF';
  return isLightColor(spineColor) ? '#1A1A1A' : '#FFFFFF';
}

export function spineColorFromId(id) {
  if (!id) return SPINE_PALETTE[0];
  const idx = id.toString().split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % SPINE_PALETTE.length;
  return SPINE_PALETTE[idx];
}

export const getSpineColorFromId = spineColorFromId;
