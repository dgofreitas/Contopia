import { useTranslation } from 'react-i18next';
import { ToggleSwitch } from 'flowbite-react';
import { useCoverStore } from '../../stores/cover-store';

export default function SpineToggle() {
  const { t } = useTranslation('cover');
  const spineCustomized = useCoverStore((s) => s.spineCustomized);
  const setSpineCustomized = useCoverStore((s) => s.setSpineCustomized);

  return (
    <ToggleSwitch
      checked={spineCustomized}
      label={t('cover.spine.toggleLabel')}
      onChange={setSpineCustomized}
      aria-checked={spineCustomized}
    />
  );
}
