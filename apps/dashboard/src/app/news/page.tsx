const base = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  source: string | null;
  publishedAt: string | null;
}

export const metadata = { title: 'Notícias — CyberHub AI' };

export default async function NewsPage() {
  let items: NewsItem[] = [];
  try {
    const res = await fetch(`${base()}/news?limit=20`, { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { items: NewsItem[] };
      items = data.items;
    }
  } catch {
    // API off
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Notícias de segurança</h1>
      <ul className="space-y-3">
        {items.map((n) => (
          <li key={n.id} className="rounded-lg border border-border p-4">
            <a href={n.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
              {n.title}
            </a>
            <p className="mt-1 text-sm text-muted-foreground">{n.summary}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {n.source} {n.publishedAt ? `· ${new Date(n.publishedAt).toLocaleDateString('pt-BR')}` : ''}
            </p>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma notícia cadastrada.</p>}
      </ul>
    </div>
  );
}