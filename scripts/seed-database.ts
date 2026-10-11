import { seedDatabase } from '../server/seed-data';
import { pool } from '../server/db';

try {
  await seedDatabase();
  console.log('Database seed complete');
} catch (error) {
  console.error('Database seed failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
