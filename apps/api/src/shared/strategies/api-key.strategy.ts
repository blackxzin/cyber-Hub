import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-custom';
import { verifyPassword } from '@cyberhub/utils';
import { createLogger } from '@cyberhub/shared';
import { prisma } from '@cyberhub/database';

const log = createLogger('api.strategy.apikey');

// Strategy custom: lê header x-api-key, consulta todos os Users role=BOT
// e faz bcryptjs.compare contra cada apiKeyHash. Aceelera com cache Redis
// quando >1 bot (ponytail).
@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  async validate(req: any): Promise<{ id: string; email: string; role: 'BOT'; apiKey: true }> {
    const apiKey: string | undefined = req?.headers?.['x-api-key'];
    if (!apiKey) throw new UnauthorizedException('x-api-key ausente');

    const bots = await prisma.user.findMany({
      where: { role: 'BOT', apiKeyHash: { not: null } },
      select: { id: true, email: true, apiKeyHash: true },
    });

    for (const bot of bots) {
      if (!bot.apiKeyHash) continue;
      const ok = await verifyPassword(apiKey, bot.apiKeyHash);
      if (ok) {
        return { id: bot.id, email: bot.email, role: 'BOT', apiKey: true };
      }
    }
    log.warn({ hasKey: true }, 'api key rejeitada');
    throw new UnauthorizedException('api key inválida');
  }
}
