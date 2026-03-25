import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agenoconcern';
const sql = postgres(DATABASE_URL);

console.log('Adding institutional_reporting column to wellbeing_checkins...');

try {
  await sql`
    ALTER TABLE wellbeing_checkins
    ADD COLUMN IF NOT EXISTS institutional_reporting boolean
  `;
  console.log('Column added (or already exists).');

  // Mark the Drizzle migration as applied so drizzle-kit migrate won't try again
  const now = Date.now();
  await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES ('0004_institutional_reporting', ${now})
    ON CONFLICT DO NOTHING
  `;
  console.log('Migration 0004_institutional_reporting marked as applied.');

  const all = await sql`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at`;
  console.log('All applied migrations:', all.map(r => r.hash).join(', '));
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
