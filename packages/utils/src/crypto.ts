import { hash, compare } from 'bcryptjs';

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return compare(plain, hashed);
}

export async function hashApiKey(plain: string): Promise<string> {
  return hash(plain, ROUNDS);
}

// ponytail: upgrade to argon2 when Dockerfile build deps are staged; bcryptjs works everywhere with zero native friction.
