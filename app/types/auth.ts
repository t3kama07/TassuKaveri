export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  provider?: string;
}
