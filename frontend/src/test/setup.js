import '@testing-library/jest-dom/vitest';

// jsdom não implementa matchMedia, que o Motion consulta para reduced motion
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  });
}
