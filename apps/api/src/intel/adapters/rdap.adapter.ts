import { Injectable } from '@nestjs/common';
import type { IIntelAdapter, IntelDomainResult, IntelIpResult } from '../intel-adapter';

// RDAP — WHOIS moderno de domínio via registries (IANA bootstrap, sem key).
// Preferível ao binário `whois` (mais estruturado e confiável).
@Injectable()
export class RdapAdapter implements IIntelAdapter {
  readonly name = 'rdap';

  isEnabled(): boolean {
    return true;
  }

  ip(): Promise<IntelIpResult | null> {
    return Promise.resolve(null);
  }

  async domain(domain: string): Promise<IntelDomainResult | null> {
    try {
      // Bootstrap: descobre o servidor RDAP do TLD
      const tld = domain.split('.').pop()?.toLowerCase() ?? '';
      const boot = await fetch(`https://data.iana.org/rdap/dns.json`, { signal: AbortSignal.timeout(8000) });
      if (!boot.ok) return null;
      const bootJson = (await boot.json()) as { services?: Array<[string[], string[]]> };
      const entry = bootJson.services?.find(([names]) => names.includes(tld));
      const url = entry?.[1]?.[0];
      if (!url) return null;

      const res = await fetch(`${url.replace(/\/?$/, '')}/domain/${domain}`, {
        headers: { Accept: 'application/rdap+json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const d = (await res.json()) as {
        events?: Array<{ eventAction: string; eventDate: string }>;
        entities?: Array<{ roles?: string[]; vcardArray?: unknown[] }>;
      };
      const created = d.events?.find((e) => e.eventAction === 'registration')?.eventDate ?? null;
      return { registrar: null, createdAt: created ?? null, lastSeen: null };
    } catch {
      return null;
    }
  }
}