export interface UserData {
  email: string;
  passwordHash: string;
  authVersion?: number;
  legacyPasswordMigratedAt?: string;
  testsUsed: number;
  testsPurchased: number;
  sharesGiven: number;
  sharesReceived: number;
  shareCredits: number;
  createdAt: string;
  lastTestAt: string | null;
  lastPurchaseAt?: string;
}

export type PublicUserData = Omit<UserData, 'passwordHash' | 'authVersion' | 'legacyPasswordMigratedAt'>;

export interface JWTPayload {
  email: string;
  iat: number;
  exp: number;
  authVersion?: number;
}

export interface AuthResponse {
  token: string;
  user?: PublicUserData;
  error?: string;
}

export interface ReferralLink {
  refId: string;
  fromUser: string;
  toUser?: string;
  createdAt: string;
  claimed: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  referralId?: string;
  usedAnonymousAssessment?: boolean;
}

export interface SignupRequest {
  email: string;
  password: string;
}
