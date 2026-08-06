import { Injectable } from '@nestjs/common';
import { prisma } from '@cyberhub/database';
import { RedisCacheService } from '../shared/redis/redis-cache.service';
import { AbuseIpdbAdapter } from './adapters/abuseipdb.adapter';
import { VirustotalAdapter } from './adapters/virustotal.adapter';
import { DnsAdapter } from './adapters/dns.adapter';
import { WhoisAdapter } from './adapters/whois.adapter';
import { IpGeoAdapter } from './adapters/ipgeo.adapter';
import { RdapAdapter } from './adapters/rdap.adapter';
import type { IIntelAdapter, IntelDomainResult, IntelIpResult } from './intel-adapter';

// Orquestra adapters: consulta cada fonte ativa em paralelo, funde os campos
// não-null e cacheia o resultado 5min no Redis. Persiste a Consulta p/ histórico.
@Injectable()
export class IntelService {
  private readonly adapters: IIntelAdapter[];

  constructor(private readonly cache: RedisCacheService) {
    this.adapters = [
      new VirustotalAdapter(),
      new AbuseIpdbAdapter(),
      new IpGeoAdapter(),
      new DnsAdapter(),
      new WhoisAdapter(),
      new RdapAdapter(),
    ];
  }

  async ip(ip: string) {
    const data = await this.cache.getOrSet(`intel:ip:${ip}`, 300, async () => {
      const active = this.adapters.filter((a) => a.isEnabled());
      const results = await Promise.all(active.map((a) => a.ip(ip)));
      const nonNull = results.filter(Boolean) as NonNullable<IntelIpResult>[];
      if (nonNull.length > 0) await this.persist('IP', ip, active, nonNull);
      return mergeIp(nonNull);
    });

    return { ip, ...data };
  }

  async domain(domain: string) {
    const data = await this.cache.getOrSet(`intel:domain:${domain}`, 300, async () => {
      const active = this.adapters.filter((a) => a.isEnabled());
      const results = await Promise.all(active.map((a) => a.domain(domain)));
      const nonNull = results.filter(Boolean) as NonNullable<IntelDomainResult>[];
      if (nonNull.length > 0) await this.persist('DOMAIN', domain, active, nonNull);
      return merge(nonNull);
    });

    return { domain, ...data };
  }

  private async persist(
    type: 'IP' | 'DOMAIN',
    query: string,
    adapters: IIntelAdapter[],
    results: object[],
  ): Promise<void> {
    // sem usuário autenticado (rota pública) → consulta órfã do bot se existir
    const bot = await prisma.user.findFirst({ where: { role: 'BOT' }, select: { id: true } });
    if (!bot) return;
    try {
      await prisma.consulta.create({
        data: {
          userId: bot.id,
          type,
          query,
          status: 'COMPLETED',
          completedAt: new Date(),
          results: {
            create: results.map((r, i) => ({
              source: adapters[i]?.name ?? 'unknown',
              payload: r as unknown as object,
            })),
          },
        },
      });
    } catch {
      // histórico não deve derrubar a resposta
    }
  }
}

function mergeIp(results: NonNullable<IntelIpResult>[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const r of results) {
    for (const [k, v] of Object.entries(r)) {
      if (v != null && merged[k] === undefined) merged[k] = v;
    }
  }
  return {
    ...merged,
    reputation: merged.reputation ?? 'unknown',
    score: merged.score ?? null,
    country: merged.country ?? null,
    asn: merged.asn ?? null,
    isp: merged.isp ?? null,
    lastSeen: merged.lastSeen ?? null,
  };
}

function merge(results: NonNullable<IntelDomainResult>[]): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const r of results) {
    for (const [k, v] of Object.entries(r)) {
      if (v != null && merged[k] === undefined) merged[k] = v;
    }
  }
  return {
    ...merged,
    reputation: merged.reputation ?? 'unknown',
    registrar: merged.registrar ?? null,
    createdAt: merged.createdAt ?? null,
    lastSeen: merged.lastSeen ?? null,
    records: merged.records ?? [],
  };
}