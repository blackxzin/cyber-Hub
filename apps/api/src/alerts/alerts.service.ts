import { Injectable } from '@nestjs/common';
import { prisma } from '@cyberhub/database';
import { botUserId } from '../shared/bot-user';

// AlertsService: CRUD de regras de alerta. Disparo real (scan/notificação)
// é ponytail — aqui grava regra + hook p/ n8n/Discord.
@Injectable()
export class AlertsService {
  async list() {
    const alerts = await prisma.alert.findMany({ orderBy: { createdAt: 'desc' } });
    return alerts.map(toDto);
  }

  async create(input: { rule: unknown; channel?: 'DISCORD' | 'EMAIL' | 'WEBHOOK' }) {
    const alert = await prisma.alert.create({
      data: {
        userId: await botUserId(),
        rule: input.rule as object,
        channel: input.channel ?? 'DISCORD',
      },
    });
    return toDto(alert);
  }

  async setActive(id: string, active: boolean) {
    return prisma.alert
      .update({ where: { id }, data: { active } })
      .then(toDto);
  }
}

function toDto(a: {
  id: string;
  rule: unknown;
  channel: string;
  active: boolean;
  lastFiredAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: a.id,
    rule: a.rule,
    channel: a.channel,
    active: a.active,
    lastFiredAt: a.lastFiredAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}