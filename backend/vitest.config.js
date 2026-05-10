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
      include: ['app/**/*.js'],
      exclude: ['config/**', 'main.js', '__tests__/**', 'app/**/__tests__/**'],
    },
    include: ['__tests__/**/*.test.js', 'app/**/__tests__/**/*.test.js'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    root: path.resolve(__dirname, 'src'),
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
