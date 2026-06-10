const PASTEL_PALETTE = [
  'bg-amber-300',
  'bg-teal-300',
  'bg-rose-300',
  'bg-violet-300',
  'bg-sky-300',
  'bg-lime-300',
  'bg-fuchsia-300',
  'bg-orange-300',
];

function hashSeed(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export default function ChildAvatar({ firstName, avatarSeed, size = 40 }) {
  const initial = (firstName || '?').charAt(0).toUpperCase();
  const colorIndex = hashSeed(avatarSeed || firstName || 'default') % PASTEL_PALETTE.length;
  const bgColor = PASTEL_PALETTE[colorIndex];

  const sizeClasses = size <= 32
    ? 'w-8 h-8 text-xs'
    : size <= 40
      ? 'w-10 h-10 text-sm'
      : size <= 56
        ? 'w-14 h-14 text-base'
        : 'w-16 h-16 text-lg';

  return (
    <span
      className={`${bgColor} ${sizeClasses} inline-flex items-center justify-center rounded-full font-bold text-slate-800 select-none shrink-0`}
      role="img"
      aria-label={`${firstName}'s avatar`}
      title={`${firstName}'s avatar`}
    >
      {initial}
    </span>
  );
}