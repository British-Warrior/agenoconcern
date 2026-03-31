import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@localhost:5432/agenoconcern');
const result = await sql`SELECT enum_range(NULL::challenge_type) as values`;
console.log('challenge_type enum values:', result[0].values);
// Also fix duplicate migration entry
const migs = await sql`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`;
console.log('Migrations:', migs.map(r => `${r.id}: ${r.hash}`).join(', '));
await sql.end();
