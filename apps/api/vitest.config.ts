import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    env: {
      // mongodb-memory-server: 6.0.24 is the newest mongod that runs on WSL2;
      // 7.0.x segfaults on this host's WSL2 kernel.
      MONGOMS_VERSION: '6.0.24',
    },
  },
});
