// Helpers puros de validação/normalização. Zero side effects.
// Ponytail: nenhuma dep externa — regex/stdlib bastam.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
// IPv6 canônico (com zeros omitidos) — regex permissiva, alternativa: rigore via lib.
const IPV6_RE = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
const CVE_RE = /^CVE-\d{4}-\d{4,}$/;

export function isEmail(s: string): boolean {
  return EMAIL_RE.test(s);
}

export function isIPv4(s: string): boolean {
  return IPV4_RE.test(s);
}

export function isIPv6(s: string): boolean {
  return IPV6_RE.test(s);
}

export function isIP(s: string): boolean {
  return isIPv4(s) || isIPv6(s);
}

export function isCVE(s: string): boolean {
  return CVE_RE.test(s.toUpperCase());
}

/** Lowercase, tira whitespace e remove trailing dot (FQDN root label). */
export function normalizeDomain(s: string): string {
  return s.trim().toLowerCase().replace(/\.$/, '');
}

export function parseCvss(input: string | number | null | undefined): number | null {
  if (input == null || input === '') return null;
  const n = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(n, 0), 10);
}
