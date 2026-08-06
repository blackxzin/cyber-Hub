// Contrato de adapter de intel. Cada fonte externa (VirusTotal, AbuseIPDB,
// WHOIS, DNS) implementa os métodos que sabe responder. Sem fonte disponível
// (falta key/erro), retorna null — o IntelService funde os campos não-null.
//
// ponytail: fonte opcional = retorna null se indisponível; nunca lança p/ a
// fonte não derrubar a consulta inteira. Fallbacks graciosos.
export interface IIntelAdapter {
  readonly name: string;
  /** Requeridos p/ ativar este adapter. Se vazio/ausente, adapter fica inativo. */
  isEnabled(): boolean;
  ip(ip: string): Promise<IntelIpResult | null>;
  domain(domain: string): Promise<IntelDomainResult | null>;
}

export interface IntelIpResult {
  reputation?: 'malicious' | 'suspicious' | 'clean' | 'unknown';
  score?: number | null;
  country?: string | null;
  asn?: string | null;
  isp?: string | null;
  lastSeen?: string | null;
}

export interface IntelDomainResult {
  reputation?: 'malicious' | 'suspicious' | 'clean' | 'unknown';
  registrar?: string | null;
  createdAt?: string | null;
  lastSeen?: string | null;
  /** Registros A/AAAA resolvidos (ex: DNS). Não usado no merge de reputação. */
  records?: string[];
}