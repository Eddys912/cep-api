import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    // setupFiles: ["./tests/setup.ts"], // Descomenta esto cuando crees el archivo setup.ts
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', 'src/routes.ts', 'src/swagger.json'],
    },
  },
});
