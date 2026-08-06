import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../shared/decorators/decorators';
import { NewsService } from './news.service';

@Public()
@Controller('news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Get()
  list(
    @Query('query') query?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const take = clampInt(limit, 10, 1, 50);
    const skip = Math.max(0, Number(offset) || 0);
    return this.news.list(query ?? '', skip, take);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.news.byId(id);
  }
}

function clampInt(v: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}