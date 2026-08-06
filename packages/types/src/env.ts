import { z } from 'zod';

// ponytail: add provider-specific env (OPENAI_API_KEY, OPENCLAW_*) when AiModule adds adapters.
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TZ: z.string().default('America/Sao_Paulo'),

  // PostgreSQL
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive(),
  REDIS_PASSWORD: z.string().min(1),

  // API
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGINS: z.string().min(1),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  // Discord Bot / API key
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  CYBERHUB_API_KEY: z.string().min(16).optional(),
  // Webhook Discord p/ AlertsModule (disparo automático de alertas)
  DISCORD_ALERT_WEBHOOK_URL: z.string().url().optional(),
  // Canal genérico WEBHOOK dos alertas (qualquer url que aceite POST JSON)
  ALERT_WEBHOOK_URL: z.string().url().optional(),
  // Canal EMAIL (SMTP) dos alertas — obrigatório só se usar channel EMAIL
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  ALERT_EMAIL_TO: z.string().email().optional(),

  // n8n
  N8N_BASIC_AUTH_USER: z.string().optional(),
  N8N_BASIC_AUTH_PASSWORD: z.string().optional(),
  N8N_HOST: z.string().default('localhost'),
  N8N_PORT: z.coerce.number().int().positive().default(5678),
  N8N_WEBHOOK_URL: z.string().url().default('http://localhost:5678/'),
  N8N_WEBHOOK_SECRET: z.string().optional(),

  // IA (Hermes via Ollama)
  AI_PROVIDER: z.enum(['hermes', 'openclaw', 'openai']).default('hermes'),
  HERMES_BASE_URL: z.string().url().default('http://localhost:11434'),
  HERMES_MODEL: z.string().default('hermes3'),

  // Threat intel (opcionais em dev)
  VIRUSTOTAL_API_KEY: z.string().optional(),
  ABUSEIPDB_API_KEY: z.string().optional(),
  SHODAN_API_KEY: z.string().optional(),

  // Storage de relatórios
  REPORTS_STORAGE_PATH: z.string().default('./data/reports'),
});

export type Env = z.infer<typeof envSchema>;

export type EnvParseResult =
  | { ok: true; env: Env }
  | { ok: false; errors: string[] };

/** Valida process.env contra o schema. Não lança — retorna resultado tipado. */
export function parseEnv(source: Record<string, string | undefined> = process.env): EnvParseResult {
  const result = envSchema.safeParse(source);
  if (result.success) return { ok: true, env: result.data };
  const errors = result.error.issues.map(
    (i) => `env.${i.path.join('.') || '<root>'}: ${i.message}`,
  );
  return { ok: false, errors };
}
