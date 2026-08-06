import { Injectable } from '@nestjs/common';
import { prisma } from '@cyberhub/database';
import { NotFoundError } from '@cyberhub/shared';
import { RedisCacheService } from '../shared/redis/redis-cache.service';

@Injectable()
export class CvesService {
  constructor(private readonly cache: RedisCacheService) {}

  // Lista CVEs com busca opcional e paginação. Cacheia a listagem 5min (dados
  // de NVD mudam pouco em janela curta; evita re-query no DB a cada /cves).
  async list(query: string, skip: number, take: number) {
    const where = query
      ? {
          OR: [
            { id: { contains: query, mode: 'insensitive' as const } },
            { description: { contains: query, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const cacheKey = query ? `cve:list:${query.toLowerCase()}:${take}:${skip}` : `cve:list:all:${take}:${skip}`;

    const data = await this.cache.getOrSet(cacheKey, 30, async () => {
      const [items, total] = await Promise.all([
        prisma.cve.findMany({ where, orderBy: { publishedAt: 'desc' }, skip, take }),
        prisma.cve.count({ where }),
      ]);
      return {
        items: items.map(toDto),
        total,
      };
    });

    return data;
  }

  async byId(id: string) {
    const cve = await this.cache.getOrSet(`cve:id:${id}`, 300, async () => {
      const found = await prisma.cve.findUnique({
        where: { id },
        include: { references: true },
      });
      return found;
    });
    if (!cve) throw new NotFoundError(`CVE ${id} não encontrada`);
    return toDetail(cve);
  }
}

function toDto(c: {
  id: string;
  publishedAt: Date | null;
  cvss: number | null;
  description: string;
}) {
  return {
    id: c.id,
    cveId: c.id,
    publishedAt: c.publishedAt?.toISOString() ?? null,
    cvssV3: c.cvss,
    severity: severity(c.cvss),
    description: c.description,
  };
}

function toDetail(c: any) {
  return {
    ...toDto(c),
    references: (c.references ?? []).map((r: { url: string; source: string | null }) => ({
      url: r.url,
      source: r.source,
    })),
  };
}

function severity(cvss: number | null): string {
  if (cvss == null) return 'UNKNOWN';
  if (cvss >= 9) return 'CRITICAL';
  if (cvss >= 7) return 'HIGH';
  if (cvss >= 4) return 'MEDIUM';
  return 'LOW';
}