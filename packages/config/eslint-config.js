/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // TypeScript-specific
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'error',

    // General
    'no-console': 'warn',
    'eqeqeq': ['error', 'always'],
    'prefer-const': 'error',
    'no-var': 'error',
  },
  overrides: [
    // React / JSX files
    {
      files: ['*.tsx', '*.jsx'],
      extends: [
        'plugin:react-hooks/recommended',
      ],
      plugins: ['react-hooks'],
      rules: {
        'react-hooks/exhaustive-deps': 'warn',
      },
    },
    // NestJS files — decorators are expected
    {
      files: ['*.controller.ts', '*.module.ts', '*.service.ts', '*.repository.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn', // NestJS decorators sometimes need any
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/', 'build/', 'coverage/'],
};
