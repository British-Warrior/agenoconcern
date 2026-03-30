import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sql = postgres('postgresql://inclusion:inclusion@localhost:5433/agenoconcern');

const migrationSql = readFileSync(join(__dirname, '../drizzle/0005_scheduled_report_delivery.sql'), 'utf8');

// Split on --> statement-breakpoint and run each statement
const statements = migrationSql
  .split('--> statement-breakpoint')
  .map(s => s.trim())
  .filter(s => s.length > 0);

for (const stmt of statements) {
  console.log('Running:', stmt.slice(0, 80) + '...');
  try {
    await sql.unsafe(stmt);
    console.log('  OK');
  } catch (e) {
    if (e.message.includes('already exists') || e.message.includes('duplicate column')) {
      console.log('  Skipped (already exists)');
    } else {
      console.error('  Error:', e.message);
    }
  }
}

// Record migration in drizzle journal
const now = Date.now();
try {
  await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('0005_scheduled_report_delivery', ${now})`;
  console.log('Migration recorded in drizzle.__drizzle_migrations');
} catch (e) {
  if (e.message.includes('duplicate') || e.message.includes('unique')) {
    console.log('Migration already recorded');
  } else {
    console.error('Failed to record migration:', e.message);
  }
}

await sql.end();
console.log('Done');
