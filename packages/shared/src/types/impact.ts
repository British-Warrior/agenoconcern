import type { PaymentType, PaymentStatus } from './payments.js';
import type { WellbeingTrajectoryPoint } from './wellbeing.js';

export interface ImpactChallenge {
  id: string;
  title: string;
  domain: string[];
  type: string;
  status: string;
  circleId?: string;
}

export interface ImpactEarning {
  id: string;
  paymentType: PaymentType;
  amountPence: number;
  status: PaymentStatus;
  createdAt: string;
}

export interface ImpactSummary {
  challengesParticipated: ImpactChallenge[];
  totalHours: number;
  paidHours: number;
  unpaidHours: number;
  totalEarningsPence: number;
  earnings: ImpactEarning[];
  wellbeingTrajectory: WellbeingTrajectoryPoint[];
}

export interface ChallengerChallenge {
  id: string;
  title: string;
  status: string;
  resolution?: {
    problemSummary: string;
    recommendations: string;
    submittedAt: string;
  };
  rating?: {
    rating: number;
    feedback: string | null;
    createdAt: string;
  };
}

export interface ChallengerImpact {
  challenges: ChallengerChallenge[];
}
