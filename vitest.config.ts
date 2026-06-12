import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // Excluded from the unit run:
    // - tests/e2e: need a running server + browser (npm run test:e2e)
    // - tests/integration, smoke, *.service/controller specs: need a live
    //   database/server (npm run test:integration)
    // - admin-widget-visibility, featured-layout: Playwright specs
    //   (npx playwright test)
    exclude: [
      '**/node_modules/**',
      'tests/e2e/**',
      'tests/integration/**',
      'tests/smoke.test.ts',
      'tests/congress.controller.spec.ts',
      'tests/congress.service.spec.ts',
      'tests/election.service.spec.ts',
      'tests/admin-widget-visibility.spec.ts',
      'tests/featured-layout.spec.ts',
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'coverage/',
        '**/*.d.ts',
        'vite.config.ts',
        'vitest.config.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './client/src'),
      '@shared': resolve(__dirname, './shared'),
      '@assets': resolve(__dirname, './attached_assets')
    }
  }
});