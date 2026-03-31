import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@localhost:5432/agenoconcern');
const now = Date.now();
await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('0003_challenger-portal', ${now})`;
console.log('Migration marked as applied');
const all = await sql`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at`;
console.log('All migrations:', all.map(r => r.hash).join(', '));
await sql.end();
