/**
 * Demo data seed — populates the platform for "art of the possible" visualisation.
 *
 * Creates a realistic East Midlands pilot snapshot:
 * - 2 community managers + 20 contributors with rich profiles
 * - 10 challenges (community, premium, knowledge transition)
 * - Interest expressions with match scores
 * - 6 circles at different lifecycle stages
 * - Circle notes showing real collaboration
 * - Resolutions for completed circles
 * - Wellbeing check-ins with trajectories
 * - Payment transactions
 * - Hours logged
 * - Notifications
 * - Consent records
 *
 * Idempotent: skips if demo CM already exists.
 * Usage: npx tsx src/db/seed-demo.ts
 */

import * as argon2 from "argon2";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "./index.js";
import {
  contributors,
  contributorProfiles,
  challenges,
  challengeInterests,
  circles,
  circleMembers,
  circleNotes,
  circleResolutions,
  resolutionRatings,
  consentRecords,
  wellbeingCheckins,
  paymentTransactions,
  contributorHours,
  notifications,
} from "./schema.js";

const DEMO_PASSWORD = "demo2026!";

// ────────────────────────────────────────────────────────────────
// 1. PEOPLE — realistic East Midlands professionals aged 50-75+
// ────────────────────────────────────────────────────────────────

const communityManagers = [
  {
    name: "Priya Sharma",
    email: "priya.sharma@demo.indomitableunity.org",
    skills: ["Community Development", "Stakeholder Engagement", "Programme Management", "Partnership Building"],
    domains: ["Third Sector", "Public Sector"],
    summary: "15 years managing community programmes across Nottinghamshire. Former Age UK East Midlands regional coordinator. Specialist in cross-sector partnerships between local authorities and voluntary organisations.",
    availability: "full_time" as const,
    yearsOfExperience: 15,
    roles: ["Community Programme Manager", "Regional Coordinator"],
    qualifications: ["MSc Community Development (Nottingham Trent)", "ILM Level 5 Leadership"],
  },
  {
    name: "Tom Birch",
    email: "tom.birch@demo.indomitableunity.org",
    skills: ["Project Management", "Grant Writing", "Impact Measurement", "Volunteer Coordination"],
    domains: ["Third Sector", "Health & Social Care"],
    summary: "20 years in the voluntary sector across Leicester and Leicestershire. Managed £2M+ community programmes. PRINCE2 practitioner with a talent for turning grant applications into funded projects.",
    availability: "full_time" as const,
    yearsOfExperience: 20,
    roles: ["Programme Director", "Grants Manager"],
    qualifications: ["PRINCE2 Practitioner", "PGDip Social Policy (Leicester)"],
  },
];

