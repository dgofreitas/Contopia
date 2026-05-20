// Vitest Configuration for Contopia Backend
import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/app/**/*.js', 'src/common/**/*.js'],
      exclude: ['src/config/**', 'src/main.js', 'src/**/__tests__/**', 'src/__tests__/**'],
    },
    include: [
      'src/__tests__/**/*.test.js',
      'src/app/**/__tests__/**/*.test.js',
      'migrations/__tests__/**/*.test.js',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    root: path.resolve(__dirname),
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
