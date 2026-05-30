import { useState, useEffect } from 'react';

export function useVisibilityPause() {
  const [isPaused, setIsPaused] = useState(() => document.hidden === true);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  function pause() {
    setIsPaused(true);
  }

  function resume() {
    setIsPaused(false);
  }

  return { isPaused, pause, resume };
}