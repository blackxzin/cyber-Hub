import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { prisma } from '@cyberhub/database';
import { NotFoundError } from '@cyberhub/shared';
import { ReportsQueue } from './reports.queue';

// ReportsService: criação (persiste + enfileira) e listagem.
@Injectable()
export class ReportsService {
  constructor(private readonly queue: ReportsQueue) {}

  async create(
    target: { ip?: string; domain?: string; cveId?: string },
    userId: string,
  ): Promise<{ id: string; status: string }> {
    const title = titleFor(target);
    const report = await prisma.report.create({
      data: { userId, title, format: 'HTML' },
    });
    await this.queue.add(report.id, target);
    return { id: report.id, status: 'pending' };
  }

  async list(userId: string, skip: number, take: number) {
    const [items, total] = await Promise.all([
      prisma.report.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.report.count({ where: { userId } }),
    ]);
    return {
      items: items.map((r) => ({
        id: r.id,
        title: r.title,
        format: r.format,
        createdAt: r.createdAt.toISOString(),
        ready: Boolean(r.filePath),
        hasSummary: Boolean(r.summaryExec),
      })),
      total,
    };
  }

  async getForDownload(id: string): Promise<{ path: string; filename: string }> {
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report?.filePath) throw new NotFoundError('Relatório não encontrado ou ainda em geração');
    return { path: report.filePath, filename: `${report.title.replace(/\W+/g, '_')}.pdf` };
  }
}

function titleFor(target: { ip?: string; domain?: string; cveId?: string }): string {
  if (target.cveId) return `Relatório CVE — ${target.cveId}`;
  if (target.ip) return `Relatório IP — ${target.ip}`;
  if (target.domain) return `Relatório Domínio — ${target.domain}`;
  return 'Relatório CyberHub';
}