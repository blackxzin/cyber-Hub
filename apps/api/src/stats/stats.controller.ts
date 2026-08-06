import { Controller, Get } from '@nestjs/common';
import { Public } from '../shared/decorators/decorators';
import { prisma } from '@cyberhub/database';
import { config } from '@cyberhub/shared';
import { createLogger } from '@cyberhub/shared';

const log = createLogger('api.stats');

// GET /stats — métricas agregadas pro dashboard (contagens + status IA).
@Public()
@Controller('stats')
export class StatsController {
  @Get()
  async stats(): Promise<StatsPayload> {
    const [cves, news, reports, alerts, logs, criticalCves] = await Promise.all([
      prisma.cve.count(),
      prisma.news.count(),
      prisma.report.count(),
      prisma.alert.count(),
      prisma.auditLog.count(),
      prisma.cve.count({ where: { cvss: { gte: 9 } } }),
    ]);

    const ollama = await this.ollamaUp().catch(() => false);

    return {
      cves,
      criticalCves,
      news,
      reports,
      alerts,
      logs: { audit: logs },
      ia: { provider: config().AI_PROVIDER, online: ollama },
    };
  }

  private async ollamaUp(): Promise<boolean> {
    try {
      const res = await fetch(`${config().HERMES_BASE_URL}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

interface StatsPayload {
  cves: number;
  criticalCves: number;
  news: number;
  reports: number;
  alerts: number;
  logs: { audit: number };
  ia: { provider: string; online: boolean };
}