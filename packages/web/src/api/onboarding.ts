import { apiClient } from "./client.js";
import { API_BASE_URL } from "../lib/constants.js";
import type { ContributorProfile, CvParseStatus } from "@agenoconcern/shared";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface UploadUrlResponse {
  uploadUrl: string;
  s3Key: string;
}

export interface StartParseResponse {
  jobId: string;
}

export interface ParseStatusResponse {
  jobId: string;
  status: CvParseStatus;
  errorMessage?: string | null;
  profile?: Partial<ContributorProfile> | null;
}

export interface StripeConnectResponse {
  url: string;
}

export interface UpdateProfileData {
  name?: string;
  professionalSummary?: string;
  rolesAndTitles?: string[];
  skills?: string[];
  qualifications?: string[];
  sectors?: string[];
  yearsOfExperience?: number;
  affirmationMessage?: string;
}

export interface StartParseParams {
  s3Key?: string;
  mimeType?: string;
  extractedText?: string;
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const onboardingApi = {
  /**
   * Get a presigned S3 PUT URL for direct browser upload of a document CV.
   */
  getUploadUrl(fileName: string, mimeType: string): Promise<UploadUrlResponse> {
    return apiClient<UploadUrlResponse>("/api/onboarding/upload-url", {
      method: "POST",
      body: JSON.stringify({ fileName, mimeType }),
    });
  },

  /**
   * PUT the file directly to the S3 presigned URL.
   * Note: this bypasses apiClient (no JSON, no credentials needed for S3).
   */
  async uploadToS3(uploadUrl: string, file: File): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });
    if (!res.ok) {
      throw new Error(`S3 upload failed with status ${res.status}`);
    }
  },

  /**
   * Upload an image file via the server (OCR extraction path).
   */
  uploadImage(file: File): Promise<StartParseResponse> {
    const formData = new FormData();
    formData.append("file", file);

    // Use raw fetch to avoid apiClient setting Content-Type (browser sets multipart boundary)
    return fetch(`${API_BASE_URL}/api/onboarding/upload-image`, {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Upload failed: ${res.status}` }));
        throw new Error((err as { error: string }).error);
      }
      return res.json() as Promise<StartParseResponse>;
    });
  },

  /**
   * Start a CV parse job.
   */
  startParse(params: StartParseParams): Promise<StartParseResponse> {
    return apiClient<StartParseResponse>("/api/onboarding/start-parse", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  /**
   * Poll parse job status.
   */
  getParseStatus(jobId: string): Promise<ParseStatusResponse> {
    return apiClient<ParseStatusResponse>(`/api/onboarding/parse-status/${jobId}`);
  },

  /**
   * Get the contributor's profile.
   */
  getProfile(): Promise<ContributorProfile> {
    return apiClient<ContributorProfile>("/api/onboarding/profile");
  },

  /**
   * Update the contributor's profile fields.
   */
  updateProfile(data: UpdateProfileData): Promise<ContributorProfile> {
    return apiClient<ContributorProfile>("/api/onboarding/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * Save contributor communication / availability preferences.
   */
  savePreferences(data: Record<string, unknown>): Promise<ContributorProfile> {
    return apiClient<ContributorProfile>("/api/onboarding/preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * Start Stripe Connect onboarding — returns redirect URL.
   */
  startStripeConnect(): Promise<StripeConnectResponse> {
    return apiClient<StripeConnectResponse>("/api/onboarding/stripe/connect", {
      method: "POST",
    });
  },

  /**
   * Skip Stripe Connect (sets status to active).
   */
  skipStripe(): Promise<void> {
    return apiClient<void>("/api/onboarding/stripe/skip", {
      method: "POST",
    });
  },
};
