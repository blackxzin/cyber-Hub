import { parseEnv, type Env } from '@cyberhub/types';

// Singleton module-level. Assume-se que process.env já está populado
// (pelo entrypoint do app — Nest ConfigModule ou setup.sh). Shared NÃO
// carrega .env; isso é responsabilidade de quem arranca.
let cached: Env | null = null;
let lastError: string[] | null = null;

export function loadConfig(): Env {
  if (cached) return cached;
  const result = parseEnv();
  if (!result.ok) {
    lastError = result.errors;
    throw new Error('Invalid environment configuration:\n' + result.errors.join('\n'));
  }
  cached = result.env;
  return cached;
}

export function config(): Env {
  return loadConfig();
}

export function configErrors(): string[] | null {
  return lastError;
}
