import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agenoconcern';
const sql = postgres(DATABASE_URL);

console.log('Creating iThink webhook tables...');

try {
  // Create ithink_signal_type enum (idempotent via DO block — CREATE TYPE IF NOT EXISTS is not valid PostgreSQL)
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ithink_signal_type') THEN
        CREATE TYPE ithink_signal_type AS ENUM ('attention_flag');
      END IF;
    END $$
  `;
  console.log('ithink_signal_type enum created (or already exists)');

  // Create webhook_deliveries table
  await sql`
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      delivery_id VARCHAR(255) NOT NULL UNIQUE,
      source VARCHAR(50) NOT NULL DEFAULT 'ithink',
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ
    )
  `;
  console.log('webhook_deliveries table created (or already exists)');

  // Create ithink_attention_flags table
  await sql`
    CREATE TABLE IF NOT EXISTS ithink_attention_flags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
      institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
      delivery_id VARCHAR(255) NOT NULL UNIQUE,
      signal_type ithink_signal_type NOT NULL,
      cohort_size INTEGER,
      flagged_count INTEGER,
      cleared_by UUID REFERENCES contributors(id) ON DELETE SET NULL,
      cleared_at TIMESTAMPTZ,
      follow_up_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log('ithink_attention_flags table created (or already exists)');

  // Create indexes
  await sql`
    CREATE INDEX IF NOT EXISTS idx_iaf_contributor_id ON ithink_attention_flags(contributor_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_iaf_institution_id ON ithink_attention_flags(institution_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_wd_delivery_id ON webhook_deliveries(delivery_id)
  `;
  console.log('Indexes created (or already exist)');

  // Verify tables exist
  const tableCheck = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('webhook_deliveries', 'ithink_attention_flags')
    ORDER BY table_name
  `;
  if (tableCheck.length !== 2) {
    throw new Error(`Table verification failed — expected 2 tables, found ${tableCheck.length}`);
  }
  console.log('Tables verified:', tableCheck.map(r => r.table_name).join(', '));

  // Mark migration in drizzle journal
  const now = Date.now();
  await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES ('0006_ithink-webhook-tables', ${now})
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
