import globals from 'globals';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        THREE: 'readonly',
      },
    },
    rules: {
      indent: 'off',
      'linebreak-style': ['error', 'unix'],
      quotes: 'off',
      semi: 'off',
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-console': 'warn',
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
    },
    ignores: ['node_modules/', 'public/assets/', 'tests/', 'dist/', 'build/'],
  },
];
