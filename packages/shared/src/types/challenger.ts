export interface ChallengerOrg {
  id: string;
  name: string;
  contactEmail: string;
  organisationType: string;
  createdAt: string;
}

export interface ChallengerPortalChallenge {
  id: string;
  title: string;
  brief: string;
  domain: string[];
  skillsNeeded: string[];
  type: string;
  status: string;
  deadline: string | null;
  createdAt: string;
  circle?: {
    id: string;
    status: string;
    memberCount: number;
  } | null;
}

export interface ChallengerPortalChallengeDetail extends ChallengerPortalChallenge {
  circle: {
    id: string;
    status: string;
    memberCount: number;
    members: { id: string; name: string }[];
  } | null;
  resolution?: {
    id: string;
    submittedAt: string;
    rating?: {
      rating: number;
      feedback: string | null;
      createdAt: string;
    } | null;
  } | null;
}