const demoContributors = [
  {
    name: "Janet Adeyemi",
    email: "janet.adeyemi@demo.indomitableunity.org",
    skills: ["Financial Planning", "Risk Management", "Audit", "Regulatory Compliance", "Board Governance"],
    domains: ["Financial Services", "Public Sector"],
    summary: "Former Head of Internal Audit at Nottingham Building Society. 28 years in financial services. Fellow of the IIA. Left after restructuring at 57 — still sharper than most auditors half her age.",
    availability: "part_time" as const,
    yearsOfExperience: 28,
    roles: ["Head of Internal Audit", "Senior Risk Manager", "Compliance Officer"],
    qualifications: ["FIIA", "ACCA", "MBA (Nottingham Business School)"],
    mentor: true,
  },
  {
    name: "Brian Collier",
    email: "brian.collier@demo.indomitableunity.org",
    skills: ["Civil Engineering", "Project Management", "Health & Safety", "Infrastructure Planning", "Contract Management"],
    domains: ["Construction & Infrastructure", "Public Sector"],
    summary: "40 years in civil engineering. Led the A453 widening programme and Newark bypass improvements. Chartered Engineer, Fellow of ICE. Made redundant at 62 when the consultancy 'restructured' — code for replaced by someone earning half the salary.",
    availability: "part_time" as const,
    yearsOfExperience: 40,
    roles: ["Principal Engineer", "Programme Director", "Technical Director"],
    qualifications: ["CEng FICE", "BSc Civil Engineering (Loughborough)", "NEBOSH Certificate"],
    mentor: true,
  },
  {
    name: "Susan Okonkwo",
    email: "susan.okonkwo@demo.indomitableunity.org",
    skills: ["Curriculum Design", "Teacher Training", "Ofsted Inspection", "SEND", "Safeguarding"],
    domains: ["Education & Training", "Public Sector"],
    summary: "Former headteacher of a Derbyshire secondary school. 32 years in education, 12 as a head. Lead Ofsted inspector. Took early retirement at 58 after burnout but still passionate about education reform.",
    availability: "occasional" as const,
    yearsOfExperience: 32,
    roles: ["Headteacher", "Lead Ofsted Inspector", "Head of Department"],
    qualifications: ["NPQH", "MEd (Sheffield Hallam)", "PGCE"],
    mentor: true,
  },
  {
    name: "Graham Henshaw",
    email: "graham.henshaw@demo.indomitableunity.org",
    skills: ["Software Architecture", "Database Design", "Cloud Migration", "Technical Leadership", "Agile Coaching"],
    domains: ["Technology", "Financial Services"],
    summary: "Former CTO at a Nottingham fintech. 30 years building systems. Led cloud migration of legacy banking platform processing £2B annually. Let go at 56 — apparently too expensive, despite being the only person who understood the architecture.",
    availability: "part_time" as const,
    yearsOfExperience: 30,
    roles: ["CTO", "VP Engineering", "Principal Architect"],
    qualifications: ["MSc Computer Science (Birmingham)", "AWS Solutions Architect", "TOGAF 9"],
    mentor: true,
  },
  {
    name: "Patricia Kowalski",
    email: "patricia.kowalski@demo.indomitableunity.org",
    skills: ["Nursing Leadership", "Clinical Governance", "Patient Safety", "Service Improvement", "Staff Development"],
    domains: ["Health & Social Care", "Public Sector"],
    summary: "38 years NHS. Former Director of Nursing at Nottingham University Hospitals. Led patient safety transformation that reduced hospital-acquired infections by 40%. Retired at 60 — the NHS lost 38 years of institutional knowledge in an afternoon.",
    availability: "part_time" as const,
    yearsOfExperience: 38,
    roles: ["Director of Nursing", "Deputy Chief Nurse", "Ward Sister"],
    qualifications: ["RN", "MSc Healthcare Management (De Montfort)", "Florence Nightingale Leadership Scholar"],
    mentor: true,
  },
  {
    name: "Derek Asante",
    email: "derek.asante@demo.indomitableunity.org",
    skills: ["Marketing Strategy", "Brand Development", "Digital Marketing", "Market Research", "Communications"],
    domains: ["Creative Industries", "Retail & Consumer"],
    summary: "Former Marketing Director at Boots (Nottingham HQ). 25 years building consumer brands. Led the digital transformation of Boots' loyalty programme. Restructured out at 55 — ironic, given he'd restructured the department three times himself.",
    availability: "part_time" as const,
    yearsOfExperience: 25,
    roles: ["Marketing Director", "Head of Brand", "Digital Strategy Lead"],
    qualifications: ["CIM Fellow", "MBA (Cranfield)", "BA Marketing (NTU)"],
  },
  {
    name: "Helen Whitmore",
    email: "helen.whitmore@demo.indomitableunity.org",
    skills: ["HR Strategy", "Employment Law", "Organisational Development", "Change Management", "Mediation"],
    domains: ["Professional Services", "Public Sector"],
    summary: "Former HR Director at Leicester City Council. 27 years in HR across public and private sectors. CIPD Fellow. Specialist in organisational change and employee relations. Left at 56 after the latest council reorganisation.",
    availability: "part_time" as const,
    yearsOfExperience: 27,
    roles: ["HR Director", "Head of People", "Employee Relations Manager"],
    qualifications: ["FCIPD", "MA Employment Studies (Leicester)", "ACAS Mediator"],
    mentor: true,
  },
  {
    name: "Mohammed Hussain",
    email: "mohammed.hussain@demo.indomitableunity.org",
    skills: ["Supply Chain Management", "Procurement", "Lean Manufacturing", "Operations", "Logistics"],
    domains: ["Manufacturing", "Retail & Consumer"],
    summary: "35 years in manufacturing supply chains. Former Operations Director at Toyota Burnaston. Led lean transformation programmes across the East Midlands automotive cluster. Retired at 60 — factory runs on his systems but nobody calls.",
    availability: "occasional" as const,
    yearsOfExperience: 35,
    roles: ["Operations Director", "Supply Chain Director", "Plant Manager"],
    qualifications: ["Lean Six Sigma Master Black Belt", "MCIPS", "BEng Manufacturing (Loughborough)"],
    mentor: true,
  },
  {
    name: "Wendy Blackwell",
    email: "wendy.blackwell@demo.indomitableunity.org",
    skills: ["Fundraising", "Charity Governance", "Impact Reporting", "Volunteer Management", "Community Engagement"],
    domains: ["Third Sector", "Health & Social Care"],
    summary: "30 years in the charity sector. Former CEO of a Nottinghamshire mental health charity. Raised £15M over career. Trustee of three regional charities. Stepped down at 63 — still the person everyone calls when they need a funding strategy.",
    availability: "part_time" as const,
    yearsOfExperience: 30,
    roles: ["CEO", "Director of Fundraising", "Head of Development"],
    qualifications: ["IoF Certificate in Fundraising", "MA Voluntary Sector Management (South Bank)"],
    mentor: true,
  },
  {
    name: "Alan Ng",
    email: "alan.ng@demo.indomitableunity.org",
    skills: ["Architecture", "Urban Planning", "Heritage Conservation", "Building Regulations", "Sustainability"],
    domains: ["Construction & Infrastructure", "Public Sector"],
    summary: "RIBA chartered architect with 33 years of practice. Designed the Nottingham Contemporary gallery extension and several Lace Market conversions. Former chair of East Midlands RIBA. Practice wound down at 61 when partner retired.",
    availability: "part_time" as const,
    yearsOfExperience: 33,
    roles: ["Principal Architect", "Design Director", "RIBA Chapter Chair"],
    qualifications: ["RIBA", "ARB", "MArch (Sheffield)", "BREEAM Assessor"],
  },
  {
    name: "Christine Murray",
    email: "christine.murray@demo.indomitableunity.org",
    skills: ["Social Work", "Safeguarding", "Mental Health", "Multi-agency Working", "Case Management"],
    domains: ["Health & Social Care", "Public Sector"],
    summary: "35 years in social work. Former Assistant Director of Adult Social Care, Derbyshire County Council. Specialist in safeguarding and mental capacity. Took early retirement at 57 — council cut senior posts to save money.",
    availability: "part_time" as const,
    yearsOfExperience: 35,
    roles: ["Assistant Director", "Principal Social Worker", "Team Manager"],
    qualifications: ["CQSW", "MA Social Work (Nottingham)", "Best Interest Assessor"],
    mentor: true,
  },
  {
    name: "Victor Adebayo",
    email: "victor.adebayo@demo.indomitableunity.org",
    skills: ["Data Science", "Statistical Analysis", "Machine Learning", "Research Methods", "Survey Design"],
    domains: ["Technology", "Health & Social Care"],
    summary: "25 years as a research statistician. Former Senior Lecturer at University of Nottingham and NHS data analyst. Published 40+ papers on health inequalities. Contract not renewed at 59 — apparently the university needed more 'early career researchers'.",
    availability: "part_time" as const,
    yearsOfExperience: 25,
    roles: ["Senior Lecturer", "Principal Statistician", "Research Lead"],
    qualifications: ["PhD Statistics (Nottingham)", "CStat", "FHEA"],
  },
  {
    name: "Linda Pearce",
    email: "linda.pearce@demo.indomitableunity.org",
    skills: ["Legal Compliance", "Contract Law", "Data Protection", "Corporate Governance", "Mediation"],
    domains: ["Professional Services", "Public Sector"],
    summary: "30 years as a commercial solicitor. Former partner at a Leicester law firm. Specialist in public sector contracts and GDPR. Pushed out at 58 — the partnership needed to 'make room' for younger equity partners.",
    availability: "occasional" as const,
    yearsOfExperience: 30,
    roles: ["Partner", "Head of Commercial", "Senior Associate"],
    qualifications: ["LLB (Leicester)", "LPC", "CEDR Accredited Mediator", "Practitioner DPO Certificate"],
  },
  {
    name: "Keith Drummond",
    email: "keith.drummond@demo.indomitableunity.org",
    skills: ["Environmental Management", "Sustainability Strategy", "ISO 14001", "Carbon Accounting", "Waste Management"],
    domains: ["Energy & Environment", "Manufacturing"],
    summary: "28 years in environmental management. Former Group Sustainability Director at a Derbyshire manufacturer. Led the company to carbon neutral certification. Made redundant at 56 when sustainability was 'merged into operations'.",
    availability: "part_time" as const,
    yearsOfExperience: 28,
    roles: ["Group Sustainability Director", "Environmental Manager", "HSE Director"],
    qualifications: ["MIEMA", "CEnv", "MSc Environmental Management (Cranfield)", "Lead Auditor ISO 14001"],
  },
  {
    name: "Anita Patel",
    email: "anita.patel@demo.indomitableunity.org",
    skills: ["Pharmacy", "Clinical Trials", "Regulatory Affairs", "Patient Safety", "Quality Assurance"],
    domains: ["Health & Social Care", "Life Sciences"],
    summary: "32 years in pharmaceutical industry. Former VP Regulatory Affairs at a Loughborough pharma company. Led 20+ successful drug submissions to MHRA and EMA. Made redundant at 59 during post-merger 'synergies'.",
    availability: "part_time" as const,
    yearsOfExperience: 32,
    roles: ["VP Regulatory Affairs", "Director of Quality", "Senior Pharmacist"],
    qualifications: ["MRPharmS", "PhD Pharmacology (Nottingham)", "RAC"],
  },
  {
    name: "Philip Mwangi",
    email: "philip.mwangi@demo.indomitableunity.org",
    skills: ["Economic Development", "Regeneration", "Business Support", "Grant Management", "Policy Analysis"],
    domains: ["Public Sector", "Third Sector"],
    summary: "22 years in economic development. Former Head of Regeneration at a Midlands LEP. Led £50M+ regeneration programmes. Specialist in SME support and rural economy. Position eliminated at 54 when LEPs were restructured.",
    availability: "part_time" as const,
    yearsOfExperience: 22,
    roles: ["Head of Regeneration", "Economic Development Manager", "Business Growth Advisor"],
    qualifications: ["MSc Urban Regeneration (Sheffield Hallam)", "IED Diploma"],
  },
  {
    name: "Dorothy Henderson",
    email: "dorothy.henderson@demo.indomitableunity.org",
    skills: ["Library Services", "Digital Literacy", "Community Outreach", "Information Management", "Event Management"],
    domains: ["Public Sector", "Education & Training"],
    summary: "36 years in library services. Former Head of Nottinghamshire Libraries. Transformed 60 branches into community hubs with digital access centres. Forced into early retirement at 59 by council cuts — took the institutional memory of the entire service with her.",
    availability: "occasional" as const,
    yearsOfExperience: 36,
    roles: ["Head of Libraries", "Area Manager", "Community Librarian"],
    qualifications: ["MCLIP", "MA Information Studies (Loughborough)", "PRINCE2 Foundation"],
  },
  {
    name: "Raymond Clarke",
    email: "raymond.clarke@demo.indomitableunity.org",
    skills: ["Policing", "Community Safety", "Safeguarding", "Intelligence Analysis", "Partnership Working"],
    domains: ["Public Sector", "Third Sector"],
    summary: "30 years with Nottinghamshire Police. Retired Chief Superintendent. Led community safety partnerships across Nottingham. Specialist in organised crime prevention and vulnerable adult safeguarding. Retired at 55 — service pension, but decades of expertise going unused.",
    availability: "part_time" as const,
    yearsOfExperience: 30,
    roles: ["Chief Superintendent", "District Commander", "Detective Inspector"],
    qualifications: ["Strategic Command Course", "MSc Criminology (Leicester)", "Counter Terrorism Certificate"],
  },
];

