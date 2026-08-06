import { Injectable } from '@nestjs/common';
import { prisma } from '@cyberhub/database';
import { parseCvss } from '@cyberhub/utils';
import { AlertDispatcher } from '../alerts/alert-dispatcher';

// Ingest vindo do n8n (webhook HMAC). Recebe itens já buscados pelo workflow
// (NVD/CISA) e faz upsert. Reusa o mapping do sync.ts (para a API não depender
// de rede externa — o cron n8n faz a busca).
// ponytail: quando virar job recorrente, extrair para um serviço compartilhado.
@Injectable()
export class IngestService {
  constructor(private readonly alerts: AlertDispatcher) {}

  async cves(items: IngestCve[], cveIds?: string[]): Promise<number> {
    // Se só vieram cveIds (workflow gera da CISA KEV), busca o detalhe no NVD
    // para ter description/cvss antes de persistir.
    if (cveIds?.length) {
      const fetched = await Promise.all(
        cveIds.map((id) =>
          fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1&cveId=${id}`, {
            headers: { Accept: 'application/json' },
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((b: any) => b?.vulnerabilities?.[0]?.cve as IngestCve | undefined)
            .catch(() => undefined),
        ),
      );
      items = (fetched.filter(Boolean) as IngestCve[]).concat(items);
    }
    let count = 0;
    for (const item of items) {
      const desc =
        item.description?.find((d) => d.lang === 'en')?.value ?? item.description?.[0]?.value ?? '';
      if (!desc) continue;
      const score =
        item.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ??
        item.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore ??
        null;
      await prisma.cve.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          publishedAt: item.published ? new Date(item.published) : null,
          cvss: parseCvss(score),
          description: desc,
          references: {
            create: (item.references ?? []).map((r) => ({ url: r.url, source: r.source ?? null })),
          },
        },
        update: {},
      });
      // Alerta se a regra casa (severidade >= minSeverity). Fire-and-forget.
      const firstRef = item.references?.[0]?.url;
      await this.alerts.evaluate({
        type: 'CVE',
        severity: score != null ? severityOf(score) : 'UNKNOWN',
        target: item.id,
        title: `Novo CVE ${item.id}`,
        ...(firstRef ? { url: firstRef } : {}),
      });
      count++;
    }
    return count;
  }

  async news(items: IngestNews[]): Promise<number> {
    let count = 0;
    for (const n of items) {
      if (!n.url) continue;
      const data = {
        title: n.title,
        url: n.url,
        source: n.source ?? null,
        publishedAt: n.publishedAt ? new Date(n.publishedAt) : null,
        summary: n.summary ?? null,
        ...(n.source ? { sources: { create: [{ name: n.source }] } } : {}),
      };
      await prisma.news.upsert({ where: { url: n.url }, create: data, update: {} });
      count++;
    }
    return count;
  }
}

export interface IngestCve {
  id: string;
  published?: string;
  description?: Array<{ lang: string; value: string }>;
  metrics?: {
    cvssMetricV31?: Array<{ cvssData: { baseScore: number } }>;
    cvssMetricV30?: Array<{ cvssData: { baseScore: number } }>;
  };
  references?: Array<{ url: string; source?: string }>;
}

export interface IngestNews {
  title: string;
  url: string;
  source?: string;
  publishedAt?: string;
  summary?: string;
}

function severityOf(cvss: number): string {
  if (cvss >= 9) return 'CRITICAL';
  if (cvss >= 7) return 'HIGH';
  if (cvss >= 4) return 'MEDIUM';
  return 'LOW';
}