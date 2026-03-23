import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agenoconcern';
const sql = postgres(DATABASE_URL);

console.log('Creating contributor_institutions junction table...');

try {
  // Create the contributor_institutions junction table
  await sql`
    CREATE TABLE IF NOT EXISTS contributor_institutions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
      institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      assigned_by UUID REFERENCES contributors(id) ON DELETE SET NULL,
      CONSTRAINT contributor_institutions_unique UNIQUE (contributor_id, institution_id)
    )
  `;
  console.log('contributor_institutions table created (or already exists)');

  // Create indexes (idempotent)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_ci_contributor_id ON contributor_institutions(contributor_id)
  `;
  console.log('Index idx_ci_contributor_id created (or already exists)');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_ci_institution_id ON contributor_institutions(institution_id)
  `;
  console.log('Index idx_ci_institution_id created (or already exists)');

  // Verify table exists
  const tableCheck = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contributor_institutions'
  `;
  if (tableCheck.length === 0) {
    throw new Error('Table creation verification failed — table not found');
  }
  console.log('Table verified in information_schema');

  // Verify indexes
  const indexCheck = await sql`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'contributor_institutions'
    ORDER BY indexname
  `;
  console.log(`Indexes on contributor_institutions: ${indexCheck.map(r => r.indexname).join(', ')}`);

  // Mark migration in drizzle journal
  const now = Date.now();
  await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES ('0005_contributor-institutions', ${now})
    ON CONFLICT DO NOTHING
  `;
  console.log('Migration marked as applied in drizzle.__drizzle_migrations');

  // Show all migrations
  const allMigrations = await sql`
    SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at
  `;
  console.log('All migrations:', allMigrations.map(r => r.hash).join(', '));

  console.log('\nMigration complete.');
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
} finally {
  await sql.end();
}
