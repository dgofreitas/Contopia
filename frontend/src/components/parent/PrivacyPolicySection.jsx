// Contopia — PrivacyPolicySection
// Reusable section component with icon, title (aria-labelledby), and children
// WCAG AA: text-slate-700 on bg-white (8.7:1 contrast)
export default function PrivacyPolicySection({ icon: Icon, title, children }) {
  const headingId = `privacy-section-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}`;

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-center gap-3 mb-3">
        {Icon && (
          <Icon className="w-6 h-6 text-slate-500 shrink-0" aria-hidden="true" />
        )}
        <h2 id={headingId} className="text-xl font-semibold text-slate-800">
          {title}
        </h2>
      </div>
      <div className="text-slate-700 leading-relaxed">{children}</div>
    </section>
  );
}