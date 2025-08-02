import globals from 'globals';

export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
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
  },
];
