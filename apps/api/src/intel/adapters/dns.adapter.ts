import { Injectable } from '@nestjs/common';
import dns from 'node:dns/promises';
import type { IIntelAdapter, IntelDomainResult, IntelIpResult } from '../intel-adapter';

// DNS — resolve registros do domínio via stdlib (sem key, sempre ativo).
// IPs: DNS não classifica IP; devolve null.
@Injectable()
export class DnsAdapter implements IIntelAdapter {
  readonly name = 'dns';

  isEnabled(): boolean {
    return true;
  }

  ip(): Promise<IntelIpResult | null> {
    return Promise.resolve(null);
  }

  async domain(domain: string): Promise<IntelDomainResult | null> {
    try {
      const res = await dns.lookup(domain, { all: true });
      if (res.length === 0) return null;
      return { records: res.map((r) => r.address) };
    } catch {
      return null;
    }
  }
}