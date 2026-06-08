// Contopia — PrivacyNeverBadge
// Highlighted badge for "What we NEVER do" items with red/warning visual treatment
// WCAG AA: text-red-800 on bg-red-50, uses strong emphasis
export default function PrivacyNeverBadge({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <ul className="space-y-3" role="list">
      {items.map((item, index) => (
        <li
          key={index}
          className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3"
        >
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold"
            aria-hidden="true"
          >
            ✕
          </span>
          <p className="text-red-800 font-medium text-sm">
            {item}
          </p>
        </li>
      ))}
    </ul>
  );
}