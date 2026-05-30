import { useState, useEffect, useCallback, useRef } from 'react';

export function useVisibilityGuard(onPause, onResume) {
  const debounceRef = useRef(null);

  useEffect(() => {
    function handleChange() {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        if (document.hidden) {
          onPause?.();
        } else {
          onResume?.();
        }
      }, 100);
    }

    document.addEventListener('visibilitychange', handleChange);
    return () => {
      document.removeEventListener('visibilitychange', handleChange);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [onPause, onResume]);
}

export function useIsBackgrounded() {
  const [isBackgrounded, setIsBackgrounded] = useState(
    () => typeof document !== 'undefined' && document.hidden,
  );

  const onPause = useCallback(() => setIsBackgrounded(true), []);
  const onResume = useCallback(() => setIsBackgrounded(false), []);

  useVisibilityGuard(onPause, onResume);

  return isBackgrounded;
}