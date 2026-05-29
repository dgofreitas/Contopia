import { useEffect } from 'react';
import useReaderStore from '../stores/reader-store';

/**
 * Hook that detects the system color scheme preference via
 * `prefers-color-scheme` media query and sets the initial theme
 * on first visit ONLY if no persisted theme exists and the user
 * has not manually selected a theme.
 *
 * Once `hasManualThemeSelection` is true, system preference is
 * never used again to override the user's choice.
 */
export default function useSystemColorScheme() {
  useEffect(() => {
    const { theme, hasManualThemeSelection } = useReaderStore.getState();

    // If user already has a persisted preference (theme !== default 'light' or
    // hasManualThemeSelection is true), do not override with system preference
    if (hasManualThemeSelection) return;

    // Check localStorage directly to see if a persisted value exists.
    // If the persist middleware has already rehydrated a non-default theme,
    // respect that. We detect "first visit" by checking if the persisted
    // data exists in localStorage.
    try {
      const stored = localStorage.getItem('contopia-reader-prefs');
      if (stored) {
        const parsed = JSON.parse(stored);
        // If theme was already persisted (even 'light'), we have a previous visit
        if (parsed?.state?.theme !== undefined) return;
      }
    } catch {
      // localStorage unavailable — proceed with system detection
    }

    // First visit — detect system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applySystemPreference = (matches) => {
      const currentState = useReaderStore.getState();
      // Only apply if user hasn't manually chosen
      if (!currentState.hasManualThemeSelection) {
        useReaderStore.getState().setTheme(matches ? 'dark' : 'light');
      }
    };

    // Set initial theme from system preference
    applySystemPreference(mediaQuery.matches);

    // Listen for changes in system preference
    const handleChange = (event) => {
      applySystemPreference(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
}