// ────────────────────────────────────────────────────────────────
// 2. CHALLENGES — mix of community, premium, and knowledge transition
// ────────────────────────────────────────────────────────────────

const demoChallenges = [
  {
    title: "Digital Inclusion Strategy for Rushcliffe Libraries",
    description: "Rushcliffe Borough Council is developing a digital inclusion programme for its 8 library branches. Many older residents rely on library computers for essential services (benefits, NHS, banking) but struggle with increasingly complex interfaces. The council needs a strategy that addresses both infrastructure and skills gaps.",
    brief: "Develop a 12-month digital inclusion strategy for 8 library branches covering: current usage audit, infrastructure recommendations, volunteer digital champion programme, partnership opportunities with local businesses, and success metrics. Budget: £80k.",
    domain: ["Public Sector", "Education & Training", "Technology"],
    skillsNeeded: ["Digital Transformation", "Community Engagement", "Training Delivery", "Strategic Planning", "Impact Assessment"],
    type: "free" as const,
    circleSize: 5,
    status: "open" as const,
  },
  {
    title: "NHS Integrated Care Board — Patient Experience Review",
    description: "Nottingham & Nottinghamshire ICB wants to improve patient experience for people aged 50+ navigating the new integrated care system. Patients report confusion about referral pathways, digital exclusion from online booking, and poor communication between services.",
    brief: "Conduct a patient experience review across 3 PCN areas. Deliverables: stakeholder interviews (30+), patient journey maps for 5 common pathways, recommendations report, implementation plan. 4-month timeline.",
    domain: ["Health & Social Care", "Public Sector"],
    skillsNeeded: ["Patient Safety", "Service Improvement", "Stakeholder Engagement", "Data Analysis", "Multi-agency Working"],
    type: "paid" as const,
    circleSize: 4,
    status: "open" as const,
  },
  {
    title: "Heritage Trail App for Lace Market Quarter",
    description: "Nottingham City Council's heritage team wants a self-guided heritage trail app for the Lace Market — the historic centre of Nottingham's lace industry. The trail should bring the area's industrial history to life for tourists and school groups.",
    brief: "Design the content, user experience, and technical specification for a heritage trail app covering 15 stops across the Lace Market. Include: historical research, accessibility requirements, AR possibilities, content script, and procurement specification for development. 3-month timeline.",
    domain: ["Creative Industries", "Technology", "Education & Training"],
    skillsNeeded: ["Architecture", "Digital Marketing", "Curriculum Design", "Project Management", "Heritage Conservation"],
    type: "free" as const,
    circleSize: 4,
    status: "open" as const,
  },
  {
    title: "Social Enterprise Financial Model — Community Bakery",
    description: "A group in Sneinton wants to establish a community bakery as a social enterprise, providing employment for adults with learning disabilities. They need a robust financial model and business plan to secure £120k Start Up Loans funding.",
    brief: "Create a 3-year financial model and business plan for a community bakery social enterprise. Cover: revenue projections, cost structure, break-even analysis, social impact metrics, funding application support, and governance structure recommendations.",
    domain: ["Third Sector", "Financial Services"],
    skillsNeeded: ["Financial Planning", "Grant Writing", "Impact Reporting", "Board Governance", "Risk Management"],
    type: "free" as const,
    circleSize: 3,
    status: "closed" as const, // Circle formed
  },
  {
    title: "Derbyshire Schools SEND Review",
    description: "Derbyshire County Council is reviewing SEND provision across its secondary schools following critical Ofsted findings. They need experienced education professionals to audit current provision and recommend improvements.",
    brief: "Audit SEND provision across 12 secondary schools in North Derbyshire. Deliverables: school visit reports, benchmarking against best practice, recommendations for each school, county-wide improvement plan, and training programme design. 6-month engagement.",
    domain: ["Education & Training", "Public Sector"],
    skillsNeeded: ["SEND", "Ofsted Inspection", "Curriculum Design", "Safeguarding", "Teacher Training"],
    type: "paid" as const,
    circleSize: 4,
    status: "closed" as const, // Circle active
  },
  {
    title: "Leicester Market Regeneration — Community Consultation",
    description: "Leicester City Council is planning a £15M regeneration of the historic market area. They want genuine community consultation — not the usual tick-box exercise. The market traders, local residents, and business community all have strong (and conflicting) views.",
    brief: "Design and deliver a community consultation programme for Leicester Market regeneration. Include: stakeholder mapping, consultation methodology, 6 public events, online survey, youth engagement, trader interviews, analysis report, and recommendations. 4-month timeline.",
    domain: ["Public Sector", "Creative Industries"],
    skillsNeeded: ["Community Engagement", "Stakeholder Engagement", "Urban Planning", "Market Research", "Communications"],
    type: "paid" as const,
    circleSize: 5,
    status: "closed" as const, // Circle completed with resolution
  },
  {
    title: "Knowledge Transfer — Pharma Regulatory Compliance",
    description: "A Loughborough pharmaceutical company lost their Head of Regulatory Affairs to retirement. Their replacement is capable but lacks 20 years of institutional knowledge about MHRA submission processes and the company's regulatory history.",
    brief: "12-month knowledge transfer retainer. Monthly sessions covering: MHRA submission processes, product licence maintenance, regulatory change management, relationship with regulatory bodies. Goal: successor independently managing all submissions by month 9.",
    domain: ["Life Sciences", "Professional Services"],
    skillsNeeded: ["Regulatory Affairs", "Quality Assurance", "Clinical Trials", "Patient Safety"],
    type: "paid" as const,
    circleSize: 1,
    status: "closed" as const, // Knowledge transition — ongoing
  },
  {
    title: "Carbon Net Zero Roadmap — East Midlands SME Cluster",
    description: "The East Midlands Chamber of Commerce wants to help 50 manufacturing SMEs develop carbon net zero roadmaps. Most have no idea where to start. They need practical, affordable guidance — not consultancy-speak that costs more than the carbon savings.",
    brief: "Develop a carbon net zero toolkit for manufacturing SMEs. Include: self-assessment tool, sector benchmarks, quick-win guide, supply chain guidance, funding/grant directory, and template roadmap. Pilot with 10 companies. 5-month timeline.",
    domain: ["Energy & Environment", "Manufacturing"],
    skillsNeeded: ["Sustainability Strategy", "Carbon Accounting", "ISO 14001", "Supply Chain Management", "Environmental Management"],
    type: "free" as const,
    circleSize: 3,
    status: "open" as const,
  },
  {
    title: "Community Safety Partnership — County Lines Response",
    description: "Nottinghamshire's Community Safety Partnership needs to improve its response to county lines drug exploitation affecting young people and vulnerable adults in Mansfield and Ashfield. Current multi-agency working has gaps.",
    brief: "Review current multi-agency county lines response across Mansfield and Ashfield. Map service gaps, interview 20+ practitioners, develop improved referral pathways, create practitioner guidance, and design a training programme. 3-month timeline. Sensitive: DBS required.",
    domain: ["Public Sector", "Health & Social Care"],
    skillsNeeded: ["Community Safety", "Safeguarding", "Intelligence Analysis", "Multi-agency Working", "Partnership Working"],
    type: "paid" as const,
    circleSize: 3,
    status: "open" as const,
  },
  {
    title: "Women's Institute Digital Transformation — Derbyshire Federation",
    description: "Derbyshire WI Federation (180 local WIs, 4,500 members) wants to modernise its operations while keeping its character. Their systems are paper-based, communications rely on phone trees, and younger retirees expect digital access.",
    brief: "Develop a digital transformation plan for Derbyshire WI Federation. Cover: member survey, needs analysis, platform evaluation (not build), training programme for branch officers, implementation roadmap, cost-benefit analysis. Preserve the WI culture — digital should serve the community, not replace it.",
    domain: ["Third Sector", "Technology"],
    skillsNeeded: ["Digital Transformation", "Community Engagement", "Training Delivery", "Information Management", "Change Management"],
    type: "free" as const,
    circleSize: 4,
    status: "open" as const,
  },
];

