// Contopia — Vite Configuration
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Contopia',
        short_name: 'Contopia',
        description: 'Estante Digital',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#3b82f6',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // App shell: Cache-First (HTML, JS, CSS bundles)
            urlPattern: /^https?:\/\/.*\/(?:index\.html|assets\/.*)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-shell',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Static assets: Stale-While-Revalidate (icons, fonts, images)
            urlPattern: /^https?:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 24 * 60 * 60 }, // 60 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // API calls: Network-First
            urlPattern: /^https?:\/\/.*\/api\/v1\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-data',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }, // 24 hours
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Shelf & API metadata: Stale-While-Revalidate
            urlPattern: /^https?:\/\/.*\/api\/v1\/(?:books|chapters|shelf)(?:\/|$|\?)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'shelf-metadata',
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve('./src'),
      '@shared': path.resolve('./shared'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/__tests__/**/*.test.{js,jsx}', 'src/components/spike/__tests__/**/*.test.{js,jsx}', 'src/lib/**/__tests__/**/*.test.{js,jsx}', 'src/services/__tests__/**/*.{js,jsx}'],
    setupFiles: ['src/__tests__/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
    },
  },
});
