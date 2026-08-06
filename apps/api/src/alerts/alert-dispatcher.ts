import { Injectable } from '@nestjs/common';
import { prisma } from '@cyberhub/database';
import { config, createLogger } from '@cyberhub/shared';

const log = createLogger('api.alerts.dispatch');

// Dispatcher de alertas. Após ingest (CVE/News) avalia as regras ativas e dispara.
// Hoje só canal DISCORD via webhook (DISCORD_ALERT_WEBHOOK_URL).
// ponytail: EMAIL/WEBHOOK genérico e retry/backoff quando escalar.
export type ThreatEvent = {
  type: 'CVE' | 'NEWS';
  severity?: string; // só pra CVE (CRITICAL/HIGH/...)
  target?: string; // CVE-xxxx ou domínio
  title: string;
  url?: string;
};

const SEV_ORDER: Record<string, number> = { UNKNOWN: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

@Injectable()
export class AlertDispatcher {
  async evaluate(event: ThreatEvent): Promise<number> {
    let fired = 0;
    try {
      const rules = await prisma.alert.findMany({ where: { active: true } });
      for (const rule of rules) {
        if (!this.matches(rule.rule as Record<string, unknown>, event)) continue;
        await this.dispatchDiscord(event);
        await prisma.alert.update({ where: { id: rule.id }, data: { lastFiredAt: new Date() } });
        fired++;
      }
    } catch (err) {
      log.error({ err: (err as Error).message }, 'falha ao avaliar alertas');
    }
    return fired;
  }

  // Regra: { minSeverity: 'HIGH' } casa se severidade >= no CVE. Regra vazia dispara sempre.
  private matches(rule: Record<string, unknown>, event: ThreatEvent): boolean {
    const min = rule['minSeverity'];
    if (event.type === 'CVE' && min) {
      const minNum = SEV_ORDER[String(min).toUpperCase()] ?? 0;
      if ((SEV_ORDER[event.severity?.toUpperCase() ?? ''] ?? 0) < minNum) return false;
    }
    // Regra de severity não filtra NEWS (sem severidade) e targetId não implementado.
    return true;
  }

  private async dispatchDiscord(event: ThreatEvent): Promise<void> {
    const url = config().DISCORD_ALERT_WEBHOOK_URL;
    if (!url) {
      log.warn('DISCORD_ALERT_WEBHOOK_URL ausente — alerta não enviado');
      return;
    }
    const payload = {
      embeds: [
        {
          title: `🚨 ${event.title}`,
          description: `${event.type}${event.severity ? ` (${event.severity})` : ''}${event.url ? `\n${event.url}` : ''}`,
          color: event.type === 'CVE' ? 0xed4245 : 0x5865f2,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      log.error({ err: (err as Error).message }, 'falha no webhook Discord');
    }
  }
}