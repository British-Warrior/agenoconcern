import { Router, type Request, type Response } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { contributorProfiles, cvParseJobs, contributors } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { generateUploadUrl, getObjectBuffer } from "../services/s3.service.js";
import { extractText, ocrImage } from "../services/cv.service.js";
import { parseCvText } from "../services/llm.service.js";
import {
  createConnectAccount,
  createAccountLink,
  getAccountStatus,
} from "../services/stripe.service.js";
import { getEnv } from "../config/env.js";
import { updateProfileSchema, preferencesSchema } from "@indomitable-unity/shared";

const router = Router();

// Multer: memory storage for image OCR (max 10 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported image type: ${file.mimetype}`));
    }
  },
});

// ---------------------------------------------------------------------------
// Helper: ensure contributor profile row exists (upsert-once)
// ---------------------------------------------------------------------------
async function ensureProfile(contributorId: string) {
  const db = getDb();
  const existing = await db
    .select()
    .from(contributorProfiles)
    .where(eq(contributorProfiles.contributorId, contributorId))
    .limit(1);

  if (existing.length === 0) {
    const [created] = await db
      .insert(contributorProfiles)
      .values({ contributorId })
      .returning();
    return created;
  }
  return existing[0];
}

// ---------------------------------------------------------------------------
// POST /api/onboarding/upload-url
// Generate a presigned S3 PUT URL for direct browser upload.
// ---------------------------------------------------------------------------
router.post(
  "/upload-url",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const { fileName, mimeType } = req.body as { fileName?: string; mimeType?: string };

    if (!fileName || !mimeType) {
      res.status(400).json({ error: "fileName and mimeType are required" });
      return;
    }

    const allowedMimeTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];
    if (!allowedMimeTypes.includes(mimeType)) {
      res.status(400).json({ error: `Unsupported file type: ${mimeType}` });
      return;
    }

    try {
      const { uploadUrl, s3Key } = await generateUploadUrl(
        req.contributor!.id,
        fileName,
        mimeType,
      );
      res.json({ uploadUrl, s3Key });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate upload URL";
      if (message.includes("not configured")) {
        res.status(501).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/onboarding/upload-image
// Accept an image file, run OCR, return extracted text.
// ---------------------------------------------------------------------------
router.post(
  "/upload-image",
  authMiddleware,
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    try {
      const text = await ocrImage(req.file.buffer);
      res.json({ text });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "OCR failed";
      res.status(500).json({ error: message });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/onboarding/start-parse
// Kick off async CV parsing from an uploaded S3 key.
// ---------------------------------------------------------------------------
router.post(
  "/start-parse",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const { s3Key, mimeType } = req.body as { s3Key?: string; mimeType?: string };

    if (!s3Key || !mimeType) {
      res.status(400).json({ error: "s3Key and mimeType are required" });
      return;
    }

    const db = getDb();
    const contributorId = req.contributor!.id;

    // Create job record
    const [job] = await db
      .insert(cvParseJobs)
      .values({ contributorId, s3Key, mimeType, status: "pending" })
      .returning();

    // Update profile to reference this CV
    await ensureProfile(contributorId);
    await db
      .update(contributorProfiles)
      .set({ cvS3Key: s3Key, cvParseStatus: "pending", updatedAt: new Date() })
      .where(eq(contributorProfiles.contributorId, contributorId));

    // Async processing (fire-and-forget)
    void (async () => {
      try {
        // Mark as processing
        await db
          .update(cvParseJobs)
          .set({ status: "processing", startedAt: new Date() })
          .where(eq(cvParseJobs.id, job.id));
        await db
          .update(contributorProfiles)
          .set({ cvParseStatus: "processing", updatedAt: new Date() })
          .where(eq(contributorProfiles.contributorId, contributorId));

        // Download and extract
        const buffer = await getObjectBuffer(s3Key);
        const rawText = await extractText(buffer, mimeType);

        // Store rawText for debugging
        await db
          .update(cvParseJobs)
          .set({ rawText })
          .where(eq(cvParseJobs.id, job.id));

        // LLM parse
        const parsed = await parseCvText(rawText);

        // Update profile with parsed data
        await db
          .update(contributorProfiles)
          .set({
            cvParseStatus: "complete",
            rolesAndTitles: parsed.rolesAndTitles,
            skills: parsed.skills,
            qualifications: parsed.qualifications,
            sectors: parsed.sectors,
            yearsOfExperience: parsed.yearsOfExperience,
            professionalSummary: parsed.professionalSummary,
            affirmationMessage: parsed.affirmationMessage,
            updatedAt: new Date(),
          })
          .where(eq(contributorProfiles.contributorId, contributorId));

        await db
          .update(cvParseJobs)
          .set({ status: "complete", completedAt: new Date() })
          .where(eq(cvParseJobs.id, job.id));
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Parse failed";
        await db
          .update(cvParseJobs)
          .set({ status: "failed", errorMessage, completedAt: new Date() })
          .where(eq(cvParseJobs.id, job.id));
        await db
          .update(contributorProfiles)
          .set({ cvParseStatus: "failed", updatedAt: new Date() })
          .where(eq(contributorProfiles.contributorId, contributorId));
      }
    })();

    res.status(202).json({ jobId: job.id, status: "pending" });
  },
);

// ---------------------------------------------------------------------------
// GET /api/onboarding/parse-status/:jobId
// Poll parse job status.
// ---------------------------------------------------------------------------
router.get(
  "/parse-status/:jobId",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const jobId = req.params["jobId"] as string;
    const db = getDb();

    const [job] = await db
      .select()
      .from(cvParseJobs)
      .where(eq(cvParseJobs.id, jobId))
      .limit(1);

    if (!job) {
      res.status(404).json({ error: "Parse job not found" });
      return;
    }

    // Ensure requester owns this job
    if (job.contributorId !== req.contributor!.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    res.json({
      jobId: job.id,
      status: job.status,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  },
);

// ---------------------------------------------------------------------------
// GET /api/onboarding/profile
// Fetch the current contributor's profile.
// ---------------------------------------------------------------------------
router.get(
  "/profile",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const profile = await ensureProfile(req.contributor!.id);
    res.json(profile);
  },
);

// ---------------------------------------------------------------------------
// PUT /api/onboarding/profile
// Update editable profile fields (post-CV parse corrections).
// ---------------------------------------------------------------------------
router.put(
  "/profile",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const result = updateProfileSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }

    const db = getDb();
    await ensureProfile(req.contributor!.id);

    const [updated] = await db
      .update(contributorProfiles)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(contributorProfiles.contributorId, req.contributor!.id))
      .returning();

    res.json(updated);
  },
);

// ---------------------------------------------------------------------------
// PUT /api/onboarding/preferences
// Save preferences and transition contributor status to "active".
// ---------------------------------------------------------------------------
router.put(
  "/preferences",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const result = preferencesSchema.safeParse(req.body);
    if (!result.success) {
      const flat = result.error.flatten();
      const fieldErrors = Object.entries(flat.fieldErrors)
        .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
        .join("; ");
      res.status(400).json({ error: fieldErrors || flat.formErrors.join("; ") || "Validation failed" });
      return;
    }

    const db = getDb();
    await ensureProfile(req.contributor!.id);

    const [updatedProfile] = await db
      .update(contributorProfiles)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(contributorProfiles.contributorId, req.contributor!.id))
      .returning();

    // Transition contributor status to active
    await db
      .update(contributors)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(contributors.id, req.contributor!.id));

    res.json(updatedProfile);
  },
);

