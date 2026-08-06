import { Injectable } from '@nestjs/common';
import { config } from '@cyberhub/shared';
import type { IIntelAdapter, IntelIpResult } from '../intel-adapter';

// AbuseIPDB — reputação de IP. Requer ABUSEIPDB_API_KEY. Sem key fica inativo.
@Injectable()
export class AbuseIpdbAdapter implements IIntelAdapter {
  readonly name = 'abuseipdb';

  isEnabled(): boolean {
    return Boolean(config().ABUSEIPDB_API_KEY);
  }

  async ip(ip: string): Promise<IntelIpResult | null> {
    if (!this.isEnabled()) return null;
    try {
      const res = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`, {
        headers: { Key: config().ABUSEIPDB_API_KEY as string, Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { data?: { abuseConfidenceScore?: number; countryCode?: string; isp?: string; usageType?: string; lastReportedAt?: string } };
      const d = body.data;
      if (!d) return null;
      const score = d.abuseConfidenceScore ?? null;
      return {
        score,
        reputation: score != null && score >= 80 ? 'malicious' : score != null && score >= 30 ? 'suspicious' : 'clean',
        country: d.countryCode ?? null,
        isp: d.isp ?? d.usageType ?? null,
        lastSeen: d.lastReportedAt ?? null,
      };
    } catch {
      return null;
    }
  }

  domain(): Promise<null> {
    return Promise.resolve(null); // AbuseIPDB só cobre IP
  }
}