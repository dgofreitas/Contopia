import { HiSparkles } from 'react-icons/hi';

export default function ActivityEmptyState({ childFirstName }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="activity-empty-state">
      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <HiSparkles className="w-12 h-12 text-slate-400" aria-hidden="true" />
      </div>
      <p className="text-lg font-medium text-slate-700 mb-2">
        {childFirstName || 'Sua criança'} está apenas começando!
      </p>
      <p className="text-sm text-slate-500">
        Volte em breve.
      </p>
    </div>
  );
}