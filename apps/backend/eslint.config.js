import { config } from '@repo/eslint-config/base';

export default [
  ...config,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Scripts and tests are not turbo task inputs whose cache depends on env vars.
    files: ['scripts/**', 'tests/**'],
    rules: {
      'turbo/no-undeclared-env-vars': 'off',
    },
  },
  {
    ignores: ['node_modules/**', 'coverage/**'],
  },
];
