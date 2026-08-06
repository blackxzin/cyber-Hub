import { Controller, Get, Param, Post, Body, Query, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { createReadStream } from 'node:fs';
import { Public } from '../shared/decorators/decorators';
import { botUserId } from '../shared/bot-user';
import { ReportsService } from './reports.service';
import { isIP, isCVE, normalizeDomain } from '@cyberhub/utils';
import { ValidationError } from '@cyberhub/shared';

// por ora público. userId: usa do bot se existir (rota sem auth do bot).
@Public()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  async create(@Body() body: { ip?: string; domain?: string; cveId?: string }) {
    const target = parseTarget(body);
    const userId = await this.resolveUserId();
    return this.reports.create(target, userId);
  }

  @Get()
  async list(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const take = clampInt(limit, 10, 1, 50);
    const skip = Math.max(0, Number(offset) || 0);
    return this.reports.list(await botUserId(), skip, take);
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Res({ passthrough: true }) res: FastifyReply) {
    const { path, filename } = await this.reports.getForDownload(id);
    res.header('Content-Type', 'text/html');
    res.header('Content-Disposition', `inline; filename="${filename}"`);
    createReadStream(path).pipe(res.raw);
  }

  private async resolveUserId(): Promise<string> {
    return botUserId();
  }
}

function parseTarget(body: { ip?: string; domain?: string; cveId?: string }): { ip?: string; domain?: string; cveId?: string } {
  if (body?.cveId && isCVE(body.cveId)) return { cveId: body.cveId.toUpperCase() };
  if (body?.ip && isIP(body.ip)) return { ip: body.ip };
  if (body?.domain) {
    const d = normalizeDomain(body.domain);
    if (d) return { domain: d };
  }
  throw new ValidationError('Alvo inválido: informe ip, domain ou cveId válidos');
}

function clampInt(v: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}