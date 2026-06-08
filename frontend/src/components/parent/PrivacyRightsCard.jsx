// Contopia — PrivacyRightsCard
// "Your Rights" card with action links (Export, Delete) and support email
// Actions use React Router <Link> for internal paths
// Support email uses <a href="mailto:..."> with rel="noopener noreferrer"
// WCAG AA: text-slate-700 on bg-white
import { Link } from 'react-router-dom';
import { Badge } from 'flowbite-react';

export default function PrivacyRightsCard({ items, actions, supportEmail, questionsLabel }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
      {/* Rights items */}
      <ul className="space-y-2" role="list">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-slate-700">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {/* Action links */}
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-2">
          {actions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}

      {/* Support email */}
      {supportEmail && (
        <div className="pt-3 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-slate-700 text-sm">
            <Badge color="info" size="sm">
              ✉
            </Badge>
            <span>
              {questionsLabel || 'Perguntas?'}{' '}
              <a
                href={`mailto:${supportEmail}`}
                className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
                rel="noopener noreferrer"
              >
                {supportEmail}
              </a>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}