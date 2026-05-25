import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCover from './locales/en/cover.json';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['cover'],
  defaultNS: 'cover',
  interpolation: { escapeValue: false },
  resources: { en: { cover: enCover } },
});

export default i18n;