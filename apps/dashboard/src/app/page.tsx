'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';

// Home protegida: redireciona pra /login se não autenticado.
export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return <p className="text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Painel</h1>
        <p className="text-muted-foreground">
          Olá, {user.name ?? user.email}. Consulte CVEs, notícias, intel e gere relatórios.
        </p>
      </div>

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
      </div>
    </div>
  );
}