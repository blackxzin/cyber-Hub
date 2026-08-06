import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { IIntelAdapter, IntelDomainResult, IntelIpResult } from '../intel-adapter';

const execFileAsync = promisify(execFile);

// WHOIS — registro do domínio via binário `whois` (instalado no SO; sem key).
// Se o binário não existir, retorna null (adapter inativo).
@Injectable()
export class WhoisAdapter implements IIntelAdapter {
  readonly name = 'whois';

  isEnabled(): boolean {
    return true; // tentativa; se falhar no exec, devolve null
  }

  ip(): Promise<IntelIpResult | null> {
    return Promise.resolve(null);
  }

  async domain(domain: string): Promise<IntelDomainResult | null> {
    try {
      const { stdout } = await execFileAsync('whois', [domain], { timeout: 10_000 });
      return {
        registrar: pick(stdout, /Registrar:\s*(.+)/i),
        createdAt: pick(stdout, /Creation Date:\s*(.+)/i),
        lastSeen: null,
      };
    } catch {
      return null;
    }
  }
}

function pick(text: string, re: RegExp): string | null {
  const m = re.exec(text);
  return m?.[1]?.trim() ?? null;
}