export type CircleStatus = "forming" | "active" | "submitted" | "completed" | "dissolved";
export type SocialChannel = "whatsapp" | "slack" | "discord" | "teams" | "signal";

export interface Circle {
  id: string;
  challengeId: string;
  createdBy: string;
  status: CircleStatus;
  socialChannel: SocialChannel | null;
  socialChannelUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CircleMember {
  id: string;
  circleId: string;
  contributorId: string;
  joinedAt: string;
}

export interface CircleNote {
  id: string;
  circleId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteAttachment {
  id: string;
  noteId: string;
  s3Key: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface CircleResolution {
  id: string;
  circleId: string;
  submittedBy: string;
  problemSummary: string;
  recommendations: string;
  evidence: string;
  dissentingViews: string | null;
  implementationNotes: string | null;
  submittedAt: string;
  updatedAt: string;
}

export interface ResolutionRating {
  id: string;
  resolutionId: string;
  raterId: string;
  rating: number;
  feedback: string | null;
  createdAt: string;
}

// ─── Composed response types ─────────────────────────────────────────────────

export interface CircleMemberWithName {
  id: string;
  contributorId: string;
  name: string;
  joinedAt: string;
}

export interface CircleNoteWithAuthorAndAttachments extends CircleNote {
  authorName: string;
  attachments: NoteAttachment[];
}

export interface CircleWorkspaceResponse {
  circle: Circle;
  challenge: {
    id: string;
    title: string;
    brief: string;
    domain: string[];
    skillsNeeded: string[];
    type: "paid" | "free";
    createdBy: string;
  };
  members: CircleMemberWithName[];
}

export interface CircleListItem {
  id: string;
  challengeId: string;
  challengeTitle: string;
  status: CircleStatus;
  memberCount: number;
  createdAt: string;
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateCircleInput {
  challengeId: string;
  memberIds: string[];
}

export interface PostNoteInput {
  body: string;
  attachments?: Array<{
    s3Key: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
  }>;
}

export interface SubmitResolutionInput {
  problemSummary: string;
  recommendations: string;
  evidence: string;
  dissentingViews?: string;
  implementationNotes?: string;
}

export interface RateResolutionInput {
  rating: number;
  feedback?: string;
}

export interface SetSocialChannelInput {
  channel: SocialChannel;
  url: string;
}
