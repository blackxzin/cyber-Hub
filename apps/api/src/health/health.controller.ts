import { Controller, Get } from '@nestjs/common';
import { Public } from '../shared/decorators/decorators';
import { PrismaService } from '../database/prisma.service';
import { config } from '@cyberhub/shared';
import Redis from 'ioredis';
import { createLogger } from '@cyberhub/shared';

const log = createLogger('api.health');

// Healthcheck agregado: DB + Redis + n8n + Ollama.
// Nunca vaza secrets — só booleans. n8n/Ollama são opcionais em dev.
@Controller('health')
export class HealthController {
  private readonly redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    const cfg = config();
    this.redis = new Redis({
      host: cfg.REDIS_HOST,
      port: cfg.REDIS_PORT,
      password: cfg.REDIS_PASSWORD,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  @Public()
  @Get()
  async check(): Promise<{ status: string; db: boolean; redis: boolean; n8n: boolean; ollama: boolean }> {
    const [db, redis, n8n, ollama] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.ping(),
      this.httpOk(config().N8N_WEBHOOK_URL),
      this.httpOk(`${config().HERMES_BASE_URL}/api/tags`, 2000),
    ]);

    const result = {
      db: db.status === 'fulfilled',
      redis: redis.status === 'fulfilled',
      n8n: n8n.status === 'fulfilled',
      ollama: ollama.status === 'fulfilled',
    };
    const ok = Object.values(result).every(Boolean);
    const status = ok ? 'ok' : 'degraded';
    if (!ok) log.warn(result, 'health degradado');
    return { status, ...result };
  }

  private async httpOk(url: string, timeoutMs = 2000): Promise<boolean> {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ac.signal, method: 'GET' });
      return res.ok || res.status === 401; // 401 = está no ar, só exige auth
    } catch {
      return false;
    } finally {
      clearTimeout(t);
    }
  }
}
