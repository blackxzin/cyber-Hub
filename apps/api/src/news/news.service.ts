import { Injectable } from '@nestjs/common';
import { prisma } from '@cyberhub/database';
import { NotFoundError } from '@cyberhub/shared';
import { RedisCacheService } from '../shared/redis/redis-cache.service';

@Injectable()
export class NewsService {
  constructor(private readonly cache: RedisCacheService) {}

  async list(query: string, skip: number, take: number) {
    const where = query
      ? {
          OR: [
            { title: { contains: query, mode: 'insensitive' as const } },
            { summary: { contains: query, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const cacheKey = query
      ? `news:list:${query.toLowerCase()}:${take}:${skip}`
      : `news:list:all:${take}:${skip}`;

    const { items, total } = await this.cache.getOrSet(
      cacheKey,
      60,
      async () => {
        const [rows, cnt] = await Promise.all([
          prisma.news.findMany({ where, orderBy: { publishedAt: 'desc' }, skip, take }),
          prisma.news.count({ where }),
        ]);
        return { items: rows.map(toDto), total: cnt };
      },
    );

    return { items, total };
  }

  async byId(id: string) {
    const news = await prisma.news.findUnique({ where: { id }, include: { sources: true } });
    if (!news) throw new NotFoundError('Notícia não encontrada');
    return toDetail(news);
  }
}

function toDto(n: {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  source: string | null;
  publishedAt: Date | null;
}) {
  return {
    id: n.id,
    title: n.title,
    summary: n.summary,
    url: n.url,
    source: n.source,
    publishedAt: n.publishedAt?.toISOString() ?? null,
  };
}

function toDetail(n: any) {
  return {
    ...toDto(n),
    body: n.body ?? null,
    sources: (n.sources ?? []).map((s: { name: string; url: string | null }) => ({
      name: s.name,
      url: s.url,
    })),
  };
}