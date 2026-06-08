// Contopia — PrivacyComplianceBox
// COPPA/GDPR/LGPD compliance badges with plain-language descriptions
// Uses Flowbite Badge: color="info" for COPPA, color="success" for GDPR/LGPD
// WCAG AA: text-slate-700 on bg-white
import { Badge } from 'flowbite-react';

const BADGE_COLORS = {
  coppa: 'info',
  'gdpr-lgpd': 'success',
};

export default function PrivacyComplianceBox({ compliance }) {
  if (!compliance || compliance.length === 0) return null;

  return (
    <div className="space-y-4">
      {compliance.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 bg-white rounded-lg border border-slate-200 p-4"
        >
          <Badge color={BADGE_COLORS[item.id] || 'info'} size="sm">
            {item.title}
          </Badge>
          <p className="text-sm text-slate-700 leading-relaxed flex-1">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}