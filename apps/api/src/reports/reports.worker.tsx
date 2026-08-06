import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer';
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
    const pdfPath = join(storage, `${reportId}.pdf`);
    const buf = await renderPdf(reportDoc(title, summary, summaryExec, target));
    await writeFile(pdfPath, buf);
    // Mantém o JSON p/ consumo/inspeção da API/intel.
    await writeFile(join(storage, `${reportId}.json`), JSON.stringify({ title, summary, aiSummary: summaryExec, target }, null, 2));

    await prisma.report.update({
      where: { id: reportId },
      data: {
        summaryExec,
        filePath: pdfPath,
        format: 'PDF',
      },
    });
  }

  private async markFailed(reportId: string | undefined, message: string): Promise<void> {
    if (!reportId) return;
    await prisma.report.update({ where: { id: reportId }, data: { filePath: null } }).catch(() => {});
  }
}

// Documento PDF do relatório (react-pdf). renderDoc retorna o JSX; renderPdf
// compila p/ Promise<Blob>. Corpo enxuto e idêntico ao antigo HTML.
function reportDoc(
  title: string,
  summary: string,
  aiSummary: string | null,
  target: { ip?: string; domain?: string; cveId?: string },
): JSX.Element {
  return (
    <Document>
      <Page size="A4" style={{ padding: 32, fontFamily: 'Helvetica', fontSize: 11, color: '#1a1a2e' }}>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 20, color: '#0f3460', marginBottom: 4 }}>🛡️ {title}</Text>
          <Text style={{ fontSize: 9, color: '#5865f2' }}>CyberHub AI — {new Date().toISOString()}</Text>
        </View>
        {aiSummary ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>Resumo IA</Text>
            <Text>{aiSummary}</Text>
          </View>
        ) : null}
        <Text style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>Descrição</Text>
        <Text style={{ marginBottom: 12 }}>{summary || '—'}</Text>
        <Text style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>Alvo</Text>
        <Text style={{ fontFamily: 'Courier', fontSize: 9 }}>{JSON.stringify({ ...target }, null, 2)}</Text>
      </Page>
    </Document>
  );
}

function renderPdf(element: JSX.Element): Promise<Buffer> {
  return renderToBuffer(element);
}