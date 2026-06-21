// Contopia — Test Setup
import '@testing-library/jest-dom';

if (!globalThis.requestIdleCallback) {
  globalThis.requestIdleCallback = (cb) => setTimeout(cb, 1);
}

Object.defineProperty(navigator, 'onLine', { writable: true, value: true });

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    m: actual.motion,
  };
});

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

// Mock IntersectionObserver for Framer Motion animations
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Polyfill scrollIntoView for JSDOM (used by BookshelfGridLayout highlight)
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// Mock IntersectionObserver for Framer Motion (used by BookshelfGrid)
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}

// Mock react-i18next globally — translation key passthrough
// Also expose i18n.language so components like PrivacyPolicyPage don't crash.
const mockI18n = { language: 'pt-BR', changeLanguage: vi.fn() };
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (options && typeof options === 'object') {
        return key.replace(/{{\s*(\w+)\s*}}/g, (_, k) => options[k] ?? '');
      }
      return key;
    },
    i18n: mockI18n,
  }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));
