import { HiInformationCircle } from 'react-icons/hi';

export default function PrivacyNoticeBanner({ childFirstName }) {
  return (
    <div
      className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800"
      role="note"
      aria-label="Privacy notice"
    >
      <HiInformationCircle className="w-5 h-5 text-blue-500 shrink-0" aria-hidden="true" />
      <p>
        As histórias da {childFirstName || 'criança'} são privadas. Apenas títulos e tempo de leitura são mostrados aqui.
      </p>
    </div>
  );
}