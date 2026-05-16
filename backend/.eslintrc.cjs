module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.js', '**/*.test.js'],
      rules: {
        'no-import-assign': 'off',
      },
    },
  ],
  ignorePatterns: ['node_modules/', 'coverage/', 'dist/'],
};