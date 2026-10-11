import { defineConfig } from 'drizzle-kit';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
export default defineConfig({
  dialect: 'postgresql', schema: './shared/schema.ts',
  tablesFilter: ['official_results_sync_runs'],
  dbCredentials: { url: process.env.DATABASE_URL },
});
