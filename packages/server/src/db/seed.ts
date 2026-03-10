/**
 * Database seed script.
 * Creates the initial admin account for Kirk Harper.
 * Idempotent: skips if admin account already exists.
 *
 * Usage: pnpm db:seed  (or: npx tsx src/db/seed.ts)
 */

import * as argon2 from "argon2";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "./index.js";
import { contributors } from "./schema.js";

async function seed() {
  console.log("[seed] Starting database seed...");

  const db = getDb();

  const adminEmail =
    process.env.SEED_ADMIN_EMAIL || "kirk@agenoconcern.org";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "changeme123";

  // Check if admin already exists
  const [existing] = await db
    .select({ id: contributors.id })
    .from(contributors)
    .where(eq(contributors.email, adminEmail))
    .limit(1);

  if (existing) {
    console.log(`[seed] Admin account (${adminEmail}) already exists. Skipping.`);
    await closeDb();
    return;
  }

  const passwordHash = await argon2.hash(adminPassword);

  const [admin] = await db
    .insert(contributors)
    .values({
      name: "Kirk Harper",
      email: adminEmail,
      passwordHash,
      authProvider: "email",
      role: "admin",
      status: "active",
    })
    .returning({ id: contributors.id, email: contributors.email });

  console.log(`[seed] Admin account created: ${admin.email} (${admin.id})`);

  if (adminPassword === "changeme123") {
    console.log(
      "[seed] WARNING: Using default password. Set SEED_ADMIN_PASSWORD in production.",
    );
  }

  await closeDb();
  console.log("[seed] Done.");
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
