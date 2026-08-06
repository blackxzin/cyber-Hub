'use client';
import { useState } from 'react';

const base = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function IntelPage() {
  const [target, setTarget] = useState('');
  const [kind, setKind] = useState<'ip' | 'domain' | 'cve'>('ip');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup() {
    const t = target.trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    setData(null);
    setReport(null);
    try {
      const path = { ip: `/intel/ip/${t}`, domain: `/intel/domain/${t}`, cve: `/cves/${t.toUpperCase()}` }[kind];
      const res = await fetch(`${base()}${path}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(res.status === 404 ? 'Não encontrado' : (body?.message ?? `HTTP ${res.status}`));
      }
      setData((await res.json()) as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'erro');
    } finally {
      setLoading(false);
    }
  }

  async function makeReport() {
    const t = target.trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const body = kind === 'ip' ? { ip: t } : kind === 'domain' ? { domain: t } : { cveId: t.toUpperCase() };
      const res = await fetch(`${base()}/reports`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = (await res.json()) as { id: string };
      setReport(`Relatório gerado: /reports/${created.id}/pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Intel &amp; Relatórios</h1>

      <div className="flex flex-wrap gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="ip">IP</option>
          <option value="domain">Domínio</option>
          <option value="cve">CVE</option>
        </select>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && lookup()}
          placeholder={kind === 'cve' ? 'CVE-2024-12345' : kind === 'ip' ? '1.2.3.4' : 'exemplo.com'}
          className="min-w-56 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button onClick={lookup} disabled={loading} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">
          Consultar
        </button>
        <button onClick={makeReport} disabled={loading} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/40">
          Gerar relatório
        </button>
      </div>

      {error && <p className="text-sm text-destructive">Erro: {error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {report && <p className="text-sm text-green-400">{report}</p>}

      {data && (
        <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-muted/30 p-4 text-sm">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}