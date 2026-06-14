// playwright.config.js — E2E Infrastructure for STORY-061
// Cross-browser E2E tests for Parent-First Onboarding (EPIC-011)
// https://playwright.dev/docs/api/class-testconfig

import { defineConfig, devices } from '@playwright/test';

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';
const CI = !!process.env.CI;

export default defineConfig({
  // Look for test files in the specs directory (relative to this config file's dir)
  testDir: 'specs',

  // Fail tests if they exceed this threshold
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  // Run tests in files in parallel, but NOT across files
  // This ensures auth state is consistent per file
  fullyParallel: false,

  // Retry on CI only
  retries: CI ? 2 : 0,

  // Reporters — paths relative to config file directory
  reporter: [
    ['html', { outputFolder: 'report' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for all page navigations
    baseURL: TEST_BASE_URL,

    // Collect trace on first retry
    trace: CI ? 'on-first-retry' : 'off',

    // Capture screenshot on failure
    screenshot: CI ? 'only-on-failure' : 'off',
  },

  // Global setup — runs once before all test files
  // Path is relative to this config file's directory (e2e/)
  globalSetup: './fixtures/auth.setup.js',

  // Project definitions for cross-browser testing
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Storage state path is relative to config file directory
        storageState: '.auth/parent.json',
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: '.auth/parent.json',
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: '.auth/parent.json',
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['iPhone SE'],
        storageState: '.auth/parent.json',
      },
    },
  ],
});