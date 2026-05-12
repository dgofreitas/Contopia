// Contopia — i18n Initialization
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ptBRAuth from './locales/pt-BR/auth.json';
import ptBRShelf from './locales/pt-BR/shelf.json';
import ptBREditor from './locales/pt-BR/editor.json';
import ptBRReader from './locales/pt-BR/reader.json';
import enAuth from './locales/en/auth.json';
import enShelf from './locales/en/shelf.json';
import enEditor from './locales/en/editor.json';
import enReader from './locales/en/reader.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'pt-BR',
    debug: import.meta.env.DEV,
    ns: ['auth', 'shelf', 'editor', 'reader'],
    defaultNS: 'auth',
    interpolation: {
      escapeValue: false, // React already escapes output
    },
    resources: {
      'pt-BR': {
        auth: ptBRAuth,
        shelf: ptBRShelf,
        editor: ptBREditor,
        reader: ptBRReader,
      },
      en: {
        auth: enAuth,
        shelf: enShelf,
        editor: enEditor,
        reader: enReader,
      },
    },
  });

export default i18n;