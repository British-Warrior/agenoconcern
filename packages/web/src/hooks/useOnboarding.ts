import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { onboardingApi, type UpdateProfileData, type StartParseParams } from "../api/onboarding.js";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const QUERY_KEYS = {
  parseStatus: (jobId: string) => ["cvParseStatus", jobId] as const,
  profile: ["onboardingProfile"] as const,
} as const;

// ---------------------------------------------------------------------------
// CV upload mutation
// ---------------------------------------------------------------------------

/**
 * Handles the full upload flow:
 * - For image files (JPG/PNG): POST to /upload-image (server OCR path)
 * - For documents (PDF/DOCX/TXT): get presigned URL, PUT to S3, then POST start-parse
 *
 * Returns { jobId } on success.
 */
export function useCvUpload() {
  return useMutation({
    mutationFn: async (file: File): Promise<{ jobId: string }> => {
      const isImage = ["image/jpeg", "image/png"].includes(file.type);

      if (isImage) {
        // Image path: server handles OCR extraction
        const result = await onboardingApi.uploadImage(file);
        return { jobId: result.jobId };
      }

      // Document path: presigned S3 upload then start-parse
      const { uploadUrl, s3Key } = await onboardingApi.getUploadUrl(file.name, file.type);
      await onboardingApi.uploadToS3(uploadUrl, file);
      const { jobId } = await onboardingApi.startParse({ s3Key, mimeType: file.type } satisfies StartParseParams);
      return { jobId };
    },
  });
}

// ---------------------------------------------------------------------------
// Parse status polling
// ---------------------------------------------------------------------------

/**
 * Poll parse job status every 2 seconds.
 * Stops polling when status is "complete" or "failed".
 */
export function useCvParseStatus(jobId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.parseStatus(jobId ?? ""),
    queryFn: () => onboardingApi.getParseStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "complete" || status === "failed") {
        return false;
      }
      return 2000;
    },
    staleTime: 0,
  });
}

// ---------------------------------------------------------------------------
// Profile queries and mutations
// ---------------------------------------------------------------------------

/**
 * Fetch the contributor's onboarding profile.
 */
export function useProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.profile,
    queryFn: () => onboardingApi.getProfile(),
    staleTime: 60 * 1000,
  });
}

/**
 * Update the contributor's profile fields.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileData) => onboardingApi.updateProfile(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(QUERY_KEYS.profile, updatedProfile);
    },
  });
}
