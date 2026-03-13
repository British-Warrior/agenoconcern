export type PaymentType = 'retainer' | 'stipend' | 'sme_subscription';

export type PaymentStatus = 'held' | 'transferred' | 'failed' | 'refunded';

export interface PaymentTransaction {
  id: string;
  contributorId: string;
  challengeId: string | null;
  circleId: string | null;
  paymentType: PaymentType;
  status: PaymentStatus;
  amountPence: number;
  totalAmountPence: number;
  currency: string;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  stripeTransferId: string | null;
  stripeSubscriptionId: string | null;
  stripeEventId: string | null;
  transferredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContributorHours {
  id: string;
  contributorId: string;
  circleId: string;
  hoursLogged: number;
  description: string | null;
  isPaid: boolean;
  loggedAt: string;
  createdAt: string;
}
