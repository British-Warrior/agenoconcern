/**
 * Test data seed script for Circle workflow verification.
 * Creates: 1 CM, 5 contributors with profiles, 1 challenge, 5 interest expressions.
 * Idempotent: skips if test CM already exists.
 *
 * Usage: npx tsx src/db/seed-test-data.ts
 */

import * as argon2 from "argon2";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "./index.js";
import {
  contributors,
  contributorProfiles,
  challenges,
  challengeInterests,
} from "./schema.js";

const TEST_PASSWORD = "testpass123";

const testContributors = [
  {
    name: "Sarah Chen",
    email: "sarah.chen@test.com",
    role: "community_manager" as const,
    skills: ["Project Management", "Stakeholder Engagement", "Strategic Planning"],
    domains: ["Health & Social Care", "Public Sector"],
    summary: "20 years leading community health programmes across the NHS and local government.",
  },
  {
    name: "James Okafor",
    email: "james.okafor@test.com",
    role: "contributor" as const,
    skills: ["Financial Analysis", "Risk Management", "Regulatory Compliance", "Strategic Planning"],
    domains: ["Financial Services", "Public Sector"],
    summary: "Former CFO with 25 years in banking and public finance.",
  },
  {
    name: "Margaret Thompson",
    email: "margaret.thompson@test.com",
    role: "contributor" as const,
    skills: ["Curriculum Design", "Training Delivery", "Mentoring", "Stakeholder Engagement"],
    domains: ["Education & Training", "Third Sector"],
    summary: "Retired headteacher with expertise in adult education and workforce development.",
  },
  {
    name: "David Patel",
    email: "david.patel@test.com",
    role: "contributor" as const,
    skills: ["Software Architecture", "Data Analysis", "Project Management", "Digital Transformation"],
    domains: ["Technology", "Health & Social Care"],
    summary: "Former CTO specialising in digital transformation for public services.",
  },
  {
    name: "Fiona MacLeod",
    email: "fiona.macleod@test.com",
    role: "contributor" as const,
    skills: ["Policy Analysis", "Grant Writing", "Community Engagement", "Impact Assessment"],
    domains: ["Third Sector", "Public Sector"],
    summary: "30 years in the voluntary sector, specialising in community development and funding.",
  },
  {
    name: "Robert Williams",
    email: "robert.williams@test.com",
    role: "contributor" as const,
    skills: ["Marketing Strategy", "Communications", "Stakeholder Engagement", "Brand Development"],
    domains: ["Creative Industries", "Third Sector"],
    summary: "Former marketing director with expertise in cause-related and social enterprise campaigns.",
  },
];

async function seedTestData() {
  console.log("[seed-test] Starting test data seed...");

  const db = getDb();
  const passwordHash = await argon2.hash(TEST_PASSWORD);

  // Check if already seeded
  const [existing] = await db
    .select({ id: contributors.id })
    .from(contributors)
    .where(eq(contributors.email, "sarah.chen@test.com"))
    .limit(1);

  if (existing) {
    console.log("[seed-test] Test data already exists. Skipping.");
    await closeDb();
    return;
  }

  // Create contributors and profiles
  const createdIds: { name: string; id: string; role: string }[] = [];

  for (const tc of testContributors) {
    const [contributor] = await db
      .insert(contributors)
      .values({
        name: tc.name,
        email: tc.email,
        passwordHash,
        authProvider: "email",
        role: tc.role,
        status: "active",
      })
      .returning({ id: contributors.id });

    await db.insert(contributorProfiles).values({
      contributorId: contributor.id,
      skills: tc.skills,
      domainPreferences: tc.domains,
      rolesAndTitles: [tc.summary.split(" ")[1] ?? "Professional"],
      professionalSummary: tc.summary,
      availability: "part_time",
      maxCircles: 3,
      cvParseStatus: "complete",
      commChannel: "email",
      commFrequency: "daily",
    });

    createdIds.push({ name: tc.name, id: contributor.id, role: tc.role });
    console.log(`[seed-test] Created ${tc.role}: ${tc.name} (${contributor.id})`);
  }

  const cmId = createdIds.find((c) => c.role === "community_manager")!.id;
  const contributorIds = createdIds.filter((c) => c.role === "contributor");

  // Create a challenge (created by the CM)
  const [challenge] = await db
    .insert(challenges)
    .values({
      createdBy: cmId,
      title: "Digital Inclusion Strategy for Rural Communities",
      description:
        "A local council needs help developing a digital inclusion strategy for rural communities where broadband access is limited and many older residents lack digital skills. The strategy should cover infrastructure recommendations, digital skills training programmes, and community hub proposals.",
      brief:
        "Develop a comprehensive digital inclusion strategy covering infrastructure, training, and community hubs for underserved rural areas. Deliverable: a 20-page strategy document with costed recommendations and a 12-month implementation roadmap.",
      domain: ["Public Sector", "Technology", "Education & Training"],
      skillsNeeded: [
        "Strategic Planning",
        "Digital Transformation",
        "Community Engagement",
        "Policy Analysis",
        "Training Delivery",
        "Data Analysis",
      ],
      type: "free",
      circleSize: 4,
      status: "open",
    })
    .returning({ id: challenges.id });

  console.log(`[seed-test] Created challenge: ${challenge.id}`);

  // All 5 contributors express interest
  for (const c of contributorIds) {
    await db.insert(challengeInterests).values({
      challengeId: challenge.id,
      contributorId: c.id,
      status: "active",
    });
    console.log(`[seed-test] ${c.name} expressed interest`);
  }

  // Update denormalized interest count
  await db
    .update(challenges)
    .set({ interestCount: contributorIds.length })
    .where(eq(challenges.id, challenge.id));

  console.log("\n[seed-test] === DONE ===");
  console.log(`[seed-test] CM login: sarah.chen@test.com / ${TEST_PASSWORD}`);
  console.log(`[seed-test] Contributor logins: <name>@test.com / ${TEST_PASSWORD}`);
  console.log(`[seed-test] Challenge: "${challenge.id}"`);
  console.log("[seed-test] All 5 contributors have expressed interest in the challenge.");
  console.log("[seed-test] Log in as CM → Challenges → Manage → view team suggestions → Form Circle");

  await closeDb();
}

seedTestData().catch((err) => {
  console.error("[seed-test] Failed:", err);
  process.exit(1);
});
