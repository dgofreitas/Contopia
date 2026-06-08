import { HiBookOpen, HiEye, HiClock } from 'react-icons/hi';

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5 text-slate-400" aria-hidden="true" />
        <p className="text-sm text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export default function ActivitySummaryCards({ booksWritten, booksRead, readingTimeMinutes, childFirstName }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      aria-label={`${childFirstName} activity metrics`}
    >
      <MetricCard
        icon={HiBookOpen}
        label="Livros Escritos"
        value={booksWritten}
      />
      <MetricCard
        icon={HiEye}
        label="Livros Lidos"
        value={booksRead}
      />
      <MetricCard
        icon={HiClock}
        label="Tempo de Leitura"
        value={`${readingTimeMinutes} minutos`}
      />
    </div>
  );
}