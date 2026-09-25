module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: 'detect' } },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react/jsx-runtime', 'plugin:react-hooks/recommended'],
  rules: { 'react/prop-types': 'off' },
  overrides: [{ files: ['**/*.test.jsx', 'src/test/**', 'src/__tests__/**'], env: { node: true }, globals: { vi: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly' } }],
};
