export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Painel</h1>
        <p className="text-muted-foreground">Consulte CVEs, notícias, intel de IP/domínio e gere relatórios.</p>
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