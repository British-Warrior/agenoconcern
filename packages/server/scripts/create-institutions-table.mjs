import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agenoconcern';
const sql = postgres(DATABASE_URL);

console.log('Creating institutions table...');

try {
  // Create the institutions table
  await sql`
    CREATE TABLE IF NOT EXISTS institutions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      city VARCHAR(100),
      stats_json JSONB DEFAULT '{"contributors": 0, "challenges": 0, "hours": 0}',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log('institutions table created (or already exists)');

  // Verify table exists
  const tableCheck = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'institutions'
  `;
  if (tableCheck.length === 0) {
    throw new Error('Table creation verification failed — table not found');
  }
  console.log('Table verified in information_schema');

  // Seed 2 example institutions for dev testing (idempotent)
  await sql`
    INSERT INTO institutions (name, slug, description, city, stats_json)
    VALUES
      (
        'Brixton Library',
        'brixton-library',
        'Community hub serving the Brixton area with a range of professional development and learning programmes.',
        'London',
        '{"contributors": 12, "challenges": 5, "hours": 340}'
      ),
      (
        'Manchester Central Library',
        'manchester-central',
        'Supporting lifelong learning in Manchester through skills-sharing, mentoring, and community challenges.',
        'Manchester',
        '{"contributors": 8, "challenges": 3, "hours": 180}'
      )
    ON CONFLICT (slug) DO NOTHING
  `;
  console.log('Seed data inserted (idempotent — skipped if already present)');

  // Verify seed data
  const rows = await sql`SELECT name, slug, city, stats_json FROM institutions ORDER BY name`;
  console.log(`institutions table contains ${rows.length} row(s):`);
  for (const row of rows) {
    console.log(`  - ${row.name} (${row.slug}) — ${row.city} — stats: ${JSON.stringify(row.stats_json)}`);
  }

  // Mark migration in drizzle journal
  const now = Date.now();
  await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES ('0004_institutions-table', ${now})
    ON CONFLICT DO NOTHING
  `;
  console.log('Migration marked as applied in drizzle.__drizzle_migrations');

  console.log('\nMigration complete.');
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
} finally {
  await sql.end();
}
