// Contopia — React Entry Point
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, domAnimation } from 'framer-motion';
import { registerSW } from 'virtual:pwa-register';
import { useErrorStore } from './stores/error-store';
import { requestPersistentStorage } from './services/storage-monitor';
import App from './App.jsx';
import './i18n/index.js';
import './index.css';

// Register Service Worker with offline-ready toast notification
const updateSW = registerSW({
  onOfflineReady() {
    useErrorStore.getState().addToast('PWA_OFFLINE_READY', null);
    requestPersistentStorage();
  },
  onNeedRefresh() {
    useErrorStore.getState().addToast('PWA_UPDATE_AVAILABLE', null, {
      label: 'Update',
      onClick: () => updateSW(true),
    });
  },
  onRegisteredSW(swScriptUrl, registration) {
    console.log('[PWA] Service Worker registered:', swScriptUrl);
    if (registration) {
      console.log('[PWA] SW scope:', registration.scope);
    }
  },
  onRegisterError(error) {
    console.error('[PWA] Service Worker registration failed:', error);
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LazyMotion features={domAnimation} strict>
          <App />
        </LazyMotion>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);