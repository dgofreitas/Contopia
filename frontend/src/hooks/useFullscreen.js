import { useState, useCallback, useEffect, useRef } from 'react';

function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fallbackRef = useRef(false);

  const getFullscreenElement = useCallback(() => {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }, []);

  const enterFullscreen = useCallback(async () => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else {
        document.body.classList.add('reader-fullscreen-fallback');
        fallbackRef.current = true;
        setIsFullscreen(true);
      }
    } catch {
      document.body.classList.add('reader-fullscreen-fallback');
      fallbackRef.current = true;
      setIsFullscreen(true);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (fallbackRef.current) {
        document.body.classList.remove('reader-fullscreen-fallback');
        fallbackRef.current = false;
        setIsFullscreen(false);
        return;
      }
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      }
    } catch {
      document.body.classList.remove('reader-fullscreen-fallback');
      fallbackRef.current = false;
      setIsFullscreen(false);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen || getFullscreenElement()) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen, getFullscreenElement]);

  useEffect(() => {
    const handleChange = () => {
      const fsEl = getFullscreenElement();
      if (!fsEl && !fallbackRef.current) {
        setIsFullscreen(false);
        document.body.classList.remove('reader-fullscreen-fallback');
      } else if (fsEl) {
        setIsFullscreen(true);
        fallbackRef.current = false;
      }
    };

    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, [getFullscreenElement]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('reader-fullscreen-fallback');
    };
  }, []);

  return { isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen };
}

export default useFullscreen;