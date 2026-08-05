import type { RoleName } from '@cyberhub/database';

// Shape populado nos guards no req.user.
export interface AuthedUser {
  id: string;
  email: string;
  role: RoleName;
  apiKey?: true;
}

export interface AuthedRequest {
  user: AuthedUser;
  cookies?: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
  ip?: string;
}
