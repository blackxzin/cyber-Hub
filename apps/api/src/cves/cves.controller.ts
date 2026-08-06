import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../shared/decorators/decorators';
import { CvesService } from './cves.service';

// Por ora públicos (Fase 3 rotas sem auth no bot). pontail: adicionar
// ApiKeyAuthGuard quando o modelo de rota intel voltar ao zelo.
@Public()
@Controller('cves')
export class CvesController {
  constructor(private readonly cves: CvesService) {}

  @Get()
  list(
    @Query('query') query?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const take = clampInt(limit, 10, 1, 100);
    const skip = Math.max(0, Number(offset) || 0);
    return this.cves.list(query ?? '', skip, take);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.cves.byId(id.toUpperCase());
  }
}

function clampInt(v: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}