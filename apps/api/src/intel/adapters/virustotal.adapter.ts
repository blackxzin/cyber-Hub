import { Injectable } from '@nestjs/common';
import { config } from '@cyberhub/shared';
import type { IIntelAdapter, IntelDomainResult, IntelIpResult } from '../intel-adapter';

// VirusTotal — IP e domínio. Requer VIRUSTOTAL_API_KEY. Sem key fica inativo.
@Injectable()
export class VirustotalAdapter implements IIntelAdapter {
  readonly name = 'virustotal';

  isEnabled(): boolean {
    return Boolean(config().VIRUSTOTAL_API_KEY);
  }

  async ip(ip: string): Promise<IntelIpResult | null> {
    return this.lookup(`ip_addresses/${ip}`);
  }

  async domain(domain: string): Promise<IntelDomainResult | null> {
    return this.lookup(`domains/${domain}`);
  }

  private async lookup(resource: string): Promise<IntelIpResult | IntelDomainResult | null> {
    const key = config().VIRUSTOTAL_API_KEY as string;
    try {
      const res = await fetch(`https://www.virustotal.com/api/v3/${resource}`, {
        headers: { 'x-apikey': key, Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as {
        data?: {
          attributes?: {
            last_analysis_stats?: { malicious?: number; suspicious?: number };
            last_analysis_date?: number;
          };
        };
      };
      const a = body.data?.attributes;
      if (!a) return null;
      const five = a.last_analysis_stats;
      const lastSeen = a.last_analysis_date ? new Date(a.last_analysis_date * 1000).toISOString() : null;
      return {
        reputation: five?.malicious ? 'malicious' : five?.suspicious ? 'suspicious' : 'clean',
        score: five?.malicious ?? null,
        lastSeen,
      };
    } catch {
      return null;
    }
  }
}