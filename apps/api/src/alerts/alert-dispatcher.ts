import { Injectable } from '@nestjs/common';
import { prisma } from '@cyberhub/database';
import { config, createLogger } from '@cyberhub/shared';

const log = createLogger('api.alerts.dispatch');

// Dispatcher de alertas. Após ingest (CVE/News) avalia as regras ativas e dispara
// no canal da regra (DISCORD / EMAIL / WEBHOOK). Retry com backoff p/ rede instável.
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
  // Dispara cada regra que casa. Retorna quantos disparos efetivos houve.
  async evaluate(event: ThreatEvent): Promise<number> {
    let fired = 0;
    try {
      const rules = await prisma.alert.findMany({ where: { active: true } });
      for (const rule of rules) {
        if (!this.matches(rule.rule as Record<string, unknown>, event)) continue;
        const ok = await this.dispatch(rule.channel, event);
        if (ok) {
          await prisma.alert.update({ where: { id: rule.id }, data: { lastFiredAt: new Date() } });
          fired++;
        }
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
    return true;
  }

  // Roteia pelo canal da regra.
  private dispatch(channel: string, event: ThreatEvent): Promise<boolean> {
    switch (channel.toUpperCase()) {
      case 'EMAIL':
        return this.dispatchEmail(event);
      case 'WEBHOOK':
        return this.dispatchWebhook(event);
      case 'DISCORD':
      default:
        return this.postWithRetry(
          config().DISCORD_ALERT_WEBHOOK_URL ?? '',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(this.discordPayload(event)),
          },
          true,
        );
    }
  }

  // WEBHOOK genérico: POST JSON com { type, severity, title, url } p/ ALERT_WEBHOOK_URL.
  private async dispatchWebhook(event: ThreatEvent): Promise<boolean> {
    const url = config().ALERT_WEBHOOK_URL;
    if (!url) {
      log.warn('ALERT_WEBHOOK_URL ausente — alerta WEBHOOK não enviado');
      return false;
    }
    return this.postWithRetry(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'threat',
        type: event.type,
        severity: event.severity,
        title: event.title,
        url: event.url,
        target: event.target,
        at: new Date().toISOString(),
      }),
    });
  }

  // EMAIL via SMTP (nodemailer importado lazy p/ não obrigar dep na API crua).
  private async dispatchEmail(event: ThreatEvent): Promise<boolean> {
    const to = config().ALERT_EMAIL_TO;
    if (!to) {
      log.warn('ALERT_EMAIL_TO ausente — alerta EMAIL não enviado');
      return false;
    }
    try {
      const { createTransport } = await import('nodemailer');
      const cfg = config();
      const transport = createTransport({
        host: cfg.SMTP_HOST,
        port: cfg.SMTP_PORT,
        secure: (cfg.SMTP_PORT ?? 465) === 465,
        auth: cfg.SMTP_USER ? { user: cfg.SMTP_USER, pass: cfg.SMTP_PASS } : undefined,
      });
      await transport.sendMail({
        from: cfg.SMTP_FROM ?? cfg.SMTP_USER,
        to,
        subject: `🚨 [CyberHub] ${event.title}`,
        text:
          `${event.type}${event.severity ? ` (${event.severity})` : ''}\n\n` +
          `${event.title}${event.url ? `\n${event.url}` : ''}`,
      });
      return true;
    } catch (err) {
      log.error({ err: (err as Error).message }, 'falha no envio de email do alerta');
      return false;
    }
  }

  // Retry com backoff (0.5s → 1s → 2s) p/ rede instável. Se URL ausente ou 4xx, não tenta de novo.
  private async postWithRetry(url: string, init: RequestInit, retry = true): Promise<boolean> {
    if (!url) {
      log.warn('URL do canal ausente — alerta não enviado');
      return false;
    }
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
        if (res.ok) return true;
        if (res.status >= 400 && res.status < 500) return false;
      } catch {
        // queda de rede → tenta de novo (se retry ligado)
      }
      if (!retry || i === 2) return false;
      await sleep(500 * 2 ** i);
    }
    return false;
  }

  private discordPayload(event: ThreatEvent) {
    return {
      embeds: [
        {
          title: `🚨 ${event.title}`,
          description: `${event.type}${event.severity ? ` (${event.severity})` : ''}${event.url ? `\n${event.url}` : ''}`,
          color: event.type === 'CVE' ? 0xed4245 : 0x5865f2,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}