// ────────────────────────────────────────────────────────────────
// HELPER — relative dates
// ────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ────────────────────────────────────────────────────────────────
// MAIN SEED
// ────────────────────────────────────────────────────────────────

async function seedDemo() {
  console.log("[seed-demo] Starting demo data seed...\n");

  const db = getDb();
  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  // Idempotent check
  const [existing] = await db
    .select({ id: contributors.id })
    .from(contributors)
    .where(eq(contributors.email, "priya.sharma@demo.indomitableunity.org"))
    .limit(1);

  if (existing) {
    console.log("[seed-demo] Demo data already exists. Skipping.");
    await closeDb();
    return;
  }

  // ── Create Community Managers ──
  const cmIds: string[] = [];
  for (const cm of communityManagers) {
    const [row] = await db
      .insert(contributors)
      .values({
        name: cm.name,
        email: cm.email,
        passwordHash,
        authProvider: "email",
        role: "community_manager",
        status: "active",
        createdAt: daysAgo(90),
      })
      .returning({ id: contributors.id });

    await db.insert(contributorProfiles).values({
      contributorId: row.id,
      skills: cm.skills,
      domainPreferences: cm.domains,
      rolesAndTitles: cm.roles,
      qualifications: cm.qualifications,
      professionalSummary: cm.summary,
      yearsOfExperience: cm.yearsOfExperience,
      availability: cm.availability,
      maxCircles: 10,
      cvParseStatus: "complete",
      commChannel: "both",
      commFrequency: "immediate",
      stripeStatus: "complete",
      stripeAccountId: `acct_demo_cm_${cmIds.length}`,
    });

    cmIds.push(row.id);
    console.log(`[seed-demo] CM: ${cm.name}`);
  }

  // ── Create Contributors ──
  const contribIds: { id: string; name: string; skills: string[]; domains: string[] }[] = [];
  for (const c of demoContributors) {
    const [row] = await db
      .insert(contributors)
      .values({
        name: c.name,
        email: c.email,
        passwordHash,
        authProvider: "email",
        role: "contributor",
        status: "active",
        createdAt: daysAgo(Math.floor(Math.random() * 60) + 30), // joined 30-90 days ago
      })
      .returning({ id: contributors.id });

    await db.insert(contributorProfiles).values({
      contributorId: row.id,
      skills: c.skills,
      domainPreferences: c.domains,
      rolesAndTitles: c.roles,
      qualifications: c.qualifications,
      professionalSummary: c.summary,
      yearsOfExperience: c.yearsOfExperience,
      availability: c.availability,
      maxCircles: c.availability === "occasional" ? 1 : 3,
      cvParseStatus: "complete",
      commChannel: "email",
      commFrequency: "daily",
      willingToMentor: (c as any).mentor ?? false,
      stripeStatus: Math.random() > 0.3 ? "complete" : "not_started",
      stripeAccountId: Math.random() > 0.3 ? `acct_demo_${contribIds.length}` : undefined,
    });

    contribIds.push({ id: row.id, name: c.name, skills: c.skills, domains: c.domains });
    console.log(`[seed-demo] Contributor: ${c.name}`);
  }

  // ── Create Challenges ──
  const challengeIds: { id: string; title: string; status: string; type: string }[] = [];
  for (let i = 0; i < demoChallenges.length; i++) {
    const ch = demoChallenges[i];
    const cmId = cmIds[i % cmIds.length];
    const [row] = await db
      .insert(challenges)
      .values({
        createdBy: cmId,
        title: ch.title,
        description: ch.description,
        brief: ch.brief,
        domain: ch.domain,
        skillsNeeded: ch.skillsNeeded,
        type: ch.type,
        circleSize: ch.circleSize,
        status: ch.status,
        deadline: ch.status === "open" ? new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0] : undefined,
        createdAt: daysAgo(ch.status === "open" ? Math.floor(Math.random() * 14) + 1 : Math.floor(Math.random() * 30) + 30),
      })
      .returning({ id: challenges.id });

    challengeIds.push({ id: row.id, title: ch.title, status: ch.status, type: ch.type });
    console.log(`[seed-demo] Challenge: ${ch.title.substring(0, 50)}...`);
  }

  // ── Express Interest — spread contributors across challenges ──
  console.log("\n[seed-demo] Creating interest expressions...");

  // Simple match scoring: overlap of skills/domains
  function matchScore(contrib: typeof contribIds[0], challengeIdx: number): number {
    const ch = demoChallenges[challengeIdx];
    const skillOverlap = contrib.skills.filter(s => ch.skillsNeeded.includes(s)).length;
    const domainOverlap = contrib.domains.filter(d => ch.domain.includes(d)).length;
    return Math.min(100, (skillOverlap * 15) + (domainOverlap * 20) + Math.floor(Math.random() * 10));
  }

  // Each contributor expresses interest in 2-4 relevant challenges
  const interestMap = new Map<string, string[]>(); // challengeId -> contributorIds
  for (const c of contribIds) {
    const scored = challengeIds.map((ch, idx) => ({ ch, idx, score: matchScore(c, idx) }));
    scored.sort((a, b) => b.score - a.score);
    const topN = scored.slice(0, 2 + Math.floor(Math.random() * 3));
    for (const { ch, idx, score } of topN) {
      await db.insert(challengeInterests).values({
        challengeId: ch.id,
        contributorId: c.id,
        status: "active",
        matchScore: score,
        note: score > 50 ? `Strong match — ${c.skills.slice(0, 2).join(", ")} directly relevant.` : undefined,
        createdAt: daysAgo(Math.floor(Math.random() * 14) + 1),
      });
      if (!interestMap.has(ch.id)) interestMap.set(ch.id, []);
      interestMap.get(ch.id)!.push(c.id);
    }
  }

  // Update interest counts
  for (const [chId, ids] of interestMap) {
    await db.update(challenges).set({ interestCount: ids.length }).where(eq(challenges.id, chId));
  }

  // ── Create Circles ──
  console.log("\n[seed-demo] Creating circles...");

  // Helper to find contributor by name
  const byName = (name: string) => contribIds.find(c => c.name === name)!;

  // Circle 1: Community Bakery (submitted — resolution done)
  const bakeryChallenge = challengeIds[3]; // Social Enterprise Financial Model
  const [bakeryCircle] = await db.insert(circles).values({
    challengeId: bakeryChallenge.id,
    createdBy: cmIds[0],
    status: "submitted",
    socialChannel: "whatsapp",
    socialChannelUrl: "https://chat.whatsapp.com/demo-bakery-circle",
    createdAt: daysAgo(45),
  }).returning({ id: circles.id });

  const bakeryMembers = [byName("Janet Adeyemi"), byName("Wendy Blackwell"), byName("Philip Mwangi")];
  for (const m of bakeryMembers) {
    await db.insert(circleMembers).values({ circleId: bakeryCircle.id, contributorId: m.id, joinedAt: daysAgo(44) });
  }

  // Bakery circle notes
  const bakeryNotes = [
    { author: "Janet Adeyemi", body: "I've drafted the 3-year P&L model. Revenue assumptions: Year 1 £85k (café + wholesale), Year 2 £140k, Year 3 £180k. Labour costs assume 6 supported employees at Living Wage plus 2 supervisors. Margins are tight in Y1 but the social impact metrics should strengthen the funding case. Sharing spreadsheet in our WhatsApp.", daysAgo: 40 },
    { author: "Wendy Blackwell", body: "Just spoke with the Start Up Loans team — they're keen but want to see a clear path to sustainability by month 18. Janet, can we model a scenario where wholesale revenue kicks in at month 6 rather than month 9? Also, I've drafted the social impact framework using the SROI methodology — 3 key outcomes: employment, skills development, community cohesion.", daysAgo: 35 },
    { author: "Philip Mwangi", body: "Good news — I've identified 3 grant funds that could supplement the Start Up Loans: Power to Change (up to £50k for community businesses), Plunkett Foundation (specialist community shop/café support), and the local VCSE infrastructure fund. Each has different timelines so we should stagger applications. I've also benchmarked against Handmade Bakery in Yorkshire — similar model, £200k revenue by year 3.", daysAgo: 30 },
    { author: "Janet Adeyemi", body: "Updated the model with the accelerated wholesale scenario. Break-even moves from month 14 to month 11 — much stronger. I've also added a sensitivity analysis showing what happens if the supported employment grant (Access to Work) isn't approved. Worst case: still viable but break-even extends to month 16. Wendy, the SROI framework looks excellent — can you quantify the mental health benefit using the HACT social value calculator?", daysAgo: 25 },
    { author: "Wendy Blackwell", body: "HACT valuations done. Per supported employee: £13,500/year social value (employment) + £8,200 (improved wellbeing) + £3,100 (reduced social isolation). For 6 employees: £148,800 annual social value against £120k investment = SROI ratio of 1.24:1 in year 1, rising to 2.1:1 by year 3. That's a strong case.", daysAgo: 20 },
    { author: "Philip Mwangi", body: "Business plan first draft is complete. 42 pages covering: executive summary, market analysis (Sneinton demographic data, competitor mapping, footfall analysis), operations plan, financial model (3 scenarios), social impact framework, governance structure (CIC recommended), risk register, and implementation timeline. Ready for circle review before submission.", daysAgo: 15 },
  ];
  for (const n of bakeryNotes) {
    await db.insert(circleNotes).values({
      circleId: bakeryCircle.id,
      authorId: byName(n.author).id,
      body: n.body,
      createdAt: daysAgo(n.daysAgo),
    });
  }

  // Bakery resolution
  const [bakeryResolution] = await db.insert(circleResolutions).values({
    circleId: bakeryCircle.id,
    submittedBy: byName("Janet Adeyemi").id,
    problemSummary: "A community group in Sneinton seeks to establish a bakery as a social enterprise providing supported employment for adults with learning disabilities. They need a robust financial model and business plan to secure £120k Start Up Loans funding and supplementary grants.",
    recommendations: "1. Establish as a Community Interest Company (CIC) with asset lock. 2. Pursue Start Up Loans (£120k) as primary funding, supplemented by Power to Change (£50k) and Access to Work grants. 3. Operate hybrid model: café (60% revenue) + wholesale to local businesses (40%). 4. Employ 6 supported workers at Living Wage with 2 experienced supervisors. 5. Achieve break-even by month 11 with accelerated wholesale strategy. 6. Target £180k revenue and 2.1:1 SROI ratio by year 3.",
    evidence: "Financial model with 3 scenarios (base, optimistic, pessimistic). HACT social value calculations: £148,800 annual social value for 6 supported employees. Benchmarking against Handmade Bakery (Yorkshire) and Better Health Bakery (London) — both achieved sustainability within 18 months. Sneinton demographic analysis shows 12,000 residents within 10-minute walk, 3 competing cafés but no artisan bakery. Start Up Loans preliminary conversation positive.",
    dissentingViews: "Philip raised concern about reliance on Access to Work grants — if not approved, break-even extends to month 16. Mitigated by the pessimistic scenario remaining viable and alternative DWP funding routes identified.",
    implementationNotes: "Immediate next steps: 1. Community group to register CIC (2 weeks). 2. Submit Start Up Loans application with our business plan (1 month). 3. Begin Power to Change application (parallel). 4. Secure premises — 3 options identified in Sneinton Market area. 5. Recruit supervisors during funding approval period.",
    submittedAt: daysAgo(10),
  }).returning({ id: circleResolutions.id });

  await db.insert(resolutionRatings).values({
    resolutionId: bakeryResolution.id,
    raterId: cmIds[0],
    rating: 5,
    feedback: "Exceptional work. The financial model is thorough, the social impact case is compelling, and the implementation plan is actionable. The community group is delighted. Recommending all three contributors for future paid challenges.",
    createdAt: daysAgo(8),
  });

  // Circle 2: SEND Review (active — in progress)
  const sendChallenge = challengeIds[4];
  const [sendCircle] = await db.insert(circles).values({
    challengeId: sendChallenge.id,
    createdBy: cmIds[1],
    status: "active",
    socialChannel: "teams",
    socialChannelUrl: "https://teams.microsoft.com/l/team/demo-send-review",
    createdAt: daysAgo(30),
  }).returning({ id: circles.id });

  const sendMembers = [byName("Susan Okonkwo"), byName("Christine Murray"), byName("Patricia Kowalski"), byName("Victor Adebayo")];
  for (const m of sendMembers) {
    await db.insert(circleMembers).values({ circleId: sendCircle.id, contributorId: m.id, joinedAt: daysAgo(29) });
  }

  const sendNotes = [
    { author: "Susan Okonkwo", body: "School visits 1-4 complete. Pattern emerging: SENCOs are overwhelmed and under-resourced. Average caseload is 85 pupils per SENCO against a recommended 50. EHCPs are taking 30+ weeks vs the statutory 20. Documentation is inconsistent — some schools excellent, others barely compliant.", daysAgo: 20 },
    { author: "Christine Murray", body: "Safeguarding cross-reference done. 3 schools have gaps in their SEND-safeguarding overlap protocols. Specifically: transition planning for vulnerable SEND pupils at Y11 is weak. Two schools couldn't show me a single transition plan that included adult social care input. This is a significant risk.", daysAgo: 15 },
    { author: "Victor Adebayo", body: "Data analysis from schools 1-8 is revealing. Attainment gap between SEND and non-SEND pupils is 2.3 grade levels on average — worse than national. But two schools (schools 3 and 7) are significantly outperforming — gap is only 0.8 levels. Their common factor: dedicated SEND teaching assistants in every lesson, not just 'in-class support'. We should use these as exemplars.", daysAgo: 10 },
    { author: "Patricia Kowalski", body: "Health liaison review complete. Only 2 of 8 schools have a named NHS contact for SEND health needs. School nurses are stretched across 4-6 schools each. Mental health referral pathways are unclear — most staff don't know about the CAMHS schools link programme. Recommending a health-education liaison protocol as a priority.", daysAgo: 5 },
  ];
  for (const n of sendNotes) {
    await db.insert(circleNotes).values({
      circleId: sendCircle.id,
      authorId: byName(n.author).id,
      body: n.body,
      createdAt: daysAgo(n.daysAgo),
    });
  }

  // Circle 3: Leicester Market (completed with resolution)
  const marketChallenge = challengeIds[5];
  const [marketCircle] = await db.insert(circles).values({
    challengeId: marketChallenge.id,
    createdBy: cmIds[0],
    status: "completed",
    socialChannel: "slack",
    socialChannelUrl: "https://indomitableunity.slack.com/channels/leicester-market",
    createdAt: daysAgo(75),
  }).returning({ id: circles.id });

  const marketMembers = [byName("Derek Asante"), byName("Helen Whitmore"), byName("Alan Ng"), byName("Dorothy Henderson"), byName("Raymond Clarke")];
  for (const m of marketMembers) {
    await db.insert(circleMembers).values({ circleId: marketCircle.id, contributorId: m.id, joinedAt: daysAgo(74) });
  }

  const [marketResolution] = await db.insert(circleResolutions).values({
    circleId: marketCircle.id,
    submittedBy: byName("Derek Asante").id,
    problemSummary: "Leicester City Council's £15M market regeneration required genuine community consultation that captured diverse stakeholder views — traders, residents, businesses, and young people — without becoming a tick-box exercise.",
    recommendations: "1. Adopt a 'co-design' approach with a standing Citizens Panel of 30 representatives. 2. Hold 6 themed workshops (not presentations) using visual planning tools. 3. Create a market heritage archive involving local schools. 4. Establish a Trader Advisory Board with formal input rights. 5. Use digital and physical consultation in parallel — QR codes at market stalls linking to quick polls. 6. Publish a 'You Said, We Did' response within 30 days of each event.",
    evidence: "612 survey responses (39% aged 50+, 22% traders, 18% under-25). 6 public workshops with 180 attendees total. 23 in-depth trader interviews. 4 school engagement sessions. Benchmarking against Borough Market, Torvehallerne (Copenhagen), and Pike Place Market regenerations. Sentiment analysis shows 67% support for regeneration with concerns about: affordability (45%), character preservation (38%), and trader displacement (31%).",
    dissentingViews: "Raymond felt the council's timeline was unrealistic for genuine engagement. Alan argued the architectural brief should be co-designed with traders, not presented as fait accompli. Both views documented in the recommendations.",
    implementationNotes: "Consultation report delivered to Leicester City Council. All 6 workshops completed. Citizens Panel established and first meeting held. Council has committed to publishing design brief for public comment before procurement. Trader Advisory Board charter drafted.",
    submittedAt: daysAgo(20),
  }).returning({ id: circleResolutions.id });

  await db.insert(resolutionRatings).values({
    resolutionId: marketResolution.id,
    raterId: cmIds[0],
    rating: 5,
    feedback: "Outstanding engagement. The council said this was the most thorough community consultation they'd ever commissioned. The Citizens Panel model is being adopted for future regeneration projects across the city. 612 responses exceeded their target of 200.",
    createdAt: daysAgo(18),
  });

  // Circle 4: Knowledge Transfer — Pharma (active, single person)
  const pharmaChallenge = challengeIds[6];
  const [pharmaCircle] = await db.insert(circles).values({
    challengeId: pharmaChallenge.id,
    createdBy: cmIds[1],
    status: "active",
    socialChannel: "teams",
    socialChannelUrl: "https://teams.microsoft.com/l/team/demo-pharma-kt",
    createdAt: daysAgo(60),
  }).returning({ id: circles.id });

  await db.insert(circleMembers).values({
    circleId: pharmaCircle.id,
    contributorId: byName("Anita Patel").id,
    joinedAt: daysAgo(59),
  });

  const pharmaNotes = [
    { author: "Anita Patel", body: "Month 1 complete. Covered: MHRA submission lifecycle, the company's product licence portfolio (12 active licences), and their regulatory filing system. The successor (Dr. James Liu) is competent but has no institutional knowledge of the agency's informal expectations — the stuff you only learn from 20 years of submissions. We mapped the top 5 'unwritten rules' that would have caused rejection if missed.", daysAgo: 50 },
    { author: "Anita Patel", body: "Month 2. Focused on variation submissions — the bread and butter of regulatory maintenance. Walked through 3 live variations together: one Type IA, one Type IB, one Type II. Dr. Liu handled the Type IA independently by end of month. Key gap identified: his GMP inspection preparation knowledge is weak. Adding a session on how to prepare the site for MHRA inspections — this isn't in any textbook.", daysAgo: 20 },
  ];
  for (const n of pharmaNotes) {
    await db.insert(circleNotes).values({
      circleId: pharmaCircle.id,
      authorId: byName(n.author).id,
      body: n.body,
      createdAt: daysAgo(n.daysAgo),
    });
  }

  // ── Wellbeing Check-ins (with trajectories) ──
  console.log("\n[seed-demo] Creating wellbeing check-ins...");

  // Create consent records and check-ins for a subset of contributors
  const wellbeingContributors = [
    {
      name: "Janet Adeyemi",
      checkins: [
        { daysAgo: 80, ucla: [2, 3, 2], wemwbs: [3, 3, 2, 3, 3, 2, 3] }, // Initial — moderate loneliness
        { daysAgo: 24, ucla: [1, 2, 1], wemwbs: [4, 4, 3, 4, 4, 3, 4] }, // Improved after circle work
      ],
    },
    {
      name: "Brian Collier",
      checkins: [
        { daysAgo: 75, ucla: [3, 3, 3], wemwbs: [2, 2, 2, 2, 3, 2, 2] }, // High loneliness, low wellbeing
        { daysAgo: 19, ucla: [2, 2, 2], wemwbs: [3, 3, 3, 3, 3, 3, 3] }, // Gradual improvement
      ],
    },
    {
      name: "Graham Henshaw",
      checkins: [
        { daysAgo: 70, ucla: [2, 2, 2], wemwbs: [3, 3, 3, 3, 3, 3, 3] }, // Moderate
        { daysAgo: 14, ucla: [1, 1, 1], wemwbs: [4, 5, 4, 4, 4, 4, 5] }, // Significant improvement
      ],
    },
    {
      name: "Derek Asante",
      checkins: [
        { daysAgo: 85, ucla: [3, 4, 3], wemwbs: [2, 2, 1, 2, 2, 2, 2] }, // Struggling initially
        { daysAgo: 29, ucla: [2, 2, 2], wemwbs: [3, 3, 3, 3, 4, 3, 3] }, // Much better after market project
      ],
    },
    {
      name: "Dorothy Henderson",
      checkins: [
        { daysAgo: 60, ucla: [2, 2, 1], wemwbs: [3, 4, 3, 3, 4, 3, 4] }, // Already fairly good
        { daysAgo: 4, ucla: [1, 1, 1], wemwbs: [4, 5, 4, 4, 5, 4, 5] }, // Thriving
      ],
    },
    {
      name: "Helen Whitmore",
      checkins: [
        { daysAgo: 65, ucla: [3, 3, 2], wemwbs: [2, 3, 2, 2, 3, 2, 3] }, // Moderate loneliness
        { daysAgo: 9, ucla: [2, 2, 1], wemwbs: [3, 4, 3, 3, 4, 3, 4] }, // Improving
      ],
    },
  ];

  for (const wc of wellbeingContributors) {
    const contrib = byName(wc.name);
    for (const checkin of wc.checkins) {
      const [consent] = await db.insert(consentRecords).values({
        contributorId: contrib.id,
        purpose: "wellbeing_checkin",
        granted: true,
        policyVersion: "1.0",
        grantedAt: daysAgo(checkin.daysAgo),
      }).returning({ id: consentRecords.id });

      const uclaScore = checkin.ucla.reduce((a, b) => a + b, 0);
      const wemwbsScore = checkin.wemwbs.reduce((a, b) => a + b, 0);

      await db.insert(wellbeingCheckins).values({
        contributorId: contrib.id,
        consentRecordId: consent.id,
        uclaItem1: checkin.ucla[0],
        uclaItem2: checkin.ucla[1],
        uclaItem3: checkin.ucla[2],
        uclaScore,
        wemwbsItem1: checkin.wemwbs[0],
        wemwbsItem2: checkin.wemwbs[1],
        wemwbsItem3: checkin.wemwbs[2],
        wemwbsItem4: checkin.wemwbs[3],
        wemwbsItem5: checkin.wemwbs[4],
        wemwbsItem6: checkin.wemwbs[5],
        wemwbsItem7: checkin.wemwbs[6],
        wemwbsScore,
        completedAt: daysAgo(checkin.daysAgo),
        createdAt: daysAgo(checkin.daysAgo),
      });
    }
    console.log(`[seed-demo] Wellbeing: ${wc.name} (${wc.checkins.length} check-ins)`);
  }

  // ── Payment Transactions ──
  console.log("\n[seed-demo] Creating payment transactions...");

  // SEND Review — paid challenge, stipend payments
  for (const m of sendMembers) {
    await db.insert(paymentTransactions).values({
      contributorId: m.id,
      challengeId: sendChallenge.id,
      circleId: sendCircle.id,
      paymentType: "stipend",
      status: "transferred",
      amountPence: 150000, // £1,500 contributor share (75%)
      totalAmountPence: 200000, // £2,000 total
      currency: "gbp",
      stripePaymentIntentId: `pi_demo_send_${m.id.substring(0, 8)}`,
      stripeTransferId: `tr_demo_send_${m.id.substring(0, 8)}`,
      transferredAt: daysAgo(25),
      createdAt: daysAgo(28),
    });
  }

  // Leicester Market — paid challenge, stipend payments
  for (const m of marketMembers) {
    await db.insert(paymentTransactions).values({
      contributorId: m.id,
      challengeId: marketChallenge.id,
      circleId: marketCircle.id,
      paymentType: "stipend",
      status: "transferred",
      amountPence: 225000, // £2,250 contributor share
      totalAmountPence: 300000, // £3,000 total
      currency: "gbp",
      stripePaymentIntentId: `pi_demo_market_${m.id.substring(0, 8)}`,
      stripeTransferId: `tr_demo_market_${m.id.substring(0, 8)}`,
      transferredAt: daysAgo(15),
      createdAt: daysAgo(20),
    });
  }

  // Pharma knowledge transfer — retainer payments (monthly)
  for (let month = 0; month < 2; month++) {
    await db.insert(paymentTransactions).values({
      contributorId: byName("Anita Patel").id,
      challengeId: pharmaChallenge.id,
      circleId: pharmaCircle.id,
      paymentType: "retainer",
      status: "transferred",
      amountPence: 187500, // £1,875 contributor share (75% of £2,500)
      totalAmountPence: 250000, // £2,500/month
      currency: "gbp",
      stripePaymentIntentId: `pi_demo_pharma_m${month}`,
      stripeTransferId: `tr_demo_pharma_m${month}`,
      transferredAt: daysAgo(55 - month * 30),
      createdAt: daysAgo(58 - month * 30),
    });
  }

  // ── Hours Logged ──
  console.log("[seed-demo] Creating hours logged...");

  // Bakery circle — community (unpaid)
  for (const m of bakeryMembers) {
    await db.insert(contributorHours).values({
      contributorId: m.id,
      circleId: bakeryCircle.id,
      hoursLogged: Math.floor(Math.random() * 15) + 10,
      description: "Financial modelling, research, and business plan drafting",
      isPaid: false,
      loggedAt: daysAgo(12),
    });
  }

  // SEND circle — paid
  for (const m of sendMembers) {
    await db.insert(contributorHours).values({
      contributorId: m.id,
      circleId: sendCircle.id,
      hoursLogged: Math.floor(Math.random() * 20) + 15,
      description: "School visits, data analysis, and interim reporting",
      isPaid: true,
      loggedAt: daysAgo(8),
    });
  }

  // Market circle — paid
  for (const m of marketMembers) {
    await db.insert(contributorHours).values({
      contributorId: m.id,
      circleId: marketCircle.id,
      hoursLogged: Math.floor(Math.random() * 25) + 20,
      description: "Community consultation events, stakeholder interviews, report writing",
      isPaid: true,
      loggedAt: daysAgo(22),
    });
  }

  // Pharma — paid retainer
  await db.insert(contributorHours).values({
    contributorId: byName("Anita Patel").id,
    circleId: pharmaCircle.id,
    hoursLogged: 32,
    description: "Knowledge transfer sessions — MHRA processes and variation submissions",
    isPaid: true,
    loggedAt: daysAgo(5),
  });

  // ── Notifications ──
  console.log("[seed-demo] Creating notifications...");

  const notifData = [
    { name: "Janet Adeyemi", type: "resolution_feedback" as const, title: "Resolution rated — Community Bakery", body: "Priya rated your resolution 5/5: \"Exceptional work. The financial model is thorough...\"", url: "/circles", daysAgo: 8 },
    { name: "Derek Asante", type: "resolution_feedback" as const, title: "Resolution rated — Leicester Market", body: "Priya rated your resolution 5/5: \"Outstanding engagement. The council said this was the most thorough...\"", url: "/circles", daysAgo: 18 },
    { name: "Anita Patel", type: "payment_received" as const, title: "Payment received — £1,875.00", body: "Retainer payment for Pharma Regulatory Compliance knowledge transfer (month 2)", url: "/impact", daysAgo: 25 },
    { name: "Susan Okonkwo", type: "circle_formed" as const, title: "You've been added to a Circle", body: "SEND Review circle is now active. 4 members. Check your Teams channel.", url: "/circles", daysAgo: 29 },
    { name: "Graham Henshaw", type: "challenge_match" as const, title: "New challenge matches your skills", body: "\"Heritage Trail App for Lace Market Quarter\" — 75% match. Digital Transformation, Project Management.", url: "/challenges", daysAgo: 5 },
    { name: "Dorothy Henderson", type: "challenge_match" as const, title: "New challenge matches your skills", body: "\"WI Digital Transformation\" — 85% match. Digital Literacy, Community Outreach, Information Management.", url: "/challenges", daysAgo: 3 },
    { name: "Keith Drummond", type: "challenge_match" as const, title: "New challenge matches your skills", body: "\"Carbon Net Zero Roadmap\" — 90% match. Sustainability Strategy, Carbon Accounting, ISO 14001.", url: "/challenges", daysAgo: 7 },
    { name: "Brian Collier", type: "wellbeing_reminder" as const, title: "Time for your wellbeing check-in", body: "It's been 8 weeks since your last check-in. Takes 3 minutes.", url: "/wellbeing", daysAgo: 1 },
    { name: "Helen Whitmore", type: "circle_activity" as const, title: "New note in SEND Review", body: "Patricia Kowalski posted: \"Health liaison review complete. Only 2 of 8 schools have a named NHS contact...\"", url: "/circles", daysAgo: 5 },
    { name: "Raymond Clarke", type: "payment_received" as const, title: "Payment received — £2,250.00", body: "Stipend payment for Leicester Market Regeneration community consultation", url: "/impact", daysAgo: 15 },
  ];

  for (const n of notifData) {
    const contrib = byName(n.name);
    await db.insert(notifications).values({
      contributorId: contrib.id,
      type: n.type,
      title: n.title,
      body: n.body,
      url: n.url,
      readAt: Math.random() > 0.3 ? daysAgo(n.daysAgo - 1) : undefined,
      createdAt: daysAgo(n.daysAgo),
    });
  }

  // ── Summary ──
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" DEMO DATA SEEDED ✓");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(` Community Managers: ${communityManagers.length}`);
  console.log(` Contributors:       ${demoContributors.length}`);
  console.log(` Challenges:         ${demoChallenges.length}`);
  console.log(` Circles:            4 (1 submitted, 1 active, 1 completed, 1 knowledge transfer)`);
  console.log(` Circle Notes:       ${bakeryNotes.length + sendNotes.length + pharmaNotes.length}`);
  console.log(` Resolutions:        2 (bakery + market)`);
  console.log(` Wellbeing Check-ins: ${wellbeingContributors.reduce((a, c) => a + c.checkins.length, 0)}`);
  console.log(` Payments:           ${sendMembers.length + marketMembers.length + 2} transactions`);
  console.log(` Notifications:      ${notifData.length}`);
  console.log(`\n Login: any-email@demo.indomitableunity.org / ${DEMO_PASSWORD}`);
  console.log(` CM login: priya.sharma@demo.indomitableunity.org / ${DEMO_PASSWORD}`);
  console.log(` CM login: tom.birch@demo.indomitableunity.org / ${DEMO_PASSWORD}\n`);

  await closeDb();
}

seedDemo().catch((err) => {
  console.error("[seed-demo] Failed:", err);
  process.exit(1);
});
