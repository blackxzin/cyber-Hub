import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '@cyberhub/shared';
import { prisma } from '@cyberhub/database';
import { ReportsQueue } from './reports.queue';
import { AiService } from '../ai/ai.service';

// Worker BullMQ: consome a fila 'reports', gera o relatório (HTML + JSON) no
// audit da consulta e marca como ready. PDF real é ponytail (ver reports.service).
@Injectable()
export class ReportsWorker implements OnModuleInit {
  private readonly log = new Logger('reports.worker');
  private worker?: Worker;

  constructor(private readonly queue: ReportsQueue, private readonly ai: AiService) {}

  onModuleInit(): void {
    const cfg = config();
    this.worker = new Worker(
      'reports',
      async (job) => {
        const { reportId, target } = job.data as { reportId: string; target: { ip?: string; domain?: string; cveId?: string } };
        await this.generate(reportId, target);
      },
      {
        connection: {
          host: cfg.REDIS_HOST,
          port: cfg.REDIS_PORT,
          password: cfg.REDIS_PASSWORD,
        },
        concurrency: 2,
      },
    );
    this.worker.on('failed', (job, err) => {
      this.log.error(`Job ${job?.id} falhou: ${(err as Error).message}`);
      void this.markFailed(job?.data?.reportId as string | undefined, (err as Error).message);
    });
  }

  private async generate(reportId: string, target: { ip?: string; domain?: string; cveId?: string }): Promise<void> {
    // Monta dados dependendo do alvo
    let title = 'Relatório CyberHub';
    let summary = '';
    if (target.cveId) {
      const cve = await prisma.cve.findUnique({ where: { id: target.cveId } });
      if (cve) {
        title = `Relatório CVE — ${cve.id}`;
        summary = cve.description;
      }
    } else if (target.ip) {
      title = `Relatório IP — ${target.ip}`;
      summary = `Análise de reputação de ${target.ip}`;
    } else if (target.domain) {
      title = `Relatório Domínio — ${target.domain}`;
      summary = `Análise de reputação de ${target.domain}`;
    }

    // Resumo via IA (não-bloqueante — falha não derruba o relatório)
    let summaryExec: string | null = null;
    try {
      const res = await this.ai.chat({
        message: `Resuma em até 3 frases: ${summary}`,
        system: 'Seja técnico e conciso. Responda em pt-BR.',
      });
      summaryExec = res.answer;
    } catch {
      summaryExec = null;
    }

    const storage = config().REPORTS_STORAGE_PATH;
    await mkdir(storage, { recursive: true });
    const html = buildHtml(title, summary, summaryExec, target);
    const jsonPath = join(storage, `${reportId}.json`);
    const htmlPath = join(storage, `${reportId}.html`);
    await writeFile(jsonPath, JSON.stringify({ title, summary, aiSummary: summaryExec, target }, null, 2));
    await writeFile(htmlPath, html);

    await prisma.report.update({
      where: { id: reportId },
      data: {
        summaryExec,
        filePath: htmlPath, // ponytail: PDF via @react-pdf quando necessário
        format: 'HTML',
      },
    });
  }

  private async markFailed(reportId: string | undefined, message: string): Promise<void> {
    if (!reportId) return;
    await prisma.report.update({ where: { id: reportId }, data: { filePath: null } }).catch(() => {});
  }
}

function buildHtml(
  title: string,
  summary: string,
  aiSummary: string | null,
  target: { ip?: string; domain?: string; cveId?: string },
): string {
  const targetInfo = JSON.stringify({ ...target }, null, 2);
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:sans-serif;max-width:720px;margin:40px auto;color:#1a1a2e;line-height:1.6}
h1{color:#0f3460}pre{background:#f1f5f9;padding:12px;border-radius:8px;overflow:auto}
.badge{background:#5865f2;color:#fff;padding:2px 10px;border-radius:99px;font-size:12px}</style></head>
<body><h1>🛡️ ${title}</h1><p><span class="badge">CyberHub AI</span> &nbsp;${new Date().toISOString()}</p>
${aiSummary ? `<h2>Resumo IA</h2><p>${aiSummary}</p>` : ''}
<h2>Descrição</h2><p>${summary || '—'}</p>
<h2>Alvo</h2><pre>${targetInfo}</pre></body></html>`;
}