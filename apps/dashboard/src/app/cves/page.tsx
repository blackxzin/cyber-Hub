import CveList from './cve-list';

export const metadata = { title: 'CVEs — CyberHub AI' };

// Server component: busca CVEs na API via rewrite /api/* → localhost:3001.
export default async function CvesPage() {
  let items: Cve[] = [];
  let total = 0;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/cves?limit=20`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as { items: Cve[]; total: number };
      items = data.items;
      total = data.total;
    }
  } catch {
    // API off — lista vazia
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">CVEs</h1>
        <span className="text-sm text-muted-foreground">{total} no banco</span>
      </div>
      <CveList initial={items} />
    </div>
  );
}

export interface Cve {
  id: string;
  cveId: string;
  publishedAt: string | null;
  cvssV3: number | null;
  severity: string;
  description: string;
}