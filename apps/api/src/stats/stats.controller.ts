import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../shared/decorators/decorators';
import { prisma } from '@cyberhub/database';
import { config } from '@cyberhub/shared';
import { createLogger } from '@cyberhub/shared';

const log = createLogger('api.stats');
const START = Date.now();

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

  // GET /stats/charts — séries p/ dashboard: CVEs por dia (30d) + por severidade.
  @Get('charts')
  async charts(): Promise<ChartsPayload> {
    const since = new Date(Date.now() - 30 * 86400 * 1000);
    const rows = await prisma.cve.findMany({
      where: { publishedAt: { gte: since } },
      select: { cvss: true, publishedAt: true },
    });
    const byDay: Record<string, number> = {};
    const sev = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      byDay[this.dayKey(d)] = 0;
    }
    for (const r of rows) {
      const k = this.dayKey(r.publishedAt ?? new Date(0));
      if (k in byDay) byDay[k] = (byDay[k] ?? 0) + 1;
      const s = r.cvss;
      if (s == null) sev.unknown++;
      else if (s >= 9) sev.critical++;
      else if (s >= 7) sev.high++;
      else if (s >= 4) sev.medium++;
      else sev.low++;
    }
    return { byDay: Object.entries(byDay).reverse(), bySeverity: sev };
  }

  private dayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // GET /metrics — formato text/plain Prometheus. Métricas de negócio + runtime node.
  @Get('metrics')
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(): Promise<string> {
    const [cves, criticalCves, news, reports, alerts, audit, highCves, medCves, lowCves] = await Promise.all([
      prisma.cve.count(),
      prisma.cve.count({ where: { cvss: { gte: 9 } } }),
      prisma.news.count(),
      prisma.report.count(),
      prisma.alert.count(),
      prisma.auditLog.count(),
      prisma.cve.count({ where: { cvss: { gte: 7, lt: 9 } } }),
      prisma.cve.count({ where: { cvss: { gte: 4, lt: 7 } } }),
      prisma.cve.count({ where: { cvss: { lt: 4 } } }),
    ]);
    const ollama = await this.ollamaUp().catch(() => false);
    const mem = process.memoryUsage();
    const uptime = (Date.now() - START) / 1000;

    const lines = [
      '# HELP cyberhub_cves_total Total de CVEs no banco',
      '# TYPE cyberhub_cves_total gauge',
      `cyberhub_cves_total{severity="critical"} ${criticalCves}`,
      `cyberhub_cves_total{severity="high"} ${highCves}`,
      `cyberhub_cves_total{severity="medium"} ${medCves}`,
      `cyberhub_cves_total{severity="low"} ${lowCves}`,
      `cyberhub_cves_total{severity="all"} ${cves}`,
      '# HELP cyberhub_news_total Total de notícias (CISA KEV)',
      '# TYPE cyberhub_news_total gauge',
      `cyberhub_news_total ${news}`,
      '# HELP cyberhub_reports_total Relatórios gerados',
      '# TYPE cyberhub_reports_total gauge',
      `cyberhub_reports_total ${reports}`,
      '# HELP cyberhub_alerts_total Regras de alerta cadastradas',
      '# TYPE cyberhub_alerts_total gauge',
      `cyberhub_alerts_total ${alerts}`,
      '# HELP cyberhub_audit_logs_total Eventos de auditoria',
      '# TYPE cyberhub_audit_logs_total gauge',
      `cyberhub_audit_logs_total ${audit}`,
      '# HELP cyberhub_ia_up IA (Ollama) respondendo',
      '# TYPE cyberhub_ia_up gauge',
      `cyberhub_ia_up{provider="${config().AI_PROVIDER}"} ${ollama ? 1 : 0}`,
      '# HELP cyberhub_process_uptime_seconds Uptime do processo (API)',
      '# TYPE cyberhub_process_uptime_seconds gauge',
      `cyberhub_process_uptime_seconds ${uptime}`,
      '# HELP process_resident_memory_bytes RSS',
      '# TYPE process_resident_memory_bytes gauge',
      `process_resident_memory_bytes ${mem.rss}`,
      '# HELP nodejs_heap_size_used_bytes Heap usado',
      '# TYPE nodejs_heap_size_used_bytes gauge',
      `nodejs_heap_size_used_bytes ${mem.heapUsed}`,
    ];
    return lines.join('\n') + '\n';
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

interface ChartsPayload {
  byDay: [string, number][];
  bySeverity: { critical: number; high: number; medium: number; low: number; unknown: number };
}