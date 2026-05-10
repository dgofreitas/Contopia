// Contopia — Test Setup
import '@testing-library/jest-dom';

// Mock window.matchMedia for responsive components (Flowbite, etc.)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock react-i18next globally — translation key passthrough
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, options) => {
    if (options && typeof options === 'object') {
      // For interpolation like t('welcome.title', { name: 'João' })
      // Return the key with interpolated values for assertion
      return key.replace(/{{\s*(\w+)\s*}}/g, (_, k) => options[k] ?? '');
    }
    return key;
  }}),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));