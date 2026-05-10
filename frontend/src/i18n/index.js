// Contopia — i18n Initialization
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ptBRAuth from './locales/pt-BR/auth.json';
import enAuth from './locales/en/auth.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'pt-BR',
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // React already escapes output
    },
    resources: {
      'pt-BR': {
        translation: { ...ptBRAuth },
      },
      en: {
        translation: { ...enAuth },
      },
    },
  });

export default i18n;