// ---------------------------------------------------------------------------
// POST /api/onboarding/stripe/connect
// Create a Stripe Connect Express account and return an onboarding link.
// ---------------------------------------------------------------------------
router.post(
  "/stripe/connect",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const contributorId = req.contributor!.id;
    const env = getEnv();

    try {
      // Fetch contributor email
      const [contributor] = await db
        .select({ email: contributors.email })
        .from(contributors)
        .where(eq(contributors.id, contributorId))
        .limit(1);

      // Check if already has a Stripe account
      const profile = await ensureProfile(contributorId);
      let stripeAccountId = profile.stripeAccountId;

      if (!stripeAccountId) {
        stripeAccountId = await createConnectAccount(
          contributorId,
          contributor?.email ?? undefined,
        );

        await db
          .update(contributorProfiles)
          .set({ stripeAccountId, stripeStatus: "pending", updatedAt: new Date() })
          .where(eq(contributorProfiles.contributorId, contributorId));
      }

      const refreshUrl = `${env.CLIENT_URL}/onboarding/stripe/refresh`;
      const returnUrl = `${env.CLIENT_URL}/onboarding/stripe/return`;

      const onboardingUrl = await createAccountLink(stripeAccountId, refreshUrl, returnUrl);

      res.json({ onboardingUrl, stripeAccountId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Stripe Connect failed";
      if (message.includes("not configured")) {
        res.status(501).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/onboarding/stripe/return
// Called after Stripe onboarding redirect. Updates account status.
// ---------------------------------------------------------------------------
router.get(
  "/stripe/return",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const contributorId = req.contributor!.id;

    const [profile] = await db
      .select()
      .from(contributorProfiles)
      .where(eq(contributorProfiles.contributorId, contributorId))
      .limit(1);

    if (!profile?.stripeAccountId) {
      res.status(400).json({ error: "No Stripe account found for this contributor" });
      return;
    }

    try {
      const status = await getAccountStatus(profile.stripeAccountId);

      if (status.detailsSubmitted) {
        await db
          .update(contributorProfiles)
          .set({ stripeStatus: "complete", updatedAt: new Date() })
          .where(eq(contributorProfiles.contributorId, contributorId));
      }

      res.json({ status: status.detailsSubmitted ? "complete" : "pending", ...status });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to retrieve Stripe status";
      res.status(500).json({ error: message });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/onboarding/stripe/skip
// Skip Stripe Connect; transition contributor to "active".
// ---------------------------------------------------------------------------
router.post(
  "/stripe/skip",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const db = getDb();
    const contributorId = req.contributor!.id;

    await db
      .update(contributors)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(contributors.id, contributorId));

    res.json({ message: "Stripe Connect skipped. Contributor status set to active." });
  },
);

export { router as onboardingRoutes };
