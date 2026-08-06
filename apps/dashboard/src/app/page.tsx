'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

// Home protegida: redireciona pra /login se não autenticado.
export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return <p className="text-muted-foreground">Carregando…</p>;

  return (
    <Dashboard user={user} />
  );
}

function Dashboard({ user }: { user: { name: string | null; email: string } }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>('/stats')
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const cards = [
    { label: 'CVEs', value: stats?.cves, sub: stats ? `${stats.criticalCves} críticas` : undefined },
    { label: 'Notícias', value: stats?.news },
    { label: 'Relatórios', value: stats?.reports },
    { label: 'Alertas ativos', value: stats?.alerts },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Painel</h1>
        <p className="text-muted-foreground">
          Olá, {user.name ?? user.email}. Consulte CVEs, notícias, intel e gere relatórios.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border p-4">
            <div className="text-sm text-muted-foreground">{c.label}</div>
            <div className="text-2xl font-semibold">{c.value ?? '—'}</div>
            {c.sub && <div className="text-xs text-muted-foreground">{c.sub}</div>}
          </div>
        ))}
      </div>

      {stats && (
        <div className="text-xs text-muted-foreground">
          IA: {stats.ia.provider} · {stats.ia.online ? 'online' : 'offline'} · {stats.logs.audit} ações auditadas
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a href="/cves" className="rounded-lg border border-border p-4 hover:bg-muted/40 transition-colors">
          <div className="text-lg">🔴 CVEs</div>
          <p className="text-sm text-muted-foreground">Vulnerabilidades recentes (NVD) e busca.</p>
        </a>
        <a href="/news" className="rounded-lg border border-border p-4 hover:bg-muted/40 transition-colors">
          <div className="text-lg">📰 Notícias</div>
          <p className="text-sm text-muted-foreground">Últimas notícias de segurança (CISA).</p>
        </a>
        <a href="/intel" className="rounded-lg border border-border p-4 hover:bg-muted/40 transition-colors">
          <div className="text-lg">🎯 Intel</div>
          <p className="text-sm text-muted-foreground">Reputação de IP/domínio e relatórios.</p>
        </a>
        <a href="/reports" className="rounded-lg border border-border p-4 hover:bg-muted/40 transition-colors">
          <div className="text-lg">📄 Relatórios</div>
          <p className="text-sm text-muted-foreground">Relatórios gerados (PDF/JSON) e download.</p>
        </a>
      </div>
    </div>
  );
}

interface Stats {
  cves: number;
  criticalCves: number;
  news: number;
  reports: number;
  alerts: number;
  logs: { audit: number };
  ia: { provider: string; online: boolean };
}