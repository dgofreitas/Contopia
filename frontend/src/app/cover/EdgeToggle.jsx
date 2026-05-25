import { useTranslation } from 'react-i18next';
import { ToggleSwitch } from 'flowbite-react';
import { useCoverStore } from '../../stores/cover-store';

export default function EdgeToggle() {
  const { t } = useTranslation('cover');
  const edgeCustomized = useCoverStore((s) => s.edgeCustomized);
  const setEdgeCustomized = useCoverStore((s) => s.setEdgeCustomized);

  return (
    <ToggleSwitch
      checked={edgeCustomized}
      label={t('cover.edge.toggleLabel')}
      onChange={setEdgeCustomized}
      aria-checked={edgeCustomized}
    />
  );
}