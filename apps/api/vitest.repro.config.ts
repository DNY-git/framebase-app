import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    hookTimeout: 600000,
    testTimeout: 600000,
    env: {
      MONGOMS_VERSION: '6.0.24',
    },
  },
});
