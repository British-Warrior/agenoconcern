import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@localhost:5432/agenoconcern');

// Extend the challenge_type enum with new values
await sql`ALTER TYPE challenge_type ADD VALUE IF NOT EXISTS 'community'`;
console.log('Added community');
await sql`ALTER TYPE challenge_type ADD VALUE IF NOT EXISTS 'premium'`;
console.log('Added premium');
await sql`ALTER TYPE challenge_type ADD VALUE IF NOT EXISTS 'knowledge_transition'`;
console.log('Added knowledge_transition');

// Verify
const result = await sql`SELECT enum_range(NULL::challenge_type) as values`;
console.log('challenge_type enum values now:', result[0].values);

// Fix duplicate migration entry
const migs = await sql`SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY created_at`;
console.log('Before fix:', migs.map(r => `${r.id}:${r.hash}`).join(', '));

// Find and remove duplicate
const duplicates = migs.filter((m, i) => migs.findIndex(x => x.hash === m.hash) !== i);
for (const dup of duplicates) {
  await sql`DELETE FROM drizzle.__drizzle_migrations WHERE id = ${dup.id}`;
  console.log(`Removed duplicate migration id=${dup.id} hash=${dup.hash}`);
}

const after = await sql`SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY created_at`;
console.log('After fix:', after.map(r => `${r.id}:${r.hash}`).join(', '));

await sql.end();
