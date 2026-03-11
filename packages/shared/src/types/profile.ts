// Union string literal types
export type Availability = "full_time" | "part_time" | "occasional" | "project_only";
export type CommChannel = "email" | "phone";
export type CommFrequency = "immediate" | "daily" | "weekly";
export type StripeStatus = "not_started" | "pending" | "complete";
export type CvParseStatus = "pending" | "processing" | "complete" | "failed";

// Parsed CV data returned by LLM
export interface ParsedCvData {
  name: string;
  rolesAndTitles: string[];
  skills: string[];
  qualifications: string[];
  sectors: string[];
  yearsOfExperience: number;
  professionalSummary: string;
  affirmationMessage: string;
}

// Contributor profile (matches DB table)
export interface ContributorProfile {
  id: string;
  contributorId: string;
  cvS3Key: string | null;
  cvParseStatus: CvParseStatus | null;
  rolesAndTitles: string[] | null;
  skills: string[] | null;
  qualifications: string[] | null;
  sectors: string[] | null;
  yearsOfExperience: number | null;
  professionalSummary: string | null;
  affirmationMessage: string | null;
  availability: Availability | null;
  maxCircles: number | null;
  domainPreferences: string[] | null;
  domainOther: string | null;
  willingToMentor: boolean | null;
  commChannel: CommChannel | null;
  commFrequency: CommFrequency | null;
  stripeAccountId: string | null;
  stripeStatus: StripeStatus | null;
  createdAt: Date;
  updatedAt: Date;
}

// CV parse job
export interface CvParseJob {
  id: string;
  contributorId: string;
  status: CvParseStatus | null;
  errorMessage: string | null;
  createdAt: Date;
}
