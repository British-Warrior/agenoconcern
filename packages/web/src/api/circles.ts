import { apiClient } from "./client.js";
import type {
  Circle,
  CircleListItem,
  CircleWorkspaceResponse,
  CircleNoteWithAuthorAndAttachments,
  CircleResolution,
  ResolutionRating,
  CreateCircleInput,
  PostNoteInput,
  SubmitResolutionInput,
  RateResolutionInput,
  SetSocialChannelInput,
} from "@indomitable-unity/shared";

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface CircleNotesResponse {
  notes: CircleNoteWithAuthorAndAttachments[];
  nextCursor: string | null;
}

export interface AttachmentUploadUrlResponse {
  uploadUrl: string;
  s3Key: string;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
}

// ─── Circle CRUD ──────────────────────────────────────────────────────────────

export function createCircle(data: CreateCircleInput): Promise<Circle> {
  return apiClient<Circle>("/api/circles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMyCircles(): Promise<CircleListItem[]> {
  const res = await apiClient<{ circles: CircleListItem[] }>("/api/circles");
  return res.circles;
}

export function getCircleWorkspace(circleId: string): Promise<CircleWorkspaceResponse> {
  return apiClient<CircleWorkspaceResponse>(`/api/circles/${circleId}`);
}

export function addMember(circleId: string, contributorId: string): Promise<void> {
  return apiClient<void>(`/api/circles/${circleId}/members`, {
    method: "POST",
    body: JSON.stringify({ contributorId }),
  });
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export function getNotes(
  circleId: string,
  cursor?: string,
): Promise<CircleNotesResponse> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiClient<CircleNotesResponse>(`/api/circles/${circleId}/notes${qs}`);
}

export function postNote(
  circleId: string,
  data: PostNoteInput,
): Promise<CircleNoteWithAuthorAndAttachments> {
  return apiClient<CircleNoteWithAuthorAndAttachments>(
    `/api/circles/${circleId}/notes`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function getAttachmentUrl(
  circleId: string,
  data: { fileName: string; mimeType: string; fileSizeBytes: number },
): Promise<AttachmentUploadUrlResponse> {
  return apiClient<AttachmentUploadUrlResponse>(
    `/api/circles/${circleId}/notes/attachment-url`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export function getDownloadUrl(
  circleId: string,
  noteId: string,
  attachmentId: string,
): Promise<DownloadUrlResponse> {
  return apiClient<DownloadUrlResponse>(
    `/api/circles/${circleId}/notes/${noteId}/download/${attachmentId}`,
  );
}

// ─── Social channel ───────────────────────────────────────────────────────────

export function setSocialChannel(
  circleId: string,
  data: SetSocialChannelInput,
): Promise<void> {
  return apiClient<void>(`/api/circles/${circleId}/social`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ─── Resolution ───────────────────────────────────────────────────────────────

export function submitResolution(
  circleId: string,
  data: SubmitResolutionInput,
): Promise<CircleResolution> {
  return apiClient<CircleResolution>(`/api/circles/${circleId}/resolution`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateResolution(
  circleId: string,
  data: SubmitResolutionInput,
): Promise<CircleResolution> {
  return apiClient<CircleResolution>(`/api/circles/${circleId}/resolution`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export interface ResolutionResponse {
  resolution: CircleResolution;
  rating: ResolutionRating | null;
}

export function getResolution(circleId: string): Promise<ResolutionResponse> {
  return apiClient<ResolutionResponse>(`/api/circles/${circleId}/resolution`);
}

export function rateResolution(
  circleId: string,
  data: RateResolutionInput,
): Promise<ResolutionRating> {
  return apiClient<ResolutionRating>(
    `/api/circles/${circleId}/resolution/rating`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}
