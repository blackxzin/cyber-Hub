import { Injectable } from '@nestjs/common';
import type { IIntelAdapter, IntelIpResult } from '../intel-adapter';

// Geolocalização/IP ASN via ip-api.com (free, sem key, ~45 req/min).
// País, ISP, ASN de qualquer IP público. Não tem feed de ameaça → reputation fica
// 'clean' apenas se nada indicar o contrário (o merge deixa null se só vier daqui).
@Injectable()
export class IpGeoAdapter implements IIntelAdapter {
  readonly name = 'ipapi';

  isEnabled(): boolean {
    return true;
  }

  async ip(ip: string): Promise<IntelIpResult | null> {
    try {
      const res = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,countryCode,isp,as,org,query`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) return null;
      const body = (await res.json()) as {
        status?: string;
        countryCode?: string;
        isp?: string;
        as?: string;
        org?: string;
      };
      if (body.status !== 'success') return null;
      return {
        country: body.countryCode ?? null,
        isp: body.isp ?? body.org ?? null,
        asn: body.as ?? null,
      };
    } catch {
      return null;
    }
  }

  domain(): Promise<null> {
    return Promise.resolve(null);
  